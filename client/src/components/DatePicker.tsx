import { useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ── DatePicker (giorno/mese/anno) ─────────────────────────────────────────────

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleziona data",
  disabled = false,
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "MMMM yyyy", { locale: it }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => { onChange(date); setOpen(false); }}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          initialFocus
          locale={it}
        />
      </PopoverContent>
    </Popover>
  );
}

// ── MonthYearPicker (solo mese e anno) ────────────────────────────────────────

const MESI = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

interface MonthYearPickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function MonthYearPicker({
  value,
  onChange,
  placeholder = "Seleziona mese",
  disabled = false,
  className,
  minDate,
  maxDate,
}: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => value?.getFullYear() ?? new Date().getFullYear());

  const handleSelect = (month: number) => {
    const date = new Date(year, month, 1);
    onChange(date);
    setOpen(false);
  };

  const isDisabled = (month: number) => {
    const date = new Date(year, month, 1);
    if (minDate) {
      const min = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      if (date < min) return true;
    }
    if (maxDate) {
      const max = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
      if (date > max) return true;
    }
    return false;
  };

  const isSelected = (month: number) =>
    value && value.getFullYear() === year && value.getMonth() === month;

  return (
    <Popover open={open} onOpenChange={(v) => {
      if (v && value) setYear(value.getFullYear());
      setOpen(v);
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "MMMM yyyy", { locale: it }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        {/* Navigazione anno */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setYear(y => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">{year}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setYear(y => y + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Griglia mesi */}
        <div className="grid grid-cols-3 gap-1">
          {MESI.map((nome, idx) => (
            <Button
              key={idx}
              variant={isSelected(idx) ? "default" : "ghost"}
              size="sm"
              className="h-8 text-xs"
              disabled={isDisabled(idx)}
              onClick={() => handleSelect(idx)}
            >
              {nome}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
