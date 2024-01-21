
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { StreamingTextResponse } from 'ai';

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

  return new StreamingTextResponse(response);
}