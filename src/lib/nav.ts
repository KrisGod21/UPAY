import type { UserRole } from "@/lib/types";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: UserRole[];
  group: "Operations" | "Programme" | "Insight" | "Administration";
}

const ALL: UserRole[] = ["admin", "coordinator", "teacher", "volunteer", "student"];
const STAFF: UserRole[] = ["admin", "coordinator", "teacher", "volunteer"];
const FIELD: UserRole[] = ["teacher", "volunteer"];
const LEADS: UserRole[] = ["admin", "coordinator"];

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", roles: ALL, group: "Operations" },
  { href: "/attendance", label: "Attendance", icon: "ScanFace", roles: STAFF, group: "Operations" },
  { href: "/checkin", label: "Check in", icon: "MapPin", roles: FIELD, group: "Operations" },
  { href: "/students", label: "Students", icon: "Users", roles: STAFF, group: "Programme" },
  { href: "/centers", label: "Centres", icon: "Building2", roles: STAFF, group: "Programme" },
  { href: "/zones", label: "Zones", icon: "Map", roles: LEADS, group: "Programme" },
  { href: "/volunteers", label: "Volunteers", icon: "HeartHandshake", roles: LEADS, group: "Programme" },
  { href: "/curriculum", label: "Curriculum", icon: "BookOpen", roles: STAFF, group: "Programme" },
  { href: "/assessments", label: "Assessments", icon: "ClipboardCheck", roles: STAFF, group: "Programme" },
  { href: "/analytics", label: "Analytics", icon: "BarChart3", roles: LEADS, group: "Insight" },
  { href: "/upaygpt", label: "UpayGPT", icon: "Sparkles", roles: STAFF, group: "Insight" },
  { href: "/certificates", label: "Certificates", icon: "Award", roles: ALL, group: "Insight" },
  { href: "/import", label: "Data import", icon: "Upload", roles: ["admin"], group: "Administration" },
  { href: "/team", label: "People & roles", icon: "ShieldCheck", roles: ["admin"], group: "Administration" },
];

export function navForRole(role: UserRole): NavItem[] {
  return NAV.filter((item) => item.roles.includes(role));
}
