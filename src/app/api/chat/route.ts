import fs from 'fs';
import path from 'path';
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
import { StreamingTextResponse } from 'ai';

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

  const root = process.cwd() + '/src/app/api/chat';
  const condenseQuestionPrompt = fs.readFileSync(path.join(root, 'condense-question-prompt.txt'), 'utf-8').trim();
  const ragPrompt = fs.readFileSync(path.join(root, 'rag-prompt.txt'), 'utf-8').trim();
  const translationPrompt = fs.readFileSync(path.join(root, 'translation-prompt.txt'), 'utf-8').trim();

  const standaloneQuestionChain = RunnableSequence.from([
    {
      question: (input: QuestionCondenserInput) => input.question,
      history: (input: QuestionCondenserInput) => input.history.map((msg, i) => `${i % 2 === 0 ? 'Human' : 'Assistant'}: ${msg}`).join('\n'),
    },
    PromptTemplate.fromTemplate(condenseQuestionPrompt),
    model,
    new StringOutputParser(),
  ]);

  const translationChain = RunnableSequence.from([
    {
      question: new RunnablePassthrough(),
    },
    PromptTemplate.fromTemplate(translationPrompt),
    model,
    new StringOutputParser(),
  ]);

  const answerChain = RunnableSequence.from([
    async (input: { originalQuestion: string, translatedQuestion: string }) => {
      const docs = await retriever.getRelevantDocuments(`${input.originalQuestion}\n\n${input.translatedQuestion}`);
      // const context = formatDocumentsAsString(docs);
      const context = docs.map(doc => `## ${doc.metadata.id}\n\nURL: ${doc.metadata.url}\n\n${doc.pageContent}\n\n---\n`).join('\n'); 
      // console.log(context);
      return {
        context,
        question: `${input.originalQuestion}`,
      }
    },
    PromptTemplate.fromTemplate(ragPrompt),
    // (input) => {
    //   console.log('Answer: ');
    //   console.log(input);
    //   return input;
    // },
    model,
  ]);

  const outputParser = new StringOutputParser();

  const conversationalRetrievalQAChain =
    answerChain
    .pipe(outputParser);
  
  const condensedQu = await standaloneQuestionChain.invoke({
    question: message,
    history
  });

  const translatedQu = await translationChain.invoke(condensedQu);

  const response = await conversationalRetrievalQAChain.stream({
    originalQuestion: message,
    translatedQuestion: translatedQu,
  });

  return new StreamingTextResponse(response);
}