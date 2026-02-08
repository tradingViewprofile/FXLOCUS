import { Activity, BookOpen, Compass, Shield, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Compass,
  Activity,
  Workflow,
  Shield
};

export function AcademyIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && iconMap[name]) || BookOpen;
  return <Icon aria-hidden="true" className={className} />;
}
