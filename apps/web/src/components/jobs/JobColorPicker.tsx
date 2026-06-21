import { Check } from "lucide-react";
import { JOB_COLOR_PALETTE } from "@/types/database";

export function JobColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {JOB_COLOR_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={`Farbe ${color} auswählen`}
          className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110"
          style={{ backgroundColor: color }}
        >
          {value === color && <Check size={14} className="text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}
