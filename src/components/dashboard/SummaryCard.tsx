import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const SummaryCard = () => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-semibold flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        Plain-Language Summary
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Your blood sugar is in the normal range. Your B12 is below normal and has been declining over your last three tests. Everything else looks stable.
      </p>
    </CardContent>
  </Card>
);

export default SummaryCard;
