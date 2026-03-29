import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Apple, Loader2, Plus, RefreshCw, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FoodItem {
  emoji: string;
  name: string;
  reason: string;
  nutrients?: string[];
  serving?: string;
}

interface Deficiency {
  nutrient: string;
  level: string;
  severity: "low" | "medium" | "high";
}

interface MealDay {
  breakfast: string;
  lunch: string;
  snack: string;
  dinner: string;
}

interface DietResult {
  deficiencies: Deficiency[];
  foods_to_eat: FoodItem[];
  foods_to_avoid: FoodItem[];
  meal_plan: Record<string, MealDay>;
}

interface MarkerInfo {
  name: string;
  value: number;
  unit: string | null;
  status: string | null;
}

interface FoodLogEntry {
  name: string;
  time: string;
}

interface DietRecommendationsProps {
  patientId: string | null;
}

const NUTRIENT_FILTERS = ["Iron", "Vitamin B12", "Folate", "Vitamin C", "Fiber", "Protein"];
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const SOURCES = [
  { name: "USDA FoodData Central", url: "fdc.nal.usda.gov" },
  { name: "National Institutes of Health, Office of Dietary Supplements", url: "ods.od.nih.gov" },
  { name: "Harvard T.H. Chan School of Public Health, The Nutrition Source", url: "hsph.harvard.edu/nutritionsource" },
  { name: "Academy of Nutrition and Dietetics", url: "eatright.org" },
  { name: "American Heart Association", url: "heart.org" },
];

