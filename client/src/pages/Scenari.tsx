import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, GitCompare, Check, Layers } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function Scenari() {
  const [nuovoScenarioNome, setNuovoScenarioNome] = useState("");
  const [nuovoScenarioDescrizione, setNuovoScenarioDescrizione] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scenariSelezionati, setScenariSelezionati] = useState<number[]>([]);

  const { data: scenari, isLoading, refetch } = trpc.scenari.list.useQuery();
  
  const createMutation = trpc.scenari.create.useMutation({
    onSuccess: () => {
      toast.success("Scenario creato con successo");
      setNuovoScenarioNome("");
      setNuovoScenarioDescrizione("");
      setDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Errore: ${error.message}`);
    },
  });

  const deleteMutation = trpc.scenari.delete.useMutation({
    onSuccess: () => {
      toast.success("Scenario eliminato");
      refetch();
    },
    onError: (error) => {
      toast.error(`Errore: ${error.message}`);
    },
  });

  const setAttivoMutation = trpc.scenari.setAttivo.useMutation({
    onSuccess: () => {
      toast.success("Scenario attivato");
      refetch();
    },
    onError: (error) => {
      toast.error(`Errore: ${error.message}`);
    },
  });

  const { data: confronto, isLoading: confrontoLoading } = trpc.scenari.compare.useQuery(
    { scenarioIds: scenariSelezionati },
    { enabled: scenariSelezionati.length >= 2 }
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  const handleCreaScenario = () => {
    if (!nuovoScenarioNome.trim()) {
      toast.error("Inserisci un nome per lo scenario");
      return;
    }

    createMutation.mutate({
      nome: nuovoScenarioNome,
      descrizione: nuovoScenarioDescrizione,
    });
  };

  const handleToggleScenario = (scenarioId: number) => {
    setScenariSelezionati(prev => {
      if (prev.includes(scenarioId)) {
        return prev.filter(id => id !== scenarioId);
      } else if (prev.length < 3) {
        return [...prev, scenarioId];
      } else {
        toast.warning("Puoi confrontare massimo 3 scenari");
        return prev;
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Layers className="h-8 w-8 text-primary" />
                <h1 className="text-4xl font-bold text-foreground">Scenari What-If</h1>
              </div>
              <p className="text-muted-foreground">
                Salva e confronta diverse strategie di investimento
              </p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuovo Scenario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crea Nuovo Scenario</DialogTitle>
                  <DialogDescription>
                    Salva la configurazione attuale come nuovo scenario per confrontarla con altre strategie
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nome">Nome Scenario *</Label>
                    <Input
                      id="nome"
                      value={nuovoScenarioNome}
                      onChange={(e) => setNuovoScenarioNome(e.target.value)}
                      placeholder="es. Strategia Conservativa"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="descrizione">Descrizione</Label>
                    <Textarea
                      id="descrizione"
                      value={nuovoScenarioDescrizione}
                      onChange={(e) => setNuovoScenarioDescrizione(e.target.value)}
                      placeholder="Descrivi questa strategia..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreaScenario}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creazione..." : "Crea Scenario"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {scenari && scenari.length > 0 ? (
            scenari.map(scenario => (
              <Card key={scenario.id} className={scenario.attivo ? "border-primary" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {scenario.nome}
                        {scenario.attivo && (
                          <span className="inline-flex items-center gap-1 text-xs font-normal bg-primary text-primary-foreground px-2 py-1 rounded">
                            <Check className="h-3 w-3" />
                            Attivo
                          </span>
                        )}
                      </CardTitle>
                      {scenario.descrizione && (
                        <CardDescription className="mt-2">
                          {scenario.descrizione}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate({ id: scenario.id })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={scenariSelezionati.includes(scenario.id)}
                        onCheckedChange={() => handleToggleScenario(scenario.id)}
                      />
                      <span className="text-sm text-muted-foreground">Confronta</span>
                    </div>
                    {!scenario.attivo && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAttivoMutation.mutate({ id: scenario.id })}
                      >
                        Attiva
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-4">
                    Creato: {new Date(scenario.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessuno scenario salvato.</p>
                  <p className="text-sm mt-2">Crea il tuo primo scenario per iniziare a confrontare strategie.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {scenariSelezionati.length >= 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                <CardTitle>Confronto Scenari</CardTitle>
              </div>
              <CardDescription>
                Confronto tra {scenariSelezionati.length} scenari selezionati
              </CardDescription>
            </CardHeader>
            <CardContent>
              {confrontoLoading ? (
                <Skeleton className="h-48" />
              ) : confronto && confronto.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scenario</TableHead>
                      <TableHead className="text-right">N° Fiumi</TableHead>
                      <TableHead className="text-right">Capitale Totale</TableHead>
                      <TableHead className="text-right">Cash Flow Mensile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {confronto.map((item, index) => {
                      const maxCapitale = Math.max(...confronto.map(c => c.capitaleTotale));
                      const maxCashFlow = Math.max(...confronto.map(c => c.cashFlowMensile));
                      const isBestCapitale = item.capitaleTotale === maxCapitale;
                      const isBestCashFlow = item.cashFlowMensile === maxCashFlow;

                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.scenario.nome}</TableCell>
                          <TableCell className="text-right">{item.numeroFiumi}</TableCell>
                          <TableCell className={`text-right ${isBestCapitale ? 'font-bold text-green-600' : ''}`}>
                            {formatCurrency(item.capitaleTotale)}
                          </TableCell>
                          <TableCell className={`text-right ${isBestCashFlow ? 'font-bold text-green-600' : ''}`}>
                            {formatCurrency(item.cashFlowMensile)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Seleziona almeno 2 scenari per confrontarli
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
