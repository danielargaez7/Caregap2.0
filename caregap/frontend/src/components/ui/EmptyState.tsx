import { Inbox, Bell, ClipboardList, AlertTriangle, ScrollText, type LucideIcon } from "lucide-react";

const PRESETS: Record<string, { icon: LucideIcon; title: string; description: string }> = {
  alerts: { icon: Bell, title: "No alerts found", description: "All clear — no alerts match your current filters." },
  followups: { icon: ClipboardList, title: "No followup tasks", description: "No open tasks match your current filters." },
  assessments: { icon: AlertTriangle, title: "No risk assessments yet", description: "Run a cohort assessment to evaluate your patient panel." },
  audit: { icon: ScrollText, title: "No audit entries", description: "No log entries match your current filters." },
  default: { icon: Inbox, title: "Nothing here yet", description: "No data to display." },
};

interface EmptyStateProps {
  preset?: keyof typeof PRESETS;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ preset = "default", icon, title, description, action }: EmptyStateProps) {
  const p = PRESETS[preset] || PRESETS.default;
  const Icon = icon || p.icon;
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-700">{title || p.title}</p>
      <p className="text-xs text-gray-400 mt-1 max-w-xs">{description || p.description}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary mt-4 text-xs">
          {action.label}
        </button>
      )}
    </div>
  );
}
