import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Apple, Loader2, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Recommendation {
  nutrient: string;
  reason: string;
  foods: string[];
  tip: string;
}

interface DietResult {
  recommendations: Recommendation[];
  disclaimer: string;
}

interface DietRecommendationsProps {
  patientId: string | null;
}

const DietRecommendations = ({ patientId }: DietRecommendationsProps) => {
  const [result, setResult] = useState<DietResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load existing recommendation from DB
  useEffect(() => {
    if (!patientId) return;
    const load = async () => {
      const { data } = await supabase
        .from("diet_recommendations")
        .select("content")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data?.[0]?.content) {
        try {
          setResult(JSON.parse(data[0].content));
        } catch { /* ignore parse errors */ }
      }
      setInitialLoading(false);
    };
    load();
  }, [patientId]);

  const handleGenerate = async () => {
    if (!patientId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("get-diet-recommendation", {
        body: { patient_id: patientId },
      });

      if (error) throw error;
      setResult(data);
      toast({ title: "Diet recommendations updated" });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to get recommendations", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Apple className="h-5 w-5 text-primary" />
          What Should I Eat?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleGenerate}
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Analysing your results…
            </>
          ) : (
            "Get diet recommendations based on my latest results"
          )}
        </Button>

        {result && result.recommendations && result.recommendations.length > 0 && (
          <div className="space-y-3">
            {result.recommendations.map((rec, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0">
                    {rec.nutrient}
                  </Badge>
                </div>
                <p className="text-sm text-foreground">{rec.reason}</p>
                <div className="flex flex-wrap gap-1.5">
                  {rec.foods.map((food, j) => (
                    <Badge key={j} variant="secondary" className="text-xs">{food}</Badge>
                  ))}
                </div>
                {rec.tip && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>{rec.tip}</span>
                  </div>
                )}
              </div>
            ))}

            <p className="text-xs text-muted-foreground italic pt-2 border-t">
              {result.disclaimer || "These suggestions support your health but do not replace medical advice. Discuss with your doctor."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DietRecommendations;
