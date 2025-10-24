// client/src/components/ui/kpi-card.tsx

import React from "react";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative";
  icon: React.ReactNode;
  bgColor?: string;
  subtitle?: string;
  tooltip?: string;
}

export function KPICard({
  title,
  value,
  change,
  changeType = "positive",
  icon,
  bgColor = "bg-slate-50",
  subtitle,
  tooltip,
}: KPICardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 hover:shadow-md transition-shadow relative group">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 ${bgColor} rounded-lg flex items-center justify-center`}
        >
          {icon}
        </div>

        {change && (
          <span
            className={`text-xs sm:text-sm font-medium px-2 py-1 rounded ${
              changeType === "positive"
                ? "text-green-600 bg-green-50"
                : "text-red-600 bg-red-50"
            }`}
          >
            {changeType === "positive" ? "↑" : "↓"} {change}
          </span>
        )}
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
        {value}
      </h3>

      <p className="text-sm sm:text-base text-slate-600 font-medium">{title}</p>

      {subtitle && (
        <div className="mt-2 sm:mt-3 text-xs text-slate-500">{subtitle}</div>
      )}

      {/* ✅ HOVER TOOLTIP
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          💡 {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
        </div>
      )} */}
    </div>
  );
}