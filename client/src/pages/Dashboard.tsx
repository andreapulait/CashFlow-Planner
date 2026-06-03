import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target, Wallet, PiggyBank } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import { FiumiManager } from "@/components/FiumiManager";

export default function Dashboard() {
  const { data: riepilogo, isLoading: riepilogoLoading } = trpc.calcoli.riepilogo.useQuery();
  const { data: impostazioni } = trpc.impostazioni.get.useQuery();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Cash Flow Planner</h1>
          <p className="text-muted-foreground">
            Gestisci i tuoi flussi di investimento e monitora il progresso verso l'obiettivo di{" "}
            {impostazioni ? formatCurrency(impostazioni.obiettivoMensile / 100) : "..."}/mese
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Numero Fiumi</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {riepilogoLoading ? "..." : riepilogo?.numeroFiumi || 0}
              </div>
              <p className="text-xs text-muted-foreground">Flussi di investimento attivi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Capitale Totale ({impostazioni ? `Anno ${Math.round(impostazioni.orizzonteTemporale / 12)}` : "Anno 10"})
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {riepilogoLoading ? "..." : formatCurrency(riepilogo?.capitaleTotale || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Valore del portafoglio</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cash Flow Mensile</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {riepilogoLoading ? "..." : formatCurrency(riepilogo?.cashFlowMensile || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Rendita mensile al {impostazioni ? `${Math.round(impostazioni.orizzonteTemporale / 12)}° anno` : "10° anno"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Obiettivo Raggiunto</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {riepilogoLoading ? "..." : `${riepilogo?.percentualeRaggiunta.toFixed(1) || 0}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                Obiettivo: {riepilogoLoading ? "..." : formatCurrency(riepilogo?.obiettivo || 0)}/mese
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        {!riepilogoLoading && riepilogo && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Progresso verso l'Obiettivo</CardTitle>
              <CardDescription>
                Visualizzazione del tuo avanzamento verso l'obiettivo di {formatCurrency(riepilogo.obiettivo)}/mese
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressBar
                current={riepilogo.cashFlowMensile}
                target={riepilogo.obiettivo}
                label={`${formatCurrency(riepilogo.cashFlowMensile)} / ${formatCurrency(riepilogo.obiettivo)}`}
              />
              <div className="mt-4 text-sm text-muted-foreground">
                {riepilogo.percentualeRaggiunta >= 100 ? (
                  <span className="text-green-600 font-medium">🎉 Obiettivo raggiunto! Hai superato il target mensile.</span>
                ) : (
                  <span>Mancano ancora {formatCurrency(riepilogo.obiettivo - riepilogo.cashFlowMensile)} per raggiungere l'obiettivo.</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fiumi */}
        <FiumiManager />
      </div>
    </div>
  );
}
