import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Apple, Loader2, Plus, RefreshCw, Clock, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

interface DietPreferences {
  diet_type: string;
  food_allergies: string[];
  cuisine_preferences: string[];
  meals_per_day: number;
}

interface DietRecommendationsProps {
  patientId: string | null;
}

const NUTRIENT_FILTERS = ["Iron", "Vitamin B12", "Folate", "Vitamin C", "Fiber", "Protein"];
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DIET_TYPES = [
  { value: "no_restrictions", label: "No restrictions", emoji: "🍽️" },
  { value: "vegetarian", label: "Vegetarian", emoji: "🥬" },
  { value: "vegan", label: "Vegan", emoji: "🌱" },
  { value: "pescatarian", label: "Pescatarian", emoji: "🐟" },
  { value: "gluten_free", label: "Gluten free", emoji: "🌾" },
  { value: "dairy_free", label: "Dairy free", emoji: "🥛" },
  { value: "halal", label: "Halal", emoji: "☪️" },
  { value: "kosher", label: "Kosher", emoji: "✡️" },
];
const FOOD_ALLERGIES_LIST = ["Peanuts", "Tree nuts", "Shellfish", "Fish", "Eggs", "Soy", "Wheat", "Dairy", "Sesame", "Other"];
const CUISINE_LIST = ["American", "Mediterranean", "Mexican", "Indian", "Asian", "Middle Eastern", "Italian", "No preference"];

