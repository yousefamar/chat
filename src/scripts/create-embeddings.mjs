import { MongoDBAtlasVectorSearch } from "@langchain/community/vectorstores/mongodb_atlas"
import { OpenAIEmbeddings } from "@langchain/openai";
import { MongoClient } from "mongodb";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv'
dotenv.config({
  path: '../../.env',
});

const client = new MongoClient('mongodb+srv://islamqa:' + process.env.DB_PASS + '@amar.u9niace.mongodb.net');

async function processFile(file, embeddings, collection) {
  const content = JSON.parse(fs.readFileSync(file, 'utf-8'));

  // if (content.id.charAt(0).toLowerCase() < 'w') {
  //   console.log(`Skipping file: ${file}`);
  //   return;
  // }
  
  // check if already processed (id in mongo)
  const doc = await collection.findOne({ id: content.id });
  if (doc) {
    console.log(`Article ${content.id} already processed`);
    return;
  }

  let text = `### Question\n\n${content.question}\n\n\n### Answer\n\n${content.answer}`;
  // truncate to 32k characters
  text = text.substring(0, 3000);
  const metadata = { id: content.id, url: content.url, question: content.question, answer: content.answer };

  console.log(`Processing file: ${file}`);
  await MongoDBAtlasVectorSearch.fromTexts(
    [text],
    [metadata],
    embeddings,
    {
      collection,
      indexName: "embedding",
      textKey: "text",
      embeddingKey: "embedding",
    }
  );
}

async function main() {
  await client.connect();
  const db = client.db('islamqa');
  const answersCollection = db.collection('answers');
  console.log("Connected to MongoDB");

  const embeddings = new OpenAIEmbeddings();
  const dir = 'islamqa';
  const files = fs.readdirSync(dir);

  for (const file of files) {
    await processFile(path.join(dir, file), embeddings, answersCollection);
  }

  console.log("All files processed");
  await client.close();
}

main().catch(console.error);