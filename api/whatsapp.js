export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(200).json({ number: '919811506015' });
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.whatsapp_number&select=value`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    });
    const data = await r.json();
    const number = (data && data[0] && data[0].value) || '919811506015';
    return res.status(200).json({ number });
  } catch (err) {
    return res.status(200).json({ number: '919811506015' });
  }
}
