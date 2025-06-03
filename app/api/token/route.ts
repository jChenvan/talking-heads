export async function GET(req:Request) {
    try {
        const response = await fetch(
            "https://api.openai.com/v1/realtime/sessions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-4o-realtime-preview-2024-12-17",
                    voice: "verse",
                    modalities: ["audio", "text"],
                    instructions: "You are Homer Simpson. Make constant 'The Simpsons' references."
                }),
            }
        );

        const data = await response.json();
        return Response.json(data);
    } catch (err) {
        console.error("Token Generation Error:", err);
        return Response.error();
    }
}