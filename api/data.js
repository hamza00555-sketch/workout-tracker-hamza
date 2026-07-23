export default async function handler(req, res) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'x-api-key',
  };

  for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (req.headers['x-api-key'] !== process.env.RATEBI_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const upstashRes = await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/get/ratebi:snapshot`,
    {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
    }
  );

  if (!upstashRes.ok) {
    return res.status(500).json({ error: 'Storage read failed' });
  }

  const { result } = await upstashRes.json();
  if (!result) return res.status(404).json({ error: 'No data synced yet' });

  return res.status(200).json(JSON.parse(result));
}
