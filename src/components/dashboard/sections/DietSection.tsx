import DietRecommendations from "@/components/dashboard/DietRecommendations";

interface DietSectionProps {
  patientId: string | null;
}

const DietSection = ({ patientId }: DietSectionProps) => (
  <div className="space-y-8">
    <DietRecommendations patientId={patientId} />
  </div>
);

export default DietSection;
