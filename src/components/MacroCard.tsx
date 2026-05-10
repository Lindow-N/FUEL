"use client";

interface MacroCardProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}

export function MacroCard({ label, value, target, unit, color }: MacroCardProps) {
  const percent = Math.min((value / target) * 100, 100);

  return (
    <div className="bg-slate-900/60 rounded-2xl p-4 flex flex-col gap-2 border border-slate-800/50">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-xs text-slate-500">
          {value}{unit} / {target}{unit}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold" style={{ color }}>
          {value}
        </span>
        <span className="text-sm text-slate-500 mb-0.5">{unit}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
