import { storage } from "../storage";

async function seedTemplates(clientId: string) {
  const defaultTemplates = [
    // Greetings
    {
      clientId,
      name: "Morning Greeting",
      content: "Good morning {firstName}! How can I help you today?",
      category: "greeting",
      variables: ["firstName"],
    },
    {
      clientId,
      name: "General Greeting",
      content: "Hi {firstName}! Thanks for reaching out. I'd be happy to help with your {service} needs.",
      category: "greeting",
      variables: ["firstName", "service"],
    },
    
    // Pricing
    {
      clientId,
      name: "Pricing Request",
      content: "Our pricing for {service} typically starts at ${price}. However, I'd love to understand your specific needs to give you an accurate quote. Can you tell me more about your project?",
      category: "pricing",
      variables: ["service", "price"],
    },
    {
      clientId,
      name: "Custom Quote",
      content: "Great question! Every project is unique, so I'd like to schedule a brief call to discuss your specific requirements. This way I can provide you with the most accurate quote. What's your availability like this week?",
      category: "pricing",
      variables: [],
    },
    
    // Booking
    {
      clientId,
      name: "Schedule Consultation",
      content: "Perfect! I'd love to schedule a consultation with you. Are you available for a 15-minute call on {date} at {time}? We can discuss your {service} needs in detail.",
      category: "booking",
      variables: ["date", "time", "service"],
    },
    {
      clientId,
      name: "Booking Confirmed",
      content: "Excellent! I've confirmed your appointment for {date} at {time}. I'll send you a calendar invite shortly. Looking forward to discussing your project!",
      category: "booking",
      variables: ["date", "time"],
    },
    
    // Follow-up
    {
      clientId,
      name: "Check In",
      content: "Hi {firstName}, just following up on our conversation about your {service} project. Have you had a chance to review the information I sent? Happy to answer any questions!",
      category: "follow-up",
      variables: ["firstName", "service"],
    },
    {
      clientId,
      name: "Next Steps",
      content: "Thanks for the information, {firstName}! Based on what you've shared, here are the next steps: [outline steps]. Let me know if you have any questions!",
      category: "follow-up",
      variables: ["firstName"],
    },
    
    // General
    {
      clientId,
      name: "More Information Needed",
      content: "Thanks for reaching out! To give you the best assistance, could you provide a bit more detail about: 1) Your timeline 2) Your budget range 3) Specific requirements. This will help me give you an accurate quote.",
      category: "general",
      variables: [],
    },
    {
      clientId,
      name: "Out of Service Area",
      content: "Thanks for your interest, {firstName}! Unfortunately, we currently don't service the {location} area. However, I'd be happy to recommend some trusted partners in your region. Would that be helpful?",
      category: "general",
      variables: ["firstName", "location"],
    },
  ];

  console.log("🌱 Seeding default templates...");
  
  for (const template of defaultTemplates) {
    await storage.createQuickReplyTemplate(template);
  }

  console.log(`✅ Seeded ${defaultTemplates.length} templates`);
}

// Run: npx tsx server/seed-templates.ts YOUR_CLIENT_ID
const clientId = process.argv[2];
if (!clientId) {
  console.error("Usage: npx tsx server/seed-templates.ts <clientId>");
  process.exit(1);
}

seedTemplates(clientId)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });