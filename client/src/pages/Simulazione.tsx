import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar, DateFilter } from "@/components/FilterBar";
import { formatMonthOffset } from "@/lib/dateFormat";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet } from "lucide-react";

export default function Simulazione() {
  const [filter, setFilter] = useState<DateFilter>({ type: "all" });
  const { data: simulazione, isLoading } = trpc.calcoli.simulazioneQuinquennale.useQuery({});
  const { data: impostazioni } = trpc.impostazioni.get.useQuery();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getMesi = () => {
    if (!impostazioni) return [];
    const allMesi = Array.from({ length: impostazioni.orizzonteTemporale }, (_, i) => i + 1);
    
    // Apply filter
    if (filter.type === "all") return allMesi;
    
    const now = new Date();
    const dataInizio = impostazioni.dataInizio ? new Date(impostazioni.dataInizio) : now;
    
    if (filter.type === "next12") {
      return allMesi.filter(m => m <= 12);
    }
    
    if (filter.type === "currentYear") {
      const currentYear = now.getFullYear();
      return allMesi.filter(m => {
        const meseDate = new Date(dataInizio);
        meseDate.setMonth(meseDate.getMonth() + m);
        return meseDate.getFullYear() === currentYear;
      });
    }
    
    if (filter.type === "custom" && filter.startDate && filter.endDate) {
      return allMesi.filter(m => {
        const meseDate = new Date(dataInizio);
        meseDate.setMonth(meseDate.getMonth() + m);
        return meseDate >= filter.startDate! && meseDate <= filter.endDate!;
      });
    }
    
    return allMesi;
  };

  const calcolaTotaliMese = (mese: number) => {
    if (!simulazione) return { valore: 0, rendita: 0, cashFlow: 0, affluenti: 0 };
    
    let valore = 0;
    let rendita = 0;
    let cashFlow = 0;
    let affluenti = 0;
    
    simulazione.forEach(fiume => {
      const meseData = fiume.mesi.find(a => a.mese === mese);
      if (meseData) {
        valore += meseData.valore;
        rendita += meseData.rendita;
        cashFlow += meseData.cashFlowMensile;
        affluenti += meseData.affluenteMese || 0;
      }
    });
    
    return { valore, rendita, cashFlow, affluenti };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!simulazione || simulazione.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Simulazione Temporale</h1>
            <p className="text-muted-foreground">
              Visualizza l'evoluzione dei tuoi investimenti nei prossimi {impostazioni?.orizzonteTemporale || 5} anni con interesse composto
            </p>
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                Nessun fiume disponibile per la simulazione. Crea almeno un fiume nella dashboard per vedere i risultati.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Simulazione Temporale</h1>
              <p className="text-muted-foreground">
                Visualizza l'evoluzione dei tuoi investimenti nei prossimi {impostazioni?.orizzonteTemporale || 5} mesi con interesse composto
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!simulazione) return;
                  const data = simulazione.map(f => ({
                    fiume: f.nome,
                    mesi: f.mesi,
                  }));
                  exportToPDF(data, {
                    title: "Simulazione Temporale",
                    dataInizio: impostazioni?.dataInizio,
                    filteredMesi: getMesi(),
                  });
                }}
                className="gap-2"
              >
                <FileDown className="h-4 w-4" />
                Esporta PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!simulazione) return;
                  const data = simulazione.map(f => ({
                    fiume: f.nome,
                    mesi: f.mesi,
                  }));
                  exportToExcel(data, {
                    title: "Simulazione Temporale",
                    dataInizio: impostazioni?.dataInizio,
                    filteredMesi: getMesi(),
                  });
                }}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Esporta Excel
              </Button>
            </div>
          </div>

        {/* Filtri Temporali */}
        <FilterBar onFilterChange={setFilter} currentFilter={filter} />

        {/* Tabella Riepilogo Totali */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Riepilogo Totali per Anno</CardTitle>
            <CardDescription>Somma di tutti i fiumi per ogni mese</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mese</TableHead>
                  <TableHead className="text-right">Valore Totale</TableHead>
                  <TableHead className="text-right">Rendita Annuale</TableHead>
                  <TableHead className="text-right">Apporti Anno</TableHead>
                  <TableHead className="text-right">Cash Flow Mensile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getMesi().map(mese => {
                  const totali = calcolaTotaliMese(mese);
                  return (
                    <TableRow key={mese} className={mese === 60 ? "bg-accent" : ""}>
                      <TableCell className="font-medium">
                        {formatMonthOffset(mese, impostazioni?.dataInizio)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(totali.valore)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(totali.rendita)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {formatCurrency(totali.affluenti)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(totali.cashFlow)}
                      </TableCell>                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tabelle Dettagliate per Fiume */}
        <div className="space-y-6">
          {simulazione.map(fiume => (
            <Card key={fiume.fiumeId}>
              <CardHeader>
                <CardTitle>{fiume.nome}</CardTitle>
                <CardDescription>
                  Capitale sorgente: {formatCurrency(fiume.sorgente)} • Rendimento: {fiume.rendimento.toFixed(2)}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mese</TableHead>
                      <TableHead className="text-right">Valore</TableHead>
                      <TableHead className="text-right">Rendita Annuale</TableHead>
                      <TableHead className="text-right">Apporto Anno</TableHead>
                      <TableHead className="text-right">Reinv. Uscita</TableHead>
                      <TableHead className="text-right">Reinv. Entrata</TableHead>
                      <TableHead className="text-right">Cash Flow Mensile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fiume.mesi.map(meseData => (
                      <TableRow key={meseData.mese}>
                        <TableCell className="font-medium">
                          {formatMonthOffset(meseData.mese, impostazioni?.dataInizio)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(meseData.valore)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(meseData.rendita)}</TableCell>
                        <TableCell className="text-right text-blue-600">{formatCurrency(meseData.affluenteMese || 0)}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {meseData.reinvestimentoUscita ? `-${formatCurrency(meseData.reinvestimentoUscita)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {meseData.reinvestimentoEntrata ? `+${formatCurrency(meseData.reinvestimentoEntrata)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(meseData.cashFlowMensile)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
