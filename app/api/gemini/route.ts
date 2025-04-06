import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-pro-exp-02-05",
    });

    const generationConfig = {
      temperature: 0.7,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: "text/plain",
    };

    const chatSession = model.startChat({
    });

    const streamResult = await chatSession.sendMessageStream(prompt);
    const encoder = new TextEncoder();
    let accumulatedText = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult.stream) {
            const text = chunk.text();
            if (text) {
              accumulatedText += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "content", content: text })}\n\n`)
              );
            }
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "final", content: accumulatedText })}\n\n`)
          );
          controller.close();
        } catch (error) {
           console.error("Streaming Error:", error);
           controller.error(error);
           controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Streaming failed" })}\n\n`)
            );
            controller.close();
        }
      },
       cancel(reason) {
         console.log("Stream cancelled:", reason);
       }
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Gemini API Setup Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to initialize stream", details: errorMessage },
      { status: 500 }
    );
  }
}

export const GET = () => {
  return NextResponse.json({ message: "Gemini API endpoint is active. Use POST to send prompts." });
};