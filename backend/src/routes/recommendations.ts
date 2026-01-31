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
    console.warn('GOOGLE_PLACES_API_KEY not set, returning mock data');
    return {
      name: 'The Quirky Café',
      place_id: 'mock_place_id_001',
      formatted_address: '123 Main St, ' + location,
      rating: 4.5,
      price_level: 2,
      photos: [{ photo_reference: 'mock_photo_001' }],
    };
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
      console.error(`Google Places API error: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as GooglePlacesSearchResponse;

    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0];
    }

    return null;
  } catch (error) {
    console.error('Error searching Google Places:', error);
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

  // Define fallback queries based on common business types
  const fallbackQueries: { [key: string]: string[] } = {
    'escape room': ['entertainment venue', 'attraction'],
    'karaoke bar': ['bar', 'entertainment'],
    'pottery studio': ['art studio', 'creative space', 'hobby shop'],
    'cooking class': ['culinary school', 'kitchen store', 'restaurant'],
    'painting class': ['art studio', 'art gallery', 'creative space'],
    'arcade': ['entertainment venue', 'game center'],
    'bowling alley': ['recreation center', 'entertainment'],
    'mini golf': ['golf course', 'recreation center'],
    'comedy club': ['bar', 'entertainment venue', 'nightlife'],
    'museum': ['attraction', 'cultural center'],
    'bookstore': ['book store', 'library', 'shop'],
    'antique shop': ['thrift store', 'vintage shop', 'shop'],
    'yoga studio': ['fitness center', 'wellness center', 'gym'],
    'dance studio': ['fitness center', 'entertainment venue'],
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

  // Try generic fallback for any query type
  if (fallbacks.length === 0) {
    fallbacks = ['restaurant', 'cafe', 'bar'];
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

  // Final fallback: search for restaurants in the location
  logger.debug('All specific searches failed, trying generic restaurant search');
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

        const prompt = `Generate 3 funny, unexpected, and highly-creative Valentine's Day date recommendations.

Context:
- Location: ${validInput.location}
- Relationship Type: ${relationshipContext[validInput.relationship]}
- Time Available: ${validInput.timeAvailable}
- Budget Range: $${validInput.minBudget} - $${validInput.maxBudget}

CRITICAL REQUIREMENT:
- EXACTLY ONE of the 3 recommendations MUST be a restaurant (unexpected, quirky, or unique - NOT a typical romantic restaurant)
- The other 2 recommendations can be any other type of activity or venue
- Restaurant examples: 24-hour diner, food truck park, hole-in-the-wall taco joint, all-you-can-eat buffet, themed restaurant, gas station with good food, dive bar with food, ethnic hole-in-the-wall spots, cafeteria, food court, street food vendor, casual eatery

Requirements:
1. Each recommendation should be humorous and unexpected - avoid clichés
2. Suggest actual business types or venues that could exist in any city
3. Make sure each recommendation fits the time constraint and budget
4. Each should include a witty, humorous description
5. The restaurant recommendation must have a searchQuery that includes "restaurant" or a specific cuisine type to ensure Google Places returns actual restaurants

CRITICAL INSTRUCTION FOR SEARCHQUERY:
The searchQuery MUST be a GENERIC, SEARCHABLE business category that Google Places can find. This is not creative - be simple and direct:
- Instead of "The Valentine's Thrift-to-Drip Fashion Show", use searchQuery: "thrift store" or "vintage clothing store"
- Instead of "Apocalypse Preparedness Store", use searchQuery: "outdoor gear store" or "sporting goods store"
- Instead of "Neon Karaoke Booth", use searchQuery: "karaoke bar"
- Instead of "Botanical Garden Cocktail Bar", use searchQuery: "bar with plants" or "lounge" or "bar"

The NAME and DESCRIPTION can be creative and funny, but searchQuery must be a real, generic business type that exists in Google Places.

For each recommendation, provide:
- name: A creative, funny name or description of a business/venue type
- description: A witty, humorous description of why this would be a great (and funny) date
- searchQuery: ONLY a simple, generic business category/type. Be literal and searchable.
  * For restaurant: "pizza restaurant", "taco restaurant", "diner", "food truck", "Thai restaurant", "BBQ restaurant", "seafood restaurant"
  * For activities: "escape room", "bowling alley", "mini golf", "arcade", "pottery studio", "cooking class", "painting class", "karaoke bar", "comedy club", "museum", "bookstore", "antique shop", "art gallery", "yoga studio", "dance studio"
- funnyExplanation: A short (1-2 sentences) explanation of why this activity is funny, unexpected, or ironic for a Valentine's date

Examples of how to structure recommendations:
- Name: "The Questionable Diner", searchQuery: "diner", description: "24-hour breakfast spot", funnyExplanation: "Nothing says romance like discussing your life over questionable pancakes at 2 AM"
- Name: "Food Truck Roulette", searchQuery: "food truck", description: "Mystery meat on wheels", funnyExplanation: "Who needs a fancy restaurant when you can eat standing up in a parking lot?"
- Name: "Pottery Disaster", searchQuery: "pottery studio", description: "Get messy with clay", funnyExplanation: "Expect hilarious results and clay under your fingernails"
- Name: "Escape or Die Trying", searchQuery: "escape room", description: "Solve puzzles to escape", funnyExplanation: "Test your relationship by being locked in a room together"
- Name: "Vintage Junk Hunter", searchQuery: "antique shop", description: "Hunt for weird old stuff", funnyExplanation: "Find treasures someone else threw away decades ago"`;

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

          // Use retry logic to find real place data
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

            app.logger.info(
              {
                aiName: rec.name,
                googleName: placeResult.name,
                rating: placeResult.rating,
                address: placeResult.formatted_address,
                dataSource: 'REAL_PLACE_DATA',
              },
              'Business enriched with real Google Places data'
            );
          } else {
            app.logger.error(
              { name: rec.name, searchQuery: rec.searchQuery },
              'Failed to find business in Google Places even with retry attempts - using AI name only'
            );

            // Ultimate fallback: use AI name with location, but no real rating/photo
            enrichedRecommendations.push({
              name: rec.name,
              description: rec.description,
              placeId: `fallback_${Date.now()}_${Math.random()}`,
              address: validInput.location,
              rating: 0,
              photoUrl: 'https://via.placeholder.com/400x300?text=Recommendation',
              priceLevel: 0,
              funnyExplanation: rec.funnyExplanation,
            });

            app.logger.warn(
              { name: rec.name, searchQuery: rec.searchQuery },
              'Using fallback data - could not find in Google Places'
            );
          }
        }

        app.logger.info(
          { count: enrichedRecommendations.length },
          'Recommendations enriched with places data'
        );

        reply.status(200).send({ recommendations: enrichedRecommendations });
      } catch (error) {
        app.logger.error(
          { err: error, location, relationship, timeAvailable, minBudget, maxBudget },
          'Failed to generate recommendations'
        );
        reply.status(500).send({ error: 'Failed to generate recommendations' });
      }
    }
  );
}
