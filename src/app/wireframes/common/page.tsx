import Link from "next/link";

const commonRobots = [
  { id: "red",    color: "bg-red-500" },
  { id: "blue",   color: "bg-blue-500" },
  { id: "green",  color: "bg-green-500" },
  { id: "yellow", color: "bg-amber-500" },
  { id: "purple", color: "bg-purple-500" },
];

const alerts = [
  { ts: "09.04.2026 15:55", text: "Possible Collision Detected", variant: "critical" },
  { ts: "09.04.2026 12:55", text: "Velocity Alert",              variant: "warning" },
  { ts: "09.04.2026 07:34", text: "Velocity Alert",              variant: "warning" },
];

export default function CommonPage() {
  return (
    <div className="h-full flex flex-col gap-3">
      <TopBar />
      <div className="flex-1 min-h-0 grid grid-rows-[1fr_auto] gap-3">
        <div className="grid grid-cols-12 gap-3 min-h-0">
          <Panel className="col-span-12 lg:col-span-5" title="2D Map">
            <div className="wireframe-block relative flex-1 min-h-0 overflow-hidden">
              <div className="absolute left-[55%] top-[45%] h-12 w-12 wireframe-emphasis-secondary rounded" />
              <div className="absolute left-[20%] top-[65%] h-8 w-16 wireframe-emphasis-secondary rounded rotate-12" />
              <div className="absolute left-[70%] top-[20%] h-10 w-6 wireframe-emphasis-secondary rounded" />
              <RobotDot cls="left-[30%] top-[30%] bg-red-500" />
              <RobotDot cls="left-[60%] top-[25%] bg-blue-500" />
              <RobotDot cls="left-[45%] top-[70%] bg-green-500" />
              <RobotDot cls="left-[15%] top-[40%] bg-purple-500" />
              <RobotDot cls="left-[78%] top-[55%] bg-amber-500" />
            </div>
          </Panel>

          <Panel className="col-span-12 md:col-span-6 lg:col-span-4" title="Pointcloud">
            <div className="wireframe-block relative flex-1 min-h-0 overflow-hidden">
              {pointcloudDots().map((d, i) => (
                <span
                  key={i}
                  className={`absolute h-1.5 w-1.5 rounded-full ${d.color}`}
                  style={{ left: `${d.x}%`, top: `${d.y}%` }}
                />
              ))}
            </div>
          </Panel>

          <Panel className="col-span-12 md:col-span-6 lg:col-span-3" title="Common Controls">
            <div className="flex flex-col gap-1.5">
              {commonRobots.map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${r.color}`} />
                  <input
                    className="h-7 flex-1 min-w-0 rounded-md border border-muted-foreground/20 bg-transparent px-2 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
                    placeholder="Lat"
                  />
                  <input
                    className="h-7 flex-1 min-w-0 rounded-md border border-muted-foreground/20 bg-transparent px-2 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
                    placeholder="Lon"
                  />
                </div>
              ))}
              <button className="mt-1.5 h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:opacity-80 transition-opacity">
                Move all Robots
              </button>
            </div>
          </Panel>
        </div>

        <Panel title="Alert History" className="shrink-0">
          <div className="space-y-1">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-md border px-2.5 py-1 text-xs ${
                  a.variant === "critical"
                    ? "border-red-500/40 bg-red-500/10 text-red-700"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-800"
                }`}
              >
                <span className="font-mono text-[10px] opacity-70 shrink-0">{a.ts}</span>
                <span className="truncate">{a.text}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div className="shrink-0 flex items-center justify-between border-b border-muted-foreground/20 pb-2">
      <div className="flex items-center gap-2">
        <Link href="/wireframes/fleet"><Tab>Fleet Overview</Tab></Link>
        <Tab active>Common</Tab>
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

function Panel({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`wireframe-block p-3 flex flex-col min-h-0 ${className}`}>
      <h3 className="shrink-0 text-[10px] uppercase tracking-widest text-primary mb-2">{title}</h3>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </section>
  );
}

function RobotDot({ cls }: { cls: string }) {
  return <span className={`absolute h-4 w-4 rounded-full ring-2 ring-background shadow ${cls}`} />;
}

function pointcloudDots() {
  const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500"];
  const seeds = [
    17, 23, 41, 59, 67, 71, 83, 97, 103, 109,
    127, 131, 149, 163, 173, 191, 197, 211, 223, 239,
    251, 263, 277, 283, 307, 317, 331, 347, 353, 367,
    379, 389, 401, 419, 433, 449, 463, 479, 491, 509,
    521, 541, 557, 569, 587, 599, 613, 631, 647, 659,
    673, 691, 709, 727, 739, 757, 773, 787, 809, 823,
  ];
  return seeds.map((s, i) => ({
    x: 8 + (s * 37) % 84,
    y: 6 + (s * 53) % 87,
    color: colors[i % colors.length],
  }));
}
