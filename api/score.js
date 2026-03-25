export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim().length < 3) {
    return res.status(400).json({ error: 'Question required' });
  }

  const prompt = `You are a semantic scoring system for a visualization called Murmuration. Score the following question across seven dimensions. Return ONLY a JSON object — no markdown, no explanation, nothing else.

Dimensions (score each 0.0 to 1.0):
- threshold: questions about becoming, edges, the moment a quantity becomes a quality, crossing, emergence, the instant before or after
- interiority: questions about consciousness, selfhood, inner experience, what it is like to be something, identity, continuity of self
- deep_time: questions about geological or evolutionary scale, ecology, non-human intelligence, deep history, the pre-linguistic universe
- form: questions about structure, pattern, elegance, mathematics, music, the relationship between form and meaning, repetition
- absence: questions about endings, what remains, traces, loss, the dried river, what persists after something stops
- particular: questions about irreducible specific instances, the horizon, tenderness, what resists abstraction, the edge of a thing
- routine: questions about productivity, scheduling, logistics, administrative tasks, everyday practical concerns

Score honestly. Most questions will score high on one or two dimensions and low on others. A truly philosophical question about consciousness should score near 0 on routine. A question about spreadsheets should score near 0 on everything except routine.

Question: "${question.trim()}"

Respond with exactly this JSON:
{"threshold":0.0,"interiority":0.0,"deep_time":0.0,"form":0.0,"absence":0.0,"particular":0.0,"routine":0.0}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content.find(b => b.type === 'text')?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    const scores = JSON.parse(clean);

    const d = [
      Math.max(0, Math.min(1, scores.threshold || 0)),
      Math.max(0, Math.min(1, scores.interiority || 0)),
      Math.max(0, Math.min(1, scores.deep_time || 0)),
      Math.max(0, Math.min(1, scores.form || 0)),
      Math.max(0, Math.min(1, scores.absence || 0)),
      Math.max(0, Math.min(1, scores.particular || 0)),
      Math.max(0, Math.min(1, scores.routine || 0)),
    ];

    return res.status(200).json({ d });
  } catch (err) {
    console.error('Score error:', err);
    return res.status(500).json({ error: 'Scoring failed' });
  }
}
