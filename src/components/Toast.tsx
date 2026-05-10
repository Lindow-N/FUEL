"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}

export function Toast({ message, type = "success", onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const Icon = type === "success" ? CheckCircle : AlertTriangle;
  const color = type === "success" ? "text-emerald-500" : "text-red-400";
  const bg = type === "success" ? "border-emerald-500/20" : "border-red-500/20";

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/95 backdrop-blur-md border ${bg} shadow-lg transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      <Icon size={16} className={color} />
      <span className="text-sm text-white font-medium">{message}</span>
    </div>
  );
}
