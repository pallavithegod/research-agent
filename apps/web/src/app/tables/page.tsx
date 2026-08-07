import { DashboardShell } from "@/components/dashboard-shell";
import { WorkspacePage } from "@/components/workspace-page";

export default function TablesPage() {
  return (
    <DashboardShell>
      <WorkspacePage page="tables" />
    </DashboardShell>
  );
}
