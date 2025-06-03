export async function POST(req: Request) {
  const { prompt, voice }: { prompt: string; voice: 'male' | 'female' } = await req.json();
  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: voice === 'male' ? 'ash' : 'sage',
        modalities: ['audio', 'text'],
        instructions: prompt,
      }),
    });

    const data = await response.json();
    return Response.json(data);
  } catch (err) {
    console.error('Token Generation Error:', err);
    return Response.error();
  }
}
