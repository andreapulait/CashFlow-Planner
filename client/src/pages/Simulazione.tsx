import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar, DateFilter } from "@/components/FilterBar";
import { formatMonthOffset } from "@/lib/dateFormat";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, ChevronDown, ChevronRight } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

/** Ritorna l'anno solare di un offset-mese dato il dataInizio del piano */
function meseToAnno(mese: number, dataInizio: Date): number {
  const d = new Date(dataInizio);
  d.setMonth(d.getMonth() + mese);
  return d.getFullYear();
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function Simulazione() {
  const [filter, setFilter] = useState<DateFilter>({ type: "all" });
  // Stato expand riepilogo (chiave = anno)
  const [anniEspansi, setAnniEspansi] = useState<Set<number>>(new Set());
  // Stato expand per-fiume (chiave = `${fiumeId}-${anno}`)
  const [anniFiumeEspansi, setAnniFiumeEspansi] = useState<Set<string>>(new Set());

  const toggleAnnoFiume = (fiumeId: number, anno: number) => {
    const key = `${fiumeId}-${anno}`;
    setAnniFiumeEspansi(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const { data: simulazione, isLoading } = trpc.calcoli.simulazioneQuinquennale.useQuery({});
  const { data: impostazioni } = trpc.impostazioni.get.useQuery();

  const toggleAnno = (anno: number) => {
    setAnniEspansi(prev => {
      const next = new Set(prev);
      next.has(anno) ? next.delete(anno) : next.add(anno);
      return next;
    });
  };

  const getMesi = () => {
    if (!impostazioni) return [];
    const allMesi = Array.from({ length: impostazioni.orizzonteTemporale }, (_, i) => i + 1);
    if (filter.type === "all") return allMesi;
    const now = new Date();
    const dataInizio = impostazioni.dataInizio ? new Date(impostazioni.dataInizio) : now;
    if (filter.type === "next12") return allMesi.filter(m => m <= 12);
    if (filter.type === "currentYear") {
      const currentYear = now.getFullYear();
      return allMesi.filter(m => {
        const d = new Date(dataInizio);
        d.setMonth(d.getMonth() + m);
        return d.getFullYear() === currentYear;
      });
    }
    if (filter.type === "custom" && filter.startDate && filter.endDate) {
      return allMesi.filter(m => {
        const d = new Date(dataInizio);
        d.setMonth(d.getMonth() + m);
        return d >= filter.startDate! && d <= filter.endDate!;
      });
    }
    return allMesi;
  };

  const calcolaTotaliMese = (mese: number) => {
    if (!simulazione) return { valore: 0, rendita: 0, cashFlow: 0, affluenti: 0 };
    let valore = 0, rendita = 0, cashFlow = 0, affluenti = 0;
    simulazione.forEach(fiume => {
      const d = fiume.mesi.find(a => a.mese === mese);
      if (d) {
        valore    += d.valore;
        rendita   += d.rendita;
        cashFlow  += d.cashFlowMensile;
        affluenti += d.affluenteMese || 0;
      }
    });
    return { valore, rendita, cashFlow, affluenti };
  };

  /** Raggruppa i mesi filtrati per anno solare */
  const getMesiPerAnno = (): Array<{ anno: number; mesi: number[] }> => {
    if (!impostazioni?.dataInizio) return [];
    const dataInizio = new Date(impostazioni.dataInizio);
    const mesi = getMesi();
    const map = new Map<number, number[]>();
    mesi.forEach(m => {
      const anno = meseToAnno(m, dataInizio);
      if (!map.has(anno)) map.set(anno, []);
      map.get(anno)!.push(m);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([anno, mesi]) => ({ anno, mesi }));
  };

  /** Aggrega i totali di un gruppo di mesi per la riga-anno */
  const calcolaTotaliAnno = (mesi: number[]) => {
    let renditaTot = 0, cashFlowTot = 0, affluentTot = 0, valoreFinale = 0;
    mesi.forEach(m => {
      const t = calcolaTotaliMese(m);
      renditaTot   += t.rendita;
      cashFlowTot  += t.cashFlow;
      affluentTot  += t.affluenti;
      valoreFinale  = t.valore; // ultimo mese dell'anno
    });
    return { rendita: renditaTot, cashFlow: cashFlowTot, affluenti: affluentTot, valore: valoreFinale };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <Card><CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
            <CardContent><Skeleton className="h-64 w-full" /></CardContent>
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
              Visualizza l'evoluzione dei tuoi investimenti nei prossimi {impostazioni?.orizzonteTemporale || 60} mesi con interesse composto
            </p>
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                Nessun fiume disponibile. Crea almeno un fiume nella dashboard per vedere i risultati.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const mesiPerAnno = getMesiPerAnno();

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Simulazione Temporale</h1>
            <p className="text-muted-foreground">
              Evoluzione del portafoglio nei prossimi {impostazioni?.orizzonteTemporale || 60} mesi con interesse composto
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2"
              onClick={() => {
                if (!simulazione) return;
                exportToPDF(simulazione.map(f => ({ fiume: f.nome, mesi: f.mesi })), {
                  title: "Simulazione Temporale",
                  dataInizio: impostazioni?.dataInizio,
                  filteredMesi: getMesi(),
                });
              }}
            >
              <FileDown className="h-4 w-4" /> Esporta PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-2"
              onClick={() => {
                if (!simulazione) return;
                exportToExcel(simulazione.map(f => ({ fiume: f.nome, mesi: f.mesi })), {
                  title: "Simulazione Temporale",
                  dataInizio: impostazioni?.dataInizio,
                  filteredMesi: getMesi(),
                });
              }}
            >
              <FileSpreadsheet className="h-4 w-4" /> Esporta Excel
            </Button>
          </div>
        </div>

        {/* Filtri */}
        <FilterBar onFilterChange={setFilter} currentFilter={filter} />

        {/* Tabella riepilogo con raggruppamento per anno */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Riepilogo per Anno</CardTitle>
            <CardDescription>
              Clicca su un anno per espandere i mesi · Somma di tutti i fiumi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Periodo</TableHead>
                  <TableHead className="text-right">Valore Totale</TableHead>
                  <TableHead className="text-right">Apporti</TableHead>
                  <TableHead className="text-right">Cash Flow</TableHead>
                  <TableHead className="text-right text-muted-foreground">Prelevabile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mesiPerAnno.map(({ anno, mesi: mesiAnno }) => {
                  const totAnno = calcolaTotaliAnno(mesiAnno);
                  const espanso = anniEspansi.has(anno);
                  return (
                    <>
                      {/* Riga Anno */}
                      <TableRow
                        key={`anno-${anno}`}
                        className="cursor-pointer bg-muted/40 hover:bg-muted/70 font-medium"
                        onClick={() => toggleAnno(anno)}
                      >
                        <TableCell className="flex items-center gap-2 py-3">
                          {espanso
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          }
                          <span className="font-semibold">{anno}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            ({mesiAnno.length} {mesiAnno.length === 1 ? "mese" : "mesi"})
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(totAnno.valore)}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {totAnno.affluenti > 0 ? formatCurrency(totAnno.affluenti) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(totAnno.rendita)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {totAnno.cashFlow > 0 ? formatCurrency(totAnno.cashFlow) : <span>—</span>}
                        </TableCell>
                      </TableRow>

                      {/* Righe mesi (espandibili) */}
                      {espanso && mesiAnno.map(mese => {
                        const t = calcolaTotaliMese(mese);
                        return (
                          <TableRow key={mese} className="bg-background hover:bg-muted/20">
                            <TableCell className="pl-10 text-sm text-muted-foreground">
                              {formatMonthOffset(mese, impostazioni?.dataInizio)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(t.valore)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-blue-600">
                              {t.affluenti > 0 ? formatCurrency(t.affluenti) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold text-primary">
                              {formatCurrency(t.rendita)}
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {t.cashFlow > 0 ? formatCurrency(t.cashFlow) : <span>—</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tabelle dettagliate per fiume */}
        <div className="space-y-6">
          {simulazione.map(fiume => {
            // Raggruppa i mesi filtrati per anno per questo fiume
            const mesiPerAnnoFiume = mesiPerAnno.map(({ anno, mesi: mesiAnno }) => {
              const mesiConDati = mesiAnno.filter(m => fiume.mesi.some(x => x.mese === m));
              return { anno, mesi: mesiConDati };
            }).filter(g => g.mesi.length > 0);

            return (
              <Card key={fiume.fiumeId}>
                <CardHeader>
                  <CardTitle>{fiume.nome}</CardTitle>
                  <CardDescription>
                    Capitale sorgente: {formatCurrency(fiume.sorgente)} · Rendimento: {fiume.rendimento.toFixed(2)}%
                    {" · "}Clicca su un anno per espandere i mesi
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">Periodo</TableHead>
                        <TableHead className="text-right">Valore</TableHead>
                        <TableHead className="text-right">Apporti</TableHead>
                        <TableHead className="text-right">Reinv. Uscita</TableHead>
                        <TableHead className="text-right">Reinv. Entrata</TableHead>
                        <TableHead className="text-right">Cash Flow</TableHead>
                        <TableHead className="text-right text-muted-foreground">Prelevabile</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mesiPerAnnoFiume.map(({ anno, mesi: mesiAnno }) => {
                        const key = `${fiume.fiumeId}-${anno}`;
                        const espanso = anniFiumeEspansi.has(key);

                        // Aggregati anno per questo fiume
                        let valoreAnno = 0, apportiAnno = 0, reinvUscitaAnno = 0;
                        let reinvEntrataAnno = 0, cashFlowAnno = 0, prelevabileAnno = 0;
                        mesiAnno.forEach(m => {
                          const d = fiume.mesi.find(x => x.mese === m);
                          if (!d) return;
                          valoreAnno       = d.valore; // ultimo mese = valore finale
                          apportiAnno     += d.affluenteMese || 0;
                          reinvUscitaAnno += d.reinvestimentoUscita || 0;
                          reinvEntrataAnno += d.reinvestimentoEntrata || 0;
                          cashFlowAnno    += d.rendita;
                          prelevabileAnno += d.cashFlowMensile || 0;
                        });

                        return (
                          <>
                            {/* Riga anno */}
                            <TableRow
                              key={`anno-${key}`}
                              className="cursor-pointer bg-muted/40 hover:bg-muted/70"
                              onClick={() => toggleAnnoFiume(fiume.fiumeId, anno)}
                            >
                              <TableCell className="flex items-center gap-2 py-3">
                                {espanso
                                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                }
                                <span className="font-semibold">{anno}</span>
                                <span className="text-xs text-muted-foreground font-normal">
                                  ({mesiAnno.length} {mesiAnno.length === 1 ? "mese" : "mesi"})
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(valoreAnno)}
                              </TableCell>
                              <TableCell className="text-right text-blue-600">
                                {apportiAnno > 0 ? formatCurrency(apportiAnno) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {reinvUscitaAnno > 0 ? `-${formatCurrency(reinvUscitaAnno)}` : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="text-right text-green-600">
                                {reinvEntrataAnno > 0 ? `+${formatCurrency(reinvEntrataAnno)}` : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-primary">
                                {formatCurrency(cashFlowAnno)}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {prelevabileAnno > 0 ? formatCurrency(prelevabileAnno) : <span>—</span>}
                              </TableCell>
                            </TableRow>

                            {/* Righe mesi */}
                            {espanso && mesiAnno.map(m => {
                              const d = fiume.mesi.find(x => x.mese === m);
                              if (!d) return null;
                              return (
                                <TableRow key={m} className="bg-background hover:bg-muted/20">
                                  <TableCell className="pl-10 text-sm text-muted-foreground">
                                    {formatMonthOffset(m, impostazioni?.dataInizio)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">{formatCurrency(d.valore)}</TableCell>
                                  <TableCell className="text-right text-sm text-blue-600">
                                    {(d.affluenteMese || 0) > 0 ? formatCurrency(d.affluenteMese || 0) : "—"}
                                  </TableCell>
                                  <TableCell className="text-right text-sm text-red-600">
                                    {d.reinvestimentoUscita ? `-${formatCurrency(d.reinvestimentoUscita)}` : "—"}
                                  </TableCell>
                                  <TableCell className="text-right text-sm text-green-600">
                                    {d.reinvestimentoEntrata ? `+${formatCurrency(d.reinvestimentoEntrata)}` : "—"}
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-semibold text-primary">
                                    {formatCurrency(d.rendita)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm text-muted-foreground">
                                    {d.cashFlowMensile > 0 ? formatCurrency(d.cashFlowMensile) : "—"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
