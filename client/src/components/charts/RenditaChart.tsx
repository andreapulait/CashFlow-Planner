import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatMonthOffset } from "@/lib/dateFormat";

interface RenditaChartProps {
  data: Array<{
    mese: number;
    rendita: number;
  }>;
  dataInizio?: Date | string | null;
  title?: string;
}

export function RenditaChart({ data, dataInizio, title = "Evoluzione Rendita Mensile" }: RenditaChartProps) {
  // Transform data for chart
  const chartData = data.map(item => ({
    mese: item.mese,
    periodo: dataInizio ? formatMonthOffset(item.mese, dataInizio) : `Mese ${item.mese}`,
    rendita: item.rendita / 100, // Convert from cents to euros
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-4">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            Rendita Mensile: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="periodo"
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="rendita"
            stroke="#10b981"
            strokeWidth={2}
            name="Rendita Mensile"
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
