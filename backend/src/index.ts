import { createApplication } from "@specific-dev/framework";
import * as schema from './db/schema.js';
import * as recommendationsRoutes from './routes/recommendations.js';
import * as placesRoutes from './routes/places.js';

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
recommendationsRoutes.register(app, app.fastify);
placesRoutes.register(app, app.fastify);

await app.run();
app.logger.info('Application running');
