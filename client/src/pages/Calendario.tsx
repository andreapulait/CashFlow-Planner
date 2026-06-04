import React, { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMonths } from "date-fns";
import { it } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, ArrowRightLeft, Wallet, RefreshCw, ExternalLink } from "lucide-react";
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

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    tipo: EventTipo;
    fiumeOrigine?: string;
    fiumeDestinazione?: string;
    fiumeNome?: string;
    importo?: number;        // centesimi, se importo fisso
    percentuale?: number;    // basis points, se percentuale
    tipoCalcolo?: string;    // per periodici: "rendita" | "capitale"
    periodicita?: number;    // per periodici
    descrizione?: string;
    href: string;            // link alla sezione di gestione
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(v / 100);

const fmtPercent = (bp: number) => `${(bp / 100).toFixed(2)}%`;

function importoLabel(resource: CalendarEvent["resource"]): string {
  if (resource.importo) return fmtCurrency(resource.importo);
  if (resource.percentuale) {
    const tipoLabel = resource.tipoCalcolo === "rendita" ? "rendita" : "capitale";
    return `${fmtPercent(resource.percentuale)} del ${tipoLabel}`;
  }
  return "—";
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function Calendario() {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const { data: reinvestimenti,         isLoading: reinvLoading }    = trpc.reinvestimenti.list.useQuery();
  const { data: reinvestimentiPeriodici, isLoading: periodiciLoading } = trpc.reinvestimentiPeriodici.list.useQuery();
  const { data: allAffluenti,            isLoading: affluentiLoading } = trpc.affluenti.listAll.useQuery();
  const { data: impostazioni }                                         = trpc.impostazioni.get.useQuery();
  const { data: fiumi }                                                = trpc.fiumi.list.useQuery();

  const isLoading = reinvLoading || periodiciLoading || affluentiLoading;

  // Converte un offset-mese in data reale usando il T0 del piano
  const meseToDate = (mese: number): Date => {
    const dataInizio = impostazioni?.dataInizio ? new Date(impostazioni.dataInizio) : new Date();
    return addMonths(dataInizio, mese);
  };

  const events: CalendarEvent[] = useMemo(() => {
    if (!impostazioni) return [];
    const list: CalendarEvent[] = [];

    // ── 0. Attivazione fiumi ──────────────────────────────────────────────
    if (fiumi) {
      fiumi.forEach(fiume => {
        const eventDate = fiume.dataCreazione
          ? new Date(fiume.dataCreazione)
          : meseToDate(fiume.meseCreazione);

        list.push({
          id: `fiume-${fiume.id}`,
          title: `▶ ${fiume.nome}`,
          start: eventDate,
          end: eventDate,
          resource: {
            tipo: "fiume_attivazione",
            fiumeNome: fiume.nome,
            importo: fiume.sorgente,
            descrizione: `Rendimento: ${(fiume.rendimento / 100).toFixed(2)}% · Reinvest.: ${fiume.percentualeReinvestimento ?? 100}%`,
            href: "/fiumi",
          },
        });
      });
    }

    // ── 1. Reinvestimenti puntuali ─────────────────────────────────────────
    if (reinvestimenti && fiumi) {
      reinvestimenti.forEach(reinv => {
        const r = reinv.reinvestimento;
        const origine    = fiumi.find(f => f.id === r.fiumeOrigineId);
        const destinazione = r.fiumeDestinazioneId ? fiumi.find(f => f.id === r.fiumeDestinazioneId) : null;

        // Data: usa dataReinvestimento se presente, altrimenti offset dal T0
        const eventDate = r.dataReinvestimento
          ? new Date(r.dataReinvestimento)
          : meseToDate(r.meseReinvestimento);

        list.push({
          id: `reinv-${r.id}`,
          title: `↔ ${origine?.nome ?? "?"} → ${destinazione?.nome ?? r.nuovoFiumeNome ?? "Nuovo"}`,
          start: eventDate,
          end: eventDate,
          resource: {
            tipo: "reinvestimento_puntuale",
            fiumeOrigine: origine?.nome,
            fiumeDestinazione: destinazione?.nome ?? r.nuovoFiumeNome ?? undefined,
            importo: r.importoFisso ?? undefined,
            percentuale: r.percentuale ?? undefined,
            descrizione: r.descrizione ?? undefined,
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
          const eventDate = meseToDate(mese);
          list.push({
            id: `reinv-periodico-${rp.id}-${mese}`,
            title: `↻ ${origineNome ?? "?"} → ${destinazioneNome ?? "?"}`,
            start: eventDate,
            end: eventDate,
            resource: {
              tipo: "reinvestimento_periodico",
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
        // Data: usa dataAffluente se presente, altrimenti offset dal T0
        const eventDate = aff.dataAffluente
          ? new Date(aff.dataAffluente)
          : meseToDate(aff.mese);

        list.push({
          id: `affluente-${aff.id}`,
          title: `+ ${aff.fiumeNome ?? "Fiume"}`,
          start: eventDate,
          end: eventDate,
          resource: {
            tipo: "affluente",
            fiumeNome: aff.fiumeNome ?? undefined,
            importo: aff.importo,
            descrizione: aff.descrizione ?? undefined,
            href: "/apporti",
          },
        });
      });
    }

    return list.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [reinvestimenti, reinvestimentiPeriodici, allAffluenti, impostazioni, fiumi]);

  // ── Stile eventi ──────────────────────────────────────────────────────────

  const eventStyleGetter = (event: CalendarEvent) => {
    const colorMap: Record<EventTipo, string> = {
      fiume_attivazione:        "#10b981",  // verde
      reinvestimento_puntuale:  "#f59e0b",  // ambra
      reinvestimento_periodico: "#8b5cf6",  // viola
      affluente:                "#3b82f6",  // blu
    };
    return {
      style: {
        backgroundColor: colorMap[event.resource.tipo],
        borderRadius: "4px",
        color: "white",
        border: "none",
        fontSize: "11px",
        padding: "1px 4px",
      },
    };
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => (
    <div className="truncate text-[11px] leading-tight px-0.5">
      <span>{event.title}</span>
    </div>
  );

  // ── KPI ───────────────────────────────────────────────────────────────────

  const oggi = new Date();
  const future = events.filter(e => e.start >= oggi);
  const prossimi = future.slice(0, 5);

  const tipoIcone: Record<EventTipo, React.ReactElement> = {
    fiume_attivazione:        <CalendarDays className="h-4 w-4 text-emerald-600" />,
    reinvestimento_puntuale:  <ArrowRightLeft className="h-4 w-4 text-amber-600" />,
    reinvestimento_periodico: <RefreshCw className="h-4 w-4 text-violet-600" />,
    affluente:                <Wallet className="h-4 w-4 text-blue-600" />,
  };

  const tipoLabel: Record<EventTipo, string> = {
    fiume_attivazione:        "Attivazione fiume",
    reinvestimento_puntuale:  "Reinvestimento",
    reinvestimento_periodico: "Rein. periodico",
    affluente:                "Affluente",
  };

  const tipoBadgeVariant: Record<EventTipo, "default" | "secondary" | "outline"> = {
    fiume_attivazione:        "secondary",
    reinvestimento_puntuale:  "default",
    reinvestimento_periodico: "outline",
    affluente:                "secondary",
  };

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
            Tutti gli eventi del piano — affluenti, reinvestimenti puntuali e periodici
          </p>
        </div>

        {/* KPI */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Totale eventi</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{events.length}</div>
              <p className="text-xs text-muted-foreground">nel piano completo</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-600">Fiumi</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-emerald-600">
              {events.filter(e => e.resource.tipo === "fiume_attivazione").length}</div>
              <p className="text-xs text-muted-foreground">attivazioni</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-600">Affluenti</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-600">
              {events.filter(e => e.resource.tipo === "affluente").length}</div>
              <p className="text-xs text-muted-foreground">versamenti pianificati</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-600">Reinvestimenti</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-amber-600">
              {events.filter(e => e.resource.tipo === "reinvestimento_puntuale").length}</div>
              <p className="text-xs text-muted-foreground">trasferimenti puntuali</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-violet-600">Periodici</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-violet-600">
              {events.filter(e => e.resource.tipo === "reinvestimento_periodico").length}</div>
              <p className="text-xs text-muted-foreground">occorrenze periodiche</p></CardContent>
          </Card>
        </div>

        {/* Prossimi eventi */}
        {prossimi.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Prossimi eventi</CardTitle>
              <CardDescription>Le operazioni in arrivo nel piano</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {prossimi.map(evento => (
                  <div key={evento.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      {tipoIcone[evento.resource.tipo]}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={tipoBadgeVariant[evento.resource.tipo]} className="text-xs">
                            {tipoLabel[evento.resource.tipo]}
                          </Badge>
                          <span className="text-sm font-medium">{evento.title}</span>
                        </div>
                        {evento.resource.descrizione && (
                          <p className="text-xs text-muted-foreground mt-0.5">{evento.resource.descrizione}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="font-semibold text-sm">{importoLabel(evento.resource)}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(evento.start, "dd MMM yyyy", { locale: it })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vista calendario */}
        <Card>
          <CardHeader>
            <CardTitle>Vista Calendario</CardTitle>
            <CardDescription>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-xs">Attivazione fiume</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-500" />
                  <span className="text-xs">Affluenti</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-amber-500" />
                  <span className="text-xs">Reinvestimenti puntuali</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-violet-500" />
                  <span className="text-xs">Reinvestimenti periodici</span>
                </div>
                <span className="text-xs text-muted-foreground">· Clicca un evento per i dettagli</span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[600px]">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: "100%" }}
                eventPropGetter={eventStyleGetter}
                components={{ event: CustomEvent as any }}
                onSelectEvent={(event) => setSelectedEvent(event as CalendarEvent)}
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
                  noEventsInRange: "Nessun evento in questo periodo",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog dettaglio evento */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && tipoIcone[selectedEvent.resource.tipo]}
              {selectedEvent && tipoLabel[selectedEvent.resource.tipo]}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data</span>
                <span className="font-medium">{format(selectedEvent.start, "dd MMMM yyyy", { locale: it })}</span>
              </div>

              {selectedEvent.resource.fiumeOrigine && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Da</span>
                  <span className="font-medium">{selectedEvent.resource.fiumeOrigine}</span>
                </div>
              )}
              {selectedEvent.resource.fiumeDestinazione && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">A</span>
                  <span className="font-medium">{selectedEvent.resource.fiumeDestinazione}</span>
                </div>
              )}
              {selectedEvent.resource.fiumeNome && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fiume</span>
                  <span className="font-medium">{selectedEvent.resource.fiumeNome}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Importo</span>
                <span className="font-semibold">{importoLabel(selectedEvent.resource)}</span>
              </div>

              {selectedEvent.resource.periodicita && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Periodicità</span>
                  <span>{selectedEvent.resource.periodicita === 1 ? "Mensile" :
                    selectedEvent.resource.periodicita === 3 ? "Trimestrale" :
                    selectedEvent.resource.periodicita === 6 ? "Semestrale" : "Annuale"}</span>
                </div>
              )}

              {selectedEvent.resource.descrizione && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Note</span>
                  <span className="text-right max-w-[60%]">{selectedEvent.resource.descrizione}</span>
                </div>
              )}

              <div className="pt-2 border-t">
                <Link href={selectedEvent.resource.href}>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedEvent(null)}>
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Vai alla sezione
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
