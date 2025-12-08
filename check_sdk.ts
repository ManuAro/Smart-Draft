import OpenAI from 'openai';
const client = new OpenAI({ apiKey: 'test' });
console.log('client.responses:', !!client.responses);
// Check if we can see the type definition or property
try {
  console.log('Keys:', Object.keys(client));
} catch (e) {
  console.log('Error:', e);
}
