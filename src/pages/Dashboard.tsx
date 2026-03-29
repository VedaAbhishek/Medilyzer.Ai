import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { usePatientData } from "@/hooks/usePatientData";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import DashboardFooter from "@/components/dashboard/DashboardFooter";
import ProfileCard from "@/components/dashboard/ProfileCard";
import MetricCards from "@/components/dashboard/MetricCards";
import TrendsChart from "@/components/dashboard/TrendsChart";
import SummaryCard from "@/components/dashboard/SummaryCard";
import UploadButton from "@/components/dashboard/UploadButton";
import ReportsList from "@/components/dashboard/ReportsList";
import MedicationsList from "@/components/dashboard/MedicationsList";
import DietRecommendations from "@/components/dashboard/DietRecommendations";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

const Dashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { patientId, patient, markers, trends, summary, hasReports, loading, refetch } = usePatientData();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <DashboardNavbar name={profile?.name || "there"} onSignOut={handleSignOut} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
        <ProfileCard
          name={patient?.name || profile?.name || "Patient"}
          bloodType={patient?.blood_type || null}
          conditions={patient?.conditions || null}
          allergies={patient?.allergies || null}
          loading={loading}
        />

        {!loading && !hasReports ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-20 flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-9 w-9 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">No reports uploaded yet</h3>
                <p className="text-base text-muted-foreground max-w-md">
                  Upload your first lab report or prescription to get started. We'll read it and explain everything in simple words.
                </p>
              </div>
              <UploadButton patientId={patientId} onUploadComplete={refetch} />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-5">
              <h2 className="text-2xl font-bold text-foreground">My Test Results</h2>
              <MetricCards markers={markers} loading={loading} />
            </div>

            <TrendsChart trends={trends} />

            <SummaryCard summary={summary} loading={loading} />

            <UploadButton patientId={patientId} onUploadComplete={refetch} />

            <MedicationsList patientId={patientId} />
            <DietRecommendations patientId={patientId} />
            <ReportsList patientId={patientId} onDeleteComplete={refetch} />
          </>
        )}
      </main>

      <DashboardFooter />
    </div>
  );
};

export default Dashboard;
