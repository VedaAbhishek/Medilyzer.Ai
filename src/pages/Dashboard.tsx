import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { usePatientData } from "@/hooks/usePatientData";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import ProfileCard from "@/components/dashboard/ProfileCard";
import MetricCards from "@/components/dashboard/MetricCards";
import TrendsChart from "@/components/dashboard/TrendsChart";
import SummaryCard from "@/components/dashboard/SummaryCard";
import UploadButton from "@/components/dashboard/UploadButton";

const Dashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { patientId, markers, summary, loading, refetch } = usePatientData();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-muted">
      <DashboardNavbar name={profile?.name || "Patient"} onSignOut={handleSignOut} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <ProfileCard />
        <MetricCards markers={markers} loading={loading} />
        <TrendsChart />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SummaryCard summary={summary} loading={loading} />
          <UploadButton patientId={patientId} onUploadComplete={refetch} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
