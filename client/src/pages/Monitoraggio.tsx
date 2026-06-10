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
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, TrendingUp, Wallet, PiggyBank, ArrowDownCircle,
  ChevronDown, ChevronRight, Landmark, ArrowRightLeft, Link2,
} from "lucide-react";
import { formatDate, monthOffsetToDate } from "@/lib/dateFormat";

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type TipoEvento = "apporto" | "rendita" | "capitale" | "prelievo";

type FormData = {
  tipo: TipoEvento;
  importoEuro: string;
  data: string;
  fiumeId: number | undefined;
  descrizione: string;
  // FK Approach A — collegamento esplicito alla voce del piano
  fiumePianoId: number | undefined;
  affluenteId: number | undefined;
  reinvestimentoId: number | undefined;
};

const emptyForm = (): FormData => ({
  tipo: "capitale",
  importoEuro: "",
  data: new Date().toISOString().slice(0, 10),
  fiumeId: undefined,
  descrizione: "",
  fiumePianoId: undefined,
  affluenteId: undefined,
  reinvestimentoId: undefined,
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

const fmtDelta = (reale: number | null, pianificato: number | null) => {
  if (reale == null || pianificato == null) return null;
  const delta = reale - pianificato;
  const pct = pianificato !== 0 ? (delta / pianificato) * 100 : null;
  return { delta, pct };
};

// ─── EventoForm (fuori dal componente per evitare perdita focus) ─────────────

interface EventoFormProps {
  form: FormData;
  setForm: (f: FormData) => void;
  fiumi: Array<{ id: number; nome: string }>;
  linkLabel?: string | null;
}

function EventoForm({ form, setForm, fiumi, linkLabel }: EventoFormProps) {
  return (
    <div className="space-y-4">
      {/* Indicatore collegamento piano */}
      {linkLabel && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 border">
          <Link2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span>{linkLabel}</span>
        </div>
      )}

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
          autoComplete="off"
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
  const [formLinkLabel, setFormLinkLabel] = useState<string | null>(null);
  const [graficoTipo, setGraficoTipo] = useState<"patrimonio" | "rendita" | "apporti">("patrimonio");
  const [pianoOpen, setPianoOpen] = useState<Record<string, boolean>>({
    fiumi: true,
    affluenti: true,
    reinvestimenti: true,
  });

  const utils = trpc.useUtils();
  const invalidate = () => {
    utils.monitoraggio.list.invalidate();
    utils.monitoraggio.confronto.invalidate();
    utils.monitoraggio.confrontoPiano.invalidate();
  };

  const { data: eventi, isLoading: loadingEventi } = trpc.monitoraggio.list.useQuery();
  const { data: confronto, isLoading: loadingConfrontoData } = trpc.monitoraggio.confronto.useQuery();
  const { data: confrontoPiano } = trpc.monitoraggio.confrontoPiano.useQuery();
  const { data: fiumi = [] } = trpc.fiumi.list.useQuery();
  const { data: allAffluenti = [] } = trpc.affluenti.listAll.useQuery();
  const { data: reinvestimentiData = [] } = trpc.reinvestimenti.list.useQuery();
  const { data: impostazioni } = trpc.impostazioni.get.useQuery();

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
    setFormLinkLabel(null);
    setDialogOpen(true);
  }

  function openCreatePreFilled(prefill: Partial<FormData>, linkLabel?: string) {
    setEditingId(null);
    setForm({ ...emptyForm(), ...prefill });
    setFormLinkLabel(linkLabel ?? null);
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
      fiumePianoId: e.fiumePianoId ?? undefined,
      affluenteId: e.affluenteId ?? undefined,
      reinvestimentoId: e.reinvestimentoId ?? undefined,
    });
    setFormLinkLabel(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setFormLinkLabel(null);
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
      fiumePianoId: form.fiumePianoId,
      affluenteId: form.affluenteId,
      reinvestimentoId: form.reinvestimentoId,
    };
    if (editingId) updateMutation.mutate({ id: editingId, ...payload });
    else createMutation.mutate(payload);
  }

  // ─── Helper: mese offset → etichetta data reale ──────────────────────────

  const meseToLabel = (mese: number) => {
    // stessa normalizzazione timezone del backend (+12h)
    const tzOffset = 12 * 3600000;
    const di = new Date((impostazioni?.dataInizio ? new Date(impostazioni.dataInizio) : new Date("2026-01-01")).getTime() + tzOffset);
    const target = new Date(Date.UTC(di.getUTCFullYear(), di.getUTCMonth() + mese, 1));
    return target.toLocaleDateString("it-IT", { month: "short", year: "numeric", timeZone: "UTC" });
  };

  // ─── Dati grafico ─────────────────────────────────────────────────────────

  const graficoData = (confronto ?? []).map(row => {
    const base = { mese: meseToLabel(row.mese) };
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

  // ─── KPI: lookup separato per patrimonio e rendita ────────────────────────

  const ultimoMesePatrimonio = confronto?.slice().reverse().find(r => r.patrimonioReale != null);
  const ultimoMeseRendita    = confronto?.slice().reverse().find(r => r.renditaReale != null);

  const kpiPatrimonio = ultimoMesePatrimonio
    ? fmtDelta(ultimoMesePatrimonio.patrimonioReale, ultimoMesePatrimonio.patrimonioPianificato)
    : null;
  const kpiRendita = ultimoMeseRendita
    ? fmtDelta(ultimoMeseRendita.renditaReale, ultimoMeseRendita.renditaPianificata)
    : null;

  // ─── Piano programmato: calcolo date e sorting ────────────────────────────

  const dataInizio = impostazioni?.dataInizio ? new Date(impostazioni.dataInizio) : new Date("2026-01-01");

  const fiumiPiano = [...fiumi]
    .map(f => {
      const data = f.dataCreazione ? new Date(f.dataCreazione) : monthOffsetToDate(dataInizio, f.meseCreazione);
      const mese = (data.getFullYear() - dataInizio.getFullYear()) * 12 + (data.getMonth() - dataInizio.getMonth());
      return { ...f, dataCalcolata: data, mese };
    })
    .sort((a, b) => a.dataCalcolata.getTime() - b.dataCalcolata.getTime());

  type AffItem = { id: number; fiumeId: number; fiumeNome: string; importo: number; dataCalcolata: Date; mese: number; descrizione: string | null; groupId: string | null; ricorrente: boolean };
  const affluentiPiano: AffItem[] = (allAffluenti as any[])
    .map((a: any) => {
      const data = a.dataAffluente ? new Date(a.dataAffluente) : monthOffsetToDate(dataInizio, a.mese);
      const mese = (data.getFullYear() - dataInizio.getFullYear()) * 12 + (data.getMonth() - dataInizio.getMonth());
      return { id: a.id, fiumeId: a.fiumeId, fiumeNome: a.fiumeNome, importo: a.importo, dataCalcolata: data, mese, descrizione: a.descrizione ?? null, groupId: a.groupId ?? null, ricorrente: a.ricorrente ?? false };
    })
    .sort((a: AffItem, b: AffItem) => a.dataCalcolata.getTime() - b.dataCalcolata.getTime());

  type ReinvItem = { id: number; mese: number; dataCalcolata: Date; fiumeOrigineNome: string; fiumeOrigineId: number; fiumeDestinazioneNome: string | null; importoFisso: number | null; percentuale: number | null; descrizione: string | null };
  const reinvestimentiPiano: ReinvItem[] = (reinvestimentiData as any[])
    .map((r: any) => {
      const reinv = r.reinvestimento ?? r;
      const data = reinv.dataReinvestimento ? new Date(reinv.dataReinvestimento) : monthOffsetToDate(dataInizio, reinv.meseReinvestimento);
      const mese = (data.getFullYear() - dataInizio.getFullYear()) * 12 + (data.getMonth() - dataInizio.getMonth());
      return {
        id: reinv.id,
        mese,
        dataCalcolata: data,
        fiumeOrigineNome: r.fiumeOrigineNome ?? "—",
        fiumeOrigineId: reinv.fiumeOrigineId,
        fiumeDestinazioneNome: r.fiumeDestinazioneNome ?? reinv.nuovoFiumeNome ?? null,
        importoFisso: reinv.importoFisso ?? null,
        percentuale: reinv.percentuale ?? null,
        descrizione: reinv.descrizione ?? null,
      };
    })
    .sort((a: ReinvItem, b: ReinvItem) => a.dataCalcolata.getTime() - b.dataCalcolata.getTime());

  // ─── Lookup Maps da confrontoPiano ────────────────────────────────────────

  const cfmFiumi = new Map(
    (confrontoPiano?.fiumi ?? []).map(x => [x.fiumePianoId, x])
  );
  const cfmAffluenti = new Map(
    (confrontoPiano?.affluenti ?? []).map(x => [x.affluenteId, x])
  );
  const cfmReinvest = new Map(
    (confrontoPiano?.reinvestimenti ?? []).map(x => [x.reinvestimentoId, x])
  );

  // ─── Aggregati per sezione ────────────────────────────────────────────────

  const aggregatoFiumi = {
    count: fiumiPiano.length,
    pianificato: fiumiPiano.reduce((s, f) => s + f.sorgente, 0),
    reale: fiumiPiano.reduce((s, f) => s + (cfmFiumi.get(f.id)?.totaleReale ?? 0), 0),
    nEventi: fiumiPiano.reduce((s, f) => s + (cfmFiumi.get(f.id)?.nEventi ?? 0), 0),
  };
  const aggregatoAffluenti = {
    count: affluentiPiano.length,
    pianificato: affluentiPiano.reduce((s, a) => s + a.importo, 0),
    reale: affluentiPiano.reduce((s, a) => s + (cfmAffluenti.get(a.id)?.totaleReale ?? 0), 0),
    nEventi: affluentiPiano.reduce((s, a) => s + (cfmAffluenti.get(a.id)?.nEventi ?? 0), 0),
  };
  const aggregatoReinvest = {
    count: reinvestimentiPiano.length,
    pianificato: (confrontoPiano?.reinvestimenti ?? []).reduce((s, x) => s + x.pianificato, 0),
    reale: (confrontoPiano?.reinvestimenti ?? []).reduce((s, x) => s + x.totaleReale, 0),
    nEventi: (confrontoPiano?.reinvestimenti ?? []).reduce((s, x) => s + x.nEventi, 0),
  };

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
      {(ultimoMesePatrimonio || ultimoMeseRendita) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ultimoMesePatrimonio && (
            <KpiCard
              label="Patrimonio vs piano"
              meseLabel={meseToLabel(ultimoMesePatrimonio.mese)}
              delta={kpiPatrimonio}
              reale={ultimoMesePatrimonio.patrimonioReale}
              pianificato={ultimoMesePatrimonio.patrimonioPianificato}
            />
          )}
          {ultimoMeseRendita && (
            <KpiCard
              label="Rendita vs piano"
              meseLabel={meseToLabel(ultimoMeseRendita.mese)}
              delta={kpiRendita}
              reale={ultimoMeseRendita.renditaReale}
              pianificato={ultimoMeseRendita.renditaPianificata}
            />
          )}
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
                    <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={l => l} />
                    <Legend />
                    <Line type="monotone" dataKey="Pianificato" stroke="#6366f1" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="Reale" stroke="#10b981" dot={{ r: 3 }} strokeWidth={2} connectNulls={false} />
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
                            <TableCell className="font-mono text-sm">{meseToLabel(row.mese)}</TableCell>
                            <TableCell className="text-right text-sm">{fmt(row.patrimonioPianificato)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{fmt(row.patrimonioReale)}</TableCell>
                            <TableCell className="text-right text-sm">
                              {d ? (
                                <span className={d.delta >= 0 ? "text-green-600" : "text-red-600"}>
                                  {d.delta >= 0 ? "+" : ""}{fmt(d.delta)}{d.pct != null ? ` (${d.pct.toFixed(1)}%)` : ""}
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

      {/* ═══ Piano Programmato ═══════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Piano Programmato</h2>
          <p className="text-sm text-muted-foreground">
            Per ogni voce pianificata: importo previsto, totale registrato (N eventi) e scostamento
          </p>
        </div>

        {/* ── Costituzione Fiumi ── */}
        <PianoSection
          id="fiumi"
          open={pianoOpen.fiumi}
          onOpenChange={v => setPianoOpen(p => ({ ...p, fiumi: v }))}
          icon={<Landmark className="h-4 w-4" />}
          title="Costituzione Fiumi"
          color="text-purple-600"
          aggregato={aggregatoFiumi}
        >
          {fiumiPiano.map(f => (
            <PianoRow
              key={f.id}
              data={formatDate(f.dataCalcolata)}
              label={f.nome}
              sub={null}
              pianificato={f.sorgente}
              confrontoData={cfmFiumi.get(f.id) ?? null}
              onRegistra={() => openCreatePreFilled({
                tipo: "capitale",
                fiumeId: f.id,
                fiumePianoId: f.id,
                importoEuro: (f.sorgente / 100).toString(),
                data: f.dataCalcolata.toISOString().slice(0, 10),
              }, `Collegato a: Costituzione "${f.nome}" (${fmt(f.sorgente / 100)})`)}
            />
          ))}
        </PianoSection>

        {/* ── Affluenti ── */}
        <PianoSection
          id="affluenti"
          open={pianoOpen.affluenti}
          onOpenChange={v => setPianoOpen(p => ({ ...p, affluenti: v }))}
          icon={<Wallet className="h-4 w-4" />}
          title="Affluenti"
          color="text-blue-600"
          aggregato={aggregatoAffluenti}
        >
          {affluentiPiano.map(a => (
            <PianoRow
              key={a.id}
              data={formatDate(a.dataCalcolata)}
              label={a.fiumeNome}
              sub={a.descrizione}
              badge={a.ricorrente ? "Ricorrente" : undefined}
              pianificato={a.importo}
              confrontoData={cfmAffluenti.get(a.id) ?? null}
              onRegistra={() => openCreatePreFilled({
                tipo: "apporto",
                fiumeId: a.fiumeId,
                affluenteId: a.id,
                importoEuro: (a.importo / 100).toString(),
                data: a.dataCalcolata.toISOString().slice(0, 10),
                descrizione: a.descrizione ?? "",
              }, `Collegato a: Apporto "${a.fiumeNome}" (${fmt(a.importo / 100)})`)}
            />
          ))}
        </PianoSection>

        {/* ── Reinvestimenti ── */}
        <PianoSection
          id="reinvestimenti"
          open={pianoOpen.reinvestimenti}
          onOpenChange={v => setPianoOpen(p => ({ ...p, reinvestimenti: v }))}
          icon={<ArrowRightLeft className="h-4 w-4" />}
          title="Reinvestimenti"
          color="text-green-600"
          aggregato={aggregatoReinvest}
        >
          {reinvestimentiPiano.map(r => {
            const cfm = cfmReinvest.get(r.id) ?? null;
            const importoLabel = r.importoFisso != null
              ? fmt(r.importoFisso / 100)
              : r.percentuale != null
                ? `${(r.percentuale / 100).toFixed(1)}%`
                : "—";
            const dest = r.fiumeDestinazioneNome ? ` → ${r.fiumeDestinazioneNome}` : "";
            const pianificato = cfm?.pianificato ?? (r.importoFisso ?? 0);
            return (
              <PianoRow
                key={r.id}
                data={formatDate(r.dataCalcolata)}
                label={`${r.fiumeOrigineNome}${dest}`}
                sub={r.descrizione}
                pianificato={pianificato}
                pianificatoLabel={r.percentuale != null && r.importoFisso == null ? importoLabel : undefined}
                confrontoData={cfm}
                onRegistra={() => openCreatePreFilled({
                  tipo: "apporto",
                  fiumeId: r.fiumeOrigineId,
                  reinvestimentoId: r.id,
                  importoEuro: r.importoFisso != null ? (r.importoFisso / 100).toString() : (cfm ? (cfm.pianificato / 100).toString() : ""),
                  data: r.dataCalcolata.toISOString().slice(0, 10),
                  descrizione: r.descrizione ?? "",
                }, `Collegato a: Reinvestimento "${r.fiumeOrigineNome}${dest}" (${importoLabel})`)}
              />
            );
          })}
        </PianoSection>
      </div>

      {/* Dialog crea/modifica */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) closeDialog(); }}>
        <DialogContent className="flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifica evento" : "Registra evento reale"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-1">
            <EventoForm form={form} setForm={setForm} fiumi={fiumi} linkLabel={formLinkLabel} />
          </div>
          <DialogFooter className="pt-4 border-t mt-2">
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, meseLabel, delta, reale, pianificato }: {
  label: string;
  meseLabel: string;
  delta: { delta: number; pct: number | null } | null;
  reale: number | null;
  pianificato: number | null;
}) {
  const fmt2 = (v: number | null) =>
    v == null ? "—" : v.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <p className="text-xs text-muted-foreground">ultimo dato: {meseLabel}</p>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{fmt2(reale)}</p>
        <p className="text-sm text-muted-foreground">Piano: {fmt2(pianificato)}</p>
        {delta && (
          <p className={`text-sm font-medium ${delta.delta >= 0 ? "text-green-600" : "text-red-600"}`}>
            {delta.delta >= 0 ? "+" : ""}{fmt2(delta.delta)}{delta.pct != null ? ` (${delta.pct.toFixed(1)}%)` : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Piano Section ────────────────────────────────────────────────────────────

function PianoSection({ id: _id, open, onOpenChange, icon, title, color, children, aggregato }: {
  id: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
  aggregato: { count: number; pianificato: number; reale: number; nEventi: number };
}) {
  const fmtLocal = (v: number) =>
    (v / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  const delta = aggregato.reale - aggregato.pianificato;
  const deltaPerc = aggregato.pianificato !== 0 ? (delta / aggregato.pianificato) * 100 : 0;
  const hasEventi = aggregato.nEventi > 0;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors rounded-t-lg text-left"
          >
            <span className={color}>{icon}</span>
            <span className="font-semibold text-sm">{title}</span>
            <Badge variant="secondary" className="text-xs">{aggregato.count}</Badge>

            {/* Aggregato summary in header */}
            {aggregato.count > 0 && aggregato.pianificato > 0 && (
              <div className="ml-auto hidden sm:flex items-center gap-3 text-xs mr-2">
                <span className="text-muted-foreground">
                  Piano: <strong className="text-foreground">{fmtLocal(aggregato.pianificato)}</strong>
                </span>
                {hasEventi && (
                  <>
                    <span className="text-muted-foreground">
                      Reale: <strong className="text-foreground">{fmtLocal(aggregato.reale)}</strong>
                      <span className="ml-1">({aggregato.nEventi} ev.)</span>
                    </span>
                    <span className={`font-semibold ${delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {delta >= 0 ? "+" : ""}{fmtLocal(delta)} ({deltaPerc.toFixed(0)}%)
                    </span>
                  </>
                )}
              </div>
            )}

            {open
              ? <ChevronDown className={`h-4 w-4 text-muted-foreground ${aggregato.count > 0 && aggregato.pianificato > 0 ? "sm:ml-0" : "ml-auto"}`} />
              : <ChevronRight className={`h-4 w-4 text-muted-foreground ${aggregato.count > 0 && aggregato.pianificato > 0 ? "sm:ml-0" : "ml-auto"}`} />
            }
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t divide-y">
            {aggregato.count === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nessun elemento</p>
            ) : children}
          </div>
          {/* Footer aggregato — visibile su mobile (su desktop è nell'header) */}
          {aggregato.count > 0 && hasEventi && aggregato.pianificato > 0 && (
            <div className="sm:hidden border-t px-4 py-2 bg-muted/20 rounded-b-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Totale</span>
                <div className="flex items-center gap-3">
                  <span>Piano: <strong>{fmtLocal(aggregato.pianificato)}</strong></span>
                  <span>Reale: <strong>{fmtLocal(aggregato.reale)}</strong></span>
                  <span className={`font-semibold ${delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {delta >= 0 ? "+" : ""}{fmtLocal(delta)} ({deltaPerc.toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ─── Piano Row ────────────────────────────────────────────────────────────────

function PianoRow({ data, label, sub, badge, pianificato, pianificatoLabel, confrontoData, onRegistra }: {
  data: string;
  label: string;
  sub: string | null;
  badge?: string;
  pianificato: number; // centesimi
  pianificatoLabel?: string; // sovrascrive il display (es. "20.0%" per i reinvestimenti in %)
  confrontoData: { nEventi: number; totaleReale: number } | null;
  onRegistra: () => void;
}) {
  const nEventi = confrontoData?.nEventi ?? 0;
  const totaleReale = confrontoData?.totaleReale ?? 0;
  const delta = totaleReale - pianificato;
  const deltaPerc = pianificato !== 0 ? (delta / pianificato) * 100 : 0;
  const hasEventi = nEventi > 0;

  const fmtCents = (v: number) =>
    (v / 100).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  const pianificatoDisplay = pianificatoLabel ?? fmtCents(pianificato);

  return (
    <div className="flex items-start gap-2 sm:gap-3 px-4 py-3 hover:bg-muted/20">
      {/* Data */}
      <span className="text-xs text-muted-foreground w-24 shrink-0 pt-0.5">{data}</span>

      {/* Label + sub */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium">{label}</span>
          {badge && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{badge}</span>
          )}
        </div>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>

      {/* Confronto colonna */}
      <div className="text-right text-xs shrink-0 space-y-0.5 min-w-[140px]">
        <div className="text-muted-foreground">
          Piano: <span className="font-medium text-foreground">{pianificatoDisplay}</span>
        </div>
        {hasEventi ? (
          <>
            <div className="text-muted-foreground">
              Reale: <span className="font-medium text-foreground">{fmtCents(totaleReale)}</span>
              <span className="ml-1">({nEventi} ev.)</span>
            </div>
            <div className={`font-semibold ${delta >= 0 ? "text-green-600" : "text-red-600"}`}>
              {delta >= 0 ? "+" : ""}{fmtCents(delta)} ({deltaPerc.toFixed(0)}%)
            </div>
          </>
        ) : (
          <div className="text-muted-foreground/60 italic">non ancora registrato</div>
        )}
      </div>

      {/* Bottone Registra — SEMPRE attivo */}
      <Button
        variant={hasEventi ? "ghost" : "outline"}
        size="sm"
        className="shrink-0 h-7 text-xs"
        onClick={onRegistra}
      >
        <Plus className="h-3 w-3 mr-1" />
        Registra
      </Button>
    </div>
  );
}
