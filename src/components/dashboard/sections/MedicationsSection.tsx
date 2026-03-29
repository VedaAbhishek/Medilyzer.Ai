import MedicationsList from "@/components/dashboard/MedicationsList";

interface MedicationsSectionProps {
  patientId: string | null;
}

const MedicationsSection = ({ patientId }: MedicationsSectionProps) => (
  <div className="space-y-8">
    <h2 className="text-2xl font-bold text-foreground">My Medications</h2>
    <MedicationsList patientId={patientId} />
  </div>
);

export default MedicationsSection;
