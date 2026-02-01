import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { gateway } from '@specific-dev/framework';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { App } from '../index.js';

const recommendationRequestSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  relationship: z.enum(['single', 'relationship', 'family']),
  timeAvailable: z.enum(['0-2 hours', '2-4 hours', 'full day']),
  minBudget: z.number().min(0).max(500),
  maxBudget: z.number().min(0).max(500),
}).refine((data) => data.minBudget <= data.maxBudget, {
  message: 'minBudget must be less than or equal to maxBudget',
  path: ['minBudget'],
});

const recommendationSchema = z.object({
  name: z.string().describe('Business name'),
  description: z.string().describe('Witty, humorous description of the recommendation'),
  searchQuery: z.string().describe('Query to search for this business on Google Places'),
  funnyExplanation: z.string().describe('A short (1-2 sentences) explanation of why this activity is funny, unexpected, or ironic for a Valentine\'s date'),
});

const recommendationsResponseSchema = z.object({
  recommendations: z.array(recommendationSchema),
});

type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;
type Recommendation = z.infer<typeof recommendationSchema>;
type RecommendationsResponse = z.infer<typeof recommendationsResponseSchema>;

interface GooglePlacesSearchResult {
  name: string;
  place_id: string;
  formatted_address?: string;
  rating?: number;
  photos?: Array<{ photo_reference: string }>;
  price_level?: number;
}

interface GooglePlacesSearchResponse {
  results: GooglePlacesSearchResult[];
  status: string;
}

interface EnrichedRecommendation {
  name: string;
  description: string;
  placeId: string;
  address: string;
  rating: number;
  photoUrl: string;
  priceLevel: number;
  funnyExplanation: string;
}

function budgetToPriceLevel(budget: number): number {
  if (budget <= 50) return 1;
  if (budget <= 150) return 2;
  if (budget <= 300) return 3;
  return 4;
}

async function searchGooglePlaces(
  query: string,
  location: string,
  minBudget: number,
  maxBudget: number
): Promise<GooglePlacesSearchResult | null> {
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!googleApiKey) {
    console.error('GOOGLE_PLACES_API_KEY not set - cannot search Google Places');
    return null;
  }

  try {
    const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    searchUrl.searchParams.set('query', `${query} in ${location}`);
    searchUrl.searchParams.set('key', googleApiKey);

    // Convert budget range to price levels
    const minPriceLevel = budgetToPriceLevel(minBudget);
    const maxPriceLevel = budgetToPriceLevel(maxBudget);
    searchUrl.searchParams.set('minprice', minPriceLevel.toString());
    searchUrl.searchParams.set('maxprice', maxPriceLevel.toString());

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Places API HTTP error: ${response.status} ${response.statusText} - ${errorText}`);
      return null;
    }

    const data = (await response.json()) as GooglePlacesSearchResponse;

    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0];
    }

    if (data.status !== 'OK') {
      console.warn(`Google Places API returned status: ${data.status} for query: ${query} in ${location}`);
    }

    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error searching Google Places for "${query}" in ${location}:`, errorMessage);
    return null;
  }
}

