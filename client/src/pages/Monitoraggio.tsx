import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, TrendingUp, Wallet, PiggyBank, ArrowDownCircle } from "lucide-react";

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type TipoEvento = "apporto" | "rendita" | "capitale" | "prelievo";

type FormData = {
  tipo: TipoEvento;
  importoEuro: string;
  data: string;
  fiumeId: number | undefined;
  descrizione: string;
};

const emptyForm = (): FormData => ({
  tipo: "capitale",
  importoEuro: "",
  data: new Date().toISOString().slice(0, 10),
  fiumeId: undefined,
  descrizione: "",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoEvento, string> = {
  apporto:  "Apporto",
  rendita:  "Rendita",
  capitale: "Valore capitale",
  prelievo: "Prelievo",
};

const TIPO_COLORS: Record<TipoEvento, string> = {
  apporto:  "bg-blue-100 text-blue-800",
  rendita:  "bg-green-100 text-green-800",
  capitale: "bg-purple-100 text-purple-800",
  prelievo: "bg-red-100 text-red-800",
};

const TIPO_ICONS: Record<TipoEvento, React.ReactNode> = {
  apporto:  <Wallet className="h-4 w-4" />,
  rendita:  <TrendingUp className="h-4 w-4" />,
  capitale: <PiggyBank className="h-4 w-4" />,
  prelievo: <ArrowDownCircle className="h-4 w-4" />,
};

const fmt = (v: number | null) =>
  v == null
    ? "—"
    : v.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const fmtDelta = (reale: number | null, pianificato: number) => {
  if (reale == null) return null;
  const delta = reale - pianificato;
  const pct = pianificato !== 0 ? (delta / pianificato) * 100 : 0;
  return { delta, pct };
};

// ─── EventoForm (fuori dal componente per evitare perdita focus) ─────────────

interface EventoFormProps {
  form: FormData;
  setForm: (f: FormData) => void;
  fiumi: Array<{ id: number; nome: string }>;
}

function EventoForm({ form, setForm, fiumi }: EventoFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Tipo</Label>
        <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v as TipoEvento })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(TIPO_LABELS) as TipoEvento[]).map(t => (
              <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Importo (€)</Label>
        <Input
          type="number"
          step="0.01"
          placeholder="0.00"
          value={form.importoEuro}
          onChange={e => setForm({ ...form, importoEuro: e.target.value })}
        />
      </div>

      <div>
        <Label>Data</Label>
        <Input
          type="date"
          value={form.data}
          onChange={e => setForm({ ...form, data: e.target.value })}
        />
      </div>

      <div>
        <Label>Fiume (opzionale)</Label>
        <Select
          value={form.fiumeId?.toString() ?? "none"}
          onValueChange={v => setForm({ ...form, fiumeId: v === "none" ? undefined : Number(v) })}
        >
          <SelectTrigger><SelectValue placeholder="Tutti i fiumi" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Tutti i fiumi</SelectItem>
            {fiumi.map(f => (
              <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Note</Label>
        <Textarea
          placeholder="Descrizione opzionale..."
          value={form.descrizione}
          onChange={e => setForm({ ...form, descrizione: e.target.value })}
          rows={2}
        />
      </div>
    </div>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function Monitoraggio() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm());
  const [graficoTipo, setGraficoTipo] = useState<"patrimonio" | "rendita" | "apporti">("patrimonio");

  const utils = trpc.useUtils();
  const invalidate = () => {
    utils.monitoraggio.list.invalidate();
    utils.monitoraggio.confronto.invalidate();
  };

  const { data: eventi, isLoading: loadingEventi } = trpc.monitoraggio.list.useQuery();
  const { data: confronto, isLoading: loadingConfrontoData } = trpc.monitoraggio.confronto.useQuery();
  const { data: fiumi = [] } = trpc.fiumi.list.useQuery();

  const createMutation = trpc.monitoraggio.create.useMutation({
    onSuccess: () => { invalidate(); closeDialog(); toast.success("Evento registrato"); },
    onError: e => toast.error(e.message),
  });

  const updateMutation = trpc.monitoraggio.update.useMutation({
    onSuccess: () => { invalidate(); closeDialog(); toast.success("Evento aggiornato"); },
    onError: e => toast.error(e.message),
  });

  const deleteMutation = trpc.monitoraggio.delete.useMutation({
    onSuccess: () => { invalidate(); toast.success("Evento eliminato"); },
    onError: e => toast.error(e.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(e: NonNullable<typeof eventi>[number]) {
    setEditingId(e.id);
    setForm({
      tipo: e.tipo as TipoEvento,
      importoEuro: (e.importo / 100).toString(),
      data: new Date(e.data).toISOString().slice(0, 10),
      fiumeId: e.fiumeId ?? undefined,
      descrizione: e.descrizione ?? "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function handleSubmit() {
    const importo = Math.round(parseFloat(form.importoEuro) * 100);
    if (!form.importoEuro || isNaN(importo) || importo <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }
    const payload = {
      tipo: form.tipo,
      importo,
      data: new Date(form.data),
      fiumeId: form.fiumeId,
      descrizione: form.descrizione || undefined,
    };
    if (editingId) updateMutation.mutate({ id: editingId, ...payload });
    else createMutation.mutate(payload);
  }

  // ─── Dati grafico ─────────────────────────────────────────────────────────

  const graficoData = (confronto ?? []).map(row => {
    const base = { mese: `M${row.mese}` };
    if (graficoTipo === "patrimonio") return {
      ...base,
      Pianificato: row.patrimonioPianificato,
      Reale: row.patrimonioReale,
    };
    if (graficoTipo === "rendita") return {
      ...base,
      Pianificato: row.renditaPianificata,
      Reale: row.renditaReale,
    };
    return {
      ...base,
      Pianificato: row.apportiPianificati,
      Reale: row.apportiReali,
    };
  });

  // ─── KPI ultimo mese con dati reali ───────────────────────────────────────

  const ultimoMeseConDati = confronto?.slice().reverse().find(r =>
    r.patrimonioReale != null || r.renditaReale != null || r.apportiReali != null
  );

  const kpiPatrimonio = ultimoMeseConDati
    ? fmtDelta(ultimoMeseConDati.patrimonioReale, ultimoMeseConDati.patrimonioPianificato)
    : null;
  const kpiRendita = ultimoMeseConDati
    ? fmtDelta(ultimoMeseConDati.renditaReale, ultimoMeseConDati.renditaPianificata)
    : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoraggio</h1>
          <p className="text-sm text-muted-foreground">Piano vs reale — traccia gli eventi effettivi</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Registra evento
        </Button>
      </div>

      {/* KPI cards */}
      {ultimoMeseConDati && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KpiCard
            label="Patrimonio vs piano"
            mese={ultimoMeseConDati.mese}
            delta={kpiPatrimonio}
            reale={ultimoMeseConDati.patrimonioReale}
            pianificato={ultimoMeseConDati.patrimonioPianificato}
          />
          <KpiCard
            label="Rendita vs piano"
            mese={ultimoMeseConDati.mese}
            delta={kpiRendita}
            reale={ultimoMeseConDati.renditaReale}
            pianificato={ultimoMeseConDati.renditaPianificata}
          />
        </div>
      )}

      <Tabs defaultValue="grafico">
        <TabsList>
          <TabsTrigger value="grafico">Grafico</TabsTrigger>
          <TabsTrigger value="tabella">Tabella mensile</TabsTrigger>
          <TabsTrigger value="eventi">Tutti gli eventi</TabsTrigger>
        </TabsList>

        {/* ── Grafico ── */}
        <TabsContent value="grafico">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">Piano vs Reale</CardTitle>
                <div className="ml-auto flex gap-1">
                  {(["patrimonio", "rendita", "apporti"] as const).map(t => (
                    <Button
                      key={t}
                      variant={graficoTipo === t ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGraficoTipo(t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingConfrontoData ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={graficoData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mese" tick={{ fontSize: 11 }} interval={Math.floor(graficoData.length / 10)} />
                    <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number) => fmt(v)}
                      labelFormatter={l => l}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Pianificato"
                      stroke="#6366f1"
                      dot={false}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="Reale"
                      stroke="#10b981"
                      dot={{ r: 3 }}
                      strokeWidth={2}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tabella mensile ── */}
        <TabsContent value="tabella">
          <Card>
            <CardContent className="p-0">
              {loadingConfrontoData ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mese</TableHead>
                        <TableHead className="text-right">Patrimonio piano</TableHead>
                        <TableHead className="text-right">Patrimonio reale</TableHead>
                        <TableHead className="text-right">Δ Patrimonio</TableHead>
                        <TableHead className="text-right">Rendita piano</TableHead>
                        <TableHead className="text-right">Rendita reale</TableHead>
                        <TableHead className="text-right">Apporti reali</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(confronto ?? []).map(row => {
                        const d = fmtDelta(row.patrimonioReale, row.patrimonioPianificato);
                        return (
                          <TableRow key={row.mese}>
                            <TableCell className="font-mono text-sm">M{row.mese}</TableCell>
                            <TableCell className="text-right text-sm">{fmt(row.patrimonioPianificato)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{fmt(row.patrimonioReale)}</TableCell>
                            <TableCell className="text-right text-sm">
                              {d ? (
                                <span className={d.delta >= 0 ? "text-green-600" : "text-red-600"}>
                                  {d.delta >= 0 ? "+" : ""}{fmt(d.delta)} ({d.pct.toFixed(1)}%)
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm">{fmt(row.renditaPianificata)}</TableCell>
                            <TableCell className="text-right text-sm">{fmt(row.renditaReale)}</TableCell>
                            <TableCell className="text-right text-sm">{fmt(row.apportiReali)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tutti gli eventi ── */}
        <TabsContent value="eventi">
          <Card>
            <CardContent className="p-0">
              {loadingEventi ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !eventi?.length ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nessun evento registrato. Clicca "Registra evento" per iniziare.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fiume</TableHead>
                      <TableHead className="text-right">Importo</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventi.map(e => {
                      const fiume = fiumi.find(f => f.id === e.fiumeId);
                      return (
                        <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(e)}>
                          <TableCell className="text-sm">
                            {new Date(e.data).toLocaleDateString("it-IT")}
                          </TableCell>
                          <TableCell>
                            <Badge className={TIPO_COLORS[e.tipo as TipoEvento]}>
                              <span className="flex items-center gap-1">
                                {TIPO_ICONS[e.tipo as TipoEvento]}
                                {TIPO_LABELS[e.tipo as TipoEvento] ?? e.tipo}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {fiume?.nome ?? "—"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {fmt(e.importo / 100)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {e.descrizione ?? ""}
                          </TableCell>
                          <TableCell onClick={ev => ev.stopPropagation()}>
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => deleteMutation.mutate({ id: e.id })}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
        </TabsContent>
      </Tabs>

      {/* Dialog crea/modifica */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifica evento" : "Registra evento reale"}</DialogTitle>
          </DialogHeader>
          <EventoForm form={form} setForm={setForm} fiumi={fiumi} />
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annulla</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Salva" : "Registra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── KPI Card helper ──────────────────────────────────────────────────────────

function KpiCard({ label, mese, delta, reale, pianificato }: {
  label: string;
  mese: number;
  delta: { delta: number; pct: number } | null;
  reale: number | null;
  pianificato: number;
}) {
  const fmt2 = (v: number | null) =>
    v == null ? "—" : v.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <p className="text-xs text-muted-foreground">ultimo dato: M{mese}</p>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{fmt2(reale)}</p>
        <p className="text-sm text-muted-foreground">Piano: {fmt2(pianificato)}</p>
        {delta && (
          <p className={`text-sm font-medium ${delta.delta >= 0 ? "text-green-600" : "text-red-600"}`}>
            {delta.delta >= 0 ? "+" : ""}{fmt2(delta.delta)} ({delta.pct.toFixed(1)}%)
          </p>
        )}
      </CardContent>
    </Card>
  );
}
