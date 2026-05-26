import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

try {
  const models = await genAI.listModels();
  console.log('Available Gemini models:');
  for (const model of models) {
    console.log(`- ${model.name}`);
  }
} catch (error) {
  console.error('Error listing models:', error.message);
}
