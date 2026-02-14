"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
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
} from "lucide-react"

interface ResultsSidebarProps {
  campaignId: string
  currentPath: string
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "", icon: LayoutDashboard },
  { label: "Dimensiones", href: "/dimensions", icon: BarChart3 },
  { label: "Tendencias", href: "/trends", icon: TrendingUp },
  { label: "Segmentos", href: "/segments", icon: Users },
  { label: "Impulsores", href: "/drivers", icon: Target },
  { label: "Alertas", href: "/alerts", icon: AlertTriangle },
  { label: "Comentarios", href: "/comments", icon: MessageSquare },
  { label: "Tecnico", href: "/technical", icon: FileText },
  { label: "Exportar", href: "/export", icon: Download },
]

export function ResultsSidebar({ campaignId, currentPath }: ResultsSidebarProps) {
  const basePath = `/campaigns/${campaignId}/results`

  return (
    <nav className="flex flex-col gap-1 py-2">
      {NAV_ITEMS.map((item) => {
        const fullPath = `${basePath}${item.href}`
        const isActive =
          currentPath === fullPath ||
          (item.href === "" && currentPath === basePath)

        return (
          <Link
            key={item.href}
            href={fullPath}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
