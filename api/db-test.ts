import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await sql`SELECT NOW() as time, version() as version`;
    res.status(200).json({
      success: true,
      message: 'Sambungan Neon berjaya!',
      data: result[0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
}
