import { redirect } from "next/navigation";

// Pipelines/Deals is a B2B sales-CRM feature (deal stages, deal value,
// expected close date) with no fit for an NGO's contributor/volunteer
// workflow — that lifecycle is already tracked properly elsewhere
// (volunteer_applications, contributor_assignments in the main app).
// Removed from the sidebar; this route redirects rather than 404ing or
// half-rendering for anyone who still has the URL bookmarked. The
// underlying components/tables are left in place, unused — no schema
// change, fully reversible.
export default function PipelinesPage() {
  redirect("/dashboard");
}
