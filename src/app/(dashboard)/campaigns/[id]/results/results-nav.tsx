"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
  MessageSquare,
  FileText,
  Download,
} from "lucide-react";

const navItems = [
  { href: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "dimensions", label: "Dimensiones", icon: BarChart3 },
  { href: "trends", label: "Tendencias", icon: TrendingUp },
  { href: "segments", label: "Segmentación", icon: Users },
  { href: "drivers", label: "Drivers", icon: Target },
  { href: "alerts", label: "Alertas", icon: AlertTriangle },
  { href: "comments", label: "Comentarios", icon: MessageSquare },
  { href: "technical", label: "Ficha Técnica", icon: FileText },
  { href: "export", label: "Exportar", icon: Download },
];

export function ResultsSidebar({
  campaignId,
  campaignName,
}: {
  campaignId: string;
  campaignName: string;
}) {
  const pathname = usePathname();
  const basePath = `/campaigns/${campaignId}/results`;

  return (
    <aside className="w-56 border-r bg-muted/30 p-4 print:hidden">
      <div className="mb-4">
        <p className="text-xs text-muted-foreground">Resultados</p>
        <p className="text-sm font-semibold truncate">{campaignName}</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const href = `${basePath}/${item.href}`;
          const isActive =
            pathname === href || (item.href === "dashboard" && pathname === basePath);
          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 pt-4 border-t">
        <Link
          href={`/campaigns/${campaignId}`}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          ← Volver a campaña
        </Link>
      </div>
    </aside>
  );
}
