import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface FiumeData {
  nome: string;
  valoreIniziale: number;
  valoreFinale: number;
  rendimento: number;
  roi: number;
}

interface FiumiComparisonChartProps {
  fiumi: FiumeData[];
  title?: string;
}

export function FiumiComparisonChart({ fiumi, title = "Confronto Performance Fiumi" }: FiumiComparisonChartProps) {
  // Transform data for chart
  const chartData = fiumi.map(fiume => ({
    nome: fiume.nome.length > 15 ? fiume.nome.substring(0, 15) + "..." : fiume.nome,
    "Valore Iniziale": fiume.valoreIniziale / 100,
    "Valore Finale": fiume.valoreFinale / 100,
    "ROI %": fiume.roi,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const fiume = fiumi.find(f => 
        f.nome === label || f.nome.startsWith(label.replace("...", ""))
      );
      
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-4">
          <p className="font-semibold text-foreground mb-2">{fiume?.nome || label}</p>
          <p className="text-sm text-muted-foreground">
            Valore Finale: {formatCurrency(payload[0]?.value || 0)}
          </p>
          <p className="text-sm text-muted-foreground">
            Valore Iniziale: {formatCurrency(payload[1]?.value || 0)}
          </p>
          {fiume && (
            <>
              <p className="text-sm text-primary font-semibold mt-2">
                ROI: {formatPercent(fiume.roi)}
              </p>
              <p className="text-sm text-muted-foreground">
                Rendimento: {(fiume.rendimento / 100).toFixed(2)}%
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          barGap={4}
          barCategoryGap="15%"
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="nome"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "10px" }}
          />
          <Bar
            dataKey="Valore Finale"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            name="Valore Finale"
          />
          <Bar
            dataKey="Valore Iniziale"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            name="Valore Iniziale"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
