import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { App } from '../index.js';

const autocompleteRequestSchema = z.object({
  input: z.string().min(1, 'Input is required'),
});

type AutocompleteRequest = z.infer<typeof autocompleteRequestSchema>;

interface GoogleAutocompleteResult {
  description: string;
  place_id: string;
}

interface GoogleAutocompleteResponse {
  predictions: GoogleAutocompleteResult[];
  status: string;
}

export async function register(app: App, fastify: FastifyInstance) {
  // Places Autocomplete endpoint
  fastify.post<{ Body: AutocompleteRequest }>(
    '/api/places/autocomplete',
    {
      schema: {
        description: 'Get autocomplete suggestions for locations',
        tags: ['places'],
        body: {
          type: 'object',
          required: ['input'],
          properties: {
            input: { type: 'string', description: 'Partial location input' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              predictions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    description: { type: 'string' },
                    placeId: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: AutocompleteRequest }>, reply: FastifyReply) => {
      const { input } = request.body;

      app.logger.info({ input }, 'Getting autocomplete suggestions');

      try {
        // Validate input
        const validInput = autocompleteRequestSchema.parse(request.body);

        const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

        if (!googleApiKey) {
          app.logger.warn('GOOGLE_PLACES_API_KEY not set, returning mock suggestions');

          // Mock data for development
          const mockPredictions = [
            {
              description: `${validInput.input}, California, USA`,
              placeId: `mock_place_${Math.random()}`,
            },
            {
              description: `${validInput.input}, Texas, USA`,
              placeId: `mock_place_${Math.random()}`,
            },
            {
              description: `${validInput.input}, New York, USA`,
              placeId: `mock_place_${Math.random()}`,
            },
          ];

          reply.status(200).send({ predictions: mockPredictions });
          return;
        }

        try {
          const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
          url.searchParams.set('input', validInput.input);
          url.searchParams.set('key', googleApiKey);
          url.searchParams.set('types', 'cities');
          url.searchParams.set('components', 'country:us');

          const response = await fetch(url.toString());

          if (!response.ok) {
            app.logger.error(
              { status: response.status, input: validInput.input },
              'Google Places API error'
            );
            return reply.status(500).send({ error: 'Failed to fetch suggestions' });
          }

          const data = (await response.json()) as GoogleAutocompleteResponse;

          if (data.status === 'OK') {
            const predictions = data.predictions.map((pred) => ({
              description: pred.description,
              placeId: pred.place_id,
            }));

            app.logger.info(
              { count: predictions.length, input: validInput.input },
              'Autocomplete suggestions retrieved'
            );

            reply.status(200).send({ predictions });
          } else if (data.status === 'ZERO_RESULTS') {
            app.logger.info({ input: validInput.input }, 'No autocomplete results found');
            reply.status(200).send({ predictions: [] });
          } else {
            app.logger.error(
              { status: data.status, input: validInput.input },
              'Google Places API error'
            );
            reply.status(500).send({ error: `API error: ${data.status}` });
          }
        } catch (fetchError) {
          app.logger.error(
            { err: fetchError, input: validInput.input },
            'Error calling Google Places API'
          );
          reply.status(500).send({ error: 'Failed to fetch suggestions' });
        }
      } catch (error) {
        app.logger.error({ err: error, input: request.body.input }, 'Autocomplete validation failed');
        reply.status(400).send({ error: 'Invalid input' });
      }
    }
  );

  // Photo endpoint - returns the URL to proxy the image
  fastify.get<{ Params: { photoReference: string } }>(
    '/api/places/photo/:photoReference',
    {
      schema: {
        description: 'Get photo from Google Places',
        tags: ['places'],
        params: {
          type: 'object',
          properties: {
            photoReference: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              url: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { photoReference: string } }>, reply: FastifyReply) => {
      const { photoReference } = request.params;

      app.logger.info({ photoReference }, 'Fetching place photo');

      try {
        const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

        if (!googleApiKey) {
          app.logger.warn('GOOGLE_PLACES_API_KEY not set, returning placeholder');
          return reply.status(200).send({
            url: 'https://via.placeholder.com/400x300?text=Photo+Not+Available',
          });
        }

        const photoUrl = new URL('https://maps.googleapis.com/maps/api/place/photo');
        photoUrl.searchParams.set('maxwidth', '400');
        photoUrl.searchParams.set('photoreference', photoReference);
        photoUrl.searchParams.set('key', googleApiKey);

        app.logger.info({ photoReference }, 'Photo URL constructed');

        reply.status(200).send({ url: photoUrl.toString() });
      } catch (error) {
        app.logger.error({ err: error, photoReference }, 'Failed to process photo request');
        reply.status(500).send({ error: 'Failed to process photo request' });
      }
    }
  );
}