const DietRecommendations = ({ patientId }: DietRecommendationsProps) => {
  const [result, setResult] = useState<DietResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [markers, setMarkers] = useState<MarkerInfo[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [foodLog, setFoodLog] = useState<FoodLogEntry[]>([]);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logInput, setLogInput] = useState("");

  useEffect(() => {
    if (!patientId) return;
    const load = async () => {
      const [{ data: dietData }, { data: markerData }] = await Promise.all([
        supabase
          .from("diet_recommendations")
          .select("content")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("markers")
          .select("name, value, unit, status")
          .eq("patient_id", patientId)
          .order("date", { ascending: false })
          .limit(50),
      ]);

      if (dietData?.[0]?.content) {
        try {
          setResult(JSON.parse(dietData[0].content));
        } catch { /* ignore */ }
      }

      // Deduplicate markers
      const seen = new Set<string>();
      const unique: MarkerInfo[] = [];
      (markerData || []).forEach(m => {
        if (!seen.has(m.name)) {
          seen.add(m.name);
          unique.push({ name: m.name, value: Number(m.value), unit: m.unit, status: m.status });
        }
      });
      setMarkers(unique);
      setInitialLoading(false);
    };
    load();
  }, [patientId]);

  const handleGenerate = async (force = false) => {
    if (!patientId) return;
    if (!force && result) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-diet-recommendation", {
        body: { patient_id: patientId },
      });
      if (error) throw error;
      setResult(data);
      toast({ title: "Your personalised food guide is ready!" });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Could not get recommendations", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogMeal = () => {
    if (!logInput.trim()) return;
    setFoodLog(prev => [...prev, {
      name: logInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }]);
    setLogInput("");
    setLogModalOpen(false);
    toast({ title: "Meal logged!" });
  };

  const filterFoods = (foods: FoodItem[]) => {
    if (!activeFilter) return foods;
    return foods.filter(f =>
      f.nutrients?.some(n => n.toLowerCase().includes(activeFilter.toLowerCase()))
    );
  };

  if (initialLoading) return null;

  // Build deficiencies from markers if no AI result yet
  const deficiencies = result?.deficiencies || [];
  const markerDeficiencies = markers.filter(m =>
    m.status && ["low", "high"].includes(m.status.toLowerCase())
  );

  const todayIndex = new Date().getDay();
  const todayKey = DAYS[todayIndex === 0 ? 6 : todayIndex - 1];
  const todayMeals = result?.meal_plan?.[todayKey];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
        <Apple className="h-7 w-7 text-primary" />
        What Should I Eat?
      </h2>

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => handleGenerate(false)}
          disabled={loading}
          className="flex-1 text-base py-6 font-semibold"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Generating your food guide…
            </>
          ) : (
            "Get My Personalised Food Guide"
          )}
        </Button>
        {result && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleGenerate(true)}
            disabled={loading}
            className="text-primary text-sm gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </Button>
        )}
      </div>

      {/* SECTION A — Deficiency banner */}
      {(deficiencies.length > 0 || markerDeficiencies.length > 0) && (
        <Card className="bg-foreground text-card">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-medium text-card/80">
              Based on your test results — deficiencies detected
            </p>
            <div className="flex flex-wrap gap-2">
              {deficiencies.length > 0 ? (
                deficiencies.map((d, i) => (
                  <Badge key={i} className={`text-sm px-3 py-1 ${
                    d.severity === "high" ? "bg-red-500 text-white" :
                    d.severity === "medium" ? "bg-amber-500 text-white" :
                    "bg-emerald-500 text-white"
                  }`}>
                    {d.severity === "high" ? "Low" : d.severity === "medium" ? "High" : "Normal"} {d.nutrient} · {d.level}
                  </Badge>
                ))
              ) : (
                markerDeficiencies.map((m, i) => (
                  <Badge key={i} className={`text-sm px-3 py-1 ${
                    m.status?.toLowerCase() === "low" ? "bg-red-500 text-white" :
                    "bg-amber-500 text-white"
                  }`}>
                    {m.status?.toLowerCase() === "low" ? "Low" : "High"} {m.name} · {m.value} {m.unit || ""}
                  </Badge>
                ))
              )}
              {markers.filter(m => m.status?.toLowerCase() === "normal").slice(0, 3).map((m, i) => (
                <Badge key={`n-${i}`} className="text-sm px-3 py-1 bg-emerald-500 text-white">
                  {m.name} normal
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* SECTION B — Tabs */}
          <Tabs defaultValue="eat" className="space-y-5">
            <TabsList className="grid grid-cols-4 w-full h-auto">
              <TabsTrigger value="eat" className="py-3 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Foods to Eat
              </TabsTrigger>
              <TabsTrigger value="avoid" className="py-3 text-sm font-semibold">
                Foods to Avoid
              </TabsTrigger>
              <TabsTrigger value="meal-plan" className="py-3 text-sm font-semibold relative">
                Weekly Meal Plan
                <Badge className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0">new</Badge>
              </TabsTrigger>
              <TabsTrigger value="food-log" className="py-3 text-sm font-semibold relative">
                My Food Log
                <Badge className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0">new</Badge>
              </TabsTrigger>
            </TabsList>

            {/* SECTION C — Nutrient filters (for eat/avoid tabs) */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {NUTRIENT_FILTERS.map(n => (
                <button
                  key={n}
                  onClick={() => setActiveFilter(activeFilter === n ? null : n)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors ${
                    activeFilter === n
                      ? "border-primary text-primary bg-primary/5"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Foods to Eat */}
            <TabsContent value="eat">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filterFoods(result.foods_to_eat || []).map((item, i) => (
                  <Card key={i} className="border-[0.5px] rounded-xl hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex flex-col items-center text-center gap-2 relative">
                      {item.serving && (
                        <span className="absolute top-2 right-2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {item.serving}
                        </span>
                      )}
                      <span className="text-4xl leading-none">{item.emoji}</span>
                      <p className="text-base font-bold text-foreground leading-tight">{item.name}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{item.reason}</p>
                      {item.nutrients && item.nutrients.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mt-1">
                          {item.nutrients.map((n, j) => (
                            <span key={j} className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              {n}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Foods to Avoid */}
            <TabsContent value="avoid">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filterFoods(result.foods_to_avoid || []).map((item, i) => (
                  <Card key={i} className="border-[0.5px] border-red-200 rounded-xl hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                      <span className="text-4xl leading-none">{item.emoji}</span>
                      <p className="text-base font-bold text-foreground leading-tight">{item.name}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{item.reason}</p>
                      {item.nutrients && item.nutrients.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1 mt-1">
                          {item.nutrients.map((n, j) => (
                            <span key={j} className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              {n}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Weekly Meal Plan */}
            <TabsContent value="meal-plan">
              {result.meal_plan && Object.keys(result.meal_plan).length > 0 ? (
                <div className="space-y-3">
                  {DAYS.map(day => {
                    const meals = result.meal_plan[day];
                    if (!meals) return null;
                    return (
                      <Card key={day} className="border-[0.5px] rounded-xl">
                        <CardContent className="p-4">
                          <p className="text-sm font-bold text-foreground mb-3 capitalize">{day}</p>
                          <div className="grid grid-cols-4 gap-3">
                            {(["breakfast", "lunch", "snack", "dinner"] as const).map(meal => (
                              <div key={meal} className="bg-muted rounded-lg p-3 text-center">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">{meal}</p>
                                <p className="text-sm text-foreground">{meals[meal]}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-base text-muted-foreground">Generate your food guide to see a weekly meal plan</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* My Food Log */}
            <TabsContent value="food-log">
              <div className="space-y-4">
                <Button onClick={() => setLogModalOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Log a meal
                </Button>
                {foodLog.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-base text-muted-foreground">No meals logged today. Tap "Log a meal" to start tracking.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {foodLog.map((entry, i) => (
                      <Card key={i} className="border-[0.5px] rounded-xl">
                        <CardContent className="p-4 flex items-center justify-between">
                          <p className="text-base font-medium text-foreground">{entry.name}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {entry.time}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* SECTION E — Today's suggested meals */}
          {todayMeals && (
            <Card className="border-[0.5px] rounded-xl">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-foreground">Today's suggested meals</p>
                  <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">new</Badge>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {(["breakfast", "lunch", "snack", "dinner"] as const).map(meal => (
                    <div key={meal} className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">{meal}</p>
                      <p className="text-sm text-foreground">{todayMeals[meal]}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION G — Meal log strip */}
          <Card className="border-[0.5px] rounded-xl">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-foreground">Log what you ate today</p>
                <p className="text-sm text-muted-foreground">Track your meals to see nutrient gaps fill up in real time</p>
              </div>
              <Button onClick={() => setLogModalOpen(true)} className="gap-2 shrink-0">
                <Plus className="h-4 w-4" /> Log a meal
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* SECTION H — References */}
      <div className="space-y-2 pt-4">
        <p className="text-xs font-medium text-muted-foreground">Sources</p>
        <div className="space-y-1">
          {SOURCES.map((s, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {s.name} — <span className="text-primary">{s.url}</span>
            </p>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Talk to your doctor before making big diet changes.
      </p>

      {/* Log meal modal */}
      <Dialog open={logModalOpen} onOpenChange={setLogModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log a meal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={logInput}
              onChange={(e) => setLogInput(e.target.value)}
              placeholder="What did you eat? e.g. Grilled chicken with rice"
              onKeyDown={(e) => e.key === "Enter" && handleLogMeal()}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleLogMeal} disabled={!logInput.trim()}>
              Log Meal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DietRecommendations;
