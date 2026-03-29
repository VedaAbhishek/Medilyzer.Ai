import UploadButton from "@/components/dashboard/UploadButton";
import ReportsList from "@/components/dashboard/ReportsList";

interface ReportsSectionProps {
  patientId: string | null;
  refetch: () => void;
}

const ReportsSection = ({ patientId, refetch }: ReportsSectionProps) => (
  <div className="space-y-8">
    <h2 className="text-2xl font-bold text-foreground">My Reports</h2>
    <UploadButton patientId={patientId} onUploadComplete={refetch} />
    <ReportsList patientId={patientId} onDeleteComplete={refetch} />
  </div>
);

export default ReportsSection;
