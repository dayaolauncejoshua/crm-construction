import { describe, it, expect, beforeAll } from "vitest";
import { storage } from "../storage";
import { classifyIntent, generateAIResponse, detectBookingIntent} from "../services/openai";


describe("AI Optimization - End-to-End Tests", () => {
  
  // ============================================
  // TIME EXTRACTION TESTS
  // ============================================
  describe("Time Extraction", () => {
    it("should extract most recent time when customer changes mind", async () => {
      const conversation = [
        { sender: "lead", content: "I want to book a meeting" },
        { sender: "ai", content: "Great! When are you available?" },
        { sender: "lead", content: "10 AM works" },
        { sender: "ai", content: "Perfect! Thursday at 10 AM?" },
        { sender: "lead", content: "Actually, 2 PM is better" },
      ];

      const intent = await detectBookingIntent(conversation, {});

      expect(intent.proposedDateTime!.time).toBe("2:00 PM"); // Not 10 AM!
      expect(intent.wantsToBook).toBe(true);
    });

    it("should handle 5 time changes", async () => {
      const conversation = [
        { sender: "lead", content: "10 AM" },
        { sender: "lead", content: "Actually 11 AM" },
        { sender: "lead", content: "No wait, 1 PM" },
        { sender: "lead", content: "Actually 3 PM" },
        { sender: "lead", content: "Final answer: 5 PM" },
      ];

      const intent = await detectBookingIntent(conversation, {});

      expect(intent.proposedDateTime!.time).toBe("5:00 PM");
    });
  });

  // ============================================
  // RESPONSE GENERATION TESTS
  // ============================================
  describe("Response Generation", () => {
    it("should answer questions directly", async () => {
      const conversation = [
        { sender: "lead", content: "Do you handle permits?" },
      ];

      const response = await generateAIResponse(
        conversation,
        { firstName: "John" },
        { name: "BuildCo" }
      );

      // Response should start with "Yes" or contain "permit"
      const lowerResponse = response.toLowerCase();
      expect(
        lowerResponse.includes("yes") || lowerResponse.includes("permit")
      ).toBe(true);
      
      // Should be concise
      expect(response.length).toBeLessThan(200);
    });

    it("should not repeat previous responses", async () => {
      const conversation = [
        { sender: "lead", content: "Hi" },
        { sender: "ai", content: "Hello! How can I help with your project?" },
        { sender: "lead", content: "Tell me more" },
      ];

      const response1 = await generateAIResponse(conversation, {}, {});
      
      conversation.push({ sender: "ai", content: response1 });
      conversation.push({ sender: "lead", content: "And then?" });

      const response2 = await generateAIResponse(conversation, {}, {});

      // Responses should be different
      expect(response1.toLowerCase().trim()).not.toBe(response2.toLowerCase().trim());
    });

    it("should acknowledge scheduling answers", async () => {
      const conversation = [
        { sender: "lead", content: "I want to meet" },
        { sender: "ai", content: "Great! Are you available this week?" },
        { sender: "lead", content: "Thursday works" },
      ];

      const response = await generateAIResponse(conversation, {}, {});

      // Should acknowledge "Thursday"
      expect(response.toLowerCase()).toContain("thursday");
    });
  });

  // ============================================
  // INTENT CLASSIFICATION TESTS
  // ============================================
  describe("Intent Classification", () => {
    it("should NEVER mark construction inquiries as spam", async () => {
      const testCases = [
        "I want to build a house",
        "Do you do renovations?",
        "Need a contractor for deck construction",
        "Commercial kitchen MEP work",
        "Home addition project",
      ];

      for (const message of testCases) {
        const result = await classifyIntent(message, [], { name: "BuildCo" });
        
        expect(result.isRelevant).toBe(true);
        expect(result.intent).toBe("construction");
      }
    });

    it("should catch obvious spam", async () => {
      const testCases = [
        { message: "test test", isFirstMessage: true },
        { message: "hello hello", isFirstMessage: true },
      ];

      for (const { message, isFirstMessage } of testCases) {
        const history = isFirstMessage ? [] : [
          { sender: "lead", content: "Previous message" },
        ];

        const result = await classifyIntent(message, history, {});

        if (isFirstMessage) {
          expect(result.isRelevant).toBe(false);
          expect(result.intent).toBe("test");
        }
      }
    });

    it("should give benefit of doubt to early messages", async () => {
      const conversation = [
        { sender: "lead", content: "Hi" },
      ];

      const result = await classifyIntent("Hi", conversation, {});

      expect(result.isRelevant).toBe(true);
      expect(result.confidence).toBeLessThan(0.7); // Low confidence but relevant
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================
  describe("Full Conversation Flow", () => {
    it("should handle complete booking with time change", async () => {
      const conversation = [
        { sender: "lead", content: "I want to build a house" },
        { sender: "ai", content: "Great! What's your budget and location?" },
        { sender: "lead", content: "Vancouver, $500k" },
        { sender: "ai", content: "Perfect! When would you like to meet?" },
        { sender: "lead", content: "Thursday at 10 AM" },
        { sender: "ai", content: "Excellent! What's your address?" },
        { sender: "lead", content: "Actually 2 PM is better. 123 Main St, Vancouver" },
      ];

      const intent = await detectBookingIntent(conversation, {});

      expect(intent.wantsToBook).toBe(true);
      expect(intent.isConfirmed).toBe(true);
      expect(intent.proposedDateTime!.time).toBe("2:00 PM"); // Changed time
      expect(intent.proposedDateTime!.date).toBe("Thursday");
      expect(intent.location).toContain("123 Main St");
    });
  });
});