import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
}

export function ProgressBar({ current, target, label }: ProgressBarProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  
  const getProgressColor = (pct: number) => {
    if (pct >= 100) return "bg-green-500";
    if (pct >= 75) return "bg-blue-500";
    if (pct >= 50) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{percentage.toFixed(1)}%</span>
        </div>
      )}
      <div className="relative">
        <Progress value={percentage} className="h-3" />
        <div 
          className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
