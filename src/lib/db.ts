import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

// Initialize Neon client only if connection string is provided, ensuring robust static builds.
export const sql = databaseUrl ? neon(databaseUrl) : null;
