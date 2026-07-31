export default async function handler(req, res) {
  const password = req.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json'
  };

  if (req.method === 'GET') {
    try {
      const leadsRes = await fetch(`${SUPABASE_URL}/rest/v1/enquiries?select=*&order=created_at.desc`, { headers });
      const leads = await leadsRes.json();

      const wRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.whatsapp_number&select=value`, { headers });
      const wData = await wRes.json();
      const whatsapp = (wData && wData[0] && wData[0].value) || '';

      return res.status(200).json({ leads, whatsapp });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to load data', detail: String(err) });
    }
  }

  if (req.method === 'POST') {
    const { whatsapp } = req.body || {};
    if (!whatsapp || !/^\d{10,15}$/.test(whatsapp)) {
      return res.status(400).json({ error: 'Enter a valid number with country code, digits only (e.g. 919811506015)' });
    }
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.whatsapp_number`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ value: whatsapp })
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update', detail: String(err) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
