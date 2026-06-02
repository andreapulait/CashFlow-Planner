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

export default function Reinvestimenti() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tipoImporto, setTipoImporto] = useState<"fisso" | "percentuale">("percentuale");
  const [tipoDestinazione, setTipoDestinazione] = useState<"esistente" | "nuovo">("nuovo");
  
  const [formData, setFormData] = useState({
    fiumeSorgenteId: "",
    fiumeDestinazioneId: "",
    mese: "1",
    dataReinvestimento: undefined as Date | undefined,
    importoFisso: "",
    percentuale: "",
    nuovoFiumeNome: "",
    nuovoFiumeRendimento: "",
    descrizione: "",
  });

  const utils = trpc.useUtils();
  const { data: fiumi, isLoading: fiumiLoading } = trpc.fiumi.list.useQuery();
  const { data: reinvestimenti, isLoading: reinvLoading } = trpc.reinvestimenti.list.useQuery();
  const { data: impostazioni } = trpc.impostazioni.get.useQuery();

  const createMutation = trpc.reinvestimenti.create.useMutation({
    onSuccess: () => {
      utils.reinvestimenti.list.invalidate();
      utils.calcoli.simulazioneQuinquennale.invalidate();
      utils.calcoli.riepilogo.invalidate();
      toast.success("Reinvestimento creato con successo");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });

  const deleteMutation = trpc.reinvestimenti.delete.useMutation({
    onSuccess: () => {
      utils.reinvestimenti.list.invalidate();
      utils.calcoli.simulazioneQuinquennale.invalidate();
      utils.calcoli.riepilogo.invalidate();
      toast.success("Reinvestimento eliminato");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
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
    setTipoImporto("percentuale");
    setTipoDestinazione("nuovo");
  };

  const handleCreate = () => {
    //  const handleCreate = () => {
    console.log("[DEBUG] formData:", formData);
    if (!formData.fiumeSorgenteId) {
      toast.error("Seleziona un fiume sorgente");
      return;
    }
    if (!formData.dataReinvestimento) {
      toast.error("Seleziona una data di reinvestimento");
      return;
    }

    const fiumeOrigineId = parseInt(formData.fiumeSorgenteId);
    const meseReinvestimento = parseInt(formData.mese);
    console.log("[DEBUG] fiumeOrigineId:", fiumeOrigineId, "meseReinvestimento:", meseReinvestimento);
    
    if (isNaN(fiumeOrigineId)) {
      toast.error("Errore: ID fiume sorgente non valido");
      return;
    }
    if (isNaN(meseReinvestimento)) {
      toast.error("Errore: Mese reinvestimento non valido");
      return;
    }
    
    const data: any = {
      fiumeSorgenteId: fiumeOrigineId,
      mese: meseReinvestimento,
      dataReinvestimento: formData.dataReinvestimento,
    };

    if (tipoImporto === "fisso") {
      data.importoFisso = Math.round(parseFloat(formData.importoFisso) * 100);
    } else {
      data.percentuale = Math.round(parseFloat(formData.percentuale) * 100);
    }

    if (tipoDestinazione === "esistente") {
      data.fiumeDestinazioneId = parseInt(formData.fiumeDestinazioneId);
    } else {
      data.nuovoFiumeNome = formData.nuovoFiumeNome;
      data.nuovoFiumeRendimento = Math.round(parseFloat(formData.nuovoFiumeRendimento) * 100);
    }

    if (formData.descrizione) {
      data.descrizione = formData.descrizione;
    }

    createMutation.mutate(data);
  };

  const handleDelete = (id: number) => {
    if (confirm("Sei sicuro di voler eliminare questo reinvestimento?")) {
      deleteMutation.mutate({ id });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getFiumeNome = (id: number | null) => {
    if (!id) return "-";
    const fiume = fiumi?.find(f => f.id === id);
    return fiume?.nome || `Fiume #${id}`;
  };

  const getDestinazioneDisplay = (reinv: any) => {
    if (reinv.fiumeDestinazioneId) {
      return getFiumeNome(reinv.fiumeDestinazioneId);
    }
    if (reinv.nuovoFiumeNome) {
      return `${reinv.nuovoFiumeNome} (nuovo - ${(reinv.nuovoFiumeRendimento / 100).toFixed(2)}%)`;
    }
    return "-";
  };

  const getImportoDisplay = (reinv: any) => {
    if (reinv.importoFisso) {
      return formatCurrency(reinv.importoFisso / 100);
    }
    if (reinv.percentuale) {
      return `${(reinv.percentuale / 100).toFixed(2)}%`;
    }
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
                  Trasferisci automaticamente capitale da un fiume ad un altro in anni specifici
                </CardDescription>
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuovo Reinvestimento
                </Button>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Crea Nuovo Reinvestimento</DialogTitle>
                    <DialogDescription>
                      Configura un trasferimento automatico di capitale da un fiume ad un altro
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {/* Fiume Sorgente */}
                    <div className="grid gap-2">
                      <Label htmlFor="sorgente">Fiume Sorgente (da cui prelevare)</Label>
                      <Select
                        value={formData.fiumeSorgenteId}
                        onValueChange={(value) => setFormData({ ...formData, fiumeSorgenteId: value })}
                      >
                        <SelectTrigger id="sorgente">
                          <SelectValue placeholder="Seleziona fiume sorgente" />
                        </SelectTrigger>
                        <SelectContent>
                          {fiumi?.map((fiume) => (
                            <SelectItem key={fiume.id} value={fiume.id.toString()}>
                              {fiume.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Anno */}
                    <div className="grid gap-2">
                      <Label htmlFor="dataReinvestimento">Data Reinvestimento</Label>
                      <MonthYearPicker
                        value={formData.dataReinvestimento}
                        onChange={(date) => {
                          const mese = date && impostazioni?.dataInizio 
                            ? dateToMonthOffset(new Date(impostazioni.dataInizio), date).toString()
                            : "1";
                          setFormData({ ...formData, dataReinvestimento: date, mese });
                        }}
                        placeholder="Seleziona mese reinvestimento"
                        minDate={impostazioni?.dataInizio ? new Date(impostazioni.dataInizio) : new Date()}
                      />
                      <p className="text-xs text-muted-foreground">
                        Scegli quando effettuare questo reinvestimento. Se non specificato, usa offset mensile.
                      </p>
                    </div>

                    {/* Tipo Importo */}
                    <div className="grid gap-2">
                      <Label>Tipo di Importo</Label>
                      <RadioGroup value={tipoImporto} onValueChange={(v: any) => setTipoImporto(v)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="percentuale" id="percentuale" />
                          <Label htmlFor="percentuale" className="font-normal">Percentuale del capitale</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="fisso" id="fisso" />
                          <Label htmlFor="fisso" className="font-normal">Importo fisso</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {tipoImporto === "percentuale" ? (
                      <div className="grid gap-2">
                        <Label htmlFor="percentuale-val">Percentuale (%)</Label>
                        <Input
                          id="percentuale-val"
                          type="number"
                          value={formData.percentuale}
                          onChange={(e) => setFormData({ ...formData, percentuale: e.target.value })}
                          placeholder="es. 20"
                          step="0.01"
                        />
                        <p className="text-sm text-muted-foreground">
                          Percentuale del capitale accumulato nel fiume sorgente
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <Label htmlFor="importo-fisso">Importo Fisso (€)</Label>
                        <Input
                          id="importo-fisso"
                          type="number"
                          value={formData.importoFisso}
                          onChange={(e) => setFormData({ ...formData, importoFisso: e.target.value })}
                          placeholder="es. 10000"
                        />
                      </div>
                    )}

                    {/* Tipo Destinazione */}
                    <div className="grid gap-2">
                      <Label>Destinazione</Label>
                      <RadioGroup value={tipoDestinazione} onValueChange={(v: any) => setTipoDestinazione(v)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="nuovo" id="nuovo" />
                          <Label htmlFor="nuovo" className="font-normal">Crea nuovo fiume</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="esistente" id="esistente" />
                          <Label htmlFor="esistente" className="font-normal">Fiume esistente</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {tipoDestinazione === "esistente" ? (
                      <div className="grid gap-2">
                        <Label htmlFor="destinazione">Fiume Destinazione</Label>
                        <Select
                          value={formData.fiumeDestinazioneId}
                          onValueChange={(value) => setFormData({ ...formData, fiumeDestinazioneId: value })}
                        >
                          <SelectTrigger id="destinazione">
                            <SelectValue placeholder="Seleziona fiume destinazione" />
                          </SelectTrigger>
                          <SelectContent>
                            {fiumi?.filter(f => f.id.toString() !== formData.fiumeSorgenteId).map((fiume) => (
                              <SelectItem key={fiume.id} value={fiume.id.toString()}>
                                {fiume.nome}
                              </SelectItem>
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
                            value={formData.nuovoFiumeNome}
                            onChange={(e) => setFormData({ ...formData, nuovoFiumeNome: e.target.value })}
                            placeholder="es. Investimento Immobiliare"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="nuovo-rendimento">Rendimento Nuovo Fiume (%)</Label>
                          <Input
                            id="nuovo-rendimento"
                            type="number"
                            value={formData.nuovoFiumeRendimento}
                            onChange={(e) => setFormData({ ...formData, nuovoFiumeRendimento: e.target.value })}
                            placeholder="es. 8"
                            step="0.01"
                          />
                        </div>
                      </>
                    )}

                    {/* Descrizione */}
                    <div className="grid gap-2">
                      <Label htmlFor="descrizione">Descrizione (opzionale)</Label>
                      <Input
                        id="descrizione"
                        value={formData.descrizione}
                        onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                        placeholder="es. Diversificazione portafoglio"
                      />
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
                    <TableHead>Anno</TableHead>
                    <TableHead>Da (Sorgente)</TableHead>
                    <TableHead>A (Destinazione)</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reinvestimenti.map((reinv) => (
                    <TableRow key={reinv.id}>
                      <TableCell className="font-medium">
                        {reinv.dataReinvestimento
                          ? formatMonthOffset(reinv.mese, reinv.dataReinvestimento)
                          : formatMonthOffset(reinv.mese, impostazioni?.dataInizio)
                        }
                      </TableCell>
                      <TableCell>{getFiumeNome(reinv.fiumeSorgenteId)}</TableCell>
                      <TableCell>{getDestinazioneDisplay(reinv)}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {getImportoDisplay(reinv)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {reinv.descrizione || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(reinv.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
