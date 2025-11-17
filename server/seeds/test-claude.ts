// server/seeds/test-claude.ts
import "dotenv/config";


import { 
  classifyIntent, 
  detectBookingIntent, 
  qualifyLead, 
  generateAIResponse 
} from "../services/claude";

async function testMigration() {
  console.log("🧪 Testing Claude Migration\n");
  
  // ✅ Validate API key exists
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ERROR: ANTHROPIC_API_KEY not found in environment");
    console.error("   Please add it to your .env file:");
    console.error("   ANTHROPIC_API_KEY=sk-ant-api03-...");
    console.error("\n   Get your key from: https://console.anthropic.com/settings/keys");
    process.exit(1);
  }
  
  console.log(`✅ API Key loaded: ${process.env.ANTHROPIC_API_KEY.substring(0, 25)}...\n`);
  
  // Test 1: Spam Detection
  console.log("TEST 1: Spam Detection");
  try {
    const spam1 = await classifyIntent("test test", [], { name: "Test Co" });
    console.log(`   "test test" → ${spam1.intent} (${spam1.isRelevant ? 'FAIL ❌' : 'PASS ✅'})`);
    
    const construction1 = await classifyIntent("I want to build a house", [], { name: "Test Co" });
    console.log(`   "build a house" → ${construction1.intent} (${construction1.isRelevant ? 'PASS ✅' : 'FAIL ❌'})\n`);
  } catch (error) {
    console.error("❌ Test 1 Failed:", error instanceof Error ? error.message : error);
  }
  
  // Test 2: Time Change Detection
  console.log("TEST 2: Time Change Detection");
  try {
    const bookingHistory = [
      { sender: "lead", content: "10 AM works", sentAt: new Date("2025-01-15T08:00:00") },
      { sender: "ai", content: "Perfect! Thursday at 10 AM", sentAt: new Date("2025-01-15T08:01:00") },
      { sender: "lead", content: "Actually, 2 PM is better", sentAt: new Date("2025-01-15T08:02:00") }
    ];
    
    const booking = await detectBookingIntent(bookingHistory, {});
    console.log(`   Extracted time: ${booking.proposedDateTime?.time || "NONE"}`);
    console.log(`   Expected: "2 PM" (${booking.proposedDateTime?.time?.includes("2") && booking.proposedDateTime?.time?.includes("PM") ? 'PASS ✅' : 'FAIL ❌'})\n`);
  } catch (error) {
    console.error("❌ Test 2 Failed:", error instanceof Error ? error.message : error);
  }
  
  // Test 3: Timeline Scoring
  console.log("TEST 3: Timeline Scoring");
  try {
    const urgentHistory = [
      { 
        sender: "lead", 
        content: "I need construction ASAP, 2M budget, I'm the owner", 
        sentAt: new Date() 
      }
    ];
    
    const qualification = await qualifyLead(
      { firstName: "Test", lastName: "Lead", email: "test@example.com", phone: "+1234567890" }, 
      urgentHistory
    );
    console.log(`   Score: ${qualification.score.toFixed(2)}`);
    console.log(`   Expected: >= 0.70 (${qualification.score >= 0.70 ? 'PASS ✅' : 'FAIL ❌'})`);
    console.log(`   Needs human: ${qualification.needsHumanAttention} (${qualification.needsHumanAttention ? 'PASS ✅' : 'FAIL ❌'})\n`);
  } catch (error) {
    console.error("❌ Test 3 Failed:", error instanceof Error ? error.message : error);
  }
  
  // Test 4: Anti-Repetition
  console.log("TEST 4: Anti-Repetition");
  try {
    const repeatHistory = [
      { sender: "ai", content: "What's your budget?", sentAt: new Date("2025-01-15T08:00:00") },
      { sender: "lead", content: "2M PHP", sentAt: new Date("2025-01-15T08:01:00") }
    ];
    
    const response = await generateAIResponse(
      repeatHistory, 
      { firstName: "Test", lastName: "Lead" }, 
      { name: "Test Co" }
    );
    const isRepeat = response.toLowerCase().includes("budget");
    console.log(`   Response: "${response.substring(0, 60)}..."`);
    console.log(`   Contains "budget": ${isRepeat ? 'FAIL ❌ (AI repeated itself)' : 'PASS ✅'}\n`);
  } catch (error) {
    console.error("❌ Test 4 Failed:", error instanceof Error ? error.message : error);
  }
  
  // Test 5: Question Answering
  console.log("TEST 5: Question Answering");
  try {
    const questionHistory = [
      { sender: "lead", content: "Do you handle permits?", sentAt: new Date() }
    ];
    
    const response = await generateAIResponse(
      questionHistory,
      { firstName: "John", lastName: "Doe" },
      { name: "BuildCo Construction" }
    );
    
    const answersQuestion = /yes|we (do|handle)|permits/i.test(response);
    console.log(`   Response: "${response.substring(0, 80)}..."`);
    console.log(`   Answers question: ${answersQuestion ? 'PASS ✅' : 'FAIL ❌'}\n`);
  } catch (error) {
    console.error("❌ Test 5 Failed:", error instanceof Error ? error.message : error);
  }
  
  console.log("✅ Migration tests complete!");
}

testMigration().catch(console.error);