const SOURCES = [
  { name: "USDA FoodData Central", url: "fdc.nal.usda.gov" },
  { name: "National Institutes of Health, Office of Dietary Supplements", url: "ods.od.nih.gov" },
  { name: "Harvard T.H. Chan School of Public Health, The Nutrition Source", url: "hsph.harvard.edu/nutritionsource" },
  { name: "Academy of Nutrition and Dietetics", url: "eatright.org" },
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
  const [dietPrefs, setDietPrefs] = useState<DietPreferences>({ diet_type: "", food_allergies: [], cuisine_preferences: [], meals_per_day: 3 });
  const [prefsModalOpen, setPrefsModalOpen] = useState(false);
  const [editPrefs, setEditPrefs] = useState<DietPreferences>(dietPrefs);

  useEffect(() => {
    if (!patientId) return;
    const load = async () => {
      const [{ data: dietData }, { data: markerData }, { data: patientData }] = await Promise.all([
        supabase.from("diet_recommendations").select("content").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1),
        supabase.from("markers").select("name, value, unit, status").eq("patient_id", patientId).order("date", { ascending: false }).limit(50),
        supabase.from("patients").select("diet_preferences").eq("id", patientId).maybeSingle(),
      ]);

      if (dietData?.[0]?.content) {
        try { setResult(JSON.parse(dietData[0].content)); } catch { /* ignore */ }
      }

      const seen = new Set<string>();
      const unique: MarkerInfo[] = [];
      (markerData || []).forEach(m => {
        if (!seen.has(m.name)) {
          seen.add(m.name);
          unique.push({ name: m.name, value: Number(m.value), unit: m.unit, status: m.status });
        }
      });
      setMarkers(unique);

      if (patientData?.diet_preferences) {
        const dp = patientData.diet_preferences as unknown as DietPreferences;
        setDietPrefs(dp);
        setEditPrefs(dp);
      }

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

  const handleSavePrefs = async () => {
    if (!patientId) return;
    const { error } = await supabase.from("patients").update({ diet_preferences: editPrefs as any }).eq("id", patientId);
    if (error) {
      toast({ title: "Could not save preferences", variant: "destructive" });
    } else {
      setDietPrefs(editPrefs);
      setPrefsModalOpen(false);
      toast({ title: "Food preferences saved!" });
    }
  };

  const toggleEditArray = (key: "food_allergies" | "cuisine_preferences", value: string) => {
    setEditPrefs(prev => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const filterFoods = (foods: FoodItem[]) => {
    if (!activeFilter) return foods;
    return foods.filter(f => f.nutrients?.some(n => n.toLowerCase().includes(activeFilter.toLowerCase())));
  };

  if (initialLoading) return null;

  const deficiencies = result?.deficiencies || [];
  const markerDeficiencies = markers.filter(m => m.status && ["low", "high"].includes(m.status.toLowerCase()));

  const todayIndex = new Date().getDay();
  const todayKey = DAYS[todayIndex === 0 ? 6 : todayIndex - 1];
  const todayMeals = result?.meal_plan?.[todayKey];

  // Nutrient progress (simple mock based on logged meals count)
  const loggedCount = foodLog.length;
  const nutrientProgress = [
    { name: "Iron", target: "18mg/day", current: Math.min(loggedCount * 3, 18), unit: "mg", max: 18 },
    { name: "Folate", target: "400mcg/day", current: Math.min(loggedCount * 80, 400), unit: "mcg", max: 400 },
    { name: "Vitamin B12", target: "2.4mcg/day", current: Math.min(loggedCount * 0.5, 2.4), unit: "mcg", max: 2.4 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Apple className="h-7 w-7 text-primary" />
          What Should I Eat?
        </h2>
        <Button variant="outline" size="sm" onClick={() => { setEditPrefs(dietPrefs); setPrefsModalOpen(true); }} className="gap-2 text-sm">
          <Settings2 className="h-4 w-4" />
          Edit Food Preferences
        </Button>
      </div>

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <Button onClick={() => handleGenerate(false)} disabled={loading} className="flex-1 text-base py-6 font-semibold">
          {loading ? (<><Loader2 className="h-5 w-5 animate-spin mr-2" />Generating your food guide…</>) : ("Get My Personalised Food Guide")}
        </Button>
        {result && (
          <Button variant="ghost" size="sm" onClick={() => handleGenerate(true)} disabled={loading} className="text-primary text-sm gap-1">
            <RefreshCw className="h-4 w-4" /> Regenerate
          </Button>
        )}
      </div>

      {/* Deficiency banner — light warm background */}
      {(deficiencies.length > 0 || markerDeficiencies.length > 0) && (
        <Card className="border border-primary/20" style={{ backgroundColor: "#FAFAFA" }}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground/80 uppercase tracking-wide">
                Based on your test results — deficiencies detected
              </p>
              <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">NEW</Badge>
            </div>
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
                    m.status?.toLowerCase() === "low" ? "bg-red-500 text-white" : "bg-amber-500 text-white"
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
          <Tabs defaultValue="eat" className="space-y-5">
            <TabsList className="grid grid-cols-4 w-full h-auto bg-transparent gap-2 p-0">
              <TabsTrigger value="eat" className="py-3 text-sm font-semibold rounded-lg border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=inactive]:border-border data-[state=inactive]:text-muted-foreground">
                Foods to Eat
              </TabsTrigger>
              <TabsTrigger value="avoid" className="py-3 text-sm font-semibold rounded-lg border data-[state=inactive]:border-border data-[state=inactive]:text-muted-foreground">
                Foods to Avoid
              </TabsTrigger>
              <TabsTrigger value="meal-plan" className="py-3 text-sm font-semibold rounded-lg border relative data-[state=inactive]:border-border data-[state=inactive]:text-muted-foreground">
                Weekly Meal Plan
                <Badge className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0">new</Badge>
              </TabsTrigger>
              <TabsTrigger value="food-log" className="py-3 text-sm font-semibold rounded-lg border relative data-[state=inactive]:border-border data-[state=inactive]:text-muted-foreground">
                My Food Log
                <Badge className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0">new</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Nutrient filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <span className="text-sm text-muted-foreground whitespace-nowrap self-center mr-1">Filter by nutrient:</span>
              {NUTRIENT_FILTERS.map(n => (
                <button
                  key={n}
                  onClick={() => setActiveFilter(activeFilter === n ? null : n)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors",
                    activeFilter === n
                      ? "border-primary text-primary bg-primary/5"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Foods to Eat */}
            <TabsContent value="eat">
              {filterFoods(result.foods_to_eat || []).length === 0 ? (
                <Card><CardContent className="p-8 text-center"><p className="text-base text-muted-foreground">No foods found for this nutrient filter</p></CardContent></Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {filterFoods(result.foods_to_eat || []).map((item, i) => (
                    <Card key={i} className="border rounded-xl hover:bg-primary/5 transition-colors" style={{ borderColor: "#E5E7EB" }}>
                      <CardContent className="p-4 flex flex-col items-center text-center gap-2 relative">
                        {item.serving && (
                          <span className="absolute top-2 right-2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {item.serving}
                          </span>
                        )}
                        <span className="text-4xl leading-none">{item.emoji}</span>
                        <p className="text-[15px] font-bold text-foreground leading-tight">{item.name}</p>
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
              )}
            </TabsContent>

            {/* Foods to Avoid */}
            <TabsContent value="avoid">
              {filterFoods(result.foods_to_avoid || []).length === 0 ? (
                <Card><CardContent className="p-8 text-center"><p className="text-base text-muted-foreground">No foods found for this nutrient filter</p></CardContent></Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {filterFoods(result.foods_to_avoid || []).map((item, i) => (
                    <Card key={i} className="border border-red-200 rounded-xl hover:bg-red-50/50 transition-colors">
                      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                        <span className="text-4xl leading-none">{item.emoji}</span>
                        <p className="text-[15px] font-bold text-foreground leading-tight">{item.name}</p>
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
              )}
            </TabsContent>

            {/* Weekly Meal Plan */}
            <TabsContent value="meal-plan">
              {result.meal_plan && Object.keys(result.meal_plan).length > 0 ? (
                <div className="space-y-3">
                  {DAYS.map(day => {
                    const meals = result.meal_plan[day];
                    if (!meals) return null;
                    return (
                      <Card key={day} className="rounded-xl" style={{ borderColor: "#E5E7EB" }}>
                        <CardContent className="p-4">
                          <p className="text-sm font-bold text-foreground mb-3 capitalize">{day}</p>
                          <div className="grid grid-cols-4 gap-3">
                            {(["breakfast", "lunch", "snack", "dinner"] as const).map(meal => (
                              <div key={meal} className="bg-muted rounded-lg p-3 text-center">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">{meal}</p>
                                <p className="text-sm text-foreground font-medium">{meals[meal]}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card><CardContent className="p-8 text-center"><p className="text-base text-muted-foreground">Generate your food guide to see a weekly meal plan</p></CardContent></Card>
              )}
            </TabsContent>

            {/* My Food Log */}
            <TabsContent value="food-log">
              <div className="space-y-4">
                <Button onClick={() => setLogModalOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Log a meal
                </Button>
                {foodLog.length === 0 ? (
                  <Card><CardContent className="p-8 text-center"><p className="text-base text-muted-foreground">No meals logged today. Tap "Log a meal" to start tracking.</p></CardContent></Card>
                ) : (
                  <div className="space-y-2">
                    {foodLog.map((entry, i) => (
                      <Card key={i} className="rounded-xl" style={{ borderColor: "#E5E7EB" }}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <p className="text-base font-medium text-foreground">{entry.name}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />{entry.time}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Today's suggested meals */}
          {todayMeals && (
            <Card className="rounded-xl" style={{ borderColor: "#E5E7EB" }}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-foreground">Today's suggested meals</p>
                  <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">new</Badge>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {(["breakfast", "lunch", "snack", "dinner"] as const).map(meal => (
                    <div key={meal} className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">{meal}</p>
                      <p className="text-sm text-foreground font-medium">{todayMeals[meal]}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nutrient progress today */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-base font-bold text-foreground">Nutrient progress today</p>
              <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">new</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {nutrientProgress.map((np) => {
                const pct = Math.round((np.current / np.max) * 100);
                const barColor = pct < 50 ? "bg-red-500" : pct < 80 ? "bg-amber-500" : "bg-emerald-500";
                return (
                  <Card key={np.name} className="rounded-xl" style={{ borderColor: "#E5E7EB" }}>
                    <CardContent className="p-4 space-y-2">
                      <p className="text-sm font-medium text-foreground">{np.name} — target {np.target}</p>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {np.current}{np.unit} so far · {pct}%
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Log what you ate strip */}
          <Card className="rounded-xl" style={{ borderColor: "#E5E7EB" }}>
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

      {/* References */}
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
          <DialogHeader><DialogTitle>Log a meal</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={logInput}
              onChange={(e) => setLogInput(e.target.value)}
              placeholder="What did you eat? e.g. Grilled chicken with rice"
              onKeyDown={(e) => e.key === "Enter" && handleLogMeal()}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleLogMeal} disabled={!logInput.trim()}>Log Meal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Food Preferences modal */}
      <Dialog open={prefsModalOpen} onOpenChange={setPrefsModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Food Preferences</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-base font-medium">Diet type</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DIET_TYPES.map((dt) => (
                  <button
                    key={dt.value}
                    type="button"
                    onClick={() => setEditPrefs(p => ({ ...p, diet_type: dt.value }))}
                    className={cn(
                      "rounded-xl border-2 p-3 text-center transition-all cursor-pointer text-sm",
                      editPrefs.diet_type === dt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    )}
                  >
                    <span className="text-xl block mb-0.5">{dt.emoji}</span>
                    {dt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Food allergies</Label>
              <div className="flex flex-wrap gap-2">
                {FOOD_ALLERGIES_LIST.map((a) => (
                  <button key={a} type="button" onClick={() => toggleEditArray("food_allergies", a)}
                    className={cn("rounded-full px-3 py-1.5 text-sm font-medium border transition-all",
                      editPrefs.food_allergies.includes(a) ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:border-primary/40"
                    )}>{a}</button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Cuisine preferences</Label>
              <div className="flex flex-wrap gap-2">
                {CUISINE_LIST.map((c) => (
                  <button key={c} type="button" onClick={() => toggleEditArray("cuisine_preferences", c)}
                    className={cn("rounded-full px-3 py-1.5 text-sm font-medium border transition-all",
                      editPrefs.cuisine_preferences.includes(c) ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:border-primary/40"
                    )}>{c}</button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-medium">Meals per day: {editPrefs.meals_per_day}</Label>
              <Slider value={[editPrefs.meals_per_day]} onValueChange={(v) => setEditPrefs(p => ({ ...p, meals_per_day: v[0] }))} min={2} max={6} step={1} className="py-2" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSavePrefs}>Save Preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DietRecommendations;
