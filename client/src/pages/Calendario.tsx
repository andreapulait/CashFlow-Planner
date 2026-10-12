import React, { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMonths, addDays, startOfDay, isSameMonth } from "date-fns";
import { it } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarDays, ArrowRightLeft, Wallet, RefreshCw, ExternalLink,
  CheckCircle2, AlertTriangle, Clock, Filter,
} from "lucide-react";
import { Link } from "wouter";

// ─── Localizzatore ────────────────────────────────────────────────────────────

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { it },
});

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type EventTipo = "fiume_attivazione" | "reinvestimento_puntuale" | "reinvestimento_periodico" | "affluente";
/** "n/d": i reinvestimenti periodici non hanno un collegamento con gli eventi reali */
type EventStato = "registrato" | "scaduto" | "programmato" | "n/d";

interface Registrazione { n: number; totale: number }

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    tipo: EventTipo;
    stato: EventStato;
    refId?: number;          // id della voce di piano (fiume / affluente / reinvestimento)
    fiumeId?: number;        // fiume coinvolto (origine per i reinvestimenti)
    fiumeDestinazioneId?: number;
    fiumeOrigine?: string;
    fiumeDestinazione?: string;
    fiumeNome?: string;
    importo?: number;        // centesimi, se importo fisso
    percentuale?: number;    // basis points, se percentuale
    tipoCalcolo?: string;    // per periodici: "rendita" | "capitale"
    periodicita?: number;    // per periodici
    descrizione?: string;
    registrazione?: Registrazione;
    href: string;            // link alla sezione di gestione
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(v / 100);

const fmtPercent = (bp: number) => `${(bp / 100).toFixed(2)}%`;

/** Normalizza a mezzogiorno locale: evita slittamenti di giorno per fuso orario / ora legale. */
const norm = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);

const toInputDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function importoLabel(resource: CalendarEvent["resource"]): string {
  if (resource.importo) return fmtCurrency(resource.importo);
  if (resource.percentuale) {
    const tipoLabel = resource.tipoCalcolo === "rendita" ? "rendita" : "capitale";
    return `${fmtPercent(resource.percentuale)} del ${tipoLabel}`;
  }
  return "—";
}

const COLORI: Record<EventTipo, string> = {
  fiume_attivazione:        "#10b981",  // verde
  reinvestimento_puntuale:  "#f59e0b",  // ambra
  reinvestimento_periodico: "#8b5cf6",  // viola
  affluente:                "#3b82f6",  // blu
};

const tipoLabel: Record<EventTipo, string> = {
  fiume_attivazione:        "Attivazione fiume",
  reinvestimento_puntuale:  "Reinvestimento",
  reinvestimento_periodico: "Rein. periodico",
  affluente:                "Affluente",
};

const tipoIcone: Record<EventTipo, React.ReactElement> = {
  fiume_attivazione:        <CalendarDays className="h-4 w-4 text-emerald-600" />,
  reinvestimento_puntuale:  <ArrowRightLeft className="h-4 w-4 text-amber-600" />,
  reinvestimento_periodico: <RefreshCw className="h-4 w-4 text-violet-600" />,
  affluente:                <Wallet className="h-4 w-4 text-blue-600" />,
};

const statoLabel: Record<EventStato, string> = {
  registrato:  "Registrato",
  scaduto:     "Da registrare (scaduto)",
  programmato: "In programma",
  "n/d":       "Periodico",
};

