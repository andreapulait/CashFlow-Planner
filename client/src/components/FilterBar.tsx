import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Filter, X } from "lucide-react";
import { MonthYearPicker } from "@/components/DatePicker";

export interface DateFilter {
  type: "all" | "next12" | "currentYear" | "custom";
  startDate?: Date;
  endDate?: Date;
}

interface FilterBarProps {
  onFilterChange: (filter: DateFilter) => void;
  currentFilter: DateFilter;
}

export function FilterBar({ onFilterChange, currentFilter }: FilterBarProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  const presets = [
    { type: "all" as const, label: "Tutti i Mesi", icon: Filter },
    { type: "next12" as const, label: "Prossimi 12 Mesi", icon: Calendar },
    { type: "currentYear" as const, label: "Anno Corrente", icon: Calendar },
  ];

  const handlePresetClick = (type: DateFilter["type"]) => {
    if (type === "custom") {
      setShowCustom(true);
      return;
    }

    setShowCustom(false);
    onFilterChange({ type });
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onFilterChange({
        type: "custom",
        startDate: customStart,
        endDate: customEnd,
      });
      setShowCustom(false);
    }
  };

  const handleClearCustom = () => {
    setCustomStart(undefined);
    setCustomEnd(undefined);
    setShowCustom(false);
    onFilterChange({ type: "all" });
  };

  return (
    <Card className="p-4 mb-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground mr-2">
            Filtro Periodo:
          </span>
          {presets.map((preset) => (
            <Button
              key={preset.type}
              variant={currentFilter.type === preset.type ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(preset.type)}
              className="gap-2"
            >
              <preset.icon className="h-4 w-4" />
              {preset.label}
            </Button>
          ))}
          <Button
            variant={currentFilter.type === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetClick("custom")}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Personalizzato
          </Button>
        </div>

        {showCustom && (
          <div className="flex items-end gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Data Inizio</label>
              <MonthYearPicker
                value={customStart}
                onChange={setCustomStart}
                placeholder="Seleziona mese inizio"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Data Fine</label>
              <MonthYearPicker
                value={customEnd}
                onChange={setCustomEnd}
                placeholder="Seleziona mese fine"
                minDate={customStart}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
                size="sm"
              >
                Applica
              </Button>
              <Button
                onClick={handleClearCustom}
                variant="outline"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {currentFilter.type === "custom" && currentFilter.startDate && currentFilter.endDate && (
          <div className="text-sm text-muted-foreground">
            Periodo: {currentFilter.startDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" })} - {currentFilter.endDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
          </div>
        )}
      </div>
    </Card>
  );
}
