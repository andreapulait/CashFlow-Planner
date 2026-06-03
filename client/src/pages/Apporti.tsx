import { useState } from "react";
import type { JSX } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, TrendingUp, Calendar } from "lucide-react";
import { MonthYearPicker } from "@/components/DatePicker";
import { formatMonthOffset, formatDate, dateToMonthOffset } from "@/lib/dateFormat";
import { toast } from "sonner";
import { BudgetTracker } from "@/components/BudgetTracker";

export default function Apporti() {
  const [selectedFiumeId, setSelectedFiumeId] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingApporto, setEditingApporto] = useState<any>(null);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ groupId: string; fiumeId: number } | null>(null);
  
  const [groupFormData, setGroupFormData] = useState({
    importo: "",
    descrizione: "",
    dataInizio: "",
    periodicita: "mensile" as "mensile" | "trimestrale" | "semestrale" | "annuale",
    durataMesi: "12",
    finoFinePiano: false,
    creaAlert: false,
    giorniPreavviso: "7",
  });
  
  const [formData, setFormData] = useState({
    importo: "",
    mese: "1",
    dataAffluente: undefined as Date | undefined,
    descrizione: "",
    ricorrente: false,
    periodicita: "mensile" as "mensile" | "trimestrale" | "semestrale" | "annuale",
    durataMesi: "12",
    finoFinePiano: false,
    creaAlert: false,
    giorniPreavviso: "7",
  });

  const utils = trpc.useUtils();
  const { data: fiumi, isLoading: fiumiLoading } = trpc.fiumi.list.useQuery();
  const { data: impostazioni } = trpc.impostazioni.get.useQuery();
  const { data: allApporti, isLoading: apportiLoading } = trpc.affluenti.listAll.useQuery();
  const { data: budgetMensile } = trpc.affluenti.getBudgetMensile.useQuery();
  
  // Filter apporti by selected fiume if any
  const apporti = selectedFiumeId 
    ? allApporti?.filter(a => a.fiumeId === selectedFiumeId)
    : allApporti;

  const createMutation = trpc.affluenti.create.useMutation({
    onSuccess: (affluente) => {
      utils.affluenti.listAll.invalidate();
      utils.affluenti.getBudgetMensile.invalidate();
      utils.calcoli.simulazioneQuinquennale.invalidate();
      utils.calcoli.riepilogo.invalidate();
      toast.success("Affluente creato con successo");
      
      // Crea alert automatico se richiesto
      if (formData.creaAlert && formData.dataAffluente) {
        createAlertMutation.mutate({
          affluenteId: affluente.id,
          dataAffluente: formData.dataAffluente,
          importo: Math.round(parseFloat(formData.importo) * 100),
          descrizione: formData.descrizione,
          giorniPreavviso: parseInt(formData.giorniPreavviso),
        });
      }
      
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Errore nella creazione: " + error.message);
    },
  });

  const createRicorrenteMutation = trpc.affluenti.createRicorrente.useMutation({
    onSuccess: (data) => {
      utils.affluenti.listAll.invalidate();
      utils.affluenti.getBudgetMensile.invalidate();
      utils.calcoli.simulazioneQuinquennale.invalidate();
      utils.calcoli.riepilogo.invalidate();
      if (data.esclusi > 0) {
        toast.success(`${data.count} apport creati`, {
          description: `${data.esclusi} apport esclusi perché oltre la fine del piano.`,
        });
      } else {
        toast.success(`${data.count} apport ricorrenti creati con successo`);
      }
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Errore nella creazione: " + error.message);
    },
  });

  const createAlertMutation = trpc.alertConfig.createAlertAutomatico.useMutation({
    onSuccess: () => {
      // Alert creato silenziosamente
    },
    onError: (error) => {
      console.error("Errore creazione alert:", error);
    },
  });
  
  const createAlertGruppoMutation = trpc.alertConfig.createAlertGruppo.useMutation({
    onSuccess: (data) => {
      if (data.count > 0) {
        toast.success(`${data.count} alert creati per affluenti futuri`);
      } else {
        toast.info("Nessun affluente futuro senza alert trovato");
      }
    },
    onError: (error) => {
      toast.error("Errore creazione alert: " + error.message);
    },
  });

  const updateMutation = trpc.affluenti.update.useMutation({
    onSuccess: () => {
      utils.affluenti.listAll.invalidate();
      utils.affluenti.getBudgetMensile.invalidate();
      utils.calcoli.simulazioneQuinquennale.invalidate();
      utils.calcoli.riepilogo.invalidate();
      toast.success("Affluente aggiornato con successo");
      setIsEditOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Errore nell'aggiornamento: " + error.message);
    },
  });

  const deleteMutation = trpc.affluenti.delete.useMutation({
    onSuccess: () => {
      utils.affluenti.listAll.invalidate();
      utils.affluenti.getBudgetMensile.invalidate();
      utils.calcoli.simulazioneQuinquennale.invalidate();
      utils.calcoli.riepilogo.invalidate();
      toast.success("Affluente eliminato con successo");
    },
    onError: (error) => {
      toast.error("Errore nell'eliminazione: " + error.message);
    },
  });

  const deleteGroupMutation = trpc.affluenti.deleteGroup.useMutation({
    onSuccess: (data) => {
      utils.affluenti.listAll.invalidate();
      utils.affluenti.getBudgetMensile.invalidate();
      utils.calcoli.simulazioneQuinquennale.invalidate();
      utils.calcoli.riepilogo.invalidate();
      toast.success(`${data.count} affluenti del gruppo eliminati con successo`);
    },
    onError: (error) => {
      toast.error("Errore nell'eliminazione gruppo: " + error.message);
    },
  });

  const updateGroupMutation = trpc.affluenti.updateGroup.useMutation({
    onSuccess: (data) => {
      utils.affluenti.listAll.invalidate();
      utils.affluenti.getBudgetMensile.invalidate();
      utils.calcoli.simulazioneQuinquennale.invalidate();
      utils.calcoli.riepilogo.invalidate();
      toast.success(`${data.count} affluenti del gruppo aggiornati con successo`);
    },
    onError: (error) => {
      toast.error("Errore nell'aggiornamento gruppo: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ 
      importo: "", 
      mese: "1", 
      dataAffluente: undefined, 
      descrizione: "",
      ricorrente: false,
      periodicita: "mensile",
      durataMesi: "12",
      finoFinePiano: false,
      creaAlert: false,
      giorniPreavviso: "7",
    });
  };

  const handleCreate = () => {
    if (!selectedFiumeId) {
      toast.error("Seleziona un fiume prima di creare un affluente");
      return;
    }
    
    const importoCents = Math.round(parseFloat(formData.importo) * 100);
    
    if (isNaN(importoCents) || importoCents <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }

    if (!formData.dataAffluente) {
      toast.error("Seleziona la data dell'apporto");
      return;
    }

    if (!impostazioni?.dataInizio) {
      toast.error("Configura prima la data di inizio piano nelle impostazioni");
      return;
    }

    const mese = dateToMonthOffset(impostazioni.dataInizio, formData.dataAffluente);
    
    if (formData.ricorrente) {
      // Crea affluenti ricorrenti
      createRicorrenteMutation.mutate({
        fiumeId: selectedFiumeId,
        importo: importoCents,
        meseInizio: mese,
        dataInizio: formData.dataAffluente,
        periodicita: formData.periodicita,
        durataMesi: parseInt(formData.durataMesi),
        descrizione: formData.descrizione || undefined,
      });
    } else {
      // Crea affluente singolo
      createMutation.mutate({
        fiumeId: selectedFiumeId,
        importo: importoCents,
        mese,
        dataAffluente: formData.dataAffluente,
        descrizione: formData.descrizione || undefined,
      });
    }
  };

  const handleEdit = () => {
    if (!editingApporto) return;
    const fiumeId = selectedFiumeId || editingApporto.fiumeId;
    
    const updates: any = {
      id: editingApporto.id,
      fiumeId: fiumeId,
    };
    
    if (formData.importo) updates.importo = Math.round(parseFloat(formData.importo) * 100);
    if (formData.mese) updates.mese = parseInt(formData.mese);
    if (formData.dataAffluente !== undefined) updates.dataAffluente = formData.dataAffluente;
    if (formData.descrizione !== undefined) updates.descrizione = formData.descrizione;
    
    updateMutation.mutate(updates);
  };

  const handleDelete = (id: number, fiumeId: number) => {
    if (confirm("Sei sicuro di voler eliminare questo affluente?")) {
      deleteMutation.mutate({ id, fiumeId });
    }
  };

  const openEditDialog = (apporto: any) => {
    setEditingApporto(apporto);
    setFormData({
      importo: (apporto.importo / 100).toString(),
      mese: apporto.mese.toString(),
      dataAffluente: apporto.dataAffluente ? new Date(apporto.dataAffluente) : undefined,
      descrizione: apporto.descrizione || "",
      ricorrente: apporto.ricorrente || false,
      periodicita: apporto.periodicita === 1 ? "mensile" : apporto.periodicita === 3 ? "trimestrale" : apporto.periodicita === 6 ? "semestrale" : "annuale",
      durataMesi: apporto.durataMesi?.toString() || "12",
      finoFinePiano: false,
      creaAlert: false, // Non modificabile in edit
      giorniPreavviso: "7",
    });
    setIsEditOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getTotaleApporti = () => {
    if (!apporti) return 0;
    return apporti.reduce((sum: number, a: any) => sum + a.importo / 100, 0);
  };

  if (fiumiLoading) {
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
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Affluenti di Capitale</h1>
          </div>
          <p className="text-muted-foreground">
            Gestisci gli affluenti di capitale nel tempo per ogni fiume di investimento
          </p>
        </div>

        {/* Selezione Fiume */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Seleziona Fiume</CardTitle>
            <CardDescription>Filtra gli affluenti per fiume (opzionale)</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedFiumeId?.toString() || "all"}
              onValueChange={(value) => setSelectedFiumeId(value === "all" ? null : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tutti i fiumi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i fiumi</SelectItem>
                {fiumi?.map((fiume) => (
                  <SelectItem key={fiume.id} value={fiume.id.toString()}>
                    {fiume.nome} - {formatCurrency(fiume.sorgente / 100)} iniziale
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Budget Tracker */}
        {impostazioni?.budgetMensileAffluenti && (
          <div className="mb-8">
            <BudgetTracker
              budgetMensile={impostazioni.budgetMensileAffluenti}
              affluentiPerMese={budgetMensile || []}
              dataInizio={impostazioni.dataInizio || null}
              orizzonteTemporale={impostazioni.orizzonteTemporale || 60}
            />
          </div>
        )}

        {/* Tabella Apporti */}
        <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Affluenti Programmati</CardTitle>
                  <CardDescription>
                    Elenco degli affluenti di capitale nel tempo{selectedFiumeId ? " per questo fiume" : ""}
                  </CardDescription>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuovo Affluente
                  </Button>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Crea Nuovo Affluente</DialogTitle>
                      <DialogDescription>
                        Aggiungi un affluente di capitale programmato per un fiume di investimento
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="fiume">Fiume di Investimento</Label>
                        <Select
                          value={selectedFiumeId?.toString() || ""}
                          onValueChange={(value) => setSelectedFiumeId(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona un fiume..." />
                          </SelectTrigger>
                          <SelectContent>
                            {fiumi?.map((fiume) => (
                              <SelectItem key={fiume.id} value={fiume.id.toString()}>
                                {fiume.nome} - {formatCurrency(fiume.sorgente / 100)} iniziale
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="importo">Importo (€)</Label>
                        <Input
                          id="importo"
                          type="number"
                          value={formData.importo}
                          onChange={(e) => setFormData({ ...formData, importo: e.target.value })}
                          placeholder="es. 10000"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="dataAffluente">
                          {formData.ricorrente ? "Data del primo apporto *" : "Data dell'apporto *"}
                        </Label>
                        <MonthYearPicker
                          value={formData.dataAffluente}
                          onChange={(date) => setFormData({ ...formData, dataAffluente: date })}
                          placeholder="Seleziona mese"
                          minDate={(() => {
                            const selectedFiume = fiumi?.find(f => f.id === selectedFiumeId);
                            return selectedFiume?.dataCreazione ? new Date(selectedFiume.dataCreazione) : (impostazioni?.dataInizio ? new Date(impostazioni.dataInizio) : new Date());
                          })()}
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.ricorrente
                            ? "Il primo apporto verrà inserito in questo mese. I successivi seguiranno la periodicità indicata."
                            : "Mese in cui l'apporto entra nel capitale del fiume."}
                        </p>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="descrizione">Descrizione (opzionale)</Label>
                        <Input
                          id="descrizione"
                          value={formData.descrizione}
                          onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                          placeholder="es. Bonus annuale"
                        />
                      </div>
                      
                      {/* Affluente Ricorrente */}
                      <div className="border-t pt-4 mt-2">
                        <div className="flex items-center space-x-2 mb-4">
                          <input
                            type="checkbox"
                            id="ricorrente"
                            checked={formData.ricorrente}
                            onChange={(e) => setFormData({ ...formData, ricorrente: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label htmlFor="ricorrente" className="font-medium">Affluente Ricorrente</Label>
                        </div>
                        
                        {formData.ricorrente && (
                          <div className="grid gap-4 pl-6 border-l-2 border-primary/20">
                            <div className="grid gap-2">
                              <Label htmlFor="periodicita">Periodicità</Label>
                              <Select
                                value={formData.periodicita}
                                onValueChange={(value: "mensile" | "trimestrale" | "semestrale" | "annuale") => 
                                  setFormData({ ...formData, periodicita: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona periodicità" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="mensile">Mensile (ogni mese)</SelectItem>
                                  <SelectItem value="trimestrale">Trimestrale (ogni 3 mesi)</SelectItem>
                                  <SelectItem value="semestrale">Semestrale (ogni 6 mesi)</SelectItem>
                                  <SelectItem value="annuale">Annuale (ogni 12 mesi)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="durataMesi">Durata (mesi)</Label>
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="checkbox"
                                  id="finoFinePiano"
                                  checked={formData.finoFinePiano}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setFormData({ 
                                      ...formData, 
                                      finoFinePiano: checked,
                                      durataMesi: checked ? (impostazioni?.orizzonteTemporale || 60).toString() : "12"
                                    });
                                  }}
                                  className="h-4 w-4"
                                />
                                <Label htmlFor="finoFinePiano" className="text-sm font-normal cursor-pointer">
                                  Fino alla fine del piano ({impostazioni?.orizzonteTemporale || 60} mesi)
                                </Label>
                              </div>
                              <Input
                                id="durataMesi"
                                type="number"
                                min="1"
                                max="240"
                                value={formData.durataMesi}
                                onChange={(e) => setFormData({ ...formData, durataMesi: e.target.value, finoFinePiano: false })}
                                placeholder="es. 30"
                                disabled={formData.finoFinePiano}
                              />
                              <p className="text-xs text-muted-foreground">
                                {formData.finoFinePiano 
                                  ? `Affluenti ricorrenti fino alla fine del piano (${impostazioni?.orizzonteTemporale || 60} mesi)`
                                  : `Durata totale del piano ricorrente (max ${impostazioni?.orizzonteTemporale || 60} mesi)`
                                }
                              </p>
                            </div>
                            {(() => {
                              const periodicityMonths = formData.periodicita === "mensile" ? 1 : formData.periodicita === "trimestrale" ? 3 : formData.periodicita === "semestrale" ? 6 : 12;
                              const durataMesi = parseInt(formData.durataMesi || "12");
                              const numRichiesti = Math.floor(durataMesi / periodicityMonths);
                              const importo = parseFloat(formData.importo || "0");
                              const periodoLabel = formData.periodicita === "mensile" ? "mensili" : formData.periodicita === "trimestrale" ? "trimestrali" : formData.periodicita === "semestrale" ? "semestrali" : "annuali";
                              const dataInizio = formData.dataAffluente;
                              const dal = dataInizio ? dataInizio.toLocaleDateString("it-IT", { month: "long", year: "numeric" }) : null;

                              // Calcola quanti rientrano nel piano
                              const orizzonteTemporale = impostazioni?.orizzonteTemporale ?? 60;
                              const meseInizio = (dataInizio && impostazioni?.dataInizio)
                                ? dateToMonthOffset(impostazioni.dataInizio, dataInizio)
                                : 0;
                              const numNelPiano = meseInizio <= orizzonteTemporale
                                ? Math.floor((orizzonteTemporale - meseInizio) / periodicityMonths) + 1
                                : 0;
                              const countEffettivo = Math.min(numRichiesti, numNelPiano);
                              const esclusi = numRichiesti - countEffettivo;

                              return (
                                <div className="space-y-2">
                                  <div className="bg-muted/50 p-3 rounded-md text-sm">
                                    <p className="font-medium">Anteprima:</p>
                                    <p className="text-muted-foreground">
                                      {countEffettivo} apport {periodoLabel} da {formatCurrency(importo)} = {formatCurrency(countEffettivo * importo)} totale
                                      {dal ? `, a partire da ${dal}` : ""}
                                    </p>
                                  </div>
                                  {esclusi > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-sm text-amber-800">
                                      <p className="font-medium">⚠ {esclusi} apport {esclusi === 1 ? "va" : "vanno"} oltre la fine del piano</p>
                                      <p className="mt-0.5 text-amber-700">
                                        Verranno esclusi automaticamente. Per includerli, estendi l'orizzonte temporale nelle impostazioni.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      
                      {/* Alert Automatico */}
                      <div className="border-t pt-4 mt-2">
                        <div className="flex items-center space-x-2 mb-4">
                          <input
                            type="checkbox"
                            id="creaAlert"
                            checked={formData.creaAlert}
                            onChange={(e) => setFormData({ ...formData, creaAlert: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label htmlFor="creaAlert" className="font-medium">Crea Alert Automatico</Label>
                        </div>
                        
                        {formData.creaAlert && (
                          <div className="grid gap-4 pl-6 border-l-2 border-primary/20">
                            <div className="grid gap-2">
                              <Label htmlFor="giorniPreavviso">Giorni di Preavviso</Label>
                              <Input
                                id="giorniPreavviso"
                                type="number"
                                min="1"
                                max="30"
                                value={formData.giorniPreavviso}
                                onChange={(e) => setFormData({ ...formData, giorniPreavviso: e.target.value })}
                                placeholder="7"
                              />
                              <p className="text-xs text-muted-foreground">
                                Riceverai una notifica {formData.giorniPreavviso} giorni prima dell'affluente
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                        Annulla
                      </Button>
                      <Button 
                        onClick={handleCreate} 
                        disabled={createMutation.isPending || createRicorrenteMutation.isPending}
                      >
                        {(createMutation.isPending || createRicorrenteMutation.isPending) 
                          ? "Creazione..." 
                          : formData.ricorrente 
                            ? "Crea Affluenti Ricorrenti" 
                            : "Crea"
                        }
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {apportiLoading ? (
                <Skeleton className="h-64" />
              ) : !apporti || apporti.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun affluente programmato{selectedFiumeId ? " per questo fiume" : ""}.</p>
                  <p className="text-sm mt-2">Clicca su "Nuovo Affluente" per aggiungerne uno.</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fiume</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Importo</TableHead>
                        <TableHead>Descrizione</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // Group affluenti by groupId
                        const grouped: { [key: string]: any[] } = {};
                        const singles: any[] = [];
                        
                        apporti?.forEach((apporto: any) => {
                          if (apporto.ricorrente && apporto.groupId) {
                            if (!grouped[apporto.groupId]) {
                              grouped[apporto.groupId] = [];
                            }
                            grouped[apporto.groupId].push(apporto);
                          } else {
                            singles.push(apporto);
                          }
                        });
                        
                        // Render groups with headers, then singles
                        const rows: JSX.Element[] = [];
                        
                        // Render grouped affluenti with headers
                        Object.entries(grouped).forEach(([groupId, groupApporti]) => {
                          const sortedGroup = groupApporti.sort((a, b) => a.mese - b.mese);
                          const first = sortedGroup[0];
                          const totalImporto = sortedGroup.reduce((sum, a) => sum + a.importo, 0);
                          const periodicityLabel = first.periodicita === 1 ? "Mensile" : first.periodicita === 3 ? "Trimestrale" : first.periodicita === 6 ? "Semestrale" : "Annuale";
                          
                          // Group header row
                          rows.push(
                            <TableRow key={`group-header-${groupId}`} className="bg-muted/50">
                              <TableCell colSpan={5}>
                                <div className="flex items-center justify-between py-1">
                                  <div className="flex items-center gap-3">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newExpanded = new Set(expandedGroups);
                                        if (newExpanded.has(first.groupId)) {
                                          newExpanded.delete(first.groupId);
                                        } else {
                                          newExpanded.add(first.groupId);
                                        }
                                        setExpandedGroups(newExpanded);
                                      }}
                                      className="h-8 w-8 p-0"
                                    >
                                      {expandedGroups.has(first.groupId) ? (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      ) : (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                      )}
                                    </Button>
                                    <span className="text-base font-bold text-foreground mr-2">
                                      {first.fiumeNome}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm">
                                      🔄 {periodicityLabel}
                                    </span>
                                    <span className="text-base font-semibold text-foreground">
                                      {sortedGroup.length} affluenti • Totale: {formatCurrency(totalImporto / 100)}
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingGroup({ groupId: first.groupId!, fiumeId: first.fiumeId });
                                        const periodicityMap: Record<number, "mensile" | "trimestrale" | "semestrale" | "annuale"> = {
                                          1: "mensile",
                                          3: "trimestrale",
                                          6: "semestrale",
                                          12: "annuale",
                                        };
                                        
                                        // Conta quanti affluenti ci sono effettivamente nel gruppo
                                        const affluentiGruppo = allApporti?.filter(a => a.groupId === first.groupId) || [];
                                        const numeroEffettivoRicorrenze = affluentiGruppo.length;
                                        
                                        // Calcola se è "fino alla fine del piano"
                                        const orizzonteTemporale = impostazioni?.orizzonteTemporale || 60;
                                        const dataInizioAffluente = first.dataAffluente ? new Date(first.dataAffluente) : null;
                                        const dataInizioPiano = impostazioni?.dataInizio ? new Date(impostazioni.dataInizio) : null;
                                        
                                        let maxRicorrenzePossibili = orizzonteTemporale;
                                        if (dataInizioAffluente && dataInizioPiano) {
                                          const meseInizio = dateToMonthOffset(dataInizioPiano, dataInizioAffluente);
                                          const mesiRimanenti = orizzonteTemporale - meseInizio;
                                          maxRicorrenzePossibili = Math.floor(mesiRimanenti / (first.periodicita || 1));
                                        }
                                        
                                        const isFinePiano = numeroEffettivoRicorrenze >= maxRicorrenzePossibili;
                                        
                                        setGroupFormData({
                                          importo: (first.importo / 100).toString(),
                                          descrizione: first.descrizione || "",
                                          dataInizio: first.dataAffluente ? new Date(first.dataAffluente).toISOString() : "",
                                          periodicita: periodicityMap[first.periodicita!] || "mensile",
                                          durataMesi: numeroEffettivoRicorrenze.toString(),
                                          finoFinePiano: isFinePiano,
                                          creaAlert: false,
                                          giorniPreavviso: "7",
                                        });
                                        setIsEditGroupOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5 mr-1" />
                                      Modifica Gruppo
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        if (confirm(`Eliminare tutti i ${sortedGroup.length} affluenti del gruppo ${periodicityLabel}?`)) {
                                          deleteGroupMutation.mutate({
                                            groupId: first.groupId,
                                            fiumeId: first.fiumeId,
                                          });
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                                      Elimina Gruppo
                                    </Button>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                          
                          // Individual affluenti rows in group (only if expanded)
                          if (expandedGroups.has(first.groupId)) {
                            sortedGroup.forEach((apporto: any) => {
                            rows.push(
                              <TableRow key={apporto.id} className="hover:bg-muted/30">
                                <TableCell className="font-medium pl-8">
                                  {apporto.fiumeNome}
                                </TableCell>
                                <TableCell>
                                  {apporto.dataAffluente
                                    ? formatDate(apporto.dataAffluente)
                                    : formatMonthOffset(apporto.mese, impostazioni?.dataInizio)
                                  }
                                </TableCell>
                                <TableCell>{formatCurrency(apporto.importo / 100)}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {apporto.descrizione || "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditDialog(apporto)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDelete(apporto.id, apporto.fiumeId)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          });
                          }
                        });
                        
                        // Render single affluenti
                        singles.forEach((apporto: any) => {
                          rows.push(
                            <TableRow key={apporto.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {apporto.fiumeNome}
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-xs">
                                    Una tantum
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {apporto.dataAffluente
                                  ? formatDate(apporto.dataAffluente)
                                  : formatMonthOffset(apporto.mese, impostazioni?.dataInizio)
                                }
                              </TableCell>
                              <TableCell>{formatCurrency(apporto.importo / 100)}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {apporto.descrizione || "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(apporto)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(apporto.id, apporto.fiumeId)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        });
                        
                        return rows;
                      })()}
                    </TableBody>
                  </Table>
                  
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Totale Affluenti:</span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(getTotaleApporti())}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifica Affluente</DialogTitle>
              <DialogDescription>Aggiorna i dettagli dell'affluente di capitale</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-importo">Importo (€)</Label>
                <Input
                  id="edit-importo"
                  type="number"
                  value={formData.importo}
                  onChange={(e) => setFormData({ ...formData, importo: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-dataAffluente">Data Apporto</Label>
                <MonthYearPicker
                  value={formData.dataAffluente}
                  onChange={(date) => setFormData({ ...formData, dataAffluente: date })}
                  placeholder="Seleziona mese apporto"
                  minDate={impostazioni?.dataInizio ? new Date(impostazioni.dataInizio) : new Date()}
                />
                <p className="text-xs text-muted-foreground">
                  Scegli quando effettuare questo apporto. Se non specificato, usa offset mensile.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-descrizione">Descrizione</Label>
                <Input
                  id="edit-descrizione"
                  value={formData.descrizione}
                  onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                />
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

        {/* Dialog Modifica Gruppo */}
        <Dialog open={isEditGroupOpen} onOpenChange={setIsEditGroupOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifica Gruppo Affluenti Ricorrenti</DialogTitle>
              <DialogDescription>
                Le modifiche verranno applicate a tutti gli affluenti del gruppo
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="group-importo">Importo (€)</Label>
                <Input
                  id="group-importo"
                  type="number"
                  value={groupFormData.importo}
                  onChange={(e) => setGroupFormData({ ...groupFormData, importo: e.target.value })}
                  placeholder="es. 10000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="group-descrizione">Descrizione (opzionale)</Label>
                <Input
                  id="group-descrizione"
                  value={groupFormData.descrizione}
                  onChange={(e) => setGroupFormData({ ...groupFormData, descrizione: e.target.value })}
                  placeholder="es. Bonus annuale"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="group-dataInizio">Data Inizio Programmazione</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Per affluenti ricorrenti, questa è la data di riferimento. Il primo affluente sarà calcolato aggiungendo la periodicità a questa data.
                </p>
                <MonthYearPicker
                  value={groupFormData.dataInizio ? new Date(groupFormData.dataInizio) : undefined}
                  onChange={(date) => setGroupFormData({ ...groupFormData, dataInizio: date?.toISOString() || '' })}
                  placeholder="Seleziona mese e anno"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="group-periodicita">Periodicità</Label>
                <Select
                  value={groupFormData.periodicita}
                  onValueChange={(value) => setGroupFormData({ ...groupFormData, periodicita: value as any })}
                >
                  <SelectTrigger id="group-periodicita">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensile">Mensile</SelectItem>
                    <SelectItem value="trimestrale">Trimestrale</SelectItem>
                    <SelectItem value="semestrale">Semestrale</SelectItem>
                    <SelectItem value="annuale">Annuale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="group-durata">Durata (mesi)</Label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="group-finoFinePiano"
                    checked={groupFormData.finoFinePiano}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setGroupFormData({ 
                        ...groupFormData, 
                        finoFinePiano: checked,
                        durataMesi: checked ? (impostazioni?.orizzonteTemporale || 60).toString() : "12"
                      });
                    }}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="group-finoFinePiano" className="text-sm font-normal cursor-pointer">
                    Fino alla fine del piano ({impostazioni?.orizzonteTemporale || 60} mesi)
                  </Label>
                </div>
                <Input
                  id="group-durata"
                  type="number"
                  min="1"
                  max="240"
                  value={groupFormData.durataMesi}
                  onChange={(e) => setGroupFormData({ ...groupFormData, durataMesi: e.target.value, finoFinePiano: false })}
                  placeholder="es. 12"
                  disabled={groupFormData.finoFinePiano}
                />
                <p className="text-xs text-muted-foreground">
                  {groupFormData.finoFinePiano 
                    ? `Affluenti ricorrenti fino alla fine del piano (${impostazioni?.orizzonteTemporale || 60} mesi)`
                    : `Durata totale del piano ricorrente (max ${impostazioni?.orizzonteTemporale || 60} mesi)`
                  }
                </p>
              </div>
              
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="group-creaAlert">Crea alert automatici</Label>
                    <p className="text-xs text-muted-foreground">
                      Crea notifiche per affluenti futuri senza alert
                    </p>
                  </div>
                  <input
                    id="group-creaAlert"
                    type="checkbox"
                    checked={groupFormData.creaAlert}
                    onChange={(e) => setGroupFormData({ ...groupFormData, creaAlert: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
                
                {groupFormData.creaAlert && (
                  <div className="grid gap-2">
                    <Label htmlFor="group-giorniPreavviso">Giorni preavviso</Label>
                    <Input
                      id="group-giorniPreavviso"
                      type="number"
                      value={groupFormData.giorniPreavviso}
                      onChange={(e) => setGroupFormData({ ...groupFormData, giorniPreavviso: e.target.value })}
                      placeholder="es. 7"
                      min="1"
                    />
                    <p className="text-xs text-muted-foreground">
                      Riceverai una notifica X giorni prima di ogni affluente futuro
                    </p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditGroupOpen(false)}>
                Annulla
              </Button>
              <Button 
                onClick={() => {
                  if (!editingGroup) return;
                  const importoCents = Math.round(parseFloat(groupFormData.importo) * 100);
                  const durataMesi = parseInt(groupFormData.durataMesi);
                  if (importoCents > 0 && durataMesi > 0) {
                    updateGroupMutation.mutate({
                      groupId: editingGroup.groupId,
                      fiumeId: editingGroup.fiumeId,
                      importo: importoCents,
                      descrizione: groupFormData.descrizione || undefined,
                      periodicita: groupFormData.periodicita,
                      durataMesi: durataMesi,
                      dataInizio: groupFormData.dataInizio,
                    }, {
                      onSuccess: () => {
                        // Se richiesto, crea alert per affluenti futuri
                        if (groupFormData.creaAlert) {
                          createAlertGruppoMutation.mutate({
                            groupId: editingGroup.groupId,
                            fiumeId: editingGroup.fiumeId,
                            giorniPreavviso: parseInt(groupFormData.giorniPreavviso),
                          });
                        }
                      }
                    });
                    setIsEditGroupOpen(false);
                  } else {
                    toast.error("Importo e durata devono essere validi");
                  }
                }}
                disabled={updateGroupMutation.isPending}
              >
                {updateGroupMutation.isPending ? "Salvataggio..." : "Salva Modifiche"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
