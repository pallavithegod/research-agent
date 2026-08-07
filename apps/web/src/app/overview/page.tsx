import { DashboardShell } from "@/components/dashboard-shell";
import { WorkspacePage } from "@/components/workspace-page";

export default function OverviewPage() {
  return (
    <DashboardShell>
      <WorkspacePage page="overview" />
    </DashboardShell>
  );
}
