import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, GitCompare, Star, Layers, ChevronDown, ChevronRight, Wallet, ArrowRightLeft, RefreshCw, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function Scenari() {
  const [nuovoNome, setNuovoNome] = useState("");
  const [nuovaDescrizione, setNuovaDescrizione] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scenariSelezionati, setScenariSelezionati] = useState<number[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const utils = trpc.useUtils();
  const { data: scenari, isLoading } = trpc.scenari.list.useQuery();

  const invalidate = () => utils.scenari.list.invalidate();

  const createMutation = trpc.scenari.create.useMutation({
    onSuccess: () => { invalidate(); setNuovoNome(""); setNuovaDescrizione(""); setDialogOpen(false); toast.success("Scenario salvato"); },
    onError: (e) => toast.error(`Errore: ${e.message}`),
  });

  const deleteMutation = trpc.scenari.delete.useMutation({
    onSuccess: () => { invalidate(); toast.success("Scenario eliminato"); },
    onError: (e) => toast.error(`Errore: ${e.message}`),
  });

  const preferitomutation = trpc.scenari.togglePreferito.useMutation({
    onSuccess: () => { invalidate(); toast.success("Scenario preferito aggiornato"); },
    onError: (e) => toast.error(`Errore: ${e.message}`),
  });

  const { data: confronto, isLoading: confrontoLoading } = trpc.scenari.compare.useQuery(
    { scenarioIds: scenariSelezionati },
    { enabled: scenariSelezionati.length >= 2 }
  );

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(v / 100);

  const toggleExpand = (id: number) =>
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelect = (id: number) =>
    setScenariSelezionati(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) { toast.warning("Massimo 3 scenari confrontabili"); return prev; }
      return [...prev, id];
    });

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

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Layers className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Scenari What-If</h1>
            </div>
            <p className="text-muted-foreground">
              Salva fotografie del piano e confronta strategie diverse
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Scenario
          </Button>
        </div>

        {/* Lista scenari */}
        {!scenari || scenari.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessuno scenario salvato.</p>
              <p className="text-sm mt-2">Salva la configurazione attuale come scenario per iniziare a confrontare strategie.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {scenari.map(scenario => {
              const isExpanded = expandedIds.has(scenario.id);
              const isSelected = scenariSelezionati.includes(scenario.id);
              return (
                <Card key={scenario.id} className={scenario.attivo ? "border-amber-400 border-2" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="flex items-center gap-2 text-base">
                          {scenario.nome}
                          {scenario.attivo === 1 && (
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
                          )}
                        </CardTitle>
                        {scenario.descrizione && (
                          <CardDescription className="mt-1 text-xs">{scenario.descrizione}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={scenario.attivo === 1 ? "text-amber-400" : "text-muted-foreground"}
                          title="Segna come preferito"
                          onClick={() => preferitomutation.mutate({ id: scenario.id })}
                        >
                          <Star className={`h-4 w-4 ${scenario.attivo === 1 ? "fill-amber-400" : ""}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate({ id: scenario.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Selezione confronto */}
                    <div className="flex items-center gap-2 mb-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(scenario.id)}
                      />
                      <span className="text-sm text-muted-foreground">Includi nel confronto</span>
                      {isSelected && (
                        <Badge variant="secondary" className="text-xs ml-auto">
                          #{scenariSelezionati.indexOf(scenario.id) + 1}
                        </Badge>
                      )}
                    </div>

                    {/* Expand dettagli */}
                    <button
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                      onClick={() => toggleExpand(scenario.id)}
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      Dettagli snapshot
                    </button>

                    {isExpanded && (
                      <SnapshotDetails scenarioId={scenario.id} />
                    )}

                    <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {new Date(scenario.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tabella confronto */}
        {scenariSelezionati.length >= 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                <CardTitle>Confronto Scenari</CardTitle>
              </div>
              <CardDescription>
                {scenariSelezionati.length} scenari selezionati · i valori migliori sono evidenziati in verde
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
                      <TableHead className="text-right">Fiumi</TableHead>
                      <TableHead className="text-right">Orizzonte</TableHead>
                      <TableHead className="text-right">Capitale Finale</TableHead>
                      <TableHead className="text-right">Cash Flow/mese</TableHead>
                      <TableHead className="text-right">ROI</TableHead>
                      <TableHead className="text-right">vs Obiettivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {confronto.map((item, i) => {
                      const maxCap  = Math.max(...confronto.map(c => c.capitaleTotale));
                      const maxCash = Math.max(...confronto.map(c => c.cashFlowMensile));
                      const maxRoi  = Math.max(...confronto.map(c => c.roi));
                      const pctObiettivo = item.obiettivo > 0
                        ? Math.round((item.cashFlowMensile / item.obiettivo) * 100)
                        : null;

                      const best = (val: number, max: number) =>
                        val === max ? "font-bold text-green-600" : "";

                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {item.scenario.nome}
                            {item.scenario.attivo === 1 && <Star className="h-3 w-3 fill-amber-400 text-amber-400 inline ml-1" />}
                          </TableCell>
                          <TableCell className="text-right">{item.numeroFiumi}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {Math.round(item.orizzonteTemporale / 12)} anni
                          </TableCell>
                          <TableCell className={`text-right ${best(item.capitaleTotale, maxCap)}`}>
                            {formatCurrency(item.capitaleTotale)}
                          </TableCell>
                          <TableCell className={`text-right ${best(item.cashFlowMensile, maxCash)}`}>
                            {formatCurrency(item.cashFlowMensile)}
                          </TableCell>
                          <TableCell className={`text-right ${best(item.roi, maxRoi)}`}>
                            {item.roi.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right">
                            {pctObiettivo !== null ? (
                              <span className={pctObiettivo >= 100 ? "text-green-600 font-bold" : ""}>
                                {pctObiettivo}%
                              </span>
                            ) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Nessun dato disponibile per gli scenari selezionati
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dialog nuovo scenario */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salva Scenario</DialogTitle>
              <DialogDescription>
                Salva una fotografia del piano corrente (fiumi, affluenti, reinvestimenti, impostazioni)
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome Scenario *</Label>
                <Input
                  value={nuovoNome}
                  onChange={e => setNuovoNome(e.target.value)}
                  placeholder="es. Strategia Conservativa"
                />
              </div>
              <div className="grid gap-2">
                <Label>Descrizione (opzionale)</Label>
                <Textarea
                  value={nuovaDescrizione}
                  onChange={e => setNuovaDescrizione(e.target.value)}
                  placeholder="Descrivi questa strategia..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
              <Button onClick={() => createMutation.mutate({ nome: nuovoNome, descrizione: nuovaDescrizione })}
                disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvataggio..." : "Salva Scenario"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ─── Dettagli snapshot (caricato on-demand) ───────────────────────────────────

function SnapshotDetails({ scenarioId }: { scenarioId: number }) {
  const { data, isLoading } = trpc.scenari.getSnapshot.useQuery({ scenarioId });

  if (isLoading) return <div className="mt-2 text-xs text-muted-foreground">Caricamento...</div>;
  if (!data) return <div className="mt-2 text-xs text-muted-foreground">Snapshot non disponibile</div>;

  const fiumi: any[]        = data.fiumi || [];
  const affluenti: any[]    = data.affluenti || [];
  const reinv: any[]        = data.reinvestimenti || [];
  const periodici: any[]    = (data as any).reinvestimentiPeriodici || [];
  const imp: any            = data.impostazioni;

  return (
    <div className="mt-3 space-y-2 text-xs border rounded-md p-3 bg-muted/30">
      <div className="flex items-center gap-2 font-medium text-foreground mb-2">Contenuto snapshot</div>

      <div className="flex items-center gap-2">
        <Wallet className="h-3 w-3 text-emerald-600" />
        <span className="font-medium">{fiumi.length} fiumi:</span>
        <span className="text-muted-foreground">{fiumi.map((f: any) => f.nome).join(", ") || "—"}</span>
      </div>

      <div className="flex items-center gap-2">
        <Wallet className="h-3 w-3 text-blue-600" />
        <span className="font-medium">{affluenti.length} affluenti</span>
      </div>

      {reinv.length > 0 && (
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-3 w-3 text-amber-600" />
          <span className="font-medium">{reinv.length} reinvestimenti puntuali</span>
        </div>
      )}

      {periodici.length > 0 && (
        <div className="flex items-center gap-2">
          <RefreshCw className="h-3 w-3 text-violet-600" />
          <span className="font-medium">{periodici.length} regole periodiche</span>
        </div>
      )}

      {imp && (
        <div className="pt-2 border-t flex gap-4 text-muted-foreground">
          <span>Orizzonte: {Math.round(imp.orizzonteTemporale / 12)} anni</span>
          <span>Obiettivo: {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(imp.obiettivoMensile / 100)}/mese</span>
        </div>
      )}
    </div>
  );
}
