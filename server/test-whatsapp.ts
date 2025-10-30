async function testWhatsApp() {
  // ✅ UPDATE THESE WITH YOUR NEW VALUES
  const token = process.env.WHATSAPP_ACCESS_TOKEN || "EAAhQWBskKlQBP3EswJHakkNC6WloZAd5bwU8ga0cwdwOYeOXbjwAJhVBZCjZCQ31TQaiORO6vDvdjznIoucFxUWL6fIubj6874Ne7165utyZCrf1AQQgSKhQ9u6gLlmA8h1G5ZCa7k0rGWBLBGuKv3BOr07QykohLXf85sZBippQu53nNbkZCTibqkNLgAKqh1by77n7q5qr1KTd2N6HWTrH1y48I9qfZA2iwcH9";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "808896282312368";
  const recipientPhone = "+639516124788"; // ✅ No + sign, just numbers
  
  console.log("📱 Testing WhatsApp API...");
  console.log("Token:", token.substring(0, 30) + "..."); // Show more chars
  console.log("Token length:", token.length); // Should be 200+ chars
  console.log("Phone Number ID:", phoneNumberId);
  console.log("Recipient:", recipientPhone);

  // ✅ Test if token looks valid
  if (token.length < 100) {
    console.error("❌ Token too short! Should be 200+ characters.");
    return;
  }

  if (!token.startsWith("EAA")) {
    console.error("❌ Token should start with 'EAA'");
    return;
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "text",
        text: {
          body: "🧪 Test from Node.js - WhatsApp working!"
        },
      }),
    }
  );

  const data = await response.json();
  
  if (response.ok) {
    console.log("✅ WhatsApp sent successfully!");
    console.log("Message ID:", data.messages[0].id);
    console.log("💬 Check your WhatsApp now!");
  } else {
    console.error("❌ WhatsApp failed:");
    console.error("Status:", response.status);
    console.error("Error:", JSON.stringify(data, null, 2));
    
    // ✅ Helpful error messages
    if (data.error?.code === 190) {
      console.error("\n💡 Fix: Get a new token from https://developers.facebook.com/apps");
    }
    if (data.error?.code === 131009) {
      console.error("\n💡 Fix: Add recipient phone number in Meta console test numbers");
    }
  }
}

testWhatsApp();