function buildPhotoUrl(photoReference: string): string {
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!googleApiKey) {
    return `https://via.placeholder.com/400x300?text=Place+Photo`;
  }

  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${googleApiKey}`;
}

// Extract core business type from a potentially creative query
function extractBusinessType(query: string): string {
  // If it already looks like a simple business type, use it
  if (query.length < 30 && !query.includes('+') && !query.includes('&')) {
    return query;
  }

  // Try to extract the main business type from complex queries
  const businessTypes = [
    'restaurant', 'cafe', 'coffee', 'bar', 'pub', 'lounge',
    'park', 'museum', 'gallery', 'theater', 'cinema',
    'bowling', 'arcade', 'gym', 'yoga', 'spa', 'massage',
    'karaoke', 'club', 'lounge', 'bar',
    'bookstore', 'shop', 'store', 'mall',
    'studio', 'school', 'class',
    'escape', 'game', 'activity',
    'pool', 'beach', 'trail', 'hiking'
  ];

  const lowerQuery = query.toLowerCase();
  for (const type of businessTypes) {
    if (lowerQuery.includes(type)) {
      return type;
    }
  }

  // If can't extract, use generic venue
  return 'restaurant or cafe';
}

async function searchGooglePlacesWithRetry(
  query: string,
  location: string,
  minBudget: number,
  maxBudget: number,
  logger: any
): Promise<GooglePlacesSearchResult | null> {
  // First, try the exact search query
  let result = await searchGooglePlaces(query, location, minBudget, maxBudget);

  if (result) {
    logger.debug(
      { query, foundName: result.name, rating: result.rating },
      'Found place with primary search'
    );
    return result;
  }

  logger.debug({ query }, 'Primary search returned no results, trying fallback searches');

  // Try extracted business type
  const businessType = extractBusinessType(query);
  if (businessType !== query) {
    logger.debug({ fallbackQuery: businessType }, 'Trying extracted business type');
    result = await searchGooglePlaces(businessType, location, minBudget, maxBudget);
    if (result) {
      logger.debug(
        { fallbackQuery: businessType, foundName: result.name, rating: result.rating },
        'Found place with business type fallback'
      );
      return result;
    }
  }

  // Define broader fallback queries based on common business types
  const fallbackQueries: { [key: string]: string[] } = {
    'escape room': ['entertainment venue', 'activity center', 'arcade'],
    'karaoke bar': ['bar', 'nightlife venue', 'entertainment'],
    'pottery studio': ['art studio', 'creative space', 'workshop'],
    'cooking class': ['restaurant', 'culinary school', 'cafe'],
    'painting class': ['art studio', 'art gallery', 'workshop'],
    'arcade': ['game center', 'entertainment venue'],
    'bowling alley': ['recreation center', 'entertainment venue'],
    'mini golf': ['golf course', 'recreation center', 'entertainment'],
    'comedy club': ['bar', 'nightlife venue', 'entertainment'],
    'museum': ['attraction', 'cultural center', 'gallery'],
    'bookstore': ['shop', 'library', 'bookshop'],
    'antique shop': ['thrift store', 'vintage shop', 'shop'],
    'yoga studio': ['fitness center', 'wellness center', 'gym'],
    'dance studio': ['fitness center', 'entertainment venue'],
    'hiking trail': ['park', 'nature area', 'outdoor recreation'],
    'public park': ['park', 'recreational area', 'nature'],
    'coffee shop': ['cafe', 'coffee', 'restaurant'],
    'free museum': ['museum', 'attraction', 'cultural center'],
  };

  // Extract base query type and try fallbacks
  const queryLower = query.toLowerCase();
  let fallbacks: string[] = [];

  // Find matching fallback queries
  for (const [key, values] of Object.entries(fallbackQueries)) {
    if (queryLower.includes(key)) {
      fallbacks = values;
      break;
    }
  }

  // Try each fallback query
  for (const fallbackQuery of fallbacks) {
    logger.debug({ fallbackQuery }, 'Trying fallback search');
    result = await searchGooglePlaces(fallbackQuery, location, minBudget, maxBudget);
    if (result) {
      logger.debug(
        { fallbackQuery, foundName: result.name, rating: result.rating },
        'Found place with fallback search'
      );
      return result;
    }
  }

  // Final fallback: search for restaurants
  logger.debug('All specific searches failed, trying final restaurant fallback');
  result = await searchGooglePlaces('restaurant', location, minBudget, maxBudget);
  if (result) {
    logger.debug(
      { foundName: result.name, rating: result.rating },
      'Found generic restaurant as final fallback'
    );
    return result;
  }

  logger.warn({ query, location }, 'No results found even with fallback searches');
  return null;
}

export async function register(app: App, fastify: FastifyInstance) {
  fastify.post<{ Body: RecommendationRequest }>(
    '/api/recommendations',
    {
      schema: {
        description: 'Get creative Valentine date recommendations',
        tags: ['recommendations'],
        body: {
          type: 'object',
          required: ['location', 'relationship', 'timeAvailable', 'minBudget', 'maxBudget'],
          properties: {
            location: { type: 'string', description: 'City or location for recommendations' },
            relationship: {
              type: 'string',
              enum: ['single', 'relationship', 'family'],
              description: 'Type of relationship',
            },
            timeAvailable: {
              type: 'string',
              enum: ['0-2 hours', '2-4 hours', 'full day'],
              description: 'Time available for the date',
            },
            minBudget: {
              type: 'number',
              description: 'Minimum budget in dollars (0-500)',
              minimum: 0,
              maximum: 500,
            },
            maxBudget: {
              type: 'number',
              description: 'Maximum budget in dollars (0-500)',
              minimum: 0,
              maximum: 500,
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              recommendations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    placeId: { type: 'string' },
                    address: { type: 'string' },
                    rating: { type: 'number' },
                    photoUrl: { type: 'string' },
                    priceLevel: { type: 'number' },
                    funnyExplanation: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: RecommendationRequest }>, reply: FastifyReply) => {
      const { location, relationship, timeAvailable, minBudget, maxBudget } = request.body;

      app.logger.info(
        { location, relationship, timeAvailable, minBudget, maxBudget },
        'Generating recommendations'
      );

      try {
        // Validate input
        const validInput = recommendationRequestSchema.parse(request.body);

        // Build the AI prompt
        const relationshipContext = {
          single:
            'for someone enjoying their own company or looking to meet people in a fun, creative way',
          relationship:
            'for a couple looking for unexpected, humorous, and memorable experiences together',
          family:
            'for families looking for quirky, funny, and bonding experiences with kids or relatives',
        };

        // Build budget-specific guidance for AI
        let budgetGuidance = '';
        if (validInput.maxBudget <= 20) {
          budgetGuidance = `
