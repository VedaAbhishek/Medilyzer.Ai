import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Apple, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FoodItem {
  emoji: string;
  name: string;
  reason: string;
}

interface DietResult {
  foods_to_eat: FoodItem[];
  foods_to_avoid: FoodItem[];
}

interface DietRecommendationsProps {
  patientId: string | null;
}

const DietRecommendations = ({ patientId }: DietRecommendationsProps) => {
  const [result, setResult] = useState<DietResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"eat" | "avoid">("eat");

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
        } catch { /* ignore */ }
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
      toast({ title: "Your food guide is ready!" });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Could not get recommendations", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return null;

  const foods = activeTab === "eat" ? result?.foods_to_eat : result?.foods_to_avoid;

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
        <Apple className="h-7 w-7 text-primary" />
        What Should I Eat?
      </h2>

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
          "Get my personalised food guide"
        )}
      </Button>

      {result && (result.foods_to_eat?.length > 0 || result.foods_to_avoid?.length > 0) && (
        <div className="space-y-5">
          {/* Toggle buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab("eat")}
              className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all ${
                activeTab === "eat"
                  ? "bg-emerald-500 text-white shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              🥗 Foods to Eat
            </button>
            <button
              onClick={() => setActiveTab("avoid")}
              className={`flex-1 py-3.5 rounded-xl text-base font-bold transition-all ${
                activeTab === "avoid"
                  ? "bg-red-500 text-white shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              🚫 Foods to Avoid
            </button>
          </div>

          {/* Food grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {foods?.map((item, i) => (
              <Card
                key={i}
                className={`p-4 flex flex-col items-center text-center gap-2 ${
                  activeTab === "eat"
                    ? "border-emerald-200 bg-white"
                    : "border-red-200 bg-white"
                }`}
              >
                <span className="text-4xl leading-none">{item.emoji}</span>
                <p className="text-base font-bold text-foreground leading-tight">{item.name}</p>
                <p className="text-xs text-muted-foreground leading-snug">{item.reason}</p>
              </Card>
            ))}
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Talk to your doctor before making big diet changes.
          </p>
        </div>
      )}
    </div>
  );
};

export default DietRecommendations;
