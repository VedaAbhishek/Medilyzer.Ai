import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { usePatientData } from "@/hooks/usePatientData";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import ProfileCard from "@/components/dashboard/ProfileCard";
import MetricCards from "@/components/dashboard/MetricCards";
import TrendsChart from "@/components/dashboard/TrendsChart";
import SummaryCard from "@/components/dashboard/SummaryCard";
import UploadButton from "@/components/dashboard/UploadButton";
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
    <div className="min-h-screen bg-muted">
      <DashboardNavbar name={profile?.name || "Patient"} onSignOut={handleSignOut} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <ProfileCard
          name={patient?.name || profile?.name || "Patient"}
          bloodType={patient?.blood_type || null}
          conditions={patient?.conditions || null}
          allergies={patient?.allergies || null}
          loading={loading}
        />

        {!loading && !hasReports ? (
          <Card className="border-dashed">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">No reports uploaded yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Upload your first lab report or prescription to get started
                </p>
              </div>
              <UploadButton patientId={patientId} onUploadComplete={refetch} />
            </CardContent>
          </Card>
        ) : (
          <>
            <MetricCards markers={markers} loading={loading} />
            <TrendsChart trends={trends} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SummaryCard summary={summary} loading={loading} />
              <UploadButton patientId={patientId} onUploadComplete={refetch} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
