import { Card, CardContent } from "@/components/ui/card";
import { Stethoscope } from "lucide-react";

const FindDoctorSection = () => (
  <div className="space-y-8">
    <h2 className="text-2xl font-bold text-foreground">Find a Doctor</h2>
    <Card>
      <CardContent className="py-20 flex flex-col items-center justify-center text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Stethoscope className="h-9 w-9 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">Coming Soon</h3>
          <p className="text-base text-muted-foreground max-w-md">
            Soon you'll be able to find nearby doctors based on the specialty you need.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default FindDoctorSection;
