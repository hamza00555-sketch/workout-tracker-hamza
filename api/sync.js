export default async function handler(req, res) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  };

  for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (req.headers['x-api-key'] !== process.env.RATEBI_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const syncedAt = new Date().toISOString();
  const snapshot = JSON.stringify({ ...req.body, syncedAt });

  const upstashRes = await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/set/ratebi:snapshot`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(snapshot),
    }
  );

  if (!upstashRes.ok) {
    return res.status(500).json({ error: 'Storage write failed' });
  }

  return res.status(200).json({ ok: true, syncedAt });
}
