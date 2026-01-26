import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-border/50">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold font-display text-foreground">Page not found</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            The page you requested was not found. Let's get you back to the map.
          </p>

          <div className="mt-8 flex justify-end">
             <Link href="/" className="px-6 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors">
               Return to Map
             </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
