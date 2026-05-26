import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const key = process.env.GEMINI_API_KEY;
console.log('Key exists:', !!key);
if (!key) process.exit(1);

const genAI = new GoogleGenerativeAI(key);

async function test() {
  const models = ['gemini-3.1-flash-lite-preview'];
  for (const modelName of models) {
    try {
      console.log(`Testing model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("hello");
      console.log(`✅ ${modelName} works!`);
      console.log('Response:', result.response.text());
    } catch (e: any) {
      console.log(`❌ ${modelName} failed:`, e.message);
    }
  }
}

test();