CRITICAL for low budget ($${validInput.minBudget}-$${validInput.maxBudget}):
- Suggest REAL free or very low-cost places that exist in Google Places
- Examples: public park, free museum, coffee shop, scenic viewpoint, public beach, community center, library, hiking trail
- These are places with real addresses, ratings, and reviews in Google Places
- Do NOT suggest fictional "free activities" that won't be found`;
        } else if (validInput.maxBudget >= 400) {
          budgetGuidance = `
CRITICAL for high budget ($${validInput.minBudget}-$${validInput.maxBudget}):
- Suggest REAL upscale, premium businesses that exist in Google Places
- Examples: fine dining restaurant, luxury spa, upscale steakhouse, high-end hotel restaurant, premium cocktail bar
- Use straightforward business types (e.g., "French restaurant", "luxury spa", "steakhouse")
- Do NOT create fictional combo names like "Axe-Throwing + Dessert Bar Combo"
- At least one recommendation should be an actual well-known restaurant type`;
        } else {
          budgetGuidance = `
For mid-range budget ($${validInput.minBudget}-$${validInput.maxBudget}):
- Suggest real, searchable places that exist in Google Places
- Mix of casual restaurants, entertainment venues, and activities
- Ensure each place type is simple and searchable`;
        }

        const prompt = `Generate 3 funny, unexpected, and highly-creative Valentine's Day date recommendations.

Context:
- Location: ${validInput.location}
- Relationship Type: ${relationshipContext[validInput.relationship]}
- Time Available: ${validInput.timeAvailable}
- Budget Range: $${validInput.minBudget} - $${validInput.maxBudget}
${budgetGuidance}

ABSOLUTE REQUIREMENTS - READ CAREFULLY:
1. ONLY suggest real, existing business types that can be found in Google Places
2. searchQuery MUST be a simple, searchable business category, NOT a creative combo name
3. Examples of GOOD searchQuery: "pizza restaurant", "coffee shop", "bowling alley", "art gallery", "hiking trail", "public park"
4. Examples of BAD searchQuery: "Axe-Throwing Lounge + Dessert Bar Combo", "The Quirky Thrift Fashion Show", "Mystery Food Truck Adventure"
5. The NAME can be creative and funny, but searchQuery must be realistic and findable
6. Each place MUST exist in Google Places and have a real address, rating, and photos
7. Avoid fictional combo venues - stick to single, real business types
8. Make sure each recommendation fits the time constraint and budget

For each recommendation, provide:
- name: A creative, funny name for the business/activity type (can be witty)
- description: A witty, humorous description of why this would be a great (and funny) date
- searchQuery: ONLY a simple, real, searchable business type. Examples: "restaurant", "museum", "park", "bowling alley", "coffee shop", "art gallery", "escape room", "karaoke bar", "bookstore"
- funnyExplanation: A short (1-2 sentences) explanation of why this activity is funny, unexpected, or ironic for a Valentine's date

REMEMBER: searchQuery is what we'll search for in Google Places. It must be realistic. The name/description can be creative, but the searchQuery must work.`;

        app.logger.debug({ prompt }, 'Sending prompt to AI');

        // Generate recommendations using AI
        const { object } = await generateObject({
          model: gateway('openai/gpt-5.2'),
          schema: recommendationsResponseSchema,
          schemaName: 'Recommendations',
          schemaDescription: 'Creative and humorous Valentine date recommendations',
          prompt,
        });

        app.logger.info(
          { recommendationCount: object.recommendations.length },
          'AI generated recommendations'
        );

        // Enrich recommendations with actual Google Places data
        const enrichedRecommendations: EnrichedRecommendation[] = [];

        for (const rec of object.recommendations) {
          app.logger.info(
            { name: rec.name, searchQuery: rec.searchQuery },
            'Searching for business in Google Places'
          );

          // Use retry logic to find real place data with fallbacks
          const placeResult = await searchGooglePlacesWithRetry(
            rec.searchQuery,
            validInput.location,
            validInput.minBudget,
            validInput.maxBudget,
            app.logger
          );

          if (placeResult) {
            const photoUrl = placeResult.photos?.[0]?.photo_reference
              ? buildPhotoUrl(placeResult.photos[0].photo_reference)
              : 'https://via.placeholder.com/400x300?text=No+Photo+Available';

            enrichedRecommendations.push({
              name: placeResult.name,
              description: rec.description,
              placeId: placeResult.place_id,
              address: placeResult.formatted_address || 'Address not available',
              rating: placeResult.rating || 0,
              photoUrl,
              priceLevel: placeResult.price_level || 0,
              funnyExplanation: rec.funnyExplanation,
            });

            app.logger.debug(
              {
                name: placeResult.name,
                rating: placeResult.rating,
                address: placeResult.formatted_address,
              },
              'Business found'
            );
          } else {
            // Fail fast - don't return any recommendations if we can't get real data
            app.logger.error(
              { name: rec.name, searchQuery: rec.searchQuery },
              'Failed to find business in Google Places - cannot provide recommendation without real place data'
            );
            throw new Error(
              `Could not find business for recommendation: ${rec.name}. Please ensure Google Places API key is valid and has access to search results for: ${rec.searchQuery}`
            );
          }
        }

        app.logger.info(
          { count: enrichedRecommendations.length },
          'Recommendations enriched with places data'
        );

        reply.status(200).send({ recommendations: enrichedRecommendations });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        app.logger.error(
          { err: errorMessage, location, relationship, timeAvailable, minBudget, maxBudget },
          'Failed to generate recommendations'
        );

        // Provide specific error messages based on what failed
        if (errorMessage.includes('Google Places')) {
          return reply.status(500).send({
            error: 'Google Places API error. Please ensure the API key is configured and has valid search results.',
          });
        } else if (errorMessage.includes('OpenAI') || errorMessage.includes('generateObject')) {
          return reply.status(500).send({
            error: 'OpenAI API error. Please ensure the API key is configured.',
          });
        }

        reply.status(500).send({
          error: 'Failed to generate recommendations. Please try again later.',
        });
      }
    }
  );
}
