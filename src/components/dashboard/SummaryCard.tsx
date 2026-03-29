import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SummaryCardProps {
  summary: string | null;
  loading: boolean;
}

const DEFAULT_SUMMARY =
  "Your blood sugar is in the normal range. Your B12 is below normal and has been declining over your last three tests. Everything else looks stable.";

const SummaryCard = ({ summary, loading }: SummaryCardProps) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-semibold flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        Plain-Language Summary
      </CardTitle>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {summary || DEFAULT_SUMMARY}
        </p>
      )}
    </CardContent>
  </Card>
);

export default SummaryCard;
