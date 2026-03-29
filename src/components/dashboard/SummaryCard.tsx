import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SummaryCardProps {
  summary: string | null;
  loading: boolean;
}

const SummaryCard = ({ summary, loading }: SummaryCardProps) => (
  <Card>
    <CardContent className="p-6 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground">What My Results Mean</h3>
      </div>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      ) : (
        <p className="text-base leading-relaxed text-foreground">
          {summary || "Upload a report to see a simple explanation of your results."}
        </p>
      )}
    </CardContent>
  </Card>
);

export default SummaryCard;
