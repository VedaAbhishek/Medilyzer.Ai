import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, MapPin, Navigation, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SymptomResult {
  specialty: string;
  search_term: string;
  reason: string;
  urgency: "routine" | "soon" | "urgent";
  urgency_note: string;
}

interface NearbyDoctor {
  name: string;
  address: string;
  distance_miles: number | null;
  lat: number;
  lon: number;
}

const FindDoctorSection = ({ patientId }: { patientId: string | null }) => {
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SymptomResult | null>(null);
  const [doctors, setDoctors] = useState<NearbyDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [noDoctors, setNoDoctors] = useState(false);

  const handleCheckSymptoms = async () => {
    if (!symptoms.trim() || !patientId) return;
    setLoading(true);
    setResult(null);
    setDoctors([]);
    setNoDoctors(false);

    try {
      const { data, error } = await supabase.functions.invoke("check-symptoms", {
        body: { symptoms_text: symptoms.trim(), patient_id: patientId },
      });

      if (error) throw error;
      setResult(data);
      findNearbyDoctors();
    } catch (e: any) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const findNearbyDoctors = () => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    setDoctorsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocationDenied(false);
        try {
          const { data, error } = await supabase.functions.invoke("find-nearby-doctors", {
            body: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          });
          if (error) throw error;
          const places = data?.places || [];
          setDoctors(places);
          setNoDoctors(places.length === 0);
        } catch {
          toast.error("Could not find nearby doctors.");
        } finally {
          setDoctorsLoading(false);
        }
      },
      () => {
        setLocationDenied(true);
        setDoctorsLoading(false);
      }
    );
  };

  const urgencyColor = (u: string) => {
    if (u === "urgent") return "bg-destructive text-destructive-foreground";
    if (u === "soon") return "bg-orange-500 text-white";
    return "bg-green-600 text-white";
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-foreground">Find a Doctor</h2>

      {/* Symptom Input */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <h3 className="text-xl font-bold text-foreground">What are you feeling?</h3>
          <Textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder={"Describe how you are feeling...\nFor example: I have been feeling very tired, my hands shake, and I feel cold all the time"}
            className="min-h-[140px] text-base"
          />
          <Button
            onClick={handleCheckSymptoms}
            disabled={loading || !symptoms.trim() || !patientId}
            className="w-full h-12 text-lg font-semibold"
          >
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Analyzing your symptoms...</>
            ) : (
              <><Stethoscope className="h-5 w-5 mr-2" /> Find the right doctor for me</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result Card */}
      {result && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-xl font-bold text-primary">
              You should see a {result.specialty}
            </p>
            <p className="text-base text-muted-foreground">{result.reason}</p>
            <div className="flex items-center gap-3">
              <Badge className={`text-sm px-3 py-1 ${urgencyColor(result.urgency)}`}>
                {result.urgency === "routine" ? "Routine" : result.urgency === "soon" ? "See them soon" : "Urgent"}
              </Badge>
            </div>
            <p className="text-base text-muted-foreground">{result.urgency_note}</p>
          </CardContent>
        </Card>
      )}

      {/* Nearby Doctors */}
      {result && (
        <div className="space-y-5">
          <h3 className="text-xl font-bold text-foreground">Doctors near you</h3>

          {locationDenied && (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-base text-muted-foreground">
                  Please allow location access so we can find doctors near you
                </p>
              </CardContent>
            </Card>
          )}

          {doctorsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-base text-muted-foreground">Finding doctors near you...</span>
            </div>
          )}

          {!doctorsLoading && !locationDenied && noDoctors && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-base text-muted-foreground">
                  No specialists found nearby. Try describing your symptoms differently.
                </p>
              </CardContent>
            </Card>
          )}

          {!doctorsLoading && doctors.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doc, i) => (
                <Card key={i}>
                  <CardContent className="p-5 space-y-3">
                    <h4 className="text-lg font-bold text-foreground">{doc.name}</h4>
                    <p className="text-sm text-muted-foreground">{doc.address}</p>
                    {doc.distance_miles !== null && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Navigation className="h-4 w-4" />
                        {doc.distance_miles} miles away
                      </p>
                    )}
                    <Button
                      variant="outline"
                      className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(doc.address)}`,
                          "_blank"
                        )
                      }
                    >
                      Get Directions
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FindDoctorSection;
