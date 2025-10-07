import "dotenv/config"; // ADD THIS LINE
import OpenAI from "openai";

async function testOpenAI() {
  console.log("Testing OpenAI API...");
  console.log("API Key exists:", !!process.env.OPENAI_API_KEY2);
  console.log("API Key preview:", process.env.OPENAI_API_KEY2?.substring(0, 20) + "...");
  
  const openai = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY2
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: "Say hello!" }
      ],
      max_tokens: 50,
    });

    console.log("✅ OpenAI API works!");
    console.log("Response:", response.choices[0].message.content);
  } catch (error: any) {
    console.error("❌ OpenAI API failed:", error.message);
    if (error.code === 'invalid_api_key') {
      console.error("Your API key is invalid. Get a new one from https://platform.openai.com/api-keys");
    }
  }
}

testOpenAI()
  .then(() => process.exit(0))
  .catch(console.error);