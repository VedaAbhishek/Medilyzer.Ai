import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Navigation, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface NearbyDoctor {
  name: string;
  address: string;
  distance_miles: number | null;
  lat: number;
  lon: number;
}

interface SecondOpinionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  patientId: string;
}

const SecondOpinionModal = ({ open, onOpenChange, recordId, patientId }: SecondOpinionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [specialty, setSpecialty] = useState<{ specialty: string; reason: string } | null>(null);
  const [doctors, setDoctors] = useState<NearbyDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [noDoctors, setNoDoctors] = useState(false);
  const [started, setStarted] = useState(false);

  const handleStart = async () => {
    setStarted(true);
    setLoading(true);
    setSpecialty(null);
    setDoctors([]);
    setNoDoctors(false);

    try {
      const { data, error } = await supabase.functions.invoke("find-second-opinion", {
        body: { record_id: recordId, patient_id: patientId },
      });
      if (error) throw error;
      setSpecialty(data);
      findNearbyDoctors();
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
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
          toast({ title: "Could not find nearby doctors", variant: "destructive" });
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

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setStarted(false);
      setSpecialty(null);
      setDoctors([]);
      setNoDoctors(false);
      setLocationDenied(false);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Find a Doctor for a Second Opinion</DialogTitle>
          <p className="text-base text-muted-foreground">
            Based on your report, here are doctors near you who can help
          </p>
        </DialogHeader>

        {!started && (
          <div className="flex justify-center py-8">
            <Button onClick={handleStart} className="h-12 px-8 text-lg font-semibold">
              <Stethoscope className="h-5 w-5 mr-2" />
              Find a specialist for me
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-base text-muted-foreground">Analyzing your report…</span>
          </div>
        )}

        {specialty && (
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-5 space-y-2">
              <p className="text-lg font-bold text-primary">
                We recommend seeing a {specialty.specialty}
              </p>
              <p className="text-base text-muted-foreground">{specialty.reason}</p>
            </CardContent>
          </Card>
        )}

        {specialty && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">Doctors near you</h3>

            {locationDenied && (
              <Card>
                <CardContent className="py-10 text-center">
                  <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-base text-muted-foreground">
                    Please allow location access so we can find doctors near you
                  </p>
                </CardContent>
              </Card>
            )}

            {doctorsLoading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-base text-muted-foreground">Finding doctors near you…</span>
              </div>
            )}

            {!doctorsLoading && !locationDenied && noDoctors && (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-base text-muted-foreground">
                    No specialists found nearby. Try again later.
                  </p>
                </CardContent>
              </Card>
            )}

            {!doctorsLoading && doctors.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {doctors.map((doc, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-2">
                      <h4 className="text-base font-bold text-foreground">{doc.name}</h4>
                      <p className="text-sm text-muted-foreground">{doc.address}</p>
                      {doc.distance_miles !== null && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Navigation className="h-4 w-4" />
                          {doc.distance_miles} miles away
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
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

        <p className="text-sm text-muted-foreground text-center pt-4">
          Medilyzer helps you find care options. Always consult your primary doctor before seeking a second opinion.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default SecondOpinionModal;
