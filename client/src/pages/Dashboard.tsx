import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, TrendingUp, Target, Wallet, PiggyBank } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonthYearPicker } from "@/components/DatePicker";
import { formatMonthOffset } from "@/lib/dateFormat";
import { toast } from "sonner";

export default function Dashboard() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFiume, setEditingFiume] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    nome: "",
    sorgente: "",
    rendimento: "",
    meseCreazione: "0",
    dataCreazione: undefined as Date | undefined,
    percentualeReinvestimento: "0",
  });

  const utils = trpc.useUtils();
  const { data: fiumi, isLoading: fiumiLoading } = trpc.fiumi.list.useQuery();
  const { data: riepilogo, isLoading: riepilogoLoading } = trpc.calcoli.riepilogo.useQuery();
  const { data: impostazioni } = trpc.impostazioni.get.useQuery();

  const createMutation = trpc.fiumi.create.useMutation({
    onSuccess: () => {
      utils.fiumi.list.invalidate();
      utils.calcoli.riepilogo.invalidate();
      setIsCreateOpen(false);
      resetForm();
      toast.success("Fiume creato con successo");
    },
    onError: (error) => {
      toast.error("Errore nella creazione: " + error.message);
    },
  });

  const updateMutation = trpc.fiumi.update.useMutation({
    onSuccess: () => {
      utils.fiumi.list.invalidate();
      utils.calcoli.riepilogo.invalidate();
      setIsEditOpen(false);
      setEditingFiume(null);
      resetForm();
      toast.success("Fiume aggiornato con successo");
    },
    onError: (error) => {
      toast.error("Errore nell'aggiornamento: " + error.message);
    },
  });

  const deleteMutation = trpc.fiumi.delete.useMutation({
    onSuccess: () => {
      utils.fiumi.list.invalidate();
      utils.calcoli.riepilogo.invalidate();
      toast.success("Fiume eliminato con successo");
    },
    onError: (error) => {
      toast.error("Errore nell'eliminazione: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ nome: "", sorgente: "", rendimento: "", meseCreazione: "0", dataCreazione: undefined, percentualeReinvestimento: "0" });
  };

  const handleCreate = () => {
    const inizialeCents = Math.round(parseFloat(formData.sorgente) * 100);
    const rendimentoBasisPoints = Math.round(parseFloat(formData.rendimento) * 100);
    const meseCreazione = parseInt(formData.meseCreazione);
    const percentualeReinv = parseInt(formData.percentualeReinvestimento) || 0;
    
    createMutation.mutate({
      nome: formData.nome,
      sorgente: inizialeCents,
      rendimento: rendimentoBasisPoints,
      meseCreazione,
      dataCreazione: formData.dataCreazione,
      percentualeReinvestimento: percentualeReinv,
    });
  };

  const handleEdit = () => {
    if (!editingFiume) return;
    
    const updates: any = {
      id: editingFiume.id,
    };
    
    if (formData.nome) updates.nome = formData.nome;
    if (formData.sorgente) updates.sorgente = Math.round(parseFloat(formData.sorgente) * 100);
    if (formData.rendimento) updates.rendimento = Math.round(parseFloat(formData.rendimento) * 100);
    if (formData.meseCreazione) updates.meseCreazione = parseInt(formData.meseCreazione);
    if (formData.dataCreazione !== undefined) updates.dataCreazione = formData.dataCreazione;
    if (formData.percentualeReinvestimento) updates.percentualeReinvestimento = parseInt(formData.percentualeReinvestimento);
    
    updateMutation.mutate(updates);
  };

  const handleDelete = (id: number) => {
    if (confirm("Sei sicuro di voler eliminare questo fiume?")) {
      deleteMutation.mutate({ id });
    }
  };

  const openEditDialog = (fiume: any) => {
    setEditingFiume(fiume);
    setFormData({
      nome: fiume.nome,
      sorgente: (fiume.sorgente / 100).toString(),
      rendimento: (fiume.rendimento / 100).toString(),
      meseCreazione: fiume.meseCreazione.toString(),
      dataCreazione: fiume.dataCreazione ? new Date(fiume.dataCreazione) : undefined,
      percentualeReinvestimento: (fiume.percentualeReinvestimento || 0).toString(),
    });
    setIsEditOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Cash Flow Planner</h1>
          <p className="text-muted-foreground">
            Gestisci i tuoi flussi di investimento e monitora il progresso verso l'obiettivo di 20.000€/mese
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Numero Fiumi</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {riepilogoLoading ? "..." : riepilogo?.numeroFiumi || 0}
              </div>
              <p className="text-xs text-muted-foreground">Flussi di investimento attivi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Capitale Totale (Anno 5)</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {riepilogoLoading ? "..." : formatCurrency(riepilogo?.capitaleTotale || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Valore del portafoglio</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Flow Mensile</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {riepilogoLoading ? "..." : formatCurrency(riepilogo?.cashFlowMensile || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Rendita mensile al 5° anno</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Obiettivo Raggiunto</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {riepilogoLoading ? "..." : `${riepilogo?.percentualeRaggiunta.toFixed(1) || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                Obiettivo: {riepilogoLoading ? "..." : formatCurrency(riepilogo?.obiettivo || 0)}/mese
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        {!riepilogoLoading && riepilogo && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Progresso verso l'Obiettivo</CardTitle>
              <CardDescription>
                Visualizzazione del tuo avanzamento verso l'obiettivo di {formatCurrency(riepilogo.obiettivo)}/mese
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressBar
                current={riepilogo.cashFlowMensile}
                target={riepilogo.obiettivo}
                label={`${formatCurrency(riepilogo.cashFlowMensile)} / ${formatCurrency(riepilogo.obiettivo)}`}
              />
              <div className="mt-4 text-sm text-muted-foreground">
                {riepilogo.percentualeRaggiunta >= 100 ? (
                  <span className="text-green-600 font-medium">🎉 Obiettivo raggiunto! Hai superato il target mensile.</span>
                ) : (
                  <span>Mancano ancora {formatCurrency(riepilogo.obiettivo - riepilogo.cashFlowMensile)} per raggiungere l'obiettivo.</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fiumi Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>I Tuoi Fiumi di Investimento</CardTitle>
                <CardDescription>Gestisci i tuoi flussi di capitale e rendimenti</CardDescription>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuovo Fiume
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crea Nuovo Fiume</DialogTitle>
                    <DialogDescription>
                      Aggiungi un nuovo flusso di investimento al tuo portafoglio
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="nome">Nome</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="es. Dividendi"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="iniziale">Capitale Iniziale (€)</Label>
                      <Input
                        id="iniziale"
                        type="number"
                        value={formData.sorgente}
                        onChange={(e) => setFormData({ ...formData, sorgente: e.target.value })}
                        placeholder="es. 50000"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="rendimento">Rendimento Annuo (%)</Label>
                      <Input
                        id="rendimento"
                        type="number"
                        step="0.01"
                        value={formData.rendimento}
                        onChange={(e) => setFormData({ ...formData, rendimento: e.target.value })}
                        placeholder="es. 10.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dataCreazione">Data di Inizio</Label>
                      <MonthYearPicker
                        value={formData.dataCreazione}
                        onChange={(date) => setFormData({ ...formData, dataCreazione: date })}
                        placeholder="Seleziona mese di inizio"
                        minDate={impostazioni?.dataInizio ? new Date(impostazioni.dataInizio) : new Date()}
                      />
                      <p className="text-xs text-muted-foreground">
                        Scegli quando attivare questo fiume nel tuo piano. Se non specificato, usa offset mensile.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="percentualeReinvestimento">Reinvestimento Automatico (%)</Label>
                      <Input
                        id="percentualeReinvestimento"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={formData.percentualeReinvestimento}
                        onChange={(e) => setFormData({ ...formData, percentualeReinvestimento: e.target.value })}
                        placeholder="es. 50"
                      />
                      <p className="text-xs text-muted-foreground">
                        Percentuale del cash flow mensile da reinvestire automaticamente (0% = tutto prelevato, 100% = tutto reinvestito)
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Annulla
                    </Button>
                    <Button onClick={handleCreate} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creazione..." : "Crea"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {fiumiLoading ? (
              <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
            ) : !fiumi || fiumi.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessun fiume creato. Inizia aggiungendo il tuo primo flusso di investimento!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Capitale Iniziale</TableHead>
                    <TableHead className="text-right">Rendimento</TableHead>
                    <TableHead className="text-right">Reinvest.</TableHead>
                    <TableHead className="text-right">Mese Creazione</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fiumi.map((fiume) => (
                    <TableRow key={fiume.id}>
                      <TableCell className="font-medium">{fiume.nome}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(fiume.sorgente / 100)}
                      </TableCell>
                      <TableCell className="text-right">{(fiume.rendimento / 100).toFixed(2)}%</TableCell>
                      <TableCell className="text-right">
                        <span className={(fiume.percentualeReinvestimento ?? 100) > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                          {fiume.percentualeReinvestimento ?? 100}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {fiume.dataCreazione 
                          ? formatMonthOffset(fiume.meseCreazione, fiume.dataCreazione)
                          : formatMonthOffset(fiume.meseCreazione, impostazioni?.dataInizio)
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(fiume)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(fiume.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifica Fiume</DialogTitle>
              <DialogDescription>Aggiorna i dettagli del tuo flusso di investimento</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nome">Nome</Label>
                <Input
                  id="edit-nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-iniziale">Capitale Iniziale (€)</Label>
                <Input
                  id="edit-iniziale"
                  type="number"
                  value={formData.sorgente}
                  onChange={(e) => setFormData({ ...formData, sorgente: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-rendimento">Rendimento Annuo (%)</Label>
                <Input
                  id="edit-rendimento"
                  type="number"
                  step="0.01"
                  value={formData.rendimento}
                  onChange={(e) => setFormData({ ...formData, rendimento: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-dataCreazione">Data di Inizio</Label>
                <MonthYearPicker
                  value={formData.dataCreazione}
                  onChange={(date) => setFormData({ ...formData, dataCreazione: date })}
                  placeholder="Seleziona mese di inizio"
                  minDate={impostazioni?.dataInizio ? new Date(impostazioni.dataInizio) : new Date()}
                />
                <p className="text-xs text-muted-foreground">
                  Scegli quando attivare questo fiume nel tuo piano. Se non specificato, usa offset mensile.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-percentualeReinvestimento">Reinvestimento Automatico (%)</Label>
                <Input
                  id="edit-percentualeReinvestimento"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.percentualeReinvestimento}
                  onChange={(e) => setFormData({ ...formData, percentualeReinvestimento: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Percentuale del cash flow mensile da reinvestire automaticamente (0% = tutto prelevato, 100% = tutto reinvestito)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvataggio..." : "Salva"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
