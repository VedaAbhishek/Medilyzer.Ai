import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileCardProps {
  name: string;
  bloodType: string | null;
  conditions: string[] | null;
  allergies: string[] | null;
  loading: boolean;
}

const ProfileCard = ({ name, bloodType, conditions, allergies, loading }: ProfileCardProps) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-5 w-52" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">{name}</h2>
              {bloodType && (
                <Badge variant="outline" className="text-xs font-semibold">
                  {bloodType}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              {conditions && conditions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">Conditions</span>
                  {conditions.map((c) => (
                    <Badge key={c} className="bg-primary/10 text-primary hover:bg-primary/20 border-0 text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
              )}
              {allergies && allergies.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">Allergies</span>
                  {allergies.map((a) => (
                    <Badge key={a} variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-0 text-xs">
                      {a}
                    </Badge>
                  ))}
                </div>
              )}
              {(!conditions || conditions.length === 0) && (!allergies || allergies.length === 0) && (
                <p className="text-sm text-muted-foreground">No conditions or allergies recorded yet.</p>
              )}
            </div>
          </div>

          <Button variant="outline" size="sm" className="gap-1.5 shrink-0 self-start">
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
