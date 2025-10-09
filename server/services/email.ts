import nodemailer from "nodemailer";

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Generate .ics calendar file
  generateICS(booking: {
    title: string;
    description: string;
    location: string;
    startTime: Date;
    endTime: Date;
    organizerEmail: string;
    organizerName: string;
    attendeeEmail: string;
    attendeeName: string;
  }): string {
    const formatDate = (date: Date) => {
      return date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    };

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Lead System//Booking//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
DTSTART:${formatDate(booking.startTime)}
DTEND:${formatDate(booking.endTime)}
DTSTAMP:${formatDate(new Date())}
ORGANIZER;CN=${booking.organizerName}:MAILTO:${booking.organizerEmail}
UID:${Date.now()}@aileadsystem.com
ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${
      booking.attendeeName
    }:MAILTO:${booking.attendeeEmail}
CREATED:${formatDate(new Date())}
DESCRIPTION:${booking.description}
LAST-MODIFIED:${formatDate(new Date())}
LOCATION:${booking.location}
SEQUENCE:0
STATUS:CONFIRMED
SUMMARY:${booking.title}
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`;
  }

  // Send calendar invite
  async sendCalendarInvite(params: {
    to: string;
    toName: string;
    subject: string;
    htmlBody: string;
    icsContent: string;
    icsFilename: string;
  }): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: `${params.toName} <${params.to}>`,
        subject: params.subject,
        html: params.htmlBody,
        icalEvent: {
          filename: params.icsFilename,
          method: "request",
          content: params.icsContent,
        },
      });

      console.log("✅ Calendar invite sent to:", params.to);
      return true;
    } catch (error) {
      console.error("❌ Failed to send calendar invite:", error);
      return false;
    }
  }

  async sendEmail({
    to,
    toName,
    subject,
    htmlBody,
    textBody,
  }: {
    to: string;
    toName: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
  }) {
    const mailOptions = {
      from: this.transporter.options.from || process.env.EMAIL_FROM,
      to: `${toName} <${to}>`,
      subject,
      html: htmlBody,
      text: textBody,
    };

    return await this.transporter.sendMail(mailOptions);
  }
}

export const emailService = new EmailService();
