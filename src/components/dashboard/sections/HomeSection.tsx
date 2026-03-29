import ProfileCard from "@/components/dashboard/ProfileCard";
import MetricCards from "@/components/dashboard/MetricCards";
import TrendsChart from "@/components/dashboard/TrendsChart";
import SummaryCard from "@/components/dashboard/SummaryCard";
import UploadButton from "@/components/dashboard/UploadButton";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface HomeSectionProps {
  patient: { name: string; blood_type: string | null; conditions: string[] | null; allergies: string[] | null } | null;
  profileName: string;
  markers: { name: string; value: number; unit: string | null; status: string | null }[];
  trends: { date: string; name: string; value: number }[];
  summary: string | null;
  hasReports: boolean;
  loading: boolean;
  patientId: string | null;
  refetch: () => void;
}

const HomeSection = ({ patient, profileName, markers, trends, summary, hasReports, loading, patientId, refetch }: HomeSectionProps) => (
  <div className="space-y-8">
    <ProfileCard
      name={patient?.name || profileName}
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
      </>
    )}
  </div>
);

export default HomeSection;
