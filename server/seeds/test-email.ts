import { emailService } from "../services/email";

async function testEmail() {
  const result = await emailService.sendEmail({
    to: "your-email@gmail.com", // Your email to test
    subject: "Test Email from AI Lead System",
    html: "<h1>It works! 🎉</h1><p>Email service is configured correctly.</p>",
  });

  console.log(result ? "✅ Email sent!" : "❌ Email failed");
}

testEmail();