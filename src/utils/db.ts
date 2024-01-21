import * as dotenv from 'dotenv';
dotenv.config();
import { Db, MongoClient } from 'mongodb';

let db: Db;

async function connectDB() {
  const client = new MongoClient('mongodb+srv://islamqa:' + process.env.DB_PASS + '@amar.u9niace.mongodb.net');
  await client.connect();
  db = client.db('islamqa');
}

export async function getDB() {
  if (!db) await connectDB();
  return db;
}