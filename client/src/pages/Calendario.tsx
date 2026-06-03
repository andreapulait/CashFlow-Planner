import { useMemo } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addYears } from "date-fns";
import { it } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const locales = {
  it: it,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: {
    tipo: "reinvestimento" | "apporto";
    importo: number;
    fiumeSorgente?: string;
    fiumeDestinazione?: string;
    descrizione?: string;
  };
}

export default function Calendario() {
  const { data: reinvestimenti, isLoading: reinvLoading } = trpc.reinvestimenti.list.useQuery();
  const { data: fiumi } = trpc.fiumi.list.useQuery();
  // Apporti will be fetched per fiume
  const isLoading = reinvLoading;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value / 100);
  };

  const events: CalendarEvent[] = useMemo(() => {
    const eventList: CalendarEvent[] = [];
    const today = new Date();

    // Add reinvestimenti events
    if (reinvestimenti && fiumi) {
      reinvestimenti.forEach(reinv => {
        const fiumeSorgente = fiumi.find(f => f.id === reinv.reinvestimento.fiumeOrigineId);
        const fiumeDestinazione = reinv.reinvestimento.fiumeDestinazioneId
          ? fiumi.find(f => f.id === reinv.reinvestimento.fiumeDestinazioneId)
          : null;

        const eventDate = addYears(today, reinv.reinvestimento.meseReinvestimento);

        let importo = 0;
        if (reinv.reinvestimento.importoFisso) {
          importo = reinv.reinvestimento.importoFisso;
        } else if (reinv.reinvestimento.percentuale && fiumeSorgente) {
          // Estimate based on initial capital
          importo = Math.round((fiumeSorgente.sorgente * reinv.reinvestimento.percentuale) / 10000);
        }

        eventList.push({
          id: reinv.reinvestimento.id,
          title: `Reinvestimento: ${fiumeSorgente?.nome || "?"} → ${fiumeDestinazione?.nome || reinv.reinvestimento.nuovoFiumeNome || "Nuovo"}`,
          start: eventDate,
          end: eventDate,
          resource: {
            tipo: "reinvestimento",
            importo,
            fiumeSorgente: fiumeSorgente?.nome,
            fiumeDestinazione: fiumeDestinazione?.nome || reinv.reinvestimento.nuovoFiumeNome || undefined,
            descrizione: undefined,
          },
        });
      });
    }

    // Note: Apporti are not shown in calendar for simplicity
    // They can be added by fetching apporti per fiume if needed

    return eventList;
  }, [reinvestimenti, fiumi]);

  const eventStyleGetter = (event: CalendarEvent) => {
    const style: React.CSSProperties = {
      backgroundColor: event.resource.tipo === "reinvestimento" ? "#f59e0b" : "#3b82f6",
      borderRadius: "4px",
      opacity: 0.9,
      color: "white",
      border: "none",
      display: "block",
      fontSize: "12px",
      padding: "2px 4px",
    };
    return { style };
  };

  const CustomEvent = ({ event }: { event: CalendarEvent }) => {
    return (
      <div className="text-xs">
        <div className="font-semibold">{event.title}</div>
        <div>{formatCurrency(event.resource.importo)}</div>
      </div>
    );
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

  const prossimeOperazioni = events
    .filter(e => e.start > new Date())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Calendario Operazioni</h1>
          </div>
          <p className="text-muted-foreground">
            Visualizza reinvestimenti e apporti programmati nel tempo
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Totale Eventi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Operazioni programmate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Reinvestimenti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {events.filter(e => e.resource.tipo === "reinvestimento").length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Trasferimenti tra fiumi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Affluenti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {events.filter(e => e.resource.tipo === "apporto").length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Capitale esterno
              </p>
            </CardContent>
          </Card>
        </div>

        {prossimeOperazioni.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <CardTitle>Prossime Operazioni</CardTitle>
              </div>
              <CardDescription>Le operazioni in arrivo nei prossimi mesi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {prossimeOperazioni.map(evento => (
                  <div key={evento.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={evento.resource.tipo === "reinvestimento" ? "default" : "secondary"}>
                          {evento.resource.tipo === "reinvestimento" ? "Reinvestimento" : "Affluente"}
                        </Badge>
                        <span className="text-sm font-medium">{evento.title}</span>
                      </div>
                      {evento.resource.descrizione && (
                        <p className="text-xs text-muted-foreground">{evento.resource.descrizione}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(evento.resource.importo)}</div>
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

        <Card>
          <CardHeader>
            <CardTitle>Vista Calendario</CardTitle>
            <CardDescription>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span className="text-sm">Reinvestimenti</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-sm">Affluenti</span>
                </div>
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
                components={{
                  event: CustomEvent,
                }}
                messages={{
                  next: "Successivo",
                  previous: "Precedente",
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

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Sistema Notifiche
          </h3>
          <p className="text-sm text-muted-foreground">
            Il sistema di notifiche è attivo. Riceverai promemoria automatici per le operazioni programmate.
            Puoi configurare le preferenze di notifica nella sezione Impostazioni.
          </p>
        </div>
      </div>
    </div>
  );
}
