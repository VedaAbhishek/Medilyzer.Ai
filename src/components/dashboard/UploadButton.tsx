import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

const UploadButton = () => (
  <Card className="flex items-center justify-center">
    <CardContent className="p-6 text-center space-y-3">
      <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <Upload className="h-5 w-5 text-primary" />
      </div>
      <Button className="w-full">Upload Lab Report or Prescription</Button>
      <p className="text-xs text-muted-foreground">PDF files only</p>
    </CardContent>
  </Card>
);

export default UploadButton;
