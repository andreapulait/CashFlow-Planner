import { Waves } from "lucide-react";
import { FiumiManager } from "@/components/FiumiManager";

export default function Fiumi() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Waves className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Fiumi di Investimento</h1>
          </div>
          <p className="text-muted-foreground">
            Gestisci i tuoi flussi di capitale — capitale iniziale, rendimento e quota di reinvestimento
          </p>
        </div>
        <FiumiManager />
      </div>
    </div>
  );
}
