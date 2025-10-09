// test-webhook-with-signature.ts
import crypto from "crypto";
import axios from "axios";

const WEBHOOK_SECRET = process.env.OPENAI_WEBHOOK_SIGNING_SECRET!;

async function testWebhook() {
  const payload = {
    type: "realtime.call.incoming",
    data: {
      call_id: "test-call-" + Date.now(),
    },
  };

  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);

  // Create signature like OpenAI does
  const signature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  const headers = {
    "Content-Type": "application/json",
    "openai-signature": `t=${timestamp},v1=${signature}`,
  };

  try {
    const response = await axios.post("http://localhost:5000/webhook", body, {
      headers,
    });
    console.log("✅ Webhook test successful:", response.data);
  } catch (error: any) {
    console.error(
      "❌ Webhook test failed:",
      error.response?.data || error.message
    );
  }
}

testWebhook();
