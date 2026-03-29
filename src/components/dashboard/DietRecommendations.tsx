import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      toast({ title: "Your food recommendations are ready!" });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Could not get recommendations", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return null;

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
        <Apple className="h-7 w-7 text-primary" />
        What Should I Eat?
      </h2>

      <Card>
        <CardContent className="p-6 space-y-5">
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full text-base py-6 font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Looking at your results…
              </>
            ) : (
              "Get food recommendations based on my latest results"
            )}
          </Button>

          {result && result.recommendations && result.recommendations.length > 0 && (
            <div className="space-y-4">
              {result.recommendations.map((rec, i) => (
                <div key={i} className="border rounded-xl p-5 space-y-3">
                  <p className="text-lg font-bold text-primary">{rec.nutrient}</p>
                  <p className="text-base text-foreground">{rec.reason}</p>
                  <div className="flex flex-wrap gap-2">
                    {rec.foods.map((food, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center rounded-full bg-secondary border border-border px-4 py-1.5 text-sm font-medium text-foreground"
                      >
                        {food}
                      </span>
                    ))}
                  </div>
                  {rec.tip && (
                    <div className="flex items-start gap-3 text-base text-muted-foreground">
                      <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                      <span>{rec.tip}</span>
                    </div>
                  )}
                </div>
              ))}

              <p className="text-sm text-muted-foreground italic pt-3 border-t">
                {result.disclaimer || "These suggestions support your health but do not replace medical advice. Discuss with your doctor."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DietRecommendations;
