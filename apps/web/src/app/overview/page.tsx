import { DashboardOverview } from "@/components/dashboard-overview";
import { DashboardShell } from "@/components/dashboard-shell";

export default function OverviewPage() {
  return (
    <DashboardShell>
      <DashboardOverview />
    </DashboardShell>
  );
}
