
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const { message } = await request.json();

  const prompt = ChatPromptTemplate.fromMessages([
    ["human", message],
  ]);
  const model = new ChatOpenAI({
    streaming: true,
  });
  const outputParser = new StringOutputParser();

  const chain = prompt.pipe(model).pipe(outputParser);

  const response = await chain.stream({
    // topic: "ice cream",
  });

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const fragment of response) {
          console.log(fragment);
          controller.enqueue(encoder.encode(fragment));
        }
        controller.close();
      },
    }),
    {
      headers: { "content-type": "text/plain; charset=utf-8" },
    }
  );
}