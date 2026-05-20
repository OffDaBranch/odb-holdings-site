import type { IntakeLeadRow } from "./intake.types";

export function buildAirtableRecordMappings(lead: IntakeLeadRow) {
  return {
    websiteInquiries: {
      table: "Website Inquiries",
      fields: {
        "Lead ID": lead.id,
        "Request ID": lead.request_id,
        Name: lead.name,
        Email: lead.email,
        Phone: lead.phone,
        Company: lead.company,
        "Inquiry Type": lead.inquiry_type,
        Message: lead.message,
        "Lead Score": lead.lead_score,
        Urgency: lead.urgency,
        "Recommended Next Action": lead.recommended_next_action,
        Status: lead.status,
        "Submitted At": lead.submitted_at,
      },
    },
    dealQueue: {
      table: "Deal Queue",
      fields: {
        "Deal Name": `${lead.inquiry_type} - ${lead.company ?? lead.name}`,
        "Lead ID": lead.id,
        "Deal Type": lead.deal_type,
        "Estimated Value Range": lead.estimated_value_range,
        Urgency: lead.urgency,
        "Next Action": lead.recommended_next_action,
        Source: "branchoffholdings.com",
      },
    },
    assetRegistry: {
      table: "Asset Registry",
      fields: {
        "Asset Name": "Branch Off Holdings Website Inquiry Intake System",
        Category: "Website-integrated SaaS module",
        Owner: "Branch Off Holdings",
        Status: "MVP build",
        "Source Repository": "OffDaBranch/odb-holdings-site",
      },
    },
  };
}

export function buildNotionPageMappings() {
  return [
    {
      title: "Website Inquiry Intake SOP",
      purpose: "Operational steps for reviewing, qualifying, and routing inbound Branch Off Holdings website inquiries.",
    },
    {
      title: "BranchOps Intake OS Product Spec",
      purpose: "Reusable product definition for the intake module after it proves value inside branchoffholdings.com.",
    },
    {
      title: "Lead Routing SOP",
      purpose: "Human-review workflow for routing licensing, partnership, institution, contractor, and acquisition leads.",
    },
  ];
}
