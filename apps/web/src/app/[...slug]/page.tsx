import { notFound } from "next/navigation";
import { DashboardSectionPage } from "@/components/dashboard-section-page";
import { DashboardShell } from "@/components/dashboard-shell";
import { getPageBySlug } from "@/lib/dashboard-pages";

export default async function SectionPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = getPageBySlug(slug.join("/"));

  if (!page) notFound();

  return (
    <DashboardShell>
      <DashboardSectionPage page={page} />
    </DashboardShell>
  );
}
