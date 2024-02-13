import { MongoDBAtlasVectorSearch } from "@langchain/community/vectorstores/mongodb_atlas"
import { OpenAIEmbeddings } from "@langchain/openai";
import { MongoClient } from "mongodb";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv'
dotenv.config({
  path: '../../.env',
});

const lang = 'ar';

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

  let text;
  
  if (content.question)
    text = `### Question\n\n${content.question}\n\n\n### Answer\n\n${content.answer}`;
  else
    text = `### Title

${content.title}

### Metadata

Madhab: ${content.madhab ? `[${content.madhab}](${content.madhabURL})` : 'Unknown'}
Source: ${content.source ? `[${content.source}](${content.sourceURL})` : 'Unknown'}
Scholars:
${content.scholars && content.scholars.length > 0 ? content.scholars.map((s, i) => `- [${s}](${content.scholarURLs[i]})`).join('\n') : 'Unknown'}

### Content

${content.content}`;

  // truncate to 32k characters
  text = text.substring(0, 9000);
  const metadata = {
    id: content.id,
    url: content.url,
    // lang
  };

  if (content.question) {
    metadata.question = content.question;
    metadata.answer = content.answer;
  } else {
    metadata.title = content.title;
    metadata.madhab = content.madhab;
    metadata.madhabURL = content.madhabURL;
    metadata.source = content.source;
    metadata.sourceURL = content.sourceURL;
    metadata.scholars = content.scholars;
    metadata.scholarURLs = content.scholarURLs;
    metadata.content = content.content;
  }

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
  const dir = 'data/islamqa-org-' + lang;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    await processFile(path.join(dir, file), embeddings, answersCollection);
  }

  console.log("All files processed");
  await client.close();
}

main().catch(console.error);