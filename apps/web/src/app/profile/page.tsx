import { DashboardShell } from "@/components/dashboard-shell";
import { WorkspacePage } from "@/components/workspace-page";

export default function ProfilePage() {
  return (
    <DashboardShell>
      <WorkspacePage page="profile" />
    </DashboardShell>
  );
}
