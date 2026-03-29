import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { usePatientData } from "@/hooks/usePatientData";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar, { type DashboardSection } from "@/components/dashboard/DashboardSidebar";
import DashboardFooter from "@/components/dashboard/DashboardFooter";
import HomeSection from "@/components/dashboard/sections/HomeSection";
import ReportsSection from "@/components/dashboard/sections/ReportsSection";
import TestResultsSection from "@/components/dashboard/sections/TestResultsSection";
import MedicationsSection from "@/components/dashboard/sections/MedicationsSection";
import DietSection from "@/components/dashboard/sections/DietSection";
import FindDoctorSection from "@/components/dashboard/sections/FindDoctorSection";
import FloatingChat from "@/components/dashboard/FloatingChat";

const Dashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { patientId, patient, markers, trends, summary, hasReports, loading, medications, refetch } = usePatientData();
  const [activeSection, setActiveSection] = useState<DashboardSection>("home");

  // Redirect to setup if profile not completed
  useEffect(() => {
    if (!loading && patient && !(patient as any).profile_completed) {
      navigate("/setup-profile", { replace: true });
    }
  }, [loading, patient, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const name = profile?.name || "there";

  const renderSection = () => {
    switch (activeSection) {
      case "home":
        return (
          <HomeSection
            patient={patient}
            profileName={name}
            markers={markers}
            trends={trends}
            summary={summary}
            hasReports={hasReports}
            loading={loading}
            patientId={patientId}
            refetch={refetch}
            medications={medications}
          />
        );
      case "reports":
        return <ReportsSection patientId={patientId} refetch={refetch} />;
      case "results":
        return <TestResultsSection patientId={patientId} />;
      case "medications":
        return <MedicationsSection patientId={patientId} />;
      case "diet":
        return <DietSection patientId={patientId} />;
      case "doctor":
        return <FindDoctorSection patientId={patientId} />;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted">
        <DashboardSidebar
          name={name}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onSignOut={handleSignOut}
        />
        <div className="flex-1 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 h-14 flex items-center border-b border-border bg-card px-4 md:hidden">
            <SidebarTrigger />
            <span className="ml-3 text-lg font-bold text-primary">Medilyzer</span>
          </header>
          <main className="flex-1 p-6 sm:p-8 max-w-5xl w-full mx-auto">
            {renderSection()}
          </main>
          <DashboardFooter />
        </div>
        <FloatingChat patientId={patientId} />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
