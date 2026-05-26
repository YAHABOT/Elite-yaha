import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

try {
  console.log('Testing gemini-3.1-flash-lite...');
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
  const result = await model.generateContent('I went for a 30 minute run today. Please extract the health data.');
  const response = await result.response;
  const text = response.text();
  console.log('✓ SUCCESS! Model works!');
  console.log('Response:', text.substring(0, 200));
} catch (error) {
  console.log('✗ FAILED:', error.message);
}
