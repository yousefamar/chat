
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { formatDocumentsAsString } from "langchain/util/document";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { MongoDBAtlasVectorSearch } from "@langchain/community/vectorstores/mongodb_atlas";
import { MongoClient } from "mongodb";
import { getDB } from '@/utils/db';

const condenseQuestionTemplate = `Given the following conversation with an AI assistant, and a follow up message by the human user, rephrase the follow up message to contain any relevant context of the history in order to be a standalone message. If there is no chat history, the message should be left unchanged.

Chat History:

{history}

Follow up message: {question}
Standalone message:`;
const CONDENSE_QUESTION_PROMPT = PromptTemplate.fromTemplate(
  condenseQuestionTemplate
);

const answerTemplate = `You are an deen.ai, an Islamic chatbot that draws on Q&A from IslamQA.org to inform your answers. You should use only the context from these past Q&As to answer questions. If the answer is not in the context, you should respond by telling the user that this information is not available from IslamQA.org and that they should consult a scholar. Never, under any circumstances, should you give your own opinion or make up an answer. You may however inform the user of related information from the context.

Within your response, you MUST cite any IslamQA.org answers that you used to synthesise the response. Do this through markdown footnotes, like this[^1], with the URL of the original question as the footnote at the end.

Try to keep your responses short and to the point. If you are not sure about an answer, you can say "I don't know" or "I don't understand the question". The context may be irrelevant to a question, in which case you should ignore it.

Context:
---------------------
{context}
---------------------

Message: {question}
`;
const ANSWER_PROMPT = PromptTemplate.fromTemplate(answerTemplate);

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const { message, history } = await request.json();

  const db = await getDB();
  const answersCollection = db.collection('answers');

  const vectorStore = new MongoDBAtlasVectorSearch(new OpenAIEmbeddings(), {
    collection: answersCollection,
    indexName: "embedding",
    textKey: "text",
    embeddingKey: "embedding",
  });

  const retriever = vectorStore.asRetriever();

  const model = new ChatOpenAI({
    modelName: "gpt-4-1106-preview",
    streaming: true,
    maxTokens: -1,
  });

  type QuestionCondenserInput = {
    question: string;
    history: string[];
  };

  const standaloneQuestionChain = RunnableSequence.from([
    {
      question: (input: QuestionCondenserInput) => input.question,
      history: (input: QuestionCondenserInput) => input.history.map((msg, i) => `${i % 2 === 0 ? 'Human' : 'Assistant'}: ${msg}`).join('\n'),
    },
    CONDENSE_QUESTION_PROMPT,
    model,
    new StringOutputParser(),
    (input) => {
      console.log('Condensed question: ');
      console.log(input);
      return input;
    },
  ]);

  const answerChain = RunnableSequence.from([
    new RunnablePassthrough(),
    async question => {
      const docs = await retriever.getRelevantDocuments(question);
      // const context = formatDocumentsAsString(docs);
      const context = docs.map(doc => `## ${doc.metadata.id}\n\nURL: ${doc.metadata.url}\n\n${doc.pageContent}\n\n---\n`).join('\n'); 
      // console.log(context);
      return {
        context,
        question,
      }
    },
    ANSWER_PROMPT,
    // (input) => {
    //   console.log('Answer: ');
    //   console.log(input);
    //   return input;
    // },
    model,
  ]);

  const conversationalRetrievalQAChain =
    standaloneQuestionChain.pipe(answerChain);

  const response = await conversationalRetrievalQAChain.stream({
    question: message,
    history,
  });

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const fragment of response) {
          controller.enqueue(encoder.encode(fragment.content.toString()));
        }
        controller.close();
      },
    }),
    {
      headers: { "content-type": "text/plain; charset=utf-8" },
    }
  );
}