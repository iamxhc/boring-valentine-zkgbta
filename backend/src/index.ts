import { createApplication } from "@specific-dev/framework";
import * as schema from './db/schema.js';
import * as recommendationsRoutes from './routes/recommendations.js';
import * as placesRoutes from './routes/places.js';

// Load environment variables from .env.local if it exists
if (process.env.NODE_ENV !== 'production') {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const envPath = path.resolve('.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=').trim();
          if (key && !process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch (error) {
    // Silently fail if .env.local doesn't exist or can't be read
  }
}

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
