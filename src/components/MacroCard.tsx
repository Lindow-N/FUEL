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
    <div className="bg-slate-900/60 rounded-2xl p-3 flex flex-col gap-1.5 border border-slate-800/50 text-center">
      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-2xl font-bold leading-none" style={{ color }}>
        {value}
        <span className="text-xs text-slate-500 font-normal ml-0.5">{unit}</span>
      </span>
      <span className="text-[10px] text-slate-500">
        / {target}{unit}
      </span>
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
