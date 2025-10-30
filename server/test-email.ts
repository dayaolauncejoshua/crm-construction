import nodemailer from "nodemailer";

async function testEmail() {
  console.log("📧 Testing email with Gmail SMTP...");
  
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "crmaileadsystem.noreply@gmail.com",
      pass: "qcwlzpxhfqozndbf",
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    await transporter.sendMail({
      from: "crmaileadsystem.noreply@gmail.com",
      to: "dayaolauncejoshua@gmail.com", // Your email
      subject: "Test Email from LeadFlow CRM",
      html: "<h1>✅ Email works!</h1><p>If you see this, email service is working.</p>",
    });
    
    console.log("✅ Email sent successfully!");
  } catch (error) {
    console.error("❌ Email failed:", error);
  }
}

testEmail();