import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Medilyzer</h1>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign Out
        </Button>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-foreground">
          Welcome, {profile?.name || "Patient"} 👋
        </h2>
        <p className="mt-3 text-muted-foreground">
          Your medical passport is ready. We'll build out your dashboard next.
        </p>
      </main>
    </div>
  );
};

export default Dashboard;
