import { DashboardShell } from "@/components/dashboard-shell";
import { WorkspacePage } from "@/components/workspace-page";

export default function BillingPage() {
  return (
    <DashboardShell>
      <WorkspacePage page="billing" />
    </DashboardShell>
  );
}
