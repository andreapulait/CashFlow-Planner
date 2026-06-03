import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KPICard } from "@/components/KPICard";
import { TrendingUp, Wallet, Target, DollarSign, Percent, Calendar, FileText } from "lucide-react";
import { PatrimonioChart } from "@/components/charts/PatrimonioChart";
import { RenditaChart } from "@/components/charts/RenditaChart";
import { FiumiComparisonChart } from "@/components/charts/FiumiComparisonChart";
import { generatePDFReport, formatPercentage } from "@/lib/pdfGenerator";
import { toast } from "sonner";

const PIE_COLORS = ["#10b981", "#3b82f6", "#a855f7", "#f97316", "#ec4899", "#06b6d4", "#84cc16"];

export default function Analytics() {
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportNotes, setExportNotes] = useState("");
  const patrimonioChartRef = useRef<HTMLDivElement>(null);
  const comparisonChartRef = useRef<HTMLDivElement>(null);

  const { data: simulazione, isLoading: simulazioneLoading } = trpc.calcoli.simulazioneQuinquennale.useQuery({});
  const { data: fiumi, isLoading: fiumiLoading } = trpc.fiumi.list.useQuery();
  const { data: impostazioni } = trpc.impostazioni.get.useQuery();
  const { data: riepilogo } = trpc.calcoli.riepilogo.useQuery();
  const { data: fiumiPerformance } = trpc.calcoli.fiumiPerformance.useQuery();
  const { data: evoluzionePatrimonio } = trpc.calcoli.evoluzionePatrimonio.useQuery();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value / 100);
  };

  // Calcola KPI
  const calculateKPIs = () => {
    if (!riepilogo || !fiumi || !impostazioni) {
      return {
        valoreAttuale: 0,
        valoreFinale: 0,
        roiTotale: 0,
        crescitaMensile: 0,
        renditaMensile: 0,
        tempoRimanente: 0,
      };
    }

    // Usa dati da riepilogo (stessa query della Dashboard)
    // Riepilogo ritorna valori in euro, ma formatCurrency si aspetta centesimi
    const valoreFinale = riepilogo.capitaleTotale * 100; // euro → centesimi
    const renditaMensile = riepilogo.cashFlowMensile * 100; // euro → centesimi
    
    // Valore attuale (capitale iniziale in centesimi)
    const valoreAttuale = fiumi.reduce((sum, f) => sum + f.sorgente, 0);

    // ROI totale
    const roiTotale = valoreAttuale > 0 
      ? ((valoreFinale - valoreAttuale) / valoreAttuale) * 100 
      : 0;

    // Crescita mensile media
    const mesiTrascorsi = impostazioni.orizzonteTemporale;
    const crescitaMensile = mesiTrascorsi > 1 && valoreAttuale > 0
      ? (Math.pow(valoreFinale / valoreAttuale, 1 / mesiTrascorsi) - 1) * 100
      : 0;

    return {
      valoreAttuale,
      valoreFinale,
      roiTotale,
      crescitaMensile,
      renditaMensile,
      tempoRimanente: impostazioni.orizzonteTemporale,
    };
  };

  // Top performers (usa dati corretti da fiumiPerformance)
  const getTopPerformers = () => {
    if (!fiumiPerformance) return [];
    return fiumiPerformance; // Già ordinati per ROI dal backend
  };

  // Prepara dati per grafico evoluzione (usa dati corretti da evoluzionePatrimonio)
  const patrimonioData = () => {
    if (!evoluzionePatrimonio) return [];
    return evoluzionePatrimonio; // Già nel formato corretto dal backend
  };

  if (simulazioneLoading || fiumiLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!simulazione || simulazione.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Analytics</h1>
            <p className="text-muted-foreground">
              Metriche chiave e analisi approfondita delle performance
            </p>
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                Nessun dato disponibile. Crea almeno un fiume nella dashboard per vedere le analytics.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const kpis = calculateKPIs();
  const topPerformers = getTopPerformers();

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Analytics</h1>
            <p className="text-muted-foreground">
              Metriche chiave e analisi approfondita delle performance del tuo portafoglio
            </p>
          </div>

          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Esporta Report PDF
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Esporta Report Analytics</DialogTitle>
                <DialogDescription>
                  Genera un report PDF professionale con grafici, tabelle e metriche chiave
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes">Note Personalizzate (opzionale)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Aggiungi note o commenti al report..."
                    value={exportNotes}
                    onChange={(e) => setExportNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={async () => {
                    try {
                      const kpis = calculateKPIs();

                      // Prepare KPI data
                      const kpiData = [
                        {
                          label: "Valore Portafoglio Attuale",
                          value: formatCurrency(kpis.valoreAttuale),
                        },
                        {
                          label: "Valore Proiettato Finale",
                          value: formatCurrency(kpis.valoreFinale),
                        },
                        {
                          label: "ROI Totale",
                          value: `${kpis.roiTotale.toFixed(2)}%`,
                          change: kpis.roiTotale > 0 ? `+${kpis.roiTotale.toFixed(2)}%` : `${kpis.roiTotale.toFixed(2)}%`,
                        },
                        {
                          label: "Crescita Mensile Media",
                          value: `${kpis.crescitaMensile.toFixed(2)}%`,
                        },
                        {
                          label: "Rendita Mensile Finale",
                          value: formatCurrency(Math.round(kpis.renditaMensile)),
                        },
                        {
                          label: "Orizzonte Temporale",
                          value: `${kpis.tempoRimanente} mesi`,
                        },
                      ];

                      // Prepare top performers table
                      const topPerformers = getTopPerformers();
                      const performersTable = {
                        title: "Top Performers",
                        headers: ["Fiume", "Valore Finale", "ROI", "Rendita Mensile"],
                        rows: topPerformers.map((p) => [
                          p.nome,
                          formatCurrency(p.valoreFinale),
                          `${p.roi.toFixed(2)}%`,
                          formatCurrency(p.renditaMensile),
                        ]),
                      };

                      // Collect chart elements
                      const chartElements: HTMLElement[] = [];
                      if (patrimonioChartRef.current) {
                        chartElements.push(patrimonioChartRef.current);
                      }
                      if (comparisonChartRef.current) {
                        chartElements.push(comparisonChartRef.current);
                      }

                      await generatePDFReport({
                        title: "Report Analytics",
                        subtitle: `Analisi Portafoglio - ${new Date().toLocaleDateString("it-IT")}`,
                        author: "Cash Flow Planner",
                        notes: exportNotes || undefined,
                        kpiData,
                        tables: [performersTable],
                        chartElements,
                      });

                      toast.success("Report PDF generato con successo!");
                      setExportDialogOpen(false);
                      setExportNotes("");
                    } catch (error) {
                      console.error("Error generating PDF:", error);
                      toast.error("Errore nella generazione del PDF");
                    }
                  }}
                  className="w-full"
                >
                  Genera PDF
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <KPICard
            title="Valore Portafoglio Attuale"
            value={formatCurrency(kpis.valoreAttuale)}
            subtitle="Capitale iniziale investito"
            icon={Wallet}
          />
          <KPICard
            title="Valore Proiettato Finale"
            value={formatCurrency(kpis.valoreFinale)}
            subtitle={`Al mese ${kpis.tempoRimanente}`}
            icon={Target}
            trend={{
              value: kpis.roiTotale,
              label: "ROI totale",
            }}
          />
          <KPICard
            title="ROI Totale"
            value={`${kpis.roiTotale.toFixed(1)}%`}
            subtitle={`Su ${kpis.tempoRimanente} mesi`}
            icon={Percent}
          />
          <KPICard
            title="Crescita Mensile Media"
            value={`${kpis.crescitaMensile.toFixed(2)}%`}
            subtitle="Tasso di crescita composto"
            icon={TrendingUp}
          />
          <KPICard
            title="Rendita Mensile Finale"
            value={formatCurrency(kpis.renditaMensile)}
            subtitle="Cash flow mensile previsto"
            icon={DollarSign}
          />
          <KPICard
            title="Orizzonte Temporale"
            value={`${kpis.tempoRimanente} mesi`}
            subtitle={`${(kpis.tempoRimanente / 12).toFixed(1)} anni`}
            icon={Calendar}
          />
        </div>

        {/* Grafici */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Evoluzione Patrimonio</CardTitle>
              <CardDescription>Andamento del valore totale del portafoglio nel tempo</CardDescription>
            </CardHeader>
            <CardContent ref={patrimonioChartRef}>
              <PatrimonioChart 
                data={patrimonioData().map(d => ({ mese: d.mese, valore: d.valore }))} 
                dataInizio={impostazioni?.dataInizio}
              />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Evoluzione Rendita Mensile</CardTitle>
              <CardDescription>Andamento del cash flow mensile generato dal portafoglio</CardDescription>
            </CardHeader>
            <CardContent>
              <RenditaChart 
                data={patrimonioData().map(d => ({ mese: d.mese, rendita: d.rendita }))} 
                dataInizio={impostazioni?.dataInizio}
              />
            </CardContent>
          </Card>

          {/* Composizione Portafoglio — torta */}
          {(() => {
            const composizioneData = simulazione?.map(fiume => {
              const ultimoMese = fiume.mesi.find(a => a.mese === impostazioni?.orizzonteTemporale);
              return { nome: fiume.nome, valore: ultimoMese?.valore || 0 };
            }) || [];
            const totale = composizioneData.reduce((s, e) => s + e.valore, 0);
            const formatCurrencyInt = (v: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
            return (
              <Card>
                <CardHeader>
                  <CardTitle>Composizione Portafoglio (Mese {impostazioni?.orizzonteTemporale})</CardTitle>
                  <CardDescription>Distribuzione del capitale per fiume</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={composizioneData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.nome}: ${totale > 0 ? ((entry.valore / totale) * 100).toFixed(1) : 0}%`}
                        outerRadius={100}
                        dataKey="valore"
                        nameKey="nome"
                      >
                        {composizioneData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number) => [formatCurrencyInt(value), ""]}
                        contentStyle={{ backgroundColor: "rgba(255,255,255,0.95)", border: "1px solid #ccc", borderRadius: "8px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            );
          })()}

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Performance Comparativa Fiumi</CardTitle>
              <CardDescription>Confronto ROI e crescita tra i diversi fiumi</CardDescription>
            </CardHeader>
            <CardContent ref={comparisonChartRef}>
              <FiumiComparisonChart fiumi={topPerformers} />
            </CardContent>
          </Card>
        </div>

        {/* Top Performers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Classifica fiumi per ROI e performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((fiume, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{fiume.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Rendimento: {(fiume.rendimento / 100).toFixed(2)}% annuo
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-primary">
                      {fiume.roi.toFixed(1)}% ROI
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(fiume.valoreIniziale)} → {formatCurrency(fiume.valoreFinale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
