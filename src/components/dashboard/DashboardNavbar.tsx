import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface DashboardNavbarProps {
  name: string;
  onSignOut: () => void;
}

const DashboardNavbar = ({ name, onSignOut }: DashboardNavbarProps) => (
  <header className="sticky top-0 z-30 border-b bg-card">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <span className="text-xl font-bold text-primary tracking-tight">Medilyzer</span>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-foreground hidden sm:inline">{name}</span>
        <Button variant="outline" size="sm" onClick={onSignOut} className="gap-1.5">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </div>
  </header>
);

export default DashboardNavbar;
