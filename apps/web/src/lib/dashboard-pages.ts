export type DashboardPage = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  primaryAction: string;
  secondaryAction: string;
  metrics: Array<{ label: string; value: string; copy: string }>;
  panels: Array<{ title: string; rows: Array<{ label: string; value: string; meta: string }> }>;
  activity: Array<{ title: string; detail: string; time: string }>;
};

export const pages: DashboardPage[] = [
  {
    slug: "projects",
    title: "Research Projects",
    eyebrow: "Workspace",
    description: "Organize long-running research goals, saved source sets, budgets, and report drafts.",
    primaryAction: "New project",
    secondaryAction: "Import brief",
    metrics: [
      { label: "Active projects", value: "12", copy: "Across market, product, and competitor research." },
      { label: "Shared briefs", value: "7", copy: "Visible to the research operations team." },
      { label: "Open questions", value: "24", copy: "Waiting for evidence or clarification." },
    ],
    panels: [
      {
        title: "Project queue",
        rows: [
          { label: "EV battery recycling market", value: "$12 budget", meta: "4 active runs" },
          { label: "Laptops under $1,500", value: "$8 budget", meta: "comparison report" },
          { label: "Competitor pricing watch", value: "$2/day", meta: "scheduled briefing" },
        ],
      },
      {
        title: "Evidence health",
        rows: [
          { label: "Citation coverage", value: "96%", meta: "editor approved" },
          { label: "Unsupported claims", value: "3", meta: "needs fact-check" },
          { label: "Expired sources", value: "1", meta: "refresh recommended" },
        ],
      },
    ],
    activity: [
      { title: "Project created", detail: "New market watch project initialized with a $10 spend cap.", time: "Today, 3:10 PM" },
      { title: "Source set updated", detail: "Added academic and news providers to the EV recycling workspace.", time: "Today, 2:48 PM" },
    ],
  },
  {
    slug: "bounties",
    title: "Bounty Board",
    eyebrow: "Tasks",
    description: "Track high-value research tasks that can be assigned to specialist agents or human reviewers.",
    primaryAction: "Create bounty",
    secondaryAction: "Review queue",
    metrics: [
      { label: "Open bounties", value: "18", copy: "Tasks ready for agent execution." },
      { label: "Avg reward", value: "$4.80", copy: "Paid from workflow budgets." },
      { label: "Completed today", value: "9", copy: "Merged into cited reports." },
    ],
    panels: [
      {
        title: "Available bounties",
        rows: [
          { label: "Verify sodium-ion battery claims", value: "$5.00", meta: "fact-checking" },
          { label: "Find original source for market-size estimate", value: "$3.25", meta: "retrieval" },
          { label: "Extract laptop warranty terms", value: "$2.50", meta: "data extraction" },
        ],
      },
      {
        title: "Quality gates",
        rows: [
          { label: "Independent source required", value: "On", meta: "default policy" },
          { label: "Editor review", value: "Required", meta: "before report" },
          { label: "Payment receipt", value: "Attached", meta: "x402 evidence" },
        ],
      },
    ],
    activity: [
      { title: "Bounty completed", detail: "Fact-check bounty closed with two independent confirmations.", time: "Today, 2:34 PM" },
      { title: "Bounty assigned", detail: "Retrieval agent accepted a source-finding task.", time: "Today, 2:11 PM" },
    ],
  },
  {
    slug: "issue-bounties",
    title: "Issue Bounties",
    eyebrow: "Review",
    description: "Convert missing evidence, weak claims, and report defects into actionable issue-style bounties.",
    primaryAction: "Open issue",
    secondaryAction: "Triage claims",
    metrics: [
      { label: "Open issues", value: "14", copy: "Evidence and report quality issues." },
      { label: "Blocked steps", value: "4", copy: "Waiting on provider or user approval." },
      { label: "High priority", value: "6", copy: "Affects final answer confidence." },
    ],
    panels: [
      {
        title: "Issue queue",
        rows: [
          { label: "Citation conflict in market forecast", value: "High", meta: "fact-check" },
          { label: "Provider returned stale product data", value: "Medium", meta: "enrichment" },
          { label: "Report section lacks timestamp", value: "Low", meta: "editor" },
        ],
      },
      {
        title: "Resolution states",
        rows: [
          { label: "Needs evidence", value: "8", meta: "agent can retry" },
          { label: "Needs human decision", value: "3", meta: "approval required" },
          { label: "Provider failed", value: "3", meta: "fallback ready" },
        ],
      },
    ],
    activity: [
      { title: "Issue escalated", detail: "A conflicting claim was routed to the editor agent.", time: "Today, 1:52 PM" },
      { title: "Issue resolved", detail: "Missing timestamp added to a cited report section.", time: "Today, 1:31 PM" },
    ],
  },
  {
    slug: "leaderboard",
    title: "Leaderboard",
    eyebrow: "Performance",
    description: "Compare agent, provider, and reviewer performance across quality, cost, and latency.",
    primaryAction: "Export ranking",
    secondaryAction: "Change period",
    metrics: [
      { label: "Top agent", value: "Editor", copy: "98% citation coverage score." },
      { label: "Best provider", value: "Search A", copy: "Lowest cost per accepted source." },
      { label: "Review SLA", value: "12m", copy: "Median human approval time." },
    ],
    panels: [
      {
        title: "Agent rankings",
        rows: [
          { label: "Editor Agent", value: "98", meta: "quality score" },
          { label: "Fact-Checking Agent", value: "94", meta: "conflict detection" },
          { label: "Search Agent", value: "91", meta: "source acceptance" },
        ],
      },
      {
        title: "Provider rankings",
        rows: [
          { label: "Academic Search", value: "$0.18", meta: "per accepted source" },
          { label: "News Index", value: "$0.09", meta: "per fresh result" },
          { label: "Claims API", value: "$0.42", meta: "per verification" },
        ],
      },
    ],
    activity: [
      { title: "Ranking refreshed", detail: "Provider quality scores recalculated from latest runs.", time: "Today, 12:55 PM" },
      { title: "SLA improved", detail: "Median report review time dropped below 15 minutes.", time: "Today, 11:40 AM" },
    ],
  },
  {
    slug: "campaigns",
    title: "Campaigns",
    eyebrow: "Monitoring",
    description: "Manage recurring briefings, market watches, product trackers, and competitor campaigns.",
    primaryAction: "New campaign",
    secondaryAction: "View calendar",
    metrics: [
      { label: "Running campaigns", value: "5", copy: "Scheduled research workflows." },
      { label: "Weekly spend cap", value: "$42", copy: "Across all campaigns." },
      { label: "Next briefing", value: "8 AM", copy: "Daily market digest." },
    ],
    panels: [
      {
        title: "Active campaigns",
        rows: [
          { label: "Daily competitor briefing", value: "$2/day", meta: "weekdays" },
          { label: "Laptop price monitor", value: "$1/day", meta: "threshold alerts" },
          { label: "Battery policy tracker", value: "$9/week", meta: "policy sources" },
        ],
      },
      {
        title: "Campaign controls",
        rows: [
          { label: "Approval mode", value: "Scoped", meta: "per provider" },
          { label: "Auto-report", value: "Enabled", meta: "with citations" },
          { label: "Checkout automation", value: "Disabled", meta: "handoff only" },
        ],
      },
    ],
    activity: [
      { title: "Campaign paused", detail: "Laptop monitor paused after reaching weekly budget.", time: "Today, 10:16 AM" },
      { title: "Briefing delivered", detail: "Competitor pricing digest sent to the workspace.", time: "Today, 8:02 AM" },
    ],
  },
  {
    slug: "pull-requests",
    title: "Pull Requests",
    eyebrow: "Changes",
    description: "Review proposed changes to prompts, provider policies, report templates, and workflow graphs.",
    primaryAction: "Open proposal",
    secondaryAction: "Review changes",
    metrics: [
      { label: "Open proposals", value: "6", copy: "Awaiting owner review." },
      { label: "Merged today", value: "4", copy: "Template and policy updates." },
      { label: "Policy checks", value: "100%", copy: "All proposed changes validated." },
    ],
    panels: [
      {
        title: "Pending proposals",
        rows: [
          { label: "Add source freshness threshold", value: "Review", meta: "policy" },
          { label: "Update product comparison template", value: "Ready", meta: "reporting" },
          { label: "Tune provider fallback order", value: "Draft", meta: "routing" },
        ],
      },
      {
        title: "Checks",
        rows: [
          { label: "Budget policy", value: "Passed", meta: "no silent overspend" },
          { label: "Citation policy", value: "Passed", meta: "required fields" },
          { label: "Safety policy", value: "Passed", meta: "no checkout automation" },
        ],
      },
    ],
    activity: [
      { title: "Proposal merged", detail: "Report template now shows payment receipts per claim group.", time: "Yesterday, 6:20 PM" },
      { title: "Review requested", detail: "Provider fallback update needs owner approval.", time: "Yesterday, 4:42 PM" },
    ],
  },
  {
    slug: "api-keys",
    title: "API Keys",
    eyebrow: "Access",
    description: "Prepare frontend placeholders for provider keys, gateway credentials, and future backend access controls.",
    primaryAction: "Create key",
    secondaryAction: "Rotate selected",
    metrics: [
      { label: "Active keys", value: "4", copy: "Workspace integration credentials." },
      { label: "Scoped providers", value: "8", copy: "Search, enrichment, and report APIs." },
      { label: "Rotation due", value: "1", copy: "Key lifecycle placeholder." },
    ],
    panels: [
      {
        title: "Key inventory",
        rows: [
          { label: "Research Gateway", value: "rk_live_...91c", meta: "all workflow calls" },
          { label: "Fact Check API", value: "fc_live_...0af", meta: "claims only" },
          { label: "Report Generator", value: "rp_live_...75b", meta: "writer agent" },
        ],
      },
      {
        title: "Scopes",
        rows: [
          { label: "Search", value: "Allowed", meta: "budget capped" },
          { label: "Payments", value: "Approval required", meta: "x402" },
          { label: "Admin", value: "Disabled", meta: "restricted by policy" },
        ],
      },
    ],
    activity: [
      { title: "Key rotated", detail: "Gateway credential rotation recorded.", time: "Today, 9:42 AM" },
      { title: "Scope updated", detail: "Fact-check API limited to verification steps.", time: "Yesterday, 7:11 PM" },
    ],
  },
  {
    slug: "ai-tools",
    title: "AI Tools",
    eyebrow: "Utilities",
    description: "Tools for prompt planning, source summarization, claim extraction, and report polishing.",
    primaryAction: "Run tool",
    secondaryAction: "Save preset",
    metrics: [
      { label: "Available tools", value: "9", copy: "Planner, summarizer, editor, and more." },
      { label: "Tool runs", value: "42", copy: "This week." },
      { label: "Saved presets", value: "6", copy: "Reusable research operations." },
    ],
    panels: [
      {
        title: "Toolbox",
        rows: [
          { label: "Claim Extractor", value: "Ready", meta: "turn report into checkable claims" },
          { label: "Source Summarizer", value: "Ready", meta: "bounded by retrieved content" },
          { label: "Prompt Optimizer", value: "Ready", meta: "planner prompts" },
        ],
      },
      {
        title: "Recent outputs",
        rows: [
          { label: "Market report outline", value: "Saved", meta: "report builder" },
          { label: "Provider policy draft", value: "Saved", meta: "workflow routing" },
          { label: "Fact-check checklist", value: "Saved", meta: "editor review" },
        ],
      },
    ],
    activity: [
      { title: "Tool completed", detail: "Claim extractor found 17 claims in the draft report.", time: "Today, 5:04 PM" },
      { title: "Preset saved", detail: "Reusable market briefing prompt added to workspace.", time: "Today, 4:31 PM" },
    ],
  },
  {
    slug: "playground",
    title: "Playground",
    eyebrow: "Experiment",
    description: "Prototype research prompts, payment policies, provider chains, and report output formats.",
    primaryAction: "Run experiment",
    secondaryAction: "Load sample",
    metrics: [
      { label: "Experiments", value: "15", copy: "Prompt and workflow variants." },
      { label: "Best score", value: "92", copy: "Based on citation coverage and cost." },
      { label: "Avg cost", value: "$1.18", copy: "Per sandbox run." },
    ],
    panels: [
      {
        title: "Experiment slots",
        rows: [
          { label: "Market research chain", value: "A/B", meta: "provider routing" },
          { label: "Strict citations mode", value: "On", meta: "writer agent" },
          { label: "Budget-first planner", value: "Draft", meta: "planner policy" },
        ],
      },
      {
        title: "Sample queries",
        rows: [
          { label: "Compare 24 GB laptops", value: "Product", meta: "price/spec evidence" },
          { label: "Daily competitor briefing", value: "Market", meta: "scheduled report" },
          { label: "Watch battery policy", value: "Monitor", meta: "freshness alerts" },
        ],
      },
    ],
    activity: [
      { title: "Experiment run", detail: "Budget-first planner saved 18% spend with same citation score.", time: "Today, 3:49 PM" },
      { title: "Sample loaded", detail: "Product comparison sample opened in playground.", time: "Today, 3:16 PM" },
    ],
  },
  {
    slug: "workflows",
    title: "Automations",
    eyebrow: "Workflow graph",
    description: "Build reusable orchestration graphs for research, monitoring, approval gates, and report delivery.",
    primaryAction: "New workflow",
    secondaryAction: "Open canvas",
    metrics: [
      { label: "Workflows", value: "11", copy: "Research-first templates." },
      { label: "Approval gates", value: "7", copy: "Human checks before sensitive actions." },
      { label: "Reusable nodes", value: "18", copy: "Planner, x402, report, and condition nodes." },
    ],
    panels: [
      {
        title: "Workflow templates",
        rows: [
          { label: "Cited research report", value: "Core", meta: "MVP path" },
          { label: "Daily briefing", value: "Scheduled", meta: "recurring budget" },
          { label: "Price monitor", value: "Watch", meta: "notify only" },
        ],
      },
      {
        title: "Canvas nodes",
        rows: [
          { label: "Planner", value: "Input", meta: "decompose query" },
          { label: "Payment x402", value: "Control", meta: "settle paid call" },
          { label: "Report", value: "Output", meta: "cited delivery" },
        ],
      },
    ],
    activity: [
      { title: "Workflow saved", detail: "Daily briefing workflow saved with a weekly budget cap.", time: "Today, 1:22 PM" },
      { title: "Node added", detail: "Payment approval gate added before data enrichment.", time: "Today, 12:44 PM" },
    ],
  },
  {
    slug: "marketplace",
    title: "Marketplace",
    eyebrow: "Providers",
    description: "Browse x402-enabled APIs and composable services for search, summarization, enrichment, and reporting.",
    primaryAction: "Add provider",
    secondaryAction: "Compare costs",
    metrics: [
      { label: "Listed services", value: "26", copy: "x402-ready provider cards." },
      { label: "Connected", value: "8", copy: "Available to workflow planner." },
      { label: "Avg latency", value: "820ms", copy: "Across connected services." },
    ],
    panels: [
      {
        title: "Featured services",
        rows: [
          { label: "Paid Search API", value: "$0.08", meta: "per query" },
          { label: "Claim Verification API", value: "$0.42", meta: "per claim" },
          { label: "Entity Enrichment API", value: "$0.15", meta: "per entity" },
        ],
      },
      {
        title: "Provider policy",
        rows: [
          { label: "Allow-list required", value: "Yes", meta: "before payment" },
          { label: "Receipt verification", value: "Required", meta: "stored as evidence" },
          { label: "Fallback routing", value: "Enabled", meta: "when provider fails" },
        ],
      },
    ],
    activity: [
      { title: "Provider connected", detail: "Entity enrichment service added to planner routing.", time: "Today, 11:12 AM" },
      { title: "Cost changed", detail: "News provider updated pricing to $0.07 per result.", time: "Yesterday, 5:23 PM" },
    ],
  },
  {
    slug: "rewards",
    title: "Rewards",
    eyebrow: "Outcomes",
    description: "Show completed high-quality research outputs, accepted evidence, and workflow milestones.",
    primaryAction: "View rewards",
    secondaryAction: "Export ledger",
    metrics: [
      { label: "Accepted outputs", value: "37", copy: "Reports and evidence bundles." },
      { label: "Quality bonus", value: "$18", copy: "Quality review allocation." },
      { label: "Rejected claims", value: "5", copy: "Prevented unsupported report content." },
    ],
    panels: [
      {
        title: "Reward events",
        rows: [
          { label: "Cited report accepted", value: "$4.00", meta: "writer + editor" },
          { label: "Conflict detected", value: "$1.50", meta: "fact-checker" },
          { label: "Fresh source found", value: "$0.75", meta: "search agent" },
        ],
      },
      {
        title: "Quality criteria",
        rows: [
          { label: "Source timestamp", value: "Required", meta: "every citation" },
          { label: "Payment receipt", value: "Required", meta: "paid steps" },
          { label: "Unsupported claims", value: "Blocked", meta: "editor policy" },
        ],
      },
    ],
    activity: [
      { title: "Reward issued", detail: "Fact-checking agent rewarded for detecting a conflicting source.", time: "Today, 2:08 PM" },
      { title: "Report accepted", detail: "Market briefing passed final citation review.", time: "Today, 12:59 PM" },
    ],
  },
  {
    slug: "usage",
    title: "Usage",
    eyebrow: "Analytics",
    description: "Monitor runs, provider calls, payment volume, report generation, and agent performance.",
    primaryAction: "Export usage",
    secondaryAction: "Change range",
    metrics: [
      { label: "Provider calls", value: "284", copy: "Last 7 days." },
      { label: "Total spend", value: "$157.60", copy: "Settled via x402." },
      { label: "Reports", value: "31", copy: "Compiled with citations." },
    ],
    panels: [
      {
        title: "Usage by step",
        rows: [
          { label: "Search", value: "104 calls", meta: "$8.32" },
          { label: "Fact-checking", value: "61 calls", meta: "$25.62" },
          { label: "Enrichment", value: "72 calls", meta: "$10.80" },
        ],
      },
      {
        title: "Run health",
        rows: [
          { label: "Succeeded", value: "89%", meta: "completed runs" },
          { label: "Partial", value: "8%", meta: "budget/provider limits" },
          { label: "Failed", value: "3%", meta: "needs review" },
        ],
      },
    ],
    activity: [
      { title: "Usage refreshed", detail: "Weekly provider call metrics updated.", time: "Today, 4:00 PM" },
      { title: "Spend alert", detail: "Fact-checking spend exceeded projected estimate by 6%.", time: "Today, 1:19 PM" },
    ],
  },
  {
    slug: "credits",
    title: "Credit Wallet",
    eyebrow: "Wallet",
    description: "Prepare the wallet UI for balances, scoped allowances, payment PIN, and x402 receipts.",
    primaryAction: "Top up",
    secondaryAction: "View receipts",
    metrics: [
      { label: "Available", value: "$842.40", copy: "Configured research allowance." },
      { label: "Scoped allowances", value: "5", copy: "Per workflow run." },
      { label: "Pending receipts", value: "3", copy: "Awaiting final verification." },
    ],
    panels: [
      {
        title: "Allowances",
        rows: [
          { label: "Daily briefing", value: "$2/day", meta: "expires Friday" },
          { label: "Market watch", value: "$10/run", meta: "approved providers" },
          { label: "Product comparison", value: "$8/run", meta: "single use" },
        ],
      },
      {
        title: "Wallet safeguards",
        rows: [
          { label: "Payment PIN", value: "Required", meta: "before new provider" },
          { label: "Silent purchases", value: "Blocked", meta: "policy" },
          { label: "Receipt storage", value: "Enabled", meta: "evidence ledger" },
        ],
      },
    ],
    activity: [
      { title: "Allowance created", detail: "Daily briefing granted a $2 weekday budget.", time: "Yesterday, 9:00 AM" },
      { title: "Receipt verified", detail: "Search API payment receipt attached to evidence item.", time: "Yesterday, 8:36 AM" },
    ],
  },
  {
    slug: "referral",
    title: "Referral",
    eyebrow: "Growth",
    description: "Manage invitations for researchers, teams, and provider partners.",
    primaryAction: "Copy invite",
    secondaryAction: "View invites",
    metrics: [
      { label: "Invites sent", value: "18", copy: "Team and partner invitations." },
      { label: "Accepted", value: "7", copy: "Joined workspace or provider pool." },
      { label: "Credits earned", value: "$35", copy: "Recorded workspace credits." },
    ],
    panels: [
      {
        title: "Invite links",
        rows: [
          { label: "Research team", value: "Active", meta: "workspace role" },
          { label: "Provider partner", value: "Active", meta: "marketplace listing" },
          { label: "Reviewer", value: "Draft", meta: "quality review role" },
        ],
      },
      {
        title: "Referral events",
        rows: [
          { label: "New researcher", value: "$5", meta: "after first run" },
          { label: "Provider listed", value: "$10", meta: "after approval" },
          { label: "Reviewer onboarded", value: "$3", meta: "after first review" },
        ],
      },
    ],
    activity: [
      { title: "Invite accepted", detail: "A reviewer joined the quality review pool.", time: "Today, 9:18 AM" },
      { title: "Referral credited", detail: "Workspace credit added for a provider partner signup.", time: "Yesterday, 3:05 PM" },
    ],
  },
  {
    slug: "offers",
    title: "Offers",
    eyebrow: "Promotions",
    description: "Display provider credits, launch offers, and budget boosts for research workflows.",
    primaryAction: "Activate offer",
    secondaryAction: "Browse providers",
    metrics: [
      { label: "Active offers", value: "4", copy: "Provider-funded credits." },
      { label: "Potential savings", value: "$64", copy: "Across current projects." },
      { label: "Expiring soon", value: "2", copy: "Use before next week." },
    ],
    panels: [
      {
        title: "Provider offers",
        rows: [
          { label: "Academic Search trial", value: "$20", meta: "new workflows" },
          { label: "Fact-check bundle", value: "15% off", meta: "claim verification" },
          { label: "Report generator", value: "10 free", meta: "compiled outputs" },
        ],
      },
      {
        title: "Eligibility",
        rows: [
          { label: "Research-first use", value: "Required", meta: "no checkout automation" },
          { label: "Citation output", value: "Required", meta: "report evidence" },
          { label: "Provider allow-list", value: "Required", meta: "payment safety" },
        ],
      },
    ],
    activity: [
      { title: "Offer activated", detail: "Academic Search trial credits applied to workspace.", time: "Today, 12:06 PM" },
      { title: "Offer expiring", detail: "Fact-check bundle expires in two days.", time: "Today, 8:30 AM" },
    ],
  },
  {
    slug: "sponsors",
    title: "Sponsors",
    eyebrow: "Partners",
    description: "Manage partner providers, sponsored research credits, and marketplace submission status.",
    primaryAction: "Add sponsor",
    secondaryAction: "Review submissions",
    metrics: [
      { label: "Sponsors", value: "6", copy: "Provider and research partners." },
      { label: "Sponsored credits", value: "$240", copy: "Available for eligible workflows." },
      { label: "Pending review", value: "3", copy: "Marketplace submissions." },
    ],
    panels: [
      {
        title: "Sponsor list",
        rows: [
          { label: "SearchGrid", value: "$120", meta: "search credits" },
          { label: "ClaimSure", value: "$80", meta: "fact-check credits" },
          { label: "ReportForge", value: "$40", meta: "report generation" },
        ],
      },
      {
        title: "Submission checks",
        rows: [
          { label: "x402 compatibility", value: "Required", meta: "payment handshake" },
          { label: "Provider policy", value: "Required", meta: "allow-list" },
          { label: "Receipt verification", value: "Required", meta: "evidence ledger" },
        ],
      },
    ],
    activity: [
      { title: "Sponsor approved", detail: "ClaimSure added to provider marketplace.", time: "Yesterday, 1:42 PM" },
      { title: "Submission received", detail: "New enrichment provider awaiting review.", time: "Yesterday, 11:08 AM" },
    ],
  },
  {
    slug: "notifications",
    title: "Notifications",
    eyebrow: "Inbox",
    description: "View research run updates, payment prompts, provider warnings, and report delivery events.",
    primaryAction: "Mark all read",
    secondaryAction: "Notification rules",
    metrics: [
      { label: "Unread", value: "8", copy: "Payment, run, and report alerts." },
      { label: "Payment prompts", value: "3", copy: "Awaiting user approval." },
      { label: "Warnings", value: "2", copy: "Provider and evidence issues." },
    ],
    panels: [
      {
        title: "Inbox",
        rows: [
          { label: "Payment approval needed", value: "$0.42", meta: "fact-check API" },
          { label: "Report ready", value: "Done", meta: "battery market briefing" },
          { label: "Provider latency high", value: "Warning", meta: "news index" },
        ],
      },
      {
        title: "Rules",
        rows: [
          { label: "Budget warning", value: "80%", meta: "notify owner" },
          { label: "Payment prompt", value: "Immediate", meta: "requires action" },
          { label: "Report delivery", value: "Email + app", meta: "when completed" },
        ],
      },
    ],
    activity: [
      { title: "Notification sent", detail: "Payment approval prompt sent for a new provider.", time: "Today, 2:21 PM" },
      { title: "Report delivered", detail: "Cited market briefing sent to project workspace.", time: "Today, 2:08 PM" },
    ],
  },
  {
    slug: "runs",
    title: "Research Runs",
    eyebrow: "Execution",
    description: "Track each live and completed orchestration run from query planning through final report.",
    primaryAction: "Start run",
    secondaryAction: "Cancel selected",
    metrics: [
      { label: "Active runs", value: "6", copy: "Currently executing." },
      { label: "Queued", value: "4", copy: "Waiting on budget or provider." },
      { label: "Completed", value: "31", copy: "This month." },
    ],
    panels: [
      {
        title: "Live runs",
        rows: [
          { label: "Battery recycling market", value: "Running", meta: "fact-check step" },
          { label: "Laptop comparison", value: "Waiting", meta: "payment approval" },
          { label: "Competitor digest", value: "Writing", meta: "report step" },
        ],
      },
      {
        title: "Run controls",
        rows: [
          { label: "Retry policy", value: "Backoff", meta: "provider failures" },
          { label: "Fallback", value: "Enabled", meta: "allow-listed providers" },
          { label: "Partial results", value: "Enabled", meta: "when budget exhausted" },
        ],
      },
    ],
    activity: [
      { title: "Run checkpointed", detail: "Planner state saved before paid enrichment step.", time: "Today, 4:18 PM" },
      { title: "Run completed", detail: "Competitor digest completed with 12 citations.", time: "Today, 3:03 PM" },
    ],
  },
  {
    slug: "planner",
    title: "Task Planner",
    eyebrow: "Planning",
    description: "Decompose research requests into tasks, provider choices, budgets, and approval gates.",
    primaryAction: "Generate plan",
    secondaryAction: "Edit policy",
    metrics: [
      { label: "Tasks planned", value: "73", copy: "Across current projects." },
      { label: "Avg estimate", value: "$6.40", copy: "Before execution." },
      { label: "Clarifications", value: "5", copy: "Needed before run." },
    ],
    panels: [
      {
        title: "Planner output",
        rows: [
          { label: "Search", value: "$0.24", meta: "3 providers" },
          { label: "Fact-check", value: "$2.10", meta: "5 claims" },
          { label: "Report", value: "$0.80", meta: "briefing format" },
        ],
      },
      {
        title: "Policy scoring",
        rows: [
          { label: "Quality", value: "35%", meta: "provider selection" },
          { label: "Cost", value: "25%", meta: "budget fit" },
          { label: "Freshness", value: "20%", meta: "source recency" },
        ],
      },
    ],
    activity: [
      { title: "Plan generated", detail: "Planner created a 7-step research workflow.", time: "Today, 3:51 PM" },
      { title: "Clarification requested", detail: "Planner asked for preferred geography and date range.", time: "Today, 3:36 PM" },
    ],
  },
  {
    slug: "apis",
    title: "Paid APIs",
    eyebrow: "Services",
    description: "Configure paid upstream services for search, retrieval, summarization, fact-checking, enrichment, and reports.",
    primaryAction: "Connect API",
    secondaryAction: "Test provider",
    metrics: [
      { label: "Connected APIs", value: "8", copy: "Ready for planner selection." },
      { label: "Allow-listed", value: "11", copy: "Approved for payment requests." },
      { label: "Fallback chains", value: "5", copy: "Provider alternatives." },
    ],
    panels: [
      {
        title: "API registry",
        rows: [
          { label: "Search API", value: "Online", meta: "$0.08/query" },
          { label: "Summary API", value: "Online", meta: "$0.03/page" },
          { label: "Fact API", value: "Online", meta: "$0.42/claim" },
        ],
      },
      {
        title: "Provider checks",
        rows: [
          { label: "x402 handshake", value: "Passing", meta: "402 flow" },
          { label: "Terms validation", value: "Passing", meta: "amount/resource/expiry" },
          { label: "Receipt verification", value: "Passing", meta: "stored evidence" },
        ],
      },
    ],
    activity: [
      { title: "Provider tested", detail: "Search API returned valid x402 payment terms.", time: "Today, 1:07 PM" },
      { title: "Fallback updated", detail: "News provider fallback moved below academic search.", time: "Yesterday, 6:14 PM" },
    ],
  },
  {
    slug: "payments",
    title: "Payments",
    eyebrow: "x402",
    description: "Review payment prompts, scoped allowances, settlement state, and receipts for each paid API request.",
    primaryAction: "Approve payment",
    secondaryAction: "Open ledger",
    metrics: [
      { label: "Settled", value: "$157.60", copy: "Verified receipts." },
      { label: "Pending", value: "$24.20", copy: "Awaiting final provider response." },
      { label: "Prompts", value: "3", copy: "Need user approval." },
    ],
    panels: [
      {
        title: "Payment queue",
        rows: [
          { label: "Fact-check API", value: "$0.42", meta: "claim verification" },
          { label: "Entity enrichment", value: "$0.15", meta: "company profile" },
          { label: "Academic search", value: "$0.18", meta: "source discovery" },
        ],
      },
      {
        title: "Settlement rules",
        rows: [
          { label: "New provider", value: "Ask", meta: "explicit approval" },
          { label: "Scoped allowance", value: "Allowed", meta: "within cap" },
          { label: "Unrelated request", value: "Blocked", meta: "no silent payment" },
        ],
      },
    ],
    activity: [
      { title: "Payment settled", detail: "Receipt verified for fact-checking request.", time: "Today, 2:23 PM" },
      { title: "Approval requested", detail: "New enrichment provider requires confirmation.", time: "Today, 2:02 PM" },
    ],
  },
  {
    slug: "facts",
    title: "Fact Checks",
    eyebrow: "Trust",
    description: "Validate important claims against independent trusted sources and flag uncertainty or conflicts.",
    primaryAction: "Check claims",
    secondaryAction: "Review conflicts",
    metrics: [
      { label: "Claims checked", value: "118", copy: "This week." },
      { label: "Conflicts found", value: "9", copy: "Held for review." },
      { label: "Confidence", value: "91%", copy: "Average accepted claim score." },
    ],
    panels: [
      {
        title: "Claim queue",
        rows: [
          { label: "Market CAGR estimate", value: "Conflict", meta: "two sources disagree" },
          { label: "Battery recycling capacity", value: "Verified", meta: "independent source" },
          { label: "Laptop warranty terms", value: "Pending", meta: "retrieval needed" },
        ],
      },
      {
        title: "Verification policy",
        rows: [
          { label: "Independent source", value: "Required", meta: "major claims" },
          { label: "Evidence snippet", value: "Required", meta: "stored with citation" },
          { label: "Uncertainty label", value: "Required", meta: "when confidence low" },
        ],
      },
    ],
    activity: [
      { title: "Conflict detected", detail: "Two sources disagreed on market-size estimate.", time: "Today, 3:29 PM" },
      { title: "Claims verified", detail: "Five product-spec claims passed evidence review.", time: "Today, 2:47 PM" },
    ],
  },
  {
    slug: "enrichment",
    title: "Data Enrichment",
    eyebrow: "Structured data",
    description: "Fetch structured domain data such as prices, availability, specifications, entities, and source metadata.",
    primaryAction: "Run enrichment",
    secondaryAction: "Map schema",
    metrics: [
      { label: "Entities enriched", value: "214", copy: "Products, companies, and policies." },
      { label: "Schemas", value: "12", copy: "Reusable structured outputs." },
      { label: "Freshness", value: "94%", copy: "Within configured source window." },
    ],
    panels: [
      {
        title: "Enrichment jobs",
        rows: [
          { label: "Laptop specs", value: "Complete", meta: "product schema" },
          { label: "Company profiles", value: "Running", meta: "market schema" },
          { label: "Policy metadata", value: "Queued", meta: "government sources" },
        ],
      },
      {
        title: "Data quality",
        rows: [
          { label: "Deduplication", value: "Enabled", meta: "source merging" },
          { label: "Freshness check", value: "Enabled", meta: "timestamp required" },
          { label: "Schema validation", value: "Enabled", meta: "before report" },
        ],
      },
    ],
    activity: [
      { title: "Entity enriched", detail: "Manufacturer data attached to product comparison.", time: "Today, 1:58 PM" },
      { title: "Schema updated", detail: "Price history schema gained availability fields.", time: "Yesterday, 5:56 PM" },
    ],
  },
  {
    slug: "reports",
    title: "Report Builder",
    eyebrow: "Output",
    description: "Compile final answers as cited reports with evidence snippets, timestamps, and payment receipts.",
    primaryAction: "Build report",
    secondaryAction: "Edit template",
    metrics: [
      { label: "Reports built", value: "31", copy: "This month." },
      { label: "Avg citations", value: "18", copy: "Per completed report." },
      { label: "Editor passes", value: "2.1", copy: "Average before delivery." },
    ],
    panels: [
      {
        title: "Report drafts",
        rows: [
          { label: "EV recycling market", value: "Review", meta: "18 citations" },
          { label: "Laptop comparison", value: "Draft", meta: "12 citations" },
          { label: "Competitor digest", value: "Delivered", meta: "9 citations" },
        ],
      },
      {
        title: "Template checks",
        rows: [
          { label: "Citation per claim", value: "Required", meta: "major claims" },
          { label: "Payment receipt", value: "Attached", meta: "paid evidence" },
          { label: "Uncertainty section", value: "Enabled", meta: "editor policy" },
        ],
      },
    ],
    activity: [
      { title: "Report compiled", detail: "Cited briefing generated with 18 source references.", time: "Today, 2:18 PM" },
      { title: "Editor pass complete", detail: "Unsupported claims removed from product comparison.", time: "Today, 1:44 PM" },
    ],
  },
  {
    slug: "evidence",
    title: "Evidence Ledger",
    eyebrow: "Sources",
    description: "Review source cards, snippets, timestamps, confidence scores, and x402 receipts attached to each research claim.",
    primaryAction: "Add evidence",
    secondaryAction: "Audit sources",
    metrics: [
      { label: "Evidence items", value: "2,300", copy: "Search results, snippets, provider payloads, and receipts." },
      { label: "Accepted sources", value: "940", copy: "Approved for citation in reports." },
      { label: "Needs review", value: "17", copy: "Conflicts, stale sources, or low-confidence claims." },
    ],
    panels: [
      {
        title: "Evidence queue",
        rows: [
          { label: "Battery recycling capacity source", value: "Accepted", meta: "fresh source with timestamp" },
          { label: "Laptop warranty comparison", value: "Review", meta: "provider data conflicts" },
          { label: "Competitor pricing snapshot", value: "Accepted", meta: "receipt attached" },
        ],
      },
      {
        title: "Ledger fields",
        rows: [
          { label: "Citation snippet", value: "Required", meta: "source-backed claim text" },
          { label: "Provider receipt", value: "Required", meta: "for paid calls" },
          { label: "Confidence score", value: "Required", meta: "shown to report editor" },
        ],
      },
    ],
    activity: [
      { title: "Evidence accepted", detail: "Three source cards were approved for the product comparison report.", time: "Today, 4:25 PM" },
      { title: "Conflict flagged", detail: "Market sizing sources disagreed and were routed to fact-checking.", time: "Today, 3:52 PM" },
    ],
  },
  {
    slug: "providers",
    title: "Provider Registry",
    eyebrow: "Composability",
    description: "Manage x402-enabled providers for search, summarization, fact-checking, enrichment, and report generation.",
    primaryAction: "Connect provider",
    secondaryAction: "Run handshake",
    metrics: [
      { label: "Connected providers", value: "8", copy: "Available to the planner and workflow canvas." },
      { label: "Provider classes", value: "5", copy: "Search, retrieval, facts, enrichment, reports." },
      { label: "Fallback chains", value: "5", copy: "Used when latency, budget, or policy blocks a call." },
    ],
    panels: [
      {
        title: "Provider catalog",
        rows: [
          { label: "Paid Search API", value: "$0.08/query", meta: "web, news, scholar" },
          { label: "Claim Verification API", value: "$0.42/claim", meta: "independent validation" },
          { label: "Entity Enrichment API", value: "$0.15/entity", meta: "structured data" },
        ],
      },
      {
        title: "Readiness checks",
        rows: [
          { label: "x402 terms", value: "Passing", meta: "amount, asset, expiry, resource" },
          { label: "Receipt verification", value: "Passing", meta: "settlement proof" },
          { label: "Policy allow-list", value: "Required", meta: "before paid use" },
        ],
      },
    ],
    activity: [
      { title: "Provider connected", detail: "Entity enrichment provider was made available to planner runs.", time: "Today, 2:43 PM" },
      { title: "Handshake tested", detail: "Paid Search API returned valid x402 payment terms.", time: "Today, 1:07 PM" },
    ],
  },
  {
    slug: "approvals",
    title: "Approvals",
    eyebrow: "Human control",
    description: "Approve new providers, budget increases, scheduled run scopes, and sensitive workflow changes before execution.",
    primaryAction: "Approve selected",
    secondaryAction: "Edit policy",
    metrics: [
      { label: "Pending approvals", value: "6", copy: "Provider, budget, and schedule requests." },
      { label: "Auto-approved", value: "31", copy: "Inside previously scoped allowances." },
      { label: "Blocked requests", value: "4", copy: "Outside policy or missing evidence." },
    ],
    panels: [
      {
        title: "Approval queue",
        rows: [
          { label: "New enrichment provider", value: "$0.15", meta: "first-time provider" },
          { label: "Market watch weekly cap", value: "$18", meta: "budget increase" },
          { label: "Daily briefing schedule", value: "Weekdays", meta: "recurring run" },
        ],
      },
      {
        title: "Control policies",
        rows: [
          { label: "New provider", value: "Ask", meta: "explicit approval required" },
          { label: "Budget increase", value: "Ask", meta: "no silent overspend" },
          { label: "Product checkout", value: "Blocked", meta: "research handoff only" },
        ],
      },
    ],
    activity: [
      { title: "Approval requested", detail: "A new paid provider needs permission before settlement.", time: "Today, 2:02 PM" },
      { title: "Budget approved", detail: "Daily briefing retained its $2 weekday allowance.", time: "Today, 8:15 AM" },
    ],
  },
  {
    slug: "schedules",
    title: "Schedules",
    eyebrow: "Recurring research",
    description: "Configure recurring briefings, market monitors, product watches, and policy trackers with scoped budgets.",
    primaryAction: "Create schedule",
    secondaryAction: "Calendar view",
    metrics: [
      { label: "Active schedules", value: "5", copy: "Recurring research workflows." },
      { label: "Weekly budget", value: "$42", copy: "Across all scheduled runs." },
      { label: "Next run", value: "8 AM", copy: "Daily competitor briefing." },
    ],
    panels: [
      {
        title: "Scheduled runs",
        rows: [
          { label: "Daily competitor briefing", value: "$2/day", meta: "weekdays at 8 AM" },
          { label: "Laptop price monitor", value: "$1/day", meta: "notify when threshold changes" },
          { label: "Battery policy tracker", value: "$9/week", meta: "government and news sources" },
        ],
      },
      {
        title: "Schedule safeguards",
        rows: [
          { label: "Scoped budget", value: "Required", meta: "per run or per period" },
          { label: "Report delivery", value: "Enabled", meta: "with citations" },
          { label: "Payment prompts", value: "Immediate", meta: "outside allowance" },
        ],
      },
    ],
    activity: [
      { title: "Schedule created", detail: "Policy tracker will run every Monday with a $9 cap.", time: "Yesterday, 5:15 PM" },
      { title: "Briefing delivered", detail: "Competitor pricing digest was sent to the workspace.", time: "Today, 8:02 AM" },
    ],
  },
  {
    slug: "docs",
    title: "Docs",
    eyebrow: "Reference",
    description: "Frontend placeholder for setup guides, API contracts, payment flows, and workflow recipes.",
    primaryAction: "Open guide",
    secondaryAction: "View API contract",
    metrics: [
      { label: "Guides", value: "8", copy: "Research, payments, and reports." },
      { label: "API specs", value: "5", copy: "Future backend contracts." },
      { label: "Recipes", value: "6", copy: "Reusable workflow examples." },
    ],
    panels: [
      {
        title: "Documentation sections",
        rows: [
          { label: "Research orchestration", value: "Guide", meta: "planner to report" },
          { label: "x402 payment flow", value: "Guide", meta: "402 handshake" },
          { label: "Evidence model", value: "Reference", meta: "citations and receipts" },
        ],
      },
      {
        title: "Backend handoff notes",
        rows: [
          { label: "Demo data", value: "Isolated", meta: "replace with connected services" },
          { label: "Routes", value: "Ready", meta: "standalone frontend" },
          { label: "Auth", value: "Disabled", meta: "add later" },
        ],
      },
    ],
    activity: [
      { title: "Docs page added", detail: "Topbar Docs now opens a standalone dashboard page.", time: "Today, 5:35 PM" },
      { title: "Contract noted", detail: "Backend integration points documented for this page.", time: "Today, 5:28 PM" },
    ],
  },
];

export function getPageBySlug(slug: string) {
  return pages.find((page) => page.slug === slug);
}
