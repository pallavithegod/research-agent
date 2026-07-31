import { DashboardOverview } from "@/components/dashboard-overview";
import { DashboardShell } from "@/components/dashboard-shell";

export default function HomePage() {
  return (
    <DashboardShell>
      <DashboardOverview />
    </DashboardShell>
  );
}
