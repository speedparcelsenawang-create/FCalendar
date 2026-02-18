import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Neon serverless SQL client
// Hanya gunakan ini dalam API routes (server-side), BUKAN dalam React components
export const sql = neon(process.env.DATABASE_URL);
