interface KPICardProps {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
  icon: React.ReactNode;
  bgColor: string;
  subtitle: string;
}

export function KPICard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon, 
  bgColor, 
  subtitle 
}: KPICardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${bgColor} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <span className={`text-xs sm:text-sm font-medium ${
          changeType === "positive" ? "text-green-600" : "text-red-600"
        }`}>
          {change}
        </span>
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-slate-900">{value}</h3>
      <p className="text-sm sm:text-base text-slate-600">{title}</p>
      <div className="mt-2 sm:mt-3 text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}
