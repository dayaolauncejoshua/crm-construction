// server/services/lead.service.ts
import { db } from "../db"; // Import your new Neon db client
import { leads } from "../../shared/schema";
import { eq, or } from "drizzle-orm";

// This interface matches the 'parameters' from your 'save_lead_info' function
interface LeadInfo {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  timeline?: string;
  budget?: string;
  decision_maker?: boolean;
  project_type?: string;
  pain_points?: string[];
  notes?: string;
}

class LeadService {
  async saveLeadFromCall(leadData: LeadInfo, clientId: string, callId: string) {
    try {
      console.log(`Saving lead for clientId: ${clientId}, callId: ${callId}`);

      // 1. Map AI data to your database schema fields
      const mappedData = {
        clientId: clientId,
        callId: callId, // Link this lead to the call
        firstName: leadData.first_name,
        lastName: leadData.last_name,
        email: leadData.email,
        phone: leadData.phone,
        company: leadData.company,
        status: "qualified", // The AI qualified it
        temperature: "hot", // It's a phone call, so it's a hot lead
        source: "phone_call",
        internalNotes: `
Project Type: ${leadData.project_type || "N/A"}
Timeline: ${leadData.timeline || "N/A"}
Budget: ${leadData.budget || "N/A"}
Decision Maker: ${leadData.decision_maker ? "Yes" : "No"}
Pain Points: ${leadData.pain_points?.join(", ") || "N/A"}
---
${leadData.notes || ""}
        `.trim(),
        // Store the raw AI data in 'audit_results' for debugging
        auditResults: leadData as any,
      };

      // 2. Try to find an existing lead by email or phone to avoid duplicates
      let existingLead = null;
      if (leadData.email) {
        existingLead = await db.query.leads.findFirst({
          where: eq(leads.email, leadData.email),
        });
      }
      if (!existingLead && leadData.phone) {
        existingLead = await db.query.leads.findFirst({
          where: eq(leads.phone, leadData.phone),
        });
      }

      // 3. Update or Insert
      if (existingLead) {
        console.log(`Updating existing lead: ${existingLead.id}`);
        const [updatedLead] = await db
          .update(leads)
          .set({ ...mappedData, updatedAt: new Date() })
          .where(eq(leads.id, existingLead.id))
          .returning();
        return updatedLead;
      } else {
        console.log("Creating new lead...");
        const [newLead] = await db.insert(leads).values(mappedData).returning();
        return newLead;
      }
    } catch (error) {
      console.error("Error saving lead to database:", error);
      throw new Error("Failed to save lead.");
    }
  }
}

export const leadService = new LeadService();
