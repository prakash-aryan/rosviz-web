import Link from "next/link";

export default function SensorDataPage() {
  return (
    <div className="h-full flex flex-col gap-3">
      <TopBar />
      <div className="flex-1 min-h-0 grid grid-rows-2 grid-cols-12 gap-3">
        <Panel className="col-span-12 md:col-span-6 lg:col-span-4 row-start-1" title="Robot Model">
          <Placeholder label="3D URDF View" />
        </Panel>
        <Panel className="col-span-12 md:col-span-6 lg:col-span-4 row-start-1" title="Video Feed">
          <Placeholder label="RGB Stream" />
        </Panel>
        <Panel className="col-span-12 md:col-span-12 lg:col-span-4 row-start-1" title="Pointcloud">
          <Placeholder label="Depth Points" />
        </Panel>

        <Panel className="col-span-12 md:col-span-6 lg:col-span-4 row-start-2" title="Depth Data">
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <div className="wireframe-block p-2 shrink-0">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Min / Max / Mean</div>
              <div className="flex gap-4 font-mono text-sm">
                <span>0.12</span>
                <span>3.42</span>
                <span>1.87</span>
              </div>
            </div>
            <div className="wireframe-block flex-1 min-h-0 p-2 flex items-end gap-[2px]">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 wireframe-emphasis-primary rounded-sm"
                  style={{ height: `${20 + (i * 7 + 13) % 70}%` }}
                />
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="col-span-12 md:col-span-6 lg:col-span-4 row-start-2">
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-2 mb-1 shrink-0">
                <h3 className="text-[10px] uppercase tracking-widest text-primary">Trajectory History</h3>
                <span className="text-amber-500 text-sm leading-none">?</span>
              </div>
              <div className="wireframe-block flex-1 min-h-0 flex items-center justify-center text-[9px] uppercase tracking-widest text-muted-foreground/60">
                (tbd) path plot
              </div>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-2 mb-1 shrink-0">
                <h3 className="text-[10px] uppercase tracking-widest text-primary">Velocity Gauge</h3>
                <span className="text-amber-500 text-sm leading-none">?</span>
              </div>
              <div className="wireframe-block flex-1 min-h-0 flex items-center justify-center text-[9px] uppercase tracking-widest text-muted-foreground/60">
                (tbd) gauge
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="col-span-12 md:col-span-12 lg:col-span-4 row-start-2" title="Battery Statistics">
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <div className="flex items-center justify-between wireframe-block px-3 py-2 shrink-0">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Voltage</span>
              <span className="font-mono text-base text-green-600">12.4 V</span>
            </div>
            <div className="wireframe-block flex-1 min-h-0 p-2 relative overflow-hidden">
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full text-green-600">
                <path
                  d="M 0 30 Q 10 28 20 26 T 40 22 T 60 20 T 80 17 T 100 15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="absolute bottom-1.5 left-2 font-mono text-[9px] text-muted-foreground">last 24h</div>
            </div>
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
        <Link href="/wireframes/robot"><Tab>Dashboard</Tab></Link>
        <Tab active>Sensor Data</Tab>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-red-500">Robot Red</span>
        <div className="flex items-center gap-1 text-muted-foreground text-base">
          <button className="w-7 h-7 rounded-md border border-muted-foreground/20 hover:bg-muted-foreground/10 active:bg-muted-foreground/20 transition-colors">+</button>
          <button className="w-7 h-7 rounded-md border border-muted-foreground/20 hover:bg-muted-foreground/10 active:bg-muted-foreground/20 transition-colors">−</button>
        </div>
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

function Panel({
  title,
  className = "",
  children,
}: {
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`wireframe-block p-3 flex flex-col min-h-0 ${className}`}>
      {title ? <h3 className="shrink-0 text-[10px] uppercase tracking-widest text-primary mb-2">{title}</h3> : null}
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </section>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="wireframe-block wireframe-x text-muted-foreground/30 flex-1 min-h-0 flex items-center justify-center relative">
      <span className="relative z-10 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}
