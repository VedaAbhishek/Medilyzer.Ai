import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface DashboardNavbarProps {
  name: string;
  onSignOut: () => void;
}

const DashboardNavbar = ({ name, onSignOut }: DashboardNavbarProps) => (
  <header className="sticky top-0 z-30 border-b bg-card">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
      <span className="text-2xl font-bold text-primary tracking-tight">Medilyzer</span>
      <div className="flex items-center gap-5">
        <span className="text-lg font-medium text-foreground">Hi, {name} 👋</span>
        <Button variant="outline" size="default" onClick={onSignOut} className="gap-2 text-base px-5">
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  </header>
);

export default DashboardNavbar;
