import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, className }: KPICardProps) {
  const trendColor = trend && trend.value > 0 ? "text-green-600" : trend && trend.value < 0 ? "text-red-600" : "text-muted-foreground";
  const trendIcon = trend && trend.value > 0 ? "↑" : trend && trend.value < 0 ? "↓" : "";

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
        {trend && (
          <p className={cn("text-xs mt-2 flex items-center gap-1", trendColor)}>
            <span className="font-semibold">{trendIcon} {Math.abs(trend.value).toFixed(1)}%</span>
            <span className="text-muted-foreground">{trend.label}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
