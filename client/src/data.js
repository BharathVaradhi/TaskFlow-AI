export const projects = [
  { id: 1, name: "Mobile App Redesign", desc: "Reimagine the customer mobile experience", status: "Active", priority: "High", progress: 72, due: "Jun 28", color: "#7c5cff", members: ["AM", "SK", "JR"] },
  { id: 2, name: "Q3 Marketing Campaign", desc: "Multi-channel product launch campaign", status: "Active", priority: "Medium", progress: 48, due: "Jul 15", color: "#ec7a9c", members: ["NP", "AM"] },
  { id: 3, name: "Analytics Dashboard", desc: "Unified business intelligence platform", status: "Planning", priority: "High", progress: 24, due: "Aug 02", color: "#42bfa5", members: ["SK", "TD", "JR"] },
  { id: 4, name: "Cloud Migration", desc: "Migrate core services to new infrastructure", status: "Delayed", priority: "Critical", progress: 61, due: "Jun 20", color: "#f3a44a", members: ["TD", "NP"] },
  { id: 5, name: "Customer Portal", desc: "Self-service support and billing portal", status: "Completed", priority: "Medium", progress: 100, due: "May 30", color: "#4f8df7", members: ["JR", "AM"] },
  { id: 6, name: "Security Audit", desc: "Annual security and compliance review", status: "On Hold", priority: "Low", progress: 35, due: "Jul 31", color: "#94a0b8", members: ["SK"] }
];

export const tasks = [
  { id: 1, title: "Create user flow diagrams", project: "Mobile App Redesign", priority: "High", due: "Today", assignee: "AM", status: "Todo" },
  { id: 2, title: "Prepare campaign brief", project: "Q3 Marketing Campaign", priority: "Medium", due: "Jun 12", assignee: "NP", status: "Todo" },
  { id: 3, title: "Build navigation prototype", project: "Mobile App Redesign", priority: "High", due: "Jun 14", assignee: "SK", status: "In Progress" },
  { id: 4, title: "Configure analytics events", project: "Analytics Dashboard", priority: "Medium", due: "Jun 16", assignee: "TD", status: "In Progress" },
  { id: 5, title: "Review onboarding screens", project: "Mobile App Redesign", priority: "Low", due: "Jun 13", assignee: "JR", status: "Review" },
  { id: 6, title: "Approve production release", project: "Customer Portal", priority: "High", due: "Jun 10", assignee: "AM", status: "Review" },
  { id: 7, title: "Finalize API documentation", project: "Customer Portal", priority: "Medium", due: "Jun 08", assignee: "TD", status: "Completed" },
  { id: 8, title: "User acceptance testing", project: "Customer Portal", priority: "High", due: "Jun 06", assignee: "NP", status: "Completed" }
];

export const team = [
  { name: "Alex Morgan", role: "Product Designer", initials: "AM", color: "#7c5cff", tasks: 12, done: 9, workload: 82 },
  { name: "Sara Kim", role: "Frontend Engineer", initials: "SK", color: "#ec7a9c", tasks: 15, done: 11, workload: 91 },
  { name: "Jordan Reed", role: "UX Researcher", initials: "JR", color: "#42bfa5", tasks: 8, done: 7, workload: 63 },
  { name: "Noah Patel", role: "Growth Lead", initials: "NP", color: "#f3a44a", tasks: 10, done: 8, workload: 74 },
  { name: "Taylor Diaz", role: "Backend Engineer", initials: "TD", color: "#4f8df7", tasks: 14, done: 10, workload: 87 }
];
