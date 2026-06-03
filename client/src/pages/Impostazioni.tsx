import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Download, Upload, Calendar, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function Impostazioni() {
  const { data: impostazioni, isLoading } = trpc.impostazioni.get.useQuery();
  const utils = trpc.useUtils();
  
  const [obiettivoInput, setObiettivoInput] = useState("");
  const [orizzonteInput, setOrizzonteInput] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [dataInizioInput, setDataInizioInput] = useState<Date | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: exportData, refetch: refetchExport } = trpc.dataManagement.export.useQuery(undefined, {
    enabled: false,
  });
  
  const importMutation = trpc.dataManagement.import.useMutation({
    onSuccess: (result) => {
      utils.fiumi.list.invalidate();
      utils.affluenti.listAll.invalidate();
      utils.reinvestimenti.list.invalidate();
      utils.impostazioni.get.invalidate();
      utils.calcoli.riepilogo.invalidate();
      toast.success(`Dati importati: ${result.imported.fiumi} fiumi, ${result.imported.affluenti} affluenti, ${result.imported.reinvestimenti} reinvestimenti`);
    },
    onError: (error) => {
      toast.error("Errore nell'importazione: " + error.message);
    },
  });
  
  const updateMutation = trpc.impostazioni.update.useMutation({
    onSuccess: () => {
      utils.impostazioni.get.invalidate();
      utils.calcoli.riepilogo.invalidate();
      utils.calcoli.simulazioneQuinquennale.invalidate();
      utils.affluenti.getBudgetMensile.invalidate();
      toast.success("Impostazioni aggiornate con successo");
    },
    onError: (error) => {
      toast.error("Errore nell'aggiornamento: " + error.message);
    },
  });
  
  const ricalcolaMesiMutation = trpc.impostazioni.ricalcolaMesi.useMutation({
    onSuccess: (result) => {
      utils.affluenti.listAll.invalidate();
      utils.affluenti.getBudgetMensile.invalidate();
      toast.success(`Ricalcolo completato: ${result.count} affluenti aggiornati`);
    },
    onError: (error) => {
      toast.error("Errore nel ricalcolo: " + error.message);
    },
  });

  const handleUpdateObiettivo = () => {
    const value = parseFloat(obiettivoInput);
    if (isNaN(value) || value <= 0) {
      toast.error("Inserisci un valore valido");
      return;
    }
    
    updateMutation.mutate({
      obiettivoMensile: Math.round(value * 100),
    });
    setObiettivoInput("");
  };

  const handleUpdateBudget = () => {
    const value = parseFloat(budgetInput);
    if (isNaN(value) || value <= 0) {
      toast.error("Inserisci un valore valido");
      return;
    }
    
    updateMutation.mutate({
      budgetMensileAffluenti: Math.round(value * 100),
    });
    setBudgetInput("");
  };
  
  const handleUpdateDataInizio = () => {
    if (!dataInizioInput) {
      toast.error("Seleziona una data valida");
      return;
    }
    
    const conferma = confirm(
      "Modificare la data di inizio piano ricalcoler\u00e0 automaticamente tutti i mesi relativi degli affluenti. Vuoi continuare?"
    );
    if (!conferma) return;
    
    updateMutation.mutate({
      dataInizio: dataInizioInput,
    });
    setDataInizioInput(undefined);
  };
  
  const handleRicalcolaMesi = () => {
    const conferma = confirm(
      "Questa operazione ricalcoler\u00e0 i mesi di tutti gli affluenti usando la data di inizio piano configurata. Vuoi continuare?"
    );
    if (!conferma) return;
    
    ricalcolaMesiMutation.mutate();
  };

  const handleUpdateOrizzonte = async () => {
    const value = parseInt(orizzonteInput);
    if (isNaN(value) || value < 1 || value > 20) {
      toast.error("Inserisci un valore tra 1 e 20 anni");
      return;
    }
    
    const nuovoOrizzonteMesi = value * 12;
    const orizzonteAttualeMesi = impostazioni?.orizzonteTemporale || 60;
    
    // Se l'utente sta riducendo l'orizzonte, verifica se ci sono dati oltre il nuovo limite
    if (nuovoOrizzonteMesi < orizzonteAttualeMesi) {
      const conferma = confirm(
        `Stai riducendo l'orizzonte temporale da ${Math.round(orizzonteAttualeMesi / 12)} a ${value} anni. ` +
        `Gli affluenti e reinvestimenti oltre il mese ${nuovoOrizzonteMesi} non verranno più calcolati. ` +
        `Vuoi continuare?`
      );
      if (!conferma) return;
    }
    
    // Se l'utente sta aumentando l'orizzonte, mostra messaggio informativo
    if (nuovoOrizzonteMesi > orizzonteAttualeMesi) {
      toast.info(`Orizzonte temporale esteso a ${value} anni. Puoi ora pianificare affluenti e reinvestimenti fino al mese ${nuovoOrizzonteMesi}.`);
    }
    
    // Converti anni in mesi per il database
    updateMutation.mutate({
      orizzonteTemporale: nuovoOrizzonteMesi,
    });
    setOrizzonteInput("");
  };

  const handleExport = async () => {
    try {
      const result = await refetchExport();
      if (!result.data) {
        toast.error("Errore nell'esportazione dei dati");
        return;
      }
      
      const dataStr = JSON.stringify(result.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cashflow-planner-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Dati esportati con successo");
    } catch (error) {
      toast.error("Errore nell'esportazione: " + (error as Error).message);
    }
  };
  
  const handleImport = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Confirm before importing
      const confirm = window.confirm(
        "L'importazione aggiungerà i dati dal file al tuo account corrente. " +
        "I dati esistenti non verranno eliminati. Vuoi continuare?"
      );
      
      if (!confirm) {
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      
      importMutation.mutate({ data });
    } catch (error) {
      toast.error("Errore nella lettura del file: " + (error as Error).message);
    } finally {
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Impostazioni</h1>
          </div>
          <p className="text-muted-foreground">
            Configura il tuo obiettivo di cash flow e l'orizzonte temporale del piano
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Obiettivo Cash Flow Mensile */}
          <Card>
            <CardHeader>
              <CardTitle>Obiettivo Cash Flow Mensile</CardTitle>
              <CardDescription>
                Imposta il tuo obiettivo di rendita mensile da raggiungere
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-accent rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Obiettivo Attuale</div>
                <div className="text-3xl font-bold text-primary">
                  {impostazioni ? formatCurrency(impostazioni.obiettivoMensile / 100) : "..."}
                </div>
                <div className="text-xs text-muted-foreground mt-1">al mese</div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="obiettivo">Nuovo Obiettivo (€)</Label>
                <div className="flex gap-2">
                  <Input
                    id="obiettivo"
                    type="number"
                    placeholder="es. 25000"
                    value={obiettivoInput}
                    onChange={(e) => setObiettivoInput(e.target.value)}
                  />
                  <Button 
                    onClick={handleUpdateObiettivo}
                    disabled={updateMutation.isPending || !obiettivoInput}
                  >
                    Aggiorna
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orizzonte Temporale */}
          <Card>
            <CardHeader>
              <CardTitle>Orizzonte Temporale</CardTitle>
              <CardDescription>
                Definisci in quanti anni vuoi raggiungere il tuo obiettivo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-accent rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Orizzonte Attuale</div>
                <div className="text-3xl font-bold text-primary">
                  {impostazioni ? Math.round(impostazioni.orizzonteTemporale / 12) : "..."} {impostazioni && Math.round(impostazioni.orizzonteTemporale / 12) === 1 ? "anno" : "anni"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">durata del piano</div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="orizzonte">Nuovo Orizzonte (anni)</Label>
                <div className="flex gap-2">
                  <Input
                    id="orizzonte"
                    type="number"
                    min="1"
                    max="20"
                    placeholder="es. 7"
                    value={orizzonteInput}
                    onChange={(e) => setOrizzonteInput(e.target.value)}
                  />
                  <Button 
                    onClick={handleUpdateOrizzonte}
                    disabled={updateMutation.isPending || !orizzonteInput}
                  >
                    Aggiorna
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Valore tra 1 e 20 anni
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Budget Mensile Affluenti */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Mensile Affluenti</CardTitle>
              <CardDescription>
                Imposta un limite mensile per monitorare l'allocazione degli affluenti
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-accent rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Budget Attuale</div>
                <div className="text-3xl font-bold text-primary">
                  {impostazioni?.budgetMensileAffluenti 
                    ? formatCurrency(impostazioni.budgetMensileAffluenti / 100)
                    : "Non configurato"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {impostazioni?.budgetMensileAffluenti 
                    ? "limite mensile per affluenti"
                    : "Configura per attivare il tracking"}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="budget">Nuovo Budget (€)</Label>
                <div className="flex gap-2">
                  <Input
                    id="budget"
                    type="number"
                    placeholder="es. 5000"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                  />
                  <Button 
                    onClick={handleUpdateBudget}
                    disabled={updateMutation.isPending || !budgetInput}
                  >
                    Aggiorna
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Quanto puoi allocare mensilmente per gli affluenti di capitale
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Data Inizio Piano */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Data Inizio Piano
              </CardTitle>
              <CardDescription>
                Data di riferimento (T0) per tutti i calcoli temporali
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-accent rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Data Corrente</div>
                <div className="text-2xl font-bold text-primary">
                  {impostazioni?.dataInizio 
                    ? new Date(impostazioni.dataInizio).toLocaleDateString("it-IT", { month: "long", year: "numeric" })
                    : "Non configurata"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Tutti i mesi relativi sono calcolati da questa data
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dataInizio">Nuova Data Inizio</Label>
                <div className="flex gap-2">
                  <Input
                    id="dataInizio"
                    type="month"
                    value={dataInizioInput ? `${dataInizioInput.getFullYear()}-${String(dataInizioInput.getMonth() + 1).padStart(2, '0')}` : ""}
                    onChange={(e) => {
                      const [year, month] = e.target.value.split('-');
                      setDataInizioInput(new Date(parseInt(year), parseInt(month) - 1, 1));
                    }}
                  />
                  <Button 
                    onClick={handleUpdateDataInizio}
                    disabled={updateMutation.isPending || !dataInizioInput}
                  >
                    Aggiorna
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Modificare questa data ricalcoler\u00e0 automaticamente tutti i mesi degli affluenti
                </p>
              </div>
              
              {/* Pulsante Ricalcola Mesi */}
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleRicalcolaMesi}
                  disabled={ricalcolaMesiMutation.isPending || !impostazioni?.dataInizio}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ricalcola Mesi Affluenti
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Ricalcola i mesi di tutti gli affluenti usando la data di inizio piano corrente
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Import/Export */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Gestione Dati</CardTitle>
            <CardDescription>
              Esporta o importa tutti i tuoi dati (fiumi, affluenti, reinvestimenti, impostazioni)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={handleExport} variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Esporta Dati
              </Button>
              <Button onClick={handleImport} variant="outline" className="flex-1" disabled={importMutation.isPending}>
                <Upload className="mr-2 h-4 w-4" />
                {importMutation.isPending ? "Importazione..." : "Importa Dati"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              <strong>Esporta:</strong> Scarica tutti i tuoi dati in un file JSON per backup o trasferimento.
              <br />
              <strong>Importa:</strong> Carica un file JSON precedentemente esportato. I dati verranno aggiunti al tuo account corrente senza eliminare quelli esistenti.
            </p>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Informazioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • <strong>Obiettivo Cash Flow:</strong> Definisce il target di rendita mensile che vuoi raggiungere. 
              Questo valore viene utilizzato per calcolare la percentuale di completamento del tuo piano.
            </p>
            <p>
              • <strong>Orizzonte Temporale:</strong> Determina la durata del tuo piano di investimento. 
              Tutte le simulazioni e i grafici si adatteranno automaticamente a questo periodo.
            </p>
            <p>
              • Quando modifichi queste impostazioni, tutti i calcoli e le visualizzazioni vengono aggiornati automaticamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
