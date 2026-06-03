import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Pencil, Trash2, ArrowRightLeft, TrendingUp } from "lucide-react";
import { MonthYearPicker } from "@/components/DatePicker";
import { formatMonthOffset, dateToMonthOffset } from "@/lib/dateFormat";
import { toast } from "sonner";

// ─── Tipi ────────────────────────────────────────────────────────────────────

export type FormData = {
  fiumeSorgenteId: string;
  fiumeDestinazioneId: string;
  mese: string;
  dataReinvestimento: Date | undefined;
  importoFisso: string;
  percentuale: string;
  nuovoFiumeNome: string;
  nuovoFiumeRendimento: string;
  descrizione: string;
};

export const emptyForm = (): FormData => ({
  fiumeSorgenteId: "",
  fiumeDestinazioneId: "",
  mese: "1",
  dataReinvestimento: undefined,
  importoFisso: "",
  percentuale: "",
  nuovoFiumeNome: "",
  nuovoFiumeRendimento: "",
  descrizione: "",
});

// ─── Form (componente a livello modulo — NON annidato dentro Reinvestimenti) ──
// Deve stare fuori per evitare che React smonta/rimonta il form ad ogni render
// del componente padre (che causerebbe la perdita del focus ad ogni keystroke).

interface ReinvestimentoFormProps {
  fd: FormData;
  setFd: (f: FormData) => void;
  tipo: "fisso" | "percentuale";
  setTipo: (t: "fisso" | "percentuale") => void;
  dest: "esistente" | "nuovo";
  setDest: (d: "esistente" | "nuovo") => void;
  fiumi: Array<{ id: number; nome: string }> | undefined;
  dataInizioPiano: Date | string | null | undefined;
}

