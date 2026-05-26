import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}

const models = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash-001',
  'gemini-1.5-pro-001',
];

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
  try {
    console.log(`Testing ${modelName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Hello, world!');
    const response = await result.response;
    const text = response.text();
    console.log(`✓ ${modelName} works! Response: ${text.substring(0, 50)}...`);
    return true;
  } catch (error) {
    console.log(`✗ ${modelName} failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Testing Gemini models...\n');
  for (const model of models) {
    await testModel(model);
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

main().catch(console.error);
