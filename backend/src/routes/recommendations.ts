import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { gateway } from '@specific-dev/framework';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { App } from '../index.js';

const recommendationRequestSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  relationship: z.enum(['single', 'relationship', 'family']),
  timeAvailable: z.enum(['0-2 hours', '2-4 hours', 'full day']),
  budget: z.number().min(0).max(500),
});

const recommendationSchema = z.object({
  name: z.string().describe('Business name'),
  description: z.string().describe('Witty, humorous description of the recommendation'),
  searchQuery: z.string().describe('Query to search for this business on Google Places'),
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
}

async function searchGooglePlaces(
  query: string,
  location: string,
  budget: number
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

export async function register(app: App, fastify: FastifyInstance) {
  fastify.post<{ Body: RecommendationRequest }>(
    '/api/recommendations',
    {
      schema: {
        description: 'Get creative Valentine date recommendations',
        tags: ['recommendations'],
        body: {
          type: 'object',
          required: ['location', 'relationship', 'timeAvailable', 'budget'],
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
            budget: {
              type: 'number',
              description: 'Budget in dollars (0-500)',
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
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: RecommendationRequest }>, reply: FastifyReply) => {
      const { location, relationship, timeAvailable, budget } = request.body;

      app.logger.info(
        { location, relationship, timeAvailable, budget },
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
- Budget: $${validInput.budget}

Requirements:
1. Each recommendation should be humorous and unexpected - avoid clichés
2. Suggest actual business types or venues that could exist in any city
3. Include specific types of businesses (restaurants, museums, parks, etc.)
4. Make sure each recommendation fits the time constraint and budget
5. Each should include a witty, humorous description

For each recommendation, provide:
- name: A creative, specific type of business or venue
- description: A witty, humorous description of why this would be a great (and funny) date
- searchQuery: A simple Google Places search query to find this type of business in the area (e.g., "pizza restaurant", "vintage bookstore", "escape room")

Examples of funny, unexpected venues: quirky museums, unusual restaurants, vintage shops, hidden parks, food truck parks, comedy clubs, axe throwing venues, pottery studios, karaoke bars, plant nurseries, board game cafés, etc.`;

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
          app.logger.debug(
            { name: rec.name, searchQuery: rec.searchQuery },
            'Searching for business'
          );

          const placeResult = await searchGooglePlaces(rec.searchQuery, validInput.location, validInput.budget);

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
            // Fallback if Google Places search fails
            enrichedRecommendations.push({
              name: rec.name,
              description: rec.description,
              placeId: `fallback_${Date.now()}_${Math.random()}`,
              address: validInput.location,
              rating: 0,
              photoUrl: 'https://via.placeholder.com/400x300?text=Recommendation',
              priceLevel: 0,
            });

            app.logger.warn({ name: rec.name }, 'Using fallback data for recommendation');
          }
        }

        app.logger.info(
          { count: enrichedRecommendations.length },
          'Recommendations enriched with places data'
        );

        reply.status(200).send({ recommendations: enrichedRecommendations });
      } catch (error) {
        app.logger.error(
          { err: error, location, relationship, timeAvailable, budget },
          'Failed to generate recommendations'
        );
        reply.status(500).send({ error: 'Failed to generate recommendations' });
      }
    }
  );
}
