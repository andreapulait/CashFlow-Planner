import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PatrimonioChart } from "@/components/charts/PatrimonioChart";
import { FiumiComparisonChart } from "@/components/charts/FiumiComparisonChart";
import { formatMonthOffset } from "@/lib/dateFormat";

const COLORS = ["#10b981", "#3b82f6", "#a855f7", "#f97316", "#ec4899", "#06b6d4", "#84cc16"];

export default function Grafici() {
  const { data: simulazione, isLoading: simulazioneLoading } = trpc.calcoli.simulazioneQuinquennale.useQuery({});
  const { data: fiumi, isLoading: fiumiLoading } = trpc.fiumi.list.useQuery();
  const { data: impostazioni } = trpc.impostazioni.get.useQuery();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M€`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k€`;
    }
    return formatCurrency(value);
  };

  // Prepara dati per grafico evoluzione patrimonio
  const patrimonioData = () => {
    if (!simulazione || !impostazioni) return [];
    
    const data = [];
    for (let mese = 1; mese <= impostazioni.orizzonteTemporale; mese++) {
      let valore = 0;
      let rendita = 0;
      let apporti = 0;
      
      simulazione.forEach(fiume => {
        const meseData = fiume.mesi.find(a => a.mese === mese);
        if (meseData) {
          valore += meseData.valore;
          rendita += meseData.rendita;
          apporti += meseData.affluenteMese || 0;
        }
      });
      
      data.push({ mese, valore, rendita, apporti });
    }
    
    return data;
  };

  // Prepara dati per grafico cash flow mensile
  const cashFlowMensileData = () => {
    if (!simulazione || !impostazioni) return [];
    
    const data = [];
    for (let mese = 1; mese <= impostazioni.orizzonteTemporale; mese++) {
      const entry: any = { mese: `Mese ${mese}` };
      let totale = 0;
      
      simulazione.forEach(fiume => {
        const meseData = fiume.mesi.find(a => a.mese === mese);
        if (meseData) {
          entry[fiume.nome] = meseData.cashFlowMensile;
          totale += meseData.cashFlowMensile;
        }
      });
      
      entry.totale = totale;
      data.push(entry);
    }
    
    return data;
  };

  // Prepara dati per grafico a barre contributo per fiume (ultimo mese)
  const contributoFiumeData = () => {
    if (!simulazione || !impostazioni) return [];
    
    return simulazione.map(fiume => {
      const ultimoMese = fiume.mesi.find(a => a.mese === impostazioni.orizzonteTemporale);
      return {
        nome: fiume.nome,
        cashFlow: ultimoMese?.cashFlowMensile || 0,
      };
    }).sort((a, b) => b.cashFlow - a.cashFlow);
  };

  // Prepara dati per grafico a torta composizione portafoglio (ultimo mese)
  const composizionePortafoglioData = () => {
    if (!simulazione || !impostazioni) return [];
    
    return simulazione.map(fiume => {
      const ultimoMese = fiume.mesi.find(a => a.mese === impostazioni.orizzonteTemporale);
      return {
        nome: fiume.nome,
        valore: ultimoMese?.valore || 0,
      };
    });
  };

  // Prepara dati per confronto performance fiumi
  const confrontoFiumiData = () => {
    if (!simulazione || !fiumi) return [];
    
    return simulazione.map(fiume => {
      const fiumeInfo = fiumi.find(f => f.id === fiume.fiumeId);
      const primoMese = fiume.mesi[0];
      const ultimoMese = fiume.mesi[fiume.mesi.length - 1];
      
      const valoreIniziale = fiumeInfo?.sorgente || 0; // centesimi
      const valoreFinale = Math.round((ultimoMese?.valore || 0) * 100); // euro → centesimi
      const roi = valoreIniziale > 0 ? ((valoreFinale - valoreIniziale) / valoreIniziale) * 100 : 0;
      
      return {
        nome: fiume.nome,
        valoreIniziale,
        valoreFinale,
        rendimento: fiumeInfo?.rendimento || 0,
        roi,
      };
    }).sort((a, b) => b.roi - a.roi);
  };

  if (simulazioneLoading || fiumiLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
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
            <h1 className="text-4xl font-bold text-foreground mb-2">Grafici e Visualizzazioni</h1>
            <p className="text-muted-foreground">
              Analizza visivamente l'evoluzione dei tuoi investimenti
            </p>
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                Nessun dato disponibile. Crea almeno un fiume nella dashboard per visualizzare i grafici.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const composizioneData = composizionePortafoglioData();

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Grafici e Visualizzazioni</h1>
          <p className="text-muted-foreground">
            Analizza visivamente l'evoluzione dei tuoi investimenti nel tempo
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Grafico Evoluzione Patrimonio */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Evoluzione Patrimonio</CardTitle>
              <CardDescription>Crescita del valore del portafoglio, rendita e apporti nel tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <PatrimonioChart 
                data={patrimonioData()} 
                dataInizio={impostazioni?.dataInizio}
              />
            </CardContent>
          </Card>

          {/* Grafico Confronto Performance Fiumi */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Confronto Performance Fiumi</CardTitle>
              <CardDescription>Analisi comparativa ROI e crescita valore per ogni fiume</CardDescription>
            </CardHeader>
            <CardContent>
              <FiumiComparisonChart fiumi={confrontoFiumiData()} />
            </CardContent>
          </Card>

          {/* Grafico a Torta Composizione Portafoglio */}
          <Card>
            <CardHeader>
              <CardTitle>Composizione Portafoglio (Mese {impostazioni?.orizzonteTemporale || 5})</CardTitle>
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
                    label={(entry) => `${entry.nome}: ${((entry.valore / composizioneData.reduce((sum, e) => sum + e.valore, 0)) * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="valore"
                  >
                    {composizioneData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
