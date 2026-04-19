import Link from "next/link";

const robots = [
  { id: "red",    name: "Robot Red",    nameColor: "text-red-500",    statusLabel: "Online",  statusColor: "bg-green-500",  statusText: "text-green-600",  battery: 87, batteryColor: "bg-green-500" },
  { id: "blue",   name: "Robot Blue",   nameColor: "text-blue-500",   statusLabel: "Online",  statusColor: "bg-green-500",  statusText: "text-green-600",  battery: 62, batteryColor: "bg-green-500" },
  { id: "green",  name: "Robot Green",  nameColor: "text-green-600",  statusLabel: "Idle",    statusColor: "bg-amber-500",  statusText: "text-amber-700",  battery: 45, batteryColor: "bg-amber-500" },
  { id: "yellow", name: "Robot Yellow", nameColor: "text-amber-600",  statusLabel: "Offline", statusColor: "bg-red-500",    statusText: "text-red-700",    battery: 18, batteryColor: "bg-red-500" },
  { id: "purple", name: "Robot Purple", nameColor: "text-purple-500", statusLabel: "Online",  statusColor: "bg-green-500",  statusText: "text-green-600",  battery: 94, batteryColor: "bg-green-500" },
  { id: "pink",   name: "Robot Pink",   nameColor: "text-pink-500",   statusLabel: "Online",  statusColor: "bg-green-500",  statusText: "text-green-600",  battery: 71, batteryColor: "bg-green-500" },
];

export default function FleetPage() {
  return (
    <div className="h-full flex flex-col gap-3">
      <TopBar />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 min-h-0 auto-rows-fr">
        {robots.map((r) => (
          <Link
            key={r.id}
            href="/wireframes/robot"
            className="wireframe-block p-3 flex flex-col min-h-0 hover:border-muted-foreground/40 hover:shadow-sm transition-all"
          >
            <div className="wireframe-block wireframe-x text-muted-foreground/30 flex-1 min-h-0 mb-2 flex items-center justify-center relative">
              <span className="relative z-10 text-[10px] uppercase tracking-widest text-muted-foreground">Camera Feed</span>
            </div>
            <div className={`text-base font-semibold ${r.nameColor}`}>{r.name}</div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className={`inline-block h-2 w-2 rounded-full ${r.statusColor}`} />
              <span className={r.statusText}>{r.statusLabel}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Battery {r.battery}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted-foreground/10 overflow-hidden">
              <div className={`h-full rounded-full ${r.batteryColor}`} style={{ width: `${r.battery}%` }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div className="shrink-0 flex items-center justify-between border-b border-muted-foreground/20 pb-2">
      <div className="flex items-center gap-2">
        <Tab active>Fleet Overview</Tab>
        <Link href="/wireframes/common"><Tab>Common</Tab></Link>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground text-base">
        <button className="w-7 h-7 rounded-md border border-muted-foreground/20 hover:bg-muted-foreground/10 active:bg-muted-foreground/20 transition-colors">+</button>
        <button className="w-7 h-7 rounded-md border border-muted-foreground/20 hover:bg-muted-foreground/10 active:bg-muted-foreground/20 transition-colors">−</button>
      </div>
    </div>
  );
}

function Tab({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
        active
          ? "bg-primary/10 text-primary border border-primary/30"
          : "text-muted-foreground border border-dashed border-muted-foreground/30 hover:text-foreground hover:bg-muted-foreground/5"
      }`}
    >
      {children}
    </span>
  );
}
