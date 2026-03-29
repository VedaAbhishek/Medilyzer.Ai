import MetricCards from "@/components/dashboard/MetricCards";

interface TestResultsSectionProps {
  markers: { name: string; value: number; unit: string | null; status: string | null }[];
  loading: boolean;
}

const TestResultsSection = ({ markers, loading }: TestResultsSectionProps) => (
  <div className="space-y-8">
    <h2 className="text-2xl font-bold text-foreground">My Test Results</h2>
    <MetricCards markers={markers} loading={loading} />
  </div>
);

export default TestResultsSection;
