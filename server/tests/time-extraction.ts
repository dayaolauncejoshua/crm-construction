// Simple test script (no vitest needed)
import { extractTimesFromConversation, getMostRecentTime } from "../services/openai";

console.log("🧪 Testing Time Extraction...\n");

// Test 1: Single time
console.log("Test 1: Single time extraction");
const test1 = [
  { sender: "lead", content: "2 PM works for me" },
];
const result1 = getMostRecentTime(extractTimesFromConversation(test1));
console.log(`   Result: ${result1}`);
console.log(`   Expected: 2:00 PM`);
console.log(`   ${result1 === "2:00 PM" ? "✅ PASS" : "❌ FAIL"}\n`);

// Test 2: Time change (MOST IMPORTANT TEST)
console.log("Test 2: Time change - use most recent");
const test2 = [
  { sender: "lead", content: "10 AM works" },
  { sender: "ai", content: "Great!" },
  { sender: "lead", content: "Actually, 2 PM is better" },
];
const result2 = getMostRecentTime(extractTimesFromConversation(test2));
console.log(`   Result: ${result2}`);
console.log(`   Expected: 2:00 PM`);
console.log(`   ${result2 === "2:00 PM" ? "✅ PASS" : "❌ FAIL"}\n`);

// Test 3: Multiple time changes
console.log("Test 3: Multiple time changes");
const test3 = [
  { sender: "lead", content: "Morning works" },
  { sender: "lead", content: "Actually 3 PM" },
  { sender: "lead", content: "Wait, 5 PM is better" },
];
const result3 = getMostRecentTime(extractTimesFromConversation(test3));
console.log(`   Result: ${result3}`);
console.log(`   Expected: 5:00 PM`);
console.log(`   ${result3 === "5:00 PM" ? "✅ PASS" : "❌ FAIL"}\n`);

// Test 4: Time of day
console.log("Test 4: Time of day (afternoon)");
const test4 = [
  { sender: "lead", content: "Afternoon works" },
];
const result4 = getMostRecentTime(extractTimesFromConversation(test4));
console.log(`   Result: ${result4}`);
console.log(`   Expected: 2:00 PM`);
console.log(`   ${result4 === "2:00 PM" ? "✅ PASS" : "❌ FAIL"}\n`);

// Test 5: No times mentioned
console.log("Test 5: No times mentioned");
const test5 = [
  { sender: "lead", content: "I want to build a house" },
];
const result5 = getMostRecentTime(extractTimesFromConversation(test5));
console.log(`   Result: ${result5}`);
console.log(`   Expected: null`);
console.log(`   ${result5 === null ? "✅ PASS" : "❌ FAIL"}\n`);

// Summary
console.log("=" .repeat(50));
console.log("Test Summary:");
const allTests = [
  result1 === "2:00 PM",
  result2 === "2:00 PM",
  result3 === "5:00 PM",
  result4 === "2:00 PM",
  result5 === null,
];
const passed = allTests.filter(Boolean).length;
const total = allTests.length;
console.log(`${passed}/${total} tests passed`);
console.log(passed === total ? "✅ ALL TESTS PASSED!" : "❌ SOME TESTS FAILED");