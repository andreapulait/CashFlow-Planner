import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer } from "recharts";

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
  const chartData = fiumi.map(fiume => ({
    nome: fiume.nome.length > 15 ? fiume.nome.substring(0, 15) + "..." : fiume.nome,
    nomeFull: fiume.nome,
    "Valore Finale": fiume.valoreFinale / 100,
    valoreIniziale: fiume.valoreIniziale / 100,
    roi: fiume.roi,
    rendimento: fiume.rendimento,
  }));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency", currency: "EUR",
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-4">
        <p className="font-semibold text-foreground mb-2">{d?.nomeFull || label}</p>
        <p className="text-sm text-muted-foreground">
          Capitale iniziale: {formatCurrency(d?.valoreIniziale || 0)}
        </p>
        <p className="text-sm text-muted-foreground">
          Valore finale: {formatCurrency(payload[0]?.value || 0)}
        </p>
        <p className="text-sm text-primary font-semibold mt-2">
          ROI: {d?.roi?.toFixed(1)}%
        </p>
        <p className="text-sm text-muted-foreground">
          Rendimento annuo: {(d?.rendimento / 100)?.toFixed(2)}%
        </p>
      </div>
    );
  };

  const RoiLabel = ({ x, y, width, value }: any) => {
    if (value === undefined || value === null) return null;
    return (
      <text
        x={x + width / 2}
        y={y - 6}
        fill="hsl(var(--muted-foreground))"
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
      >
        ROI {value?.toFixed(0)}%
      </text>
    );
  };

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 30, right: 30, left: 20, bottom: 60 }}
          barCategoryGap="40%"
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
          <Bar dataKey="Valore Finale" fill="#10b981" radius={[6, 6, 0, 0]} name="Valore Finale">
            <LabelList dataKey="roi" content={<RoiLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
