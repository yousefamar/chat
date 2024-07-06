import fs from 'fs';
import path from 'path';
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatVertexAI } from "@langchain/google-vertexai";
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
import { StringPromptValue } from 'langchain/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { log, error } from '@/utils/logging';

const serviceAccount = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'service-account.json'), 'utf-8'));

const safetySettings = [
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_ONLY_HIGH",
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_ONLY_HIGH",
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_ONLY_HIGH",
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_ONLY_HIGH",
  },
];

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

  // const fastModel = new ChatVertexAI({
  //   model: "gemini-1.5-flash-001",
  //   authOptions: { credentials: serviceAccount },
  //   safetySettings,
  // }) as any;

  const model = new ChatVertexAI({
    model: "gemini-1.5-pro-001",
    // model: "claude-3-5-sonnet@20240620",
    authOptions: { credentials: serviceAccount },
    safetySettings,
  }) as any;

  const fastModel = model;

  type QuestionCondenserInput = {
    question: string;
    history: string[];
  };

  const root = process.cwd() + '/src/app/api/chat';
  const condenseQuestionPrompt = fs.readFileSync(path.join(root, 'condense-question-prompt.txt'), 'utf-8').trim();
  const systemPrompt = fs.readFileSync(path.join(root, 'system-prompt.txt'), 'utf-8').trim();
  const ragPrompt = fs.readFileSync(path.join(root, 'rag-prompt.txt'), 'utf-8').trim();
  const translationPrompt = fs.readFileSync(path.join(root, 'translation-prompt.txt'), 'utf-8').trim();

  const standaloneQuestionChain = RunnableSequence.from([
    {
      question: (input: QuestionCondenserInput) => input.question,
      history: (input: QuestionCondenserInput) => input.history.map((msg, i) => `${i % 2 === 0 ? 'Human' : 'Assistant'}: ${msg}`).join('\n'),
    },
    async (input: QuestionCondenserInput) => {
      const sys = await PromptTemplate.fromTemplate(condenseQuestionPrompt).format({
        history: input.history,
      });

      return [
        ['system', sys],
        ['human', `Chat History:\n\n${input.history}\n\n\nMessage to rephrase:\n\n${input.question}`],
      ];
    },
    fastModel,
    new StringOutputParser(),
  ]);

  const translationChain = RunnableSequence.from([
    async (input: string) => [
      ['system', translationPrompt],
      ['human', input],
    ],
    fastModel,
    // async (input) => {
    //   console.log('Translation: ');
    //   console.log(input);
    //   return input;
    // },
    new JsonOutputParser(),
  ]);

  const answerChain = RunnableSequence.from([
    async (input: {
      originalQuestion: string,
      condensedQuestion: string,
      translatedCondensedQuestion: string,
      history: string[],
    }) => {
      const docs = await retriever.getRelevantDocuments(`${input.originalQuestion}\n\n${input.translatedCondensedQuestion}`);
      // const context = formatDocumentsAsString(docs);
      const context = docs.map(doc => `## ${doc.metadata.id}\n\nURL: ${doc.metadata.url}\n\n${doc.pageContent}\n\n---\n`).join('\n'); 

      log({
        ...input,
        context,
      });

      const ragContext = await PromptTemplate.fromTemplate(ragPrompt).format({
        context: context,
      });

      const _history = history.map((msg: string, i: number) => [ i % 2 === 0 ? 'human' : 'assistant', msg ]);

      return [
        ['system', systemPrompt + '\n\n' + ragContext],
        ..._history,
        ['human', input.originalQuestion],
      ];
    },
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

  const translatedQuObj = await translationChain.invoke(message) as { translation: string };

  const response = await conversationalRetrievalQAChain.stream({
    originalQuestion: message,
    condensedQuestion: condensedQu,
    translatedCondensedQuestion: translatedQuObj.translation,
    history,
  });

  return new StreamingTextResponse(response);
}