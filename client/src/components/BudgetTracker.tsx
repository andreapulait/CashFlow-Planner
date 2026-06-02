import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BudgetTrackerProps {
  budgetMensile: number | null; // in cents
  affluentiPerMese: Array<{ mese: number; totale: number }>; // totale in cents
  dataInizio: Date | null;
  orizzonteTemporale?: number; // Total months in plan (default 60)
}

export function BudgetTracker({ 
  budgetMensile, 
  affluentiPerMese, 
  dataInizio,
  orizzonteTemporale = 60 
}: BudgetTrackerProps) {
  // Create complete month array (0 to orizzonteTemporale-1)
  const allMonths = useMemo(() => {
    const affluentiMap = new Map(affluentiPerMese.map(a => [a.mese, a.totale]));
    
    return Array.from({ length: orizzonteTemporale }, (_, index) => ({
      mese: index,
      totale: affluentiMap.get(index) || 0,
    }));
  }, [affluentiPerMese, orizzonteTemporale]);

  const stats = useMemo(() => {
    if (!budgetMensile || budgetMensile <= 0) {
      return {
        mediaAllocata: 0,
        piccoMassimo: 0,
        mesiOk: 0,
        mesiSforati: 0,
        mesiLiberi: 0,
      };
    }

    const mesiConAffluenti = allMonths.filter(m => m.totale > 0);
    const totaleAllocato = mesiConAffluenti.reduce((sum, m) => sum + m.totale, 0);
    const mediaAllocata = mesiConAffluenti.length > 0 ? totaleAllocato / mesiConAffluenti.length : 0;
    const piccoMassimo = Math.max(...allMonths.map(m => m.totale));

    let mesiOk = 0;
    let mesiSforati = 0;
    let mesiLiberi = 0;

    allMonths.forEach(({ totale }) => {
      if (totale === 0) {
        mesiLiberi++;
      } else {
        const percentuale = (totale / budgetMensile) * 100;
        if (percentuale <= 100) mesiOk++;
        else mesiSforati++;
      }
    });

    return {
      mediaAllocata,
      piccoMassimo,
      mesiOk,
      mesiSforati,
      mesiLiberi,
    };
  }, [budgetMensile, allMonths]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(value / 100);
  };

  const formatMonth = (mese: number) => {
    if (!dataInizio) return `Mese ${mese + 1}`;
    const date = new Date(dataInizio);
    date.setMonth(date.getMonth() + mese);
    return date.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  };

  const getMattonellaStyle = (totale: number) => {
    if (totale === 0) {
      // Mese libero - sfondo grigio chiaro
      return {
        background: "rgb(241 245 249)",
        border: "1px solid rgb(226 232 240)",
      };
    }

    if (!budgetMensile || budgetMensile <= 0) {
      return {
        background: "rgb(241 245 249)",
        border: "1px solid rgb(226 232 240)",
      };
    }

    const percentuale = (totale / budgetMensile) * 100;
    const fillPercentage = Math.min(percentuale, 100);
    const isSforato = percentuale > 100;

    return {
      background: `linear-gradient(to top, rgb(134 239 172) ${fillPercentage}%, rgb(241 245 249) ${fillPercentage}%)`,
      border: isSforato ? "3px solid rgb(239 68 68)" : "1px solid rgb(226 232 240)",
    };
  };

  const getPercentualeColor = (totale: number) => {
    if (totale === 0) return "text-slate-400";
    if (!budgetMensile || budgetMensile <= 0) return "text-slate-400";
    
    const percentuale = (totale / budgetMensile) * 100;
    if (percentuale > 100) return "text-red-600 font-bold";
    return "text-slate-700 font-semibold";
  };

  if (!budgetMensile || budgetMensile <= 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Tracker Affluenti</CardTitle>
          <CardDescription>
            Configura un budget mensile nelle Impostazioni per monitorare l'allocazione degli affluenti
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Tracker Affluenti</CardTitle>
        <CardDescription>
          Monitoraggio allocazione mensile affluenti rispetto al budget disponibile ({orizzonteTemporale} mesi)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Budget Mensile</div>
            <div className="text-2xl font-bold">{formatCurrency(budgetMensile)}</div>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Media Allocata</div>
            <div className="text-2xl font-bold">{formatCurrency(stats.mediaAllocata)}</div>
            <div className="text-xs text-muted-foreground">
              su {allMonths.filter(m => m.totale > 0).length} mesi allocati
            </div>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Picco Massimo</div>
            <div className="text-2xl font-bold">{formatCurrency(stats.piccoMassimo)}</div>
            <div className="text-xs text-muted-foreground">
              {stats.piccoMassimo > 0 ? `${((stats.piccoMassimo / budgetMensile) * 100).toFixed(0)}% del budget` : '-'}
            </div>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm text-muted-foreground">Stato Generale</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-300"></div>
                <span className="text-sm font-medium">{stats.mesiOk}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span className="text-sm font-medium">{stats.mesiSforati}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                <span className="text-sm font-medium">{stats.mesiLiberi}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Month Tiles Grid */}
        <div>
          <h3 className="text-sm font-medium mb-3">Allocazione Mensile</h3>
          <TooltipProvider>
            <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-15 lg:grid-cols-20 gap-1.5">
              {allMonths.map(({ mese, totale }) => {
                const percentuale = totale > 0 && budgetMensile > 0 ? (totale / budgetMensile) * 100 : 0;
                return (
                  <Tooltip key={mese}>
                    <TooltipTrigger asChild>
                      <div
                        className="aspect-square rounded flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                        style={getMattonellaStyle(totale)}
                      >
                        <span className={`text-xs ${getPercentualeColor(totale)}`}>
                          {percentuale.toFixed(0)}%
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-1">
                        <div className="font-semibold">{formatMonth(mese)}</div>
                        {totale === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            Nessun affluente allocato
                          </div>
                        ) : (
                          <div className="text-sm">
                            <div>Allocato: <span className="font-medium">{formatCurrency(totale)}</span></div>
                            <div>Budget: <span className="font-medium">{formatCurrency(budgetMensile)}</span></div>
                            <div>Utilizzo: <span className="font-medium">{percentuale.toFixed(1)}%</span></div>
                            {percentuale > 100 && (
                              <div className="text-rose-600 font-medium">
                                Sforamento: {formatCurrency(totale - budgetMensile)}
                              </div>
                            )}
                            {percentuale > 0 && percentuale <= 100 && (
                              <div className="text-emerald-600 font-medium">
                                Disponibile: {formatCurrency(budgetMensile - totale)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border border-slate-300 bg-gradient-to-t from-green-300 to-slate-50"></div>
            <span>1-100% budget (OK)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border-4 border-red-500 bg-green-300"></div>
            <span>&gt;100% budget (Sforato)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border border-slate-300 bg-slate-100"></div>
            <span>0% budget (Libero)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
