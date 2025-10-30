import { whatsappService } from "./services/whatsapp";

async function testPhoneFormats() {
  const testMessage = "🧪 Testing phone format - which one works?";

  console.log("Testing different phone number formats...\n");

  // Format 1: With + prefix
  console.log("1️⃣ Testing: +639516124788");
  const result1 = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: "+639516124788", // ✅ With +
        type: "text",
        text: { body: testMessage + " (Format 1: +63)" },
      }),
    }
  );
  const data1 = await result1.json();
  console.log("Result:", result1.status, data1.error?.message || "✅ Success");
  console.log("Message ID:", data1.messages?.[0]?.id || "None");

  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

  // Format 2: Without + prefix
  console.log("\n2️⃣ Testing: 639516124788");
  const result2 = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: "639516124788", // ✅ Without +
        type: "text",
        text: { body: testMessage + " (Format 2: 63)" },
      }),
    }
  );
  const data2 = await result2.json();
  console.log("Result:", result2.status, data2.error?.message || "✅ Success");
  console.log("Message ID:", data2.messages?.[0]?.id || "None");

  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

  // Format 3: With country code prefix (different format)
  console.log("\n3️⃣ Testing: 9516124788 (without country code)");
  const result3 = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: "9516124788", // ✅ Without country code
        type: "text",
        text: { body: testMessage + " (Format 3: No country code)" },
      }),
    }
  );
  const data3 = await result3.json();
  console.log("Result:", result3.status, data3.error?.message || "✅ Success");
  console.log("Message ID:", data3.messages?.[0]?.id || "None");

  console.log("\n📱 Check your WhatsApp - which format(s) delivered?");
}

testPhoneFormats();