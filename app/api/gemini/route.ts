import { GoogleGenerativeAI, GenerateContentResponse } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro-exp-03-25",
    });

    const generationConfig = {
      temperature: 0.6,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 65536,
      responseMimeType: "text/plain",
    };

    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    // Properly type the stream result
    const streamResult = await chatSession.sendMessageStream(prompt);
    const encoder = new TextEncoder();
    let finalText = "";

    const thinkingMessages = ["think out loud", "almost done", ":wait"];

    const readableStream = new ReadableStream({
      async start(controller) {
        // Send initial thinking messages
        for (const message of thinkingMessages) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "thinking", content: message })}\n\n`)
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Iterate over the stream using for await...of
        for await (const chunk of streamResult.stream) {
          const text = chunk.text();
          finalText += text;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "content", content: text })}\n\n`)
          );
        }

        // Send final result
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "final", content: finalText })}\n\n`)
        );
        controller.close();
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate content", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export const GET = () => {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
};