function ReinvestimentoForm({
  fd, setFd, tipo, setTipo, dest, setDest, fiumi, dataInizioPiano,
}: ReinvestimentoFormProps) {
  return (
    <div className="grid gap-4 py-4">
      {/* Fiume Sorgente */}
      <div className="grid gap-2">
        <Label>Fiume Sorgente (da cui prelevare)</Label>
        <Select value={fd.fiumeSorgenteId} onValueChange={(v) => setFd({ ...fd, fiumeSorgenteId: v })}>
          <SelectTrigger><SelectValue placeholder="Seleziona fiume sorgente" /></SelectTrigger>
          <SelectContent>
            {fiumi?.map(f => (
              <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data */}
      <div className="grid gap-2">
        <Label>Data Reinvestimento *</Label>
        <MonthYearPicker
          value={fd.dataReinvestimento}
          onChange={(date) => {
            const mese = date && dataInizioPiano
              ? dateToMonthOffset(new Date(dataInizioPiano), date).toString()
              : "1";
            setFd({ ...fd, dataReinvestimento: date, mese });
          }}
          placeholder="Seleziona mese"
          minDate={dataInizioPiano ? new Date(dataInizioPiano) : new Date()}
        />
      </div>

      {/* Tipo importo */}
      <div className="grid gap-2">
        <Label>Tipo di Importo</Label>
        <RadioGroup value={tipo} onValueChange={(v: any) => setTipo(v)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="percentuale" id="tipo-perc" />
            <Label htmlFor="tipo-perc" className="font-normal cursor-pointer">
              Percentuale del capitale
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fisso" id="tipo-fisso" />
            <Label htmlFor="tipo-fisso" className="font-normal cursor-pointer">
              Importo fisso
            </Label>
          </div>
        </RadioGroup>
      </div>

      {tipo === "percentuale" ? (
        <div className="grid gap-2">
          <Label htmlFor="reinv-percentuale">Percentuale (%)</Label>
          <Input
            id="reinv-percentuale"
            type="number"
            value={fd.percentuale}
            step="0.01"
            placeholder="es. 20"
            onChange={(e) => setFd({ ...fd, percentuale: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Percentuale del capitale accumulato nel fiume sorgente
          </p>
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="reinv-importo">Importo Fisso (€)</Label>
          <Input
            id="reinv-importo"
            type="number"
            value={fd.importoFisso}
            placeholder="es. 10000"
            onChange={(e) => setFd({ ...fd, importoFisso: e.target.value })}
          />
        </div>
      )}

      {/* Destinazione */}
      <div className="grid gap-2">
        <Label>Destinazione</Label>
        <RadioGroup value={dest} onValueChange={(v: any) => setDest(v)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="esistente" id="dest-esistente" />
            <Label htmlFor="dest-esistente" className="font-normal cursor-pointer">
              Fiume esistente
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="nuovo" id="dest-nuovo" />
            <Label htmlFor="dest-nuovo" className="font-normal cursor-pointer">
              Crea nuovo fiume
            </Label>
          </div>
        </RadioGroup>
      </div>

      {dest === "esistente" ? (
        <div className="grid gap-2">
          <Label>Fiume Destinazione</Label>
          <Select
            value={fd.fiumeDestinazioneId}
            onValueChange={(v) => setFd({ ...fd, fiumeDestinazioneId: v })}
          >
            <SelectTrigger><SelectValue placeholder="Seleziona fiume destinazione" /></SelectTrigger>
            <SelectContent>
              {fiumi
                ?.filter(f => f.id.toString() !== fd.fiumeSorgenteId)
                .map(f => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            <Label htmlFor="nuovo-nome">Nome Nuovo Fiume</Label>
            <Input
              id="nuovo-nome"
              value={fd.nuovoFiumeNome}
              placeholder="es. Investimento Immobiliare"
              onChange={(e) => setFd({ ...fd, nuovoFiumeNome: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nuovo-rendimento">Rendimento Nuovo Fiume (%)</Label>
            <Input
              id="nuovo-rendimento"
              type="number"
              value={fd.nuovoFiumeRendimento}
              placeholder="es. 8"
              step="0.01"
              onChange={(e) => setFd({ ...fd, nuovoFiumeRendimento: e.target.value })}
            />
          </div>
        </>
      )}

      {/* Descrizione */}
      <div className="grid gap-2">
        <Label htmlFor="reinv-descrizione">Descrizione (opzionale)</Label>
        <Input
          id="reinv-descrizione"
          value={fd.descrizione}
          placeholder="es. Diversificazione portafoglio"
          onChange={(e) => setFd({ ...fd, descrizione: e.target.value })}
        />
      </div>
    </div>
  );
}

// ─── Helpers di validazione ───────────────────────────────────────────────────

function buildPayload(
  fd: FormData,
  tipo: "fisso" | "percentuale",
  dest: "esistente" | "nuovo",
): Record<string, any> | null {
  if (!fd.fiumeSorgenteId) { toast.error("Seleziona un fiume sorgente"); return null; }
  if (!fd.dataReinvestimento) { toast.error("Seleziona una data di reinvestimento"); return null; }

  const mese = parseInt(fd.mese);
  if (isNaN(mese)) { toast.error("Mese non valido"); return null; }

  const data: Record<string, any> = {
    fiumeSorgenteId: parseInt(fd.fiumeSorgenteId),
    mese,
    dataReinvestimento: fd.dataReinvestimento,
  };

  if (tipo === "fisso") {
    const v = parseFloat(fd.importoFisso);
    if (isNaN(v) || v <= 0) { toast.error("Inserisci un importo fisso valido"); return null; }
    data.importoFisso = Math.round(v * 100);
  } else {
    const v = parseFloat(fd.percentuale);
    if (isNaN(v) || v <= 0 || v > 100) { toast.error("Inserisci una percentuale tra 0.01 e 100"); return null; }
    data.percentuale = Math.round(v * 100);
  }

  if (dest === "esistente") {
    if (!fd.fiumeDestinazioneId) { toast.error("Seleziona un fiume destinazione"); return null; }
    data.fiumeDestinazioneId = parseInt(fd.fiumeDestinazioneId);
  } else {
    if (!fd.nuovoFiumeNome) { toast.error("Inserisci il nome del nuovo fiume"); return null; }
    const r = parseFloat(fd.nuovoFiumeRendimento);
    if (isNaN(r) || r < 0) { toast.error("Inserisci un rendimento valido per il nuovo fiume"); return null; }
    data.nuovoFiumeNome = fd.nuovoFiumeNome;
    data.nuovoFiumeRendimento = Math.round(r * 100);
  }

  if (fd.descrizione) data.descrizione = fd.descrizione;
  return data;
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function Reinvestimenti() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [tipoImporto, setTipoImporto] = useState<"fisso" | "percentuale">("percentuale");
  const [tipoDestinazione, setTipoDestinazione] = useState<"esistente" | "nuovo">("nuovo");
  const [tipoImportoEdit, setTipoImportoEdit] = useState<"fisso" | "percentuale">("percentuale");
  const [tipoDestinazioneEdit, setTipoDestinazioneEdit] = useState<"esistente" | "nuovo">("esistente");

  const [formData, setFormData] = useState<FormData>(emptyForm());
  const [editFormData, setEditFormData] = useState<FormData>(emptyForm());

  const utils = trpc.useUtils();
  const { data: fiumi, isLoading: fiumiLoading } = trpc.fiumi.list.useQuery();
  const { data: reinvestimenti, isLoading: reinvLoading } = trpc.reinvestimenti.list.useQuery();
  const { data: impostazioni } = trpc.impostazioni.get.useQuery();

  const invalidateCalcoli = () => {
    utils.reinvestimenti.list.invalidate();
    utils.calcoli.simulazioneQuinquennale.invalidate();
    utils.calcoli.riepilogo.invalidate();
    utils.calcoli.evoluzionePatrimonio.invalidate();
  };

  const createMutation = trpc.reinvestimenti.create.useMutation({
    onSuccess: () => {
      invalidateCalcoli();
      toast.success("Reinvestimento creato con successo");
      setIsCreateOpen(false);
      setFormData(emptyForm());
      setTipoImporto("percentuale");
      setTipoDestinazione("nuovo");
    },
    onError: (error) => toast.error("Errore: " + error.message),
  });

  const updateMutation = trpc.reinvestimenti.update.useMutation({
    onSuccess: () => {
      invalidateCalcoli();
      toast.success("Reinvestimento aggiornato");
      setIsEditOpen(false);
      setEditingId(null);
    },
    onError: (error) => toast.error("Errore: " + error.message),
  });

  const deleteMutation = trpc.reinvestimenti.delete.useMutation({
    onSuccess: () => {
      invalidateCalcoli();
      toast.success("Reinvestimento eliminato");
    },
    onError: (error) => toast.error("Errore: " + error.message),
  });

  const handleCreate = () => {
    const data = buildPayload(formData, tipoImporto, tipoDestinazione);
    if (data) createMutation.mutate(data as any);
  };

  const handleEdit = () => {
    if (!editingId) return;
    const data = buildPayload(editFormData, tipoImportoEdit, tipoDestinazioneEdit);
    if (!data) return;
    updateMutation.mutate({ id: editingId, ...data } as any);
  };

  const openEditDialog = (reinv: any) => {
    const r = reinv.reinvestimento;
    setEditingId(r.id);
    setTipoImportoEdit(r.importoFisso ? "fisso" : "percentuale");
    setTipoDestinazioneEdit(r.fiumeDestinazioneId ? "esistente" : "nuovo");
    setEditFormData({
      fiumeSorgenteId: r.fiumeOrigineId.toString(),
      fiumeDestinazioneId: r.fiumeDestinazioneId?.toString() || "",
      mese: r.meseReinvestimento.toString(),
      dataReinvestimento: r.dataReinvestimento ? new Date(r.dataReinvestimento) : undefined,
      importoFisso: r.importoFisso ? (r.importoFisso / 100).toString() : "",
      percentuale: r.percentuale ? (r.percentuale / 100).toString() : "",
      nuovoFiumeNome: r.nuovoFiumeNome || "",
      nuovoFiumeRendimento: r.nuovoFiumeRendimento ? (r.nuovoFiumeRendimento / 100).toString() : "",
      descrizione: "",
    });
    setIsEditOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Sei sicuro di voler eliminare questo reinvestimento?")) {
      deleteMutation.mutate({ id });
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(value);

  const getFiumeNome = (id: number | null) => {
    if (!id) return "-";
    return fiumi?.find(f => f.id === id)?.nome || `Fiume #${id}`;
  };

  const getDestinazioneDisplay = (r: any) => {
    if (r.fiumeDestinazioneId) return getFiumeNome(r.fiumeDestinazioneId);
    if (r.nuovoFiumeNome)
      return `${r.nuovoFiumeNome} (nuovo · ${(r.nuovoFiumeRendimento / 100).toFixed(2)}%)`;
    return "-";
  };

  const getImportoDisplay = (r: any) => {
    if (r.importoFisso) return formatCurrency(r.importoFisso / 100);
    if (r.percentuale) return `${(r.percentuale / 100).toFixed(2)}%`;
    return "-";
  };

  if (fiumiLoading || reinvLoading) {
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
          <div className="flex items-center gap-3 mb-2">
            <ArrowRightLeft className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Reinvestimenti</h1>
          </div>
          <p className="text-muted-foreground">
            Configura flussi di reinvestimento automatico tra i tuoi fiumi di capitale
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Reinvestimenti Programmati</CardTitle>
                <CardDescription>
                  Clicca su una riga per modificarla · Trasferisci capitale da un fiume ad un altro in mesi specifici
                </CardDescription>
              </div>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuovo Reinvestimento
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!reinvestimenti || reinvestimenti.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessun reinvestimento programmato.</p>
                <p className="text-sm mt-2">Clicca su "Nuovo Reinvestimento" per iniziare.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Da (Sorgente)</TableHead>
                    <TableHead>A (Destinazione)</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reinvestimenti.map((reinv) => {
                    const r = reinv.reinvestimento;
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openEditDialog(reinv)}
                      >
                        <TableCell className="font-medium">
                          {r.dataReinvestimento
                            ? formatMonthOffset(r.meseReinvestimento, r.dataReinvestimento)
                            : formatMonthOffset(r.meseReinvestimento, impostazioni?.dataInizio)
                          }
                        </TableCell>
                        <TableCell>{getFiumeNome(r.fiumeOrigineId)}</TableCell>
                        <TableCell>{getDestinazioneDisplay(r)}</TableCell>
                        <TableCell className="font-semibold text-primary">
                          {getImportoDisplay(r)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); openEditDialog(reinv); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDelete(e, r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog Crea */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crea Nuovo Reinvestimento</DialogTitle>
              <DialogDescription>
                Configura un trasferimento di capitale da un fiume ad un altro
              </DialogDescription>
            </DialogHeader>
            <ReinvestimentoForm
              fd={formData}
              setFd={setFormData}
              tipo={tipoImporto}
              setTipo={setTipoImporto}
              dest={tipoDestinazione}
              setDest={setTipoDestinazione}
              fiumi={fiumi}
              dataInizioPiano={impostazioni?.dataInizio}
            />
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifica Reinvestimento</DialogTitle>
              <DialogDescription>
                Aggiorna i parametri del reinvestimento
              </DialogDescription>
            </DialogHeader>
            <ReinvestimentoForm
              fd={editFormData}
              setFd={setEditFormData}
              tipo={tipoImportoEdit}
              setTipo={setTipoImportoEdit}
              dest={tipoDestinazioneEdit}
              setDest={setTipoDestinazioneEdit}
              fiumi={fiumi}
              dataInizioPiano={impostazioni?.dataInizio}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annulla</Button>
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
