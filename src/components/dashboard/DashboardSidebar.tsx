import { Home, FileText, BarChart3, Pill, Salad, MessageCircle, Stethoscope, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export type DashboardSection = "home" | "reports" | "results" | "medications" | "diet" | "doctor";

const navItems: { id: DashboardSection; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "reports", label: "My Reports", icon: FileText },
  { id: "results", label: "My Test Results", icon: BarChart3 },
  { id: "medications", label: "My Medications", icon: Pill },
  { id: "diet", label: "What Should I Eat?", icon: Salad },
  { id: "doctor", label: "Find a Doctor", icon: Stethoscope },
];

interface DashboardSidebarProps {
  name: string;
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  onSignOut: () => void;
}

const DashboardSidebar = ({ name, activeSection, onSectionChange, onSignOut }: DashboardSidebarProps) => {
  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-5 border-b border-border">
        <span className="text-2xl font-bold text-primary tracking-tight">Medilyzer</span>
        <p className="text-base font-medium text-foreground mt-2">Hi, {name} 👋</p>
      </SidebarHeader>

      <SidebarContent className="py-3">
        <SidebarMenu>
          {navItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  isActive={active}
                  onClick={() => onSectionChange(item.id)}
                  tooltip={item.label}
                  className={`mx-2 px-4 py-3 text-base rounded-lg transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-base">{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <Button variant="outline" onClick={onSignOut} className="w-full gap-2 text-base">
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
