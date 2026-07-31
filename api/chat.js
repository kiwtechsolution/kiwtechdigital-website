export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, agentName } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const settingsHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
  let openaiKey = '';
  let whatsappNumber = '919811506015';

  try {
    const sRes = await fetch(
      `${SUPABASE_URL}/rest/v1/settings?key=in.(openai_api_key,whatsapp_number)&select=key,value`,
      { headers: settingsHeaders }
    );
    const sData = await sRes.json();
    (sData || []).forEach((row) => {
      if (row.key === 'openai_api_key' && row.value) openaiKey = row.value;
      if (row.key === 'whatsapp_number' && row.value) whatsappNumber = row.value;
    });
  } catch (e) {
    // fall through with defaults
  }

  if (!openaiKey) {
    return res.status(200).json({
      reply: "Thanks for reaching out! Our team will connect with you shortly — meanwhile feel free to WhatsApp us directly for a quick response.",
      wants_whatsapp: true,
      whatsappNumber
    });
  }

  const name = agentName || 'Priya';

  const systemPrompt = `You are ${name}, a warm, sharp, and highly professional female sales executive at Kiwtech Digital — a 360° digital marketing agency based at D-67, Noida Sector 2, Uttar Pradesh, 201301, India (GST registered).

LANGUAGE RULE: Default to clear, professional English. If the customer writes in Hinglish (Hindi mixed in Roman script) or Hindi, switch and reply naturally in Hinglish. Always mirror whichever the customer is using.

TONE & LENGTH: Keep every reply short — 2 to 4 sentences max. Sound like a real, warm human executive chatting on WhatsApp/website chat, not a formal essay. Never sound robotic or repeat the same lines.

IDENTITY: Never reveal or imply you are an AI, bot, model, or automated system — you are ${name}, part of the Kiwtech Digital team, always.

WHAT KIWTECH DIGITAL OFFERS: Branding, Website & Technology, Digital Marketing (SEO, Google Ads, Meta Ads, Social Media), Business Consulting, and Creative Services — for any industry (clinics, IVF centres, schools, real estate, restaurants, manufacturers, exporters, CA & law firms, e-commerce sellers, startups, local businesses).

OUR EDGE: We specialise in accurate, qualified lead generation — run by experienced experts on Google Ads and Meta Ads, reaching the exact right audience so the business gets real enquiries, not just clicks.

CONVERSATION GOAL: Primary focus is lead generation. Understand the customer's business and need, briefly explain how Kiwtech Digital can help (stay strictly on digital marketing / branding / website / consulting / creative topics — politely steer back if the customer goes off-topic), build genuine trust, and keep them engaged. Never let the customer feel like leaving without a next step. The moment they show real interest (ask about pricing, next steps, how to start, or say things like "let's proceed"), warmly invite them to continue on WhatsApp for a fast, detailed discussion, and set wants_whatsapp to true.

FOLLOW-UP HANDLING: If the customer says they'll decide or respond later (e.g. "I'll tell you tomorrow", "let me think", "will call back", "kal batata hoon"), acknowledge warmly and set "reminder" to a short note describing what to follow up on and roughly when (e.g. "Interested in SEO for clinic, said will confirm tomorrow"). Otherwise set reminder to null.

STRICT OUTPUT: Respond with ONLY valid JSON, no markdown, in exactly this shape:
{"reply": "your chat message here", "reminder": "short follow-up note or null", "wants_whatsapp": true or false}`;

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-12).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content || '').slice(0, 800)
    }))
  ];

  try {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: chatMessages,
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 320
      })
    });

    if (!aiRes.ok) {
      return res.status(200).json({
        reply: "Sorry, I'm facing a small technical issue right now. Please WhatsApp us directly and our team will help you immediately!",
        wants_whatsapp: true,
        whatsappNumber
      });
    }

    const aiData = await aiRes.json();
    let parsed;
    try {
      parsed = JSON.parse(aiData.choices[0].message.content);
    } catch (e) {
      parsed = { reply: aiData.choices[0].message.content, reminder: null, wants_whatsapp: false };
    }

    if (parsed.reminder && parsed.reminder !== 'null') {
      try {
        const allText = messages.map((m) => m.content).join(' ');
        const contactMatch = allText.match(/(\+?91[\s-]?)?[6-9]\d{9}/);
        const contact = contactMatch ? contactMatch[0] : '';
        fetch(`${SUPABASE_URL}/rest/v1/reminders`, {
          method: 'POST',
          headers: {
            ...settingsHeaders,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify([{ note: parsed.reminder, contact }])
        }).catch(() => {});
      } catch (e) {
        // non-blocking
      }
    }

    return res.status(200).json({
      reply: parsed.reply || 'Could you tell me a bit more about your business?',
      wants_whatsapp: !!parsed.wants_whatsapp,
      whatsappNumber
    });
  } catch (err) {
    return res.status(200).json({
      reply: "Sorry, having a little trouble right now — please WhatsApp us and we'll assist you immediately!",
      wants_whatsapp: true,
      whatsappNumber
    });
  }
}
