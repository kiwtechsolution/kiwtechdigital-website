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

      const remRes = await fetch(
        `${SUPABASE_URL}/rest/v1/reminders?select=*&order=created_at.desc`,
        { headers }
      );
      const reminders = await remRes.json();

      const sRes = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=key,value`, { headers });
      const sData = await sRes.json();
      let whatsapp = '';
      let openaiKeySet = false;
      (sData || []).forEach((row) => {
        if (row.key === 'whatsapp_number') whatsapp = row.value;
        if (row.key === 'openai_api_key' && row.value) openaiKeySet = true;
      });

      return res.status(200).json({
        leads: Array.isArray(leads) ? leads : [],
        reminders: Array.isArray(reminders) ? reminders : [],
        whatsapp,
        openaiKeySet
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to load data', detail: String(err) });
    }
  }

  if (req.method === 'POST') {
    const { action, value, id } = req.body || {};

    if (action === 'set_whatsapp') {
      if (!value || !/^\d{10,15}$/.test(value)) {
        return res.status(400).json({ error: 'Enter a valid number with country code, digits only (e.g. 919811506015)' });
      }
      await upsertSetting(SUPABASE_URL, headers, 'whatsapp_number', value);
      return res.status(200).json({ ok: true });
    }

    if (action === 'set_openai_key') {
      if (!value || value.length < 10) {
        return res.status(400).json({ error: 'Enter a valid OpenAI API key' });
      }
      await upsertSetting(SUPABASE_URL, headers, 'openai_api_key', value);
      return res.status(200).json({ ok: true });
    }

    if (action === 'mark_reminder_done') {
      if (!id) return res.status(400).json({ error: 'Missing reminder id' });
      await fetch(`${SUPABASE_URL}/rest/v1/reminders?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ done: true })
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function upsertSetting(SUPABASE_URL, headers, key, value) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.${key}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ value })
  });
  const data = await r.json().catch(() => []);
  if (!Array.isArray(data) || data.length === 0) {
    await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify([{ key, value }])
    });
  }
}