function StatoBadge({ stato }: { stato: EventStato }) {
  if (stato === "registrato")
    return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" />Registrato</Badge>;
  if (stato === "scaduto")
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Scaduto</Badge>;
  if (stato === "programmato")
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />In programma</Badge>;
  return null;
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function Calendario() {
  const utils = trpc.useUtils();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<View>("month");

  // Filtri
  const [tipiAttivi, setTipiAttivi] = useState<Set<EventTipo>>(
    new Set<EventTipo>(["fiume_attivazione", "reinvestimento_puntuale", "reinvestimento_periodico", "affluente"])
  );
  const [filtroFiume, setFiltroFiume] = useState<string>("tutti");
  const [filtroStato, setFiltroStato] = useState<string>("tutti");

  // Registrazione rapida
  const [regImporto, setRegImporto] = useState("");
  const [regData, setRegData] = useState("");

  const { data: reinvestimenti,          isLoading: reinvLoading }     = trpc.reinvestimenti.list.useQuery();
  const { data: reinvestimentiPeriodici, isLoading: periodiciLoading } = trpc.reinvestimentiPeriodici.list.useQuery();
  const { data: allAffluenti,            isLoading: affluentiLoading } = trpc.affluenti.listAll.useQuery();
  const { data: impostazioni }                                         = trpc.impostazioni.get.useQuery();
  const { data: fiumi }                                                = trpc.fiumi.list.useQuery();
  const { data: eventiReali }                                          = trpc.monitoraggio.list.useQuery();
  const { data: confrontoPiano }                                       = trpc.monitoraggio.confrontoPiano.useQuery();

  const isLoading = reinvLoading || periodiciLoading || affluentiLoading;

  const invalidate = () => {
    utils.monitoraggio.list.invalidate();
    utils.monitoraggio.confronto.invalidate();
    utils.monitoraggio.confrontoPiano.invalidate();
  };

  const createMutation = trpc.monitoraggio.create.useMutation({
    onSuccess: () => {
      invalidate();
      setSelectedEvent(null);
      toast.success("Evento registrato");
    },
    onError: (e) => toast.error(e.message || "Errore nella registrazione"),
  });

  // Converte un offset-mese in data reale usando il T0 del piano (addMonths limita a fine mese)
  const meseToDate = (mese: number): Date => {
    const dataInizio = impostazioni?.dataInizio ? new Date(impostazioni.dataInizio) : new Date();
    return addMonths(dataInizio, mese);
  };

  // ── Eventi reali già registrati, indicizzati per voce di piano ────────────

  const registrati = useMemo(() => {
    const aff = new Map<number, Registrazione>();
    const reinv = new Map<number, Registrazione>();
    const fiume = new Map<number, Registrazione>();
    const add = (m: Map<number, Registrazione>, id: number, importo: number) => {
      const c = m.get(id) ?? { n: 0, totale: 0 };
      m.set(id, { n: c.n + 1, totale: c.totale + importo });
    };
    (eventiReali ?? []).forEach((e: any) => {
      if (e.tipo === "apporto" && e.affluenteId) add(aff, e.affluenteId, e.importo);
      if (e.tipo === "reinvestimento" && e.reinvestimentoId) add(reinv, e.reinvestimentoId, e.importo);
      if (e.tipo === "capitale" && e.fiumePianoId) add(fiume, e.fiumePianoId, e.importo);
    });
    return { aff, reinv, fiume };
  }, [eventiReali]);

  const events: CalendarEvent[] = useMemo(() => {
    if (!impostazioni) return [];
    const list: CalendarEvent[] = [];
    const oggiInizio = startOfDay(new Date());

    const statoDi = (data: Date, reg?: Registrazione): EventStato =>
      reg ? "registrato" : data < oggiInizio ? "scaduto" : "programmato";

    // ── 0. Attivazione fiumi ──────────────────────────────────────────────
    if (fiumi) {
      fiumi.forEach(fiume => {
        const eventDate = norm(fiume.dataCreazione ? new Date(fiume.dataCreazione) : meseToDate(fiume.meseCreazione));
        const reg = registrati.fiume.get(fiume.id);

        list.push({
          id: `fiume-${fiume.id}`,
          title: `▶ ${fiume.nome}`,
          start: eventDate,
          end: eventDate,
          resource: {
            tipo: "fiume_attivazione",
            stato: statoDi(eventDate, reg),
            refId: fiume.id,
            fiumeId: fiume.id,
            fiumeNome: fiume.nome,
            importo: fiume.sorgente,
            descrizione: `Rendimento: ${(fiume.rendimento / 100).toFixed(2)}% · Reinvest.: ${fiume.percentualeReinvestimento ?? 100}%`,
            registrazione: reg,
            href: "/fiumi",
          },
        });
      });
    }

    // ── 1. Reinvestimenti puntuali ─────────────────────────────────────────
    if (reinvestimenti && fiumi) {
      reinvestimenti.forEach(reinv => {
        const r = reinv.reinvestimento;
        const origine      = fiumi.find(f => f.id === r.fiumeOrigineId);
        const destinazione = r.fiumeDestinazioneId ? fiumi.find(f => f.id === r.fiumeDestinazioneId) : null;

        const eventDate = norm(r.dataReinvestimento ? new Date(r.dataReinvestimento) : meseToDate(r.meseReinvestimento));
        const reg = registrati.reinv.get(r.id);

        list.push({
          id: `reinv-${r.id}`,
          title: `↔ ${origine?.nome ?? "?"} → ${destinazione?.nome ?? r.nuovoFiumeNome ?? "Nuovo"}`,
          start: eventDate,
          end: eventDate,
          resource: {
            tipo: "reinvestimento_puntuale",
            stato: statoDi(eventDate, reg),
            refId: r.id,
            fiumeId: r.fiumeOrigineId,
            fiumeDestinazioneId: r.fiumeDestinazioneId ?? undefined,
            fiumeOrigine: origine?.nome,
            fiumeDestinazione: destinazione?.nome ?? r.nuovoFiumeNome ?? undefined,
            importo: r.importoFisso ?? undefined,
            percentuale: r.percentuale ?? undefined,
            descrizione: r.descrizione ?? undefined,
            registrazione: reg,
            href: "/reinvestimenti",
          },
        });
      });
    }

    // ── 2. Reinvestimenti periodici (una occorrenza per applicazione) ──────
    if (reinvestimentiPeriodici) {
      reinvestimentiPeriodici.forEach(row => {
        const rp = row.rp;
        const origineNome      = row.fiumeOrigineName;
        const destinazioneNome = row.fiumeDestinazioneName;

        for (let mese = rp.meseInizio; mese <= rp.meseFine; mese += rp.periodicita) {
          const eventDate = norm(meseToDate(mese));
          list.push({
            id: `reinv-periodico-${rp.id}-${mese}`,
            title: `↻ ${origineNome ?? "?"} → ${destinazioneNome ?? "?"}`,
            start: eventDate,
            end: eventDate,
            resource: {
              tipo: "reinvestimento_periodico",
              stato: "n/d",
              fiumeId: rp.fiumeOrigineId ?? undefined,
              fiumeDestinazioneId: rp.fiumeDestinazioneId ?? undefined,
              fiumeOrigine: origineNome ?? undefined,
              fiumeDestinazione: destinazioneNome ?? undefined,
              percentuale: rp.percentuale,
              tipoCalcolo: rp.tipoCalcolo,
              periodicita: rp.periodicita,
              descrizione: rp.descrizione ?? undefined,
              href: "/reinvestimenti",
            },
          });
        }
      });
    }

    // ── 3. Affluenti ──────────────────────────────────────────────────────
    if (allAffluenti) {
      allAffluenti.forEach((aff: any) => {
        const eventDate = norm(aff.dataAffluente ? new Date(aff.dataAffluente) : meseToDate(aff.mese));
        const reg = registrati.aff.get(aff.id);

        list.push({
          id: `affluente-${aff.id}`,
          title: `+ ${aff.fiumeNome ?? "Fiume"} · ${fmtCurrency(aff.importo)}`,
          start: eventDate,
          end: eventDate,
          resource: {
            tipo: "affluente",
            stato: statoDi(eventDate, reg),
            refId: aff.id,
            fiumeId: aff.fiumeId,
            fiumeNome: aff.fiumeNome ?? undefined,
            importo: aff.importo,
            descrizione: aff.descrizione ?? undefined,
            registrazione: reg,
            href: "/apporti",
          },
        });
      });
    }

    return list.sort((a, b) => a.start.getTime() - b.start.getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reinvestimenti, reinvestimentiPeriodici, allAffluenti, impostazioni, fiumi, registrati]);

  // ── Filtri ────────────────────────────────────────────────────────────────

  const eventiFiltrati = useMemo(() => events.filter(e => {
    const r = e.resource;
    if (!tipiAttivi.has(r.tipo)) return false;
    if (filtroFiume !== "tutti") {
      const id = Number(filtroFiume);
      if (r.fiumeId !== id && r.fiumeDestinazioneId !== id) return false;
    }
    if (filtroStato !== "tutti" && r.stato !== filtroStato) return false;
    return true;
  }), [events, tipiAttivi, filtroFiume, filtroStato]);

  const filtriAttivi = tipiAttivi.size < 4 || filtroFiume !== "tutti" || filtroStato !== "tutti";

  const resetFiltri = () => {
    setTipiAttivi(new Set<EventTipo>(["fiume_attivazione", "reinvestimento_puntuale", "reinvestimento_periodico", "affluente"]));
    setFiltroFiume("tutti");
    setFiltroStato("tutti");
  };

  const toggleTipo = (t: EventTipo) =>
    setTipiAttivi(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });

  // ── Stile eventi ──────────────────────────────────────────────────────────

  const eventStyleGetter = (event: CalendarEvent) => {
    const stato = event.resource.stato;
    return {
      style: {
        backgroundColor: COLORI[event.resource.tipo],
        borderRadius: "4px",
        color: "white",
        border: stato === "scaduto" ? "2px solid #dc2626" : "none",
        opacity: stato === "registrato" ? 0.55 : 1,
        fontSize: "11px",
        padding: "1px 4px",
      },
    };
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    const stato = event.resource.stato;
    const prefisso = stato === "registrato" ? "✓ " : stato === "scaduto" ? "⚠ " : "";
    return (
      <div className="truncate text-[11px] leading-tight px-0.5" title={event.title}>
        <span>{prefisso}{event.title}</span>
      </div>
    );
  };

  // ── KPI e liste ───────────────────────────────────────────────────────────

  const oggiInizio = startOfDay(new Date());
  const tra30giorni = addDays(oggiInizio, 30);

  const conStato = events.filter(e => e.resource.stato !== "n/d");
  const nRegistrati = conStato.filter(e => e.resource.stato === "registrato").length;
  const nScaduti = conStato.filter(e => e.resource.stato === "scaduto").length;
  const nProssimi30 = events.filter(e => e.resource.stato === "programmato" && e.start <= tra30giorni).length;
  const percRegistrati = conStato.length ? Math.round((nRegistrati / conStato.length) * 100) : 0;

  const scaduti = eventiFiltrati.filter(e => e.resource.stato === "scaduto").slice(-5).reverse();
  const prossimi = eventiFiltrati
    .filter(e => e.start >= oggiInizio && e.resource.stato !== "registrato")
    .slice(0, 5);

  // ── Riepilogo del mese visualizzato ───────────────────────────────────────

  const delMese = eventiFiltrati.filter(e => isSameMonth(e.start, currentDate));
  const meseAffluenti = delMese.filter(e => e.resource.tipo === "affluente");
  const meseVersamentiPrevisti = meseAffluenti.reduce((s, e) => s + (e.resource.importo ?? 0), 0);
  const meseVersamentiRegistrati = meseAffluenti
    .filter(e => e.resource.stato === "registrato")
    .reduce((s, e) => s + (e.resource.registrazione?.totale ?? 0), 0);
  const meseReinv = delMese.filter(e => e.resource.tipo === "reinvestimento_puntuale" || e.resource.tipo === "reinvestimento_periodico");
  const meseReinvFissi = meseReinv.filter(e => e.resource.importo).reduce((s, e) => s + (e.resource.importo ?? 0), 0);
  const meseScaduti = delMese.filter(e => e.resource.stato === "scaduto").length;

  // ── Registrazione rapida ──────────────────────────────────────────────────

  const importoPrecompilato = (ev: CalendarEvent): number => {
    const r = ev.resource;
    if (r.importo) return r.importo;
    if (r.tipo === "reinvestimento_puntuale" && r.refId) {
      return confrontoPiano?.reinvestimenti.find(x => x.reinvestimentoId === r.refId)?.pianificato ?? 0;
    }
    return 0;
  };

  const apriDettaglio = (ev: CalendarEvent) => {
    const cent = importoPrecompilato(ev);
    setRegImporto(cent ? (cent / 100).toString() : "");
    setRegData(toInputDate(ev.start));
    setSelectedEvent(ev);
  };

  const puoRegistrare = (ev: CalendarEvent) =>
    ev.resource.tipo !== "reinvestimento_periodico" && ev.resource.refId != null;

  const registra = () => {
    const ev = selectedEvent;
    if (!ev || !ev.resource.refId) return;
    const importo = Math.round(parseFloat(regImporto.replace(",", ".")) * 100);
    if (!Number.isFinite(importo) || importo <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }
    if (!regData) {
      toast.error("Inserisci la data");
      return;
    }
    const r = ev.resource;
    const base = { importo, data: new Date(regData) };

    if (r.tipo === "affluente") {
      createMutation.mutate({
        ...base, tipo: "apporto", fiumeId: r.fiumeId, affluenteId: r.refId,
        descrizione: r.descrizione,
      });
    } else if (r.tipo === "reinvestimento_puntuale") {
      createMutation.mutate({
        ...base, tipo: "reinvestimento", fiumeId: r.fiumeId,
        fiumeDestinazioneId: r.fiumeDestinazioneId, reinvestimentoId: r.refId,
        descrizione: r.descrizione,
      });
    } else if (r.tipo === "fiume_attivazione") {
      createMutation.mutate({
        ...base, tipo: "capitale", fiumeId: r.fiumeId, fiumePianoId: r.refId,
      });
    }
  };

  // ── Riga evento (liste) ───────────────────────────────────────────────────

  const RigaEvento = ({ evento }: { evento: CalendarEvent }) => (
    <div
      className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => apriDettaglio(evento)}
    >
      <div className="flex items-center gap-3 min-w-0">
        {tipoIcone[evento.resource.tipo]}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">{tipoLabel[evento.resource.tipo]}</Badge>
            <span className="text-sm font-medium truncate">{evento.title}</span>
          </div>
          {evento.resource.descrizione && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{evento.resource.descrizione}</p>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-semibold text-sm">{importoLabel(evento.resource)}</div>
        <div className="text-xs text-muted-foreground">{format(evento.start, "dd MMM yyyy", { locale: it })}</div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  const sel = selectedEvent;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Calendario</h1>
          </div>
          <p className="text-muted-foreground">
            Gli eventi del piano e il loro stato: cosa è già stato registrato, cosa è in arrivo e cosa è scaduto
          </p>
        </div>

        {/* KPI */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-600">Scaduti da registrare</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{nScaduti}</div>
              <p className="text-xs text-muted-foreground">data passata, nessun evento reale</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Prossimi 30 giorni</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{nProssimi30}</div>
              <p className="text-xs text-muted-foreground">operazioni in programma</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-600">Registrati</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{nRegistrati} <span className="text-base font-normal text-muted-foreground">/ {conStato.length}</span></div>
              <p className="text-xs text-muted-foreground">{percRegistrati}% delle voci tracciabili</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Totale eventi</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
              <p className="text-xs text-muted-foreground">nel piano completo (periodici inclusi)</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtri */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {(Object.keys(tipoLabel) as EventTipo[]).map(t => {
                const attivo = tipiAttivi.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTipo(t)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                      attivo ? "bg-muted font-medium" : "opacity-50 hover:opacity-80"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLORI[t] }} />
                    {tipoLabel[t]}
                  </button>
                );
              })}
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Select value={filtroFiume} onValueChange={setFiltroFiume}>
                  <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Fiume" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti i fiumi</SelectItem>
                    {(fiumi ?? []).map(f => <SelectItem key={f.id} value={String(f.id)}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filtroStato} onValueChange={setFiltroStato}>
                  <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Stato" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti gli stati</SelectItem>
                    <SelectItem value="programmato">In programma</SelectItem>
                    <SelectItem value="scaduto">Scaduti</SelectItem>
                    <SelectItem value="registrato">Registrati</SelectItem>
                    <SelectItem value="n/d">Periodici</SelectItem>
                  </SelectContent>
                </Select>
                {filtriAttivi && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFiltri}>Azzera filtri</Button>
                )}
              </div>
            </div>
            {filtriAttivi && (
              <p className="text-xs text-muted-foreground mt-3">
                {eventiFiltrati.length} eventi su {events.length}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Scaduti */}
        {scaduti.length > 0 && (
          <Card className="mb-6 border-red-300 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" /> Da registrare
              </CardTitle>
              <CardDescription>Eventi del piano con data passata e nessuna registrazione collegata (i più recenti)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scaduti.map(e => <RigaEvento key={e.id} evento={e} />)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prossimi eventi */}
        {prossimi.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Prossimi eventi</CardTitle>
              <CardDescription>Le operazioni in arrivo nel piano</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {prossimi.map(e => <RigaEvento key={e.id} evento={e} />)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vista calendario */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Vista Calendario</CardTitle>
            <CardDescription>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <span className="inline-flex items-center gap-1.5 text-xs"><span className="opacity-60">✓</span> registrato</span>
                <span className="inline-flex items-center gap-1.5 text-xs"><span className="text-red-600">⚠</span> scaduto da registrare</span>
                <span className="text-xs text-muted-foreground">· Clicca un evento per i dettagli e per registrarlo</span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[650px]">
              <Calendar
                localizer={localizer}
                culture="it"
                events={eventiFiltrati}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                date={currentDate}
                view={currentView}
                onNavigate={(d: Date) => setCurrentDate(d)}
                onView={(v: View) => setCurrentView(v)}
                eventPropGetter={eventStyleGetter}
                components={{ event: CustomEvent as any }}
                onSelectEvent={(event) => apriDettaglio(event as CalendarEvent)}
                popup
                messages={{
                  next: "›",
                  previous: "‹",
                  today: "Oggi",
                  month: "Mese",
                  week: "Settimana",
                  day: "Giorno",
                  agenda: "Agenda",
                  date: "Data",
                  time: "Ora",
                  event: "Evento",
                  showMore: (n: number) => `+${n} altri`,
                  noEventsInRange: "Nessun evento in questo periodo",
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Riepilogo del mese */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base capitalize">
              Riepilogo — {format(currentDate, "MMMM yyyy", { locale: it })}
            </CardTitle>
            <CardDescription>Segue il mese mostrato nel calendario e rispetta i filtri attivi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xs text-muted-foreground">Versamenti previsti</div>
                <div className="text-xl font-bold text-blue-600">{fmtCurrency(meseVersamentiPrevisti)}</div>
                <div className="text-xs text-muted-foreground">{meseAffluenti.length} affluenti</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Già registrati</div>
                <div className="text-xl font-bold text-emerald-600">{fmtCurrency(meseVersamentiRegistrati)}</div>
                <div className="text-xs text-muted-foreground">
                  {meseVersamentiPrevisti > 0 ? `${Math.round((meseVersamentiRegistrati / meseVersamentiPrevisti) * 100)}% del previsto` : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Reinvestimenti</div>
                <div className="text-xl font-bold text-amber-600">{meseReinv.length}</div>
                <div className="text-xs text-muted-foreground">
                  {meseReinvFissi > 0 ? `${fmtCurrency(meseReinvFissi)} a importo fisso` : "importi in percentuale"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Scaduti</div>
                <div className={`text-xl font-bold ${meseScaduti > 0 ? "text-red-600" : ""}`}>{meseScaduti}</div>
                <div className="text-xs text-muted-foreground">da registrare in questo mese</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog dettaglio evento */}
      <Dialog open={!!sel} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {sel && tipoIcone[sel.resource.tipo]}
              {sel && tipoLabel[sel.resource.tipo]}
            </DialogTitle>
          </DialogHeader>
          {sel && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Stato</span>
                {sel.resource.stato === "n/d"
                  ? <span className="text-xs text-muted-foreground">{statoLabel["n/d"]}</span>
                  : <StatoBadge stato={sel.resource.stato} />}
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Data</span>
                <span className="font-medium">{format(sel.start, "dd MMMM yyyy", { locale: it })}</span>
              </div>

              {sel.resource.fiumeOrigine && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Da</span>
                  <span className="font-medium">{sel.resource.fiumeOrigine}</span>
                </div>
              )}
              {sel.resource.fiumeDestinazione && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">A</span>
                  <span className="font-medium">{sel.resource.fiumeDestinazione}</span>
                </div>
              )}
              {sel.resource.fiumeNome && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fiume</span>
                  <span className="font-medium">{sel.resource.fiumeNome}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Importo previsto</span>
                <span className="font-semibold">{importoLabel(sel.resource)}</span>
              </div>

              {sel.resource.registrazione && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registrato</span>
                  <span className="font-semibold text-emerald-600">
                    {fmtCurrency(sel.resource.registrazione.totale)}
                    {sel.resource.registrazione.n > 1 && ` (${sel.resource.registrazione.n} eventi)`}
                  </span>
                </div>
              )}

              {sel.resource.periodicita && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Periodicità</span>
                  <span>{sel.resource.periodicita === 1 ? "Mensile" :
                    sel.resource.periodicita === 3 ? "Trimestrale" :
                    sel.resource.periodicita === 6 ? "Semestrale" : "Annuale"}</span>
                </div>
              )}

              {sel.resource.descrizione && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Note</span>
                  <span className="text-right max-w-[60%]">{sel.resource.descrizione}</span>
                </div>
              )}

              {/* Registrazione rapida */}
              {puoRegistrare(sel) && sel.resource.stato !== "registrato" && (
                <div className="pt-3 border-t space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Registra come evento reale</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="reg-importo" className="text-xs">Importo (€)</Label>
                      <Input
                        id="reg-importo"
                        inputMode="decimal"
                        autoComplete="off"
                        value={regImporto}
                        onChange={e => setRegImporto(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="reg-data" className="text-xs">Data</Label>
                      <Input
                        id="reg-data"
                        type="date"
                        value={regData}
                        onChange={e => setRegData(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button className="w-full" onClick={registra} disabled={createMutation.isPending}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {createMutation.isPending ? "Registrazione…" : "Registra"}
                  </Button>
                </div>
              )}

              <div className="pt-2 border-t flex gap-2">
                <Link href={sel.resource.href} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedEvent(null)}>
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Vai alla sezione
                  </Button>
                </Link>
                {sel.resource.stato === "registrato" && (
                  <Link href="/monitoraggio" className="flex-1">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedEvent(null)}>
                      Monitoraggio
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
