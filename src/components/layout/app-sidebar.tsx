"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, ClipboardList, BarChart3 } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavUser } from "@/components/layout/nav-user";
import type { Profile } from "@/types";

const navItems = [
  { title: "Panel", href: "/dashboard", icon: LayoutDashboard },
  { title: "Organizaciones", href: "/organizations", icon: Building2 },
  { title: "Campañas", href: "/campaigns", icon: BarChart3 },
  { title: "Instrumentos", href: "/instruments", icon: ClipboardList },
];

export function AppSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Image src="/logo.png" alt="ClimaLab" width={40} height={40} />
          <span className="text-lg font-semibold font-serif">ClimaLab</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegacion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser profile={profile} />
      </SidebarFooter>
    </Sidebar>
  );
}
