/**
 * FiumiManager — componente riutilizzabile per la gestione fiumi.
 * Usato sia dalla Dashboard (sezione inferiore) che dalla pagina /fiumi.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { MonthYearPicker } from "@/components/DatePicker";
import { formatMonthOffset } from "@/lib/dateFormat";
import { toast } from "sonner";

type FormData = {
  nome: string;
  sorgente: string;
  rendimento: string;
  meseCreazione: string;
  dataCreazione: Date | undefined;
  percentualeReinvestimento: string;
  creaAlert: boolean;
  giorniPreavviso: string;
};

const emptyForm = (): FormData => ({
  nome: "", sorgente: "", rendimento: "",
  meseCreazione: "0", dataCreazione: undefined,
  percentualeReinvestimento: "100",
  creaAlert: false, giorniPreavviso: "7",
});

export function FiumiManager() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFiume, setEditingFiume] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm());

  const utils = trpc.useUtils();
  const { data: fiumi, isLoading } = trpc.fiumi.list.useQuery();
  const { data: impostazioni } = trpc.impostazioni.get.useQuery();

  const invalidate = () => {
    utils.fiumi.list.invalidate();
    utils.calcoli.riepilogo.invalidate();
    utils.calcoli.simulazioneQuinquennale.invalidate();
  };

  const createAlertFiumeMutation = trpc.alertConfig.createAlertFiume.useMutation({
    onError: (e) => console.error("Alert fiume:", e.message),
  });

  const createMutation = trpc.fiumi.create.useMutation({
    onSuccess: (fiume) => {
      invalidate();
      setIsCreateOpen(false);
      // Crea alert se richiesto e se esiste dataCreazione
      if (formData.creaAlert && formData.dataCreazione && fiume) {
        createAlertFiumeMutation.mutate({
          fiumeId: (fiume as any).id,
          nomeFiume: formData.nome,
          dataAttivazione: formData.dataCreazione,
          giorniPreavviso: parseInt(formData.giorniPreavviso) || 7,
        });
      }
      setFormData(emptyForm());
      toast.success("Fiume creato");
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const updateMutation = trpc.fiumi.update.useMutation({
    onSuccess: () => { invalidate(); setIsEditOpen(false); setEditingFiume(null); setFormData(emptyForm()); toast.success("Fiume aggiornato"); },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const deleteMutation = trpc.fiumi.delete.useMutation({
    onSuccess: () => { invalidate(); toast.success("Fiume eliminato"); },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const handleCreate = () => {
    if (!formData.nome) { toast.error("Il nome è obbligatorio"); return; }
    const sorgente = parseFloat(formData.sorgente);
    const rendimento = parseFloat(formData.rendimento);
    if (isNaN(sorgente) || sorgente < 0) { toast.error("Capitale iniziale non valido"); return; }
    if (isNaN(rendimento) || rendimento < 0) { toast.error("Rendimento non valido"); return; }
    createMutation.mutate({
      nome: formData.nome,
      sorgente: Math.round(sorgente * 100),
      rendimento: Math.round(rendimento * 100),
      meseCreazione: parseInt(formData.meseCreazione) || 0,
      dataCreazione: formData.dataCreazione,
      percentualeReinvestimento: parseInt(formData.percentualeReinvestimento) || 100,
    });
  };

  const handleEdit = () => {
    if (!editingFiume) return;
    const updates: any = { id: editingFiume.id };
    if (formData.nome) updates.nome = formData.nome;
    if (formData.sorgente) updates.sorgente = Math.round(parseFloat(formData.sorgente) * 100);
    if (formData.rendimento) updates.rendimento = Math.round(parseFloat(formData.rendimento) * 100);
    updates.meseCreazione = parseInt(formData.meseCreazione) || 0;
    if (formData.dataCreazione !== undefined) updates.dataCreazione = formData.dataCreazione;
    updates.percentualeReinvestimento = parseInt(formData.percentualeReinvestimento) || 100;
    updateMutation.mutate(updates);
  };

  const openEdit = (fiume: any) => {
    setEditingFiume(fiume);
    setFormData({
      nome: fiume.nome,
      sorgente: (fiume.sorgente / 100).toString(),
      rendimento: (fiume.rendimento / 100).toString(),
      meseCreazione: fiume.meseCreazione.toString(),
      dataCreazione: fiume.dataCreazione ? new Date(fiume.dataCreazione) : undefined,
      percentualeReinvestimento: (fiume.percentualeReinvestimento ?? 100).toString(),
      creaAlert: false,
      giorniPreavviso: "7",
    });
    setIsEditOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Eliminare questo fiume? Tutti gli affluenti e reinvestimenti associati verranno rimossi.")) {
      deleteMutation.mutate({ id });
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

  const FiumeForm = ({ id }: { id: string }) => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor={`${id}-nome`}>Nome *</Label>
        <Input id={`${id}-nome`} value={formData.nome}
          onChange={e => setFormData({ ...formData, nome: e.target.value })}
          placeholder="es. Dividendi Azionari" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-sorgente`}>Capitale Iniziale (€)</Label>
        <Input id={`${id}-sorgente`} type="number" value={formData.sorgente}
          onChange={e => setFormData({ ...formData, sorgente: e.target.value })}
          placeholder="es. 10000" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-rendimento`}>Rendimento Annuo (%)</Label>
        <Input id={`${id}-rendimento`} type="number" step="0.01" value={formData.rendimento}
          onChange={e => setFormData({ ...formData, rendimento: e.target.value })}
          placeholder="es. 8.00" />
      </div>
      <div className="grid gap-2">
        <Label>Data di Inizio</Label>
        <MonthYearPicker
          value={formData.dataCreazione}
          onChange={date => setFormData({ ...formData, dataCreazione: date })}
          placeholder="Seleziona mese di inizio"
          minDate={impostazioni?.dataInizio ? new Date(impostazioni.dataInizio) : new Date()}
        />
        <p className="text-xs text-muted-foreground">Mese in cui questo fiume inizia a produrre rendita nel piano.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-reinv`}>Reinvestimento Automatico (%)</Label>
        <Input id={`${id}-reinv`} type="number" min="0" max="100" step="1"
          value={formData.percentualeReinvestimento}
          onChange={e => setFormData({ ...formData, percentualeReinvestimento: e.target.value })} />
        <p className="text-xs text-muted-foreground">
          Quota della rendita mensile reinvestita nel fiume (100% = tutto torna in capitale).
        </p>
      </div>

      {/* Alert automatico — solo in creazione (richiede dataCreazione) */}
      {id === "create" && (
        <div className="border-t pt-4 mt-2">
          <div className="flex items-center space-x-2 mb-3">
            <input
              type="checkbox"
              id={`${id}-creaAlert`}
              checked={formData.creaAlert}
              onChange={e => setFormData({ ...formData, creaAlert: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor={`${id}-creaAlert`} className="font-medium cursor-pointer">
              Crea Alert Automatico
            </Label>
          </div>
          {formData.creaAlert && (
            <div className="pl-6 grid gap-2">
              <Label htmlFor={`${id}-giorni`}>Giorni di Preavviso</Label>
              <Input
                id={`${id}-giorni`}
                type="number" min="1" max="30"
                value={formData.giorniPreavviso}
                onChange={e => setFormData({ ...formData, giorniPreavviso: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Riceverai una notifica {formData.giorniPreavviso} giorni prima dell'attivazione del fiume.
                Richiede che sia impostata la Data di Inizio.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>I Tuoi Fiumi di Investimento</CardTitle>
              <CardDescription>
                Clicca su una riga per modificarla · Gestisci i tuoi flussi di capitale e rendimenti
              </CardDescription>
            </div>
            <Button onClick={() => { setFormData(emptyForm()); setIsCreateOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Fiume
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                  <TableHead className="text-right">Inizio</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fiumi.map(fiume => (
                  <TableRow
                    key={fiume.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEdit(fiume)}
                  >
                    <TableCell className="font-medium">{fiume.nome}</TableCell>
                    <TableCell className="text-right">{formatCurrency(fiume.sorgente / 100)}</TableCell>
                    <TableCell className="text-right">{(fiume.rendimento / 100).toFixed(2)}%</TableCell>
                    <TableCell className="text-right">
                      <span className={(fiume.percentualeReinvestimento ?? 100) > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                        {fiume.percentualeReinvestimento ?? 100}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {fiume.dataCreazione
                        ? formatMonthOffset(fiume.meseCreazione, fiume.dataCreazione)
                        : formatMonthOffset(fiume.meseCreazione, impostazioni?.dataInizio)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(fiume); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={e => handleDelete(e, fiume.id)}>
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

      {/* Dialog Crea */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crea Nuovo Fiume</DialogTitle>
            <DialogDescription>Aggiungi un nuovo flusso di investimento al tuo portafoglio</DialogDescription>
          </DialogHeader>
          <FiumeForm id="create" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creazione..." : "Crea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifica */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Fiume</DialogTitle>
            <DialogDescription>Aggiorna i dettagli del flusso di investimento</DialogDescription>
          </DialogHeader>
          <FiumeForm id="edit" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annulla</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
