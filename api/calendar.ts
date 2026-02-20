import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Create table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id        SERIAL PRIMARY KEY,
        title     VARCHAR(500) NOT NULL,
        event_date DATE NOT NULL,
        type      VARCHAR(50) DEFAULT 'event',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // ── Auto-delete events older than 2 months ──────────────────────────────
    // Runs on every request so cleanup happens passively without a cron job
    await sql`
      DELETE FROM calendar_events
      WHERE event_date < CURRENT_DATE - INTERVAL '2 months'
    `;

    // ── GET — return all events ─────────────────────────────────────────────
    if (req.method === 'GET') {
      const events = await sql`
        SELECT id, title, event_date, type
        FROM calendar_events
        ORDER BY event_date ASC
      `;
      return res.status(200).json({ success: true, data: events });
    }

    // ── POST — insert or update ─────────────────────────────────────────────
    if (req.method === 'POST') {
      const { id, title, event_date, type } = req.body;

      if (!title || !event_date) {
        return res.status(400).json({ success: false, error: 'title dan event_date diperlukan' });
      }

      let result;
      if (id) {
        // Update existing
        result = await sql`
          UPDATE calendar_events
          SET title = ${title}, event_date = ${event_date}, type = ${type ?? 'event'}
          WHERE id = ${Number(id)}
          RETURNING id, title, event_date, type
        `;
      } else {
        // Insert new
        result = await sql`
          INSERT INTO calendar_events (title, event_date, type)
          VALUES (${title}, ${event_date}, ${type ?? 'event'})
          RETURNING id, title, event_date, type
        `;
      }

      return res.status(200).json({ success: true, data: result[0] });
    }

    // ── DELETE — remove by id ───────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, error: 'id diperlukan' });

      await sql`DELETE FROM calendar_events WHERE id = ${Number(id)}`;
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ success: false, error: `Method ${req.method} tidak dibenarkan` });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
}
