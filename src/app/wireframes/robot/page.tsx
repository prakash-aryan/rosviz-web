import Link from "next/link";

export default function RobotDashboardPage() {
  return (
    <div className="h-full flex flex-col gap-3">
      <TopBar />
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col gap-3 min-h-0">
          <Panel title="Camera Views" className="flex-[3]">
            <div className="grid grid-cols-3 grid-rows-2 gap-2 flex-1 min-h-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="wireframe-block wireframe-x text-muted-foreground/30 flex items-center justify-center relative"
                >
                  <span className="relative z-10 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Cam {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Telemetry Data" className="flex-[1]">
            <div className="grid grid-cols-6 gap-2 flex-1 min-h-0">
              {["Position X", "Position Y", "Heading", "Linear Vel", "Angular Vel", "IMU"].map((label) => (
                <div key={label} className="wireframe-block p-2 flex flex-col justify-between min-h-0">
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
                  <div className="space-y-1">
                    <div className="h-1.5 w-2/3 rounded-full wireframe-emphasis-primary" />
                    <div className="h-1.5 w-1/2 rounded-full wireframe-emphasis-tertiary" />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-4 xl:col-span-3 min-h-0">
          <Panel title="Robot Controls" className="h-full">
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              <div>
                <div className="flex items-center justify-between mb-1.5 text-[10px] text-muted-foreground">
                  <span className="uppercase tracking-widest">Speed</span>
                  <span className="font-mono text-xs text-foreground">0.50 m/s</span>
                </div>
                <div className="relative h-1.5 rounded-full wireframe-emphasis-tertiary">
                  <div className="absolute left-0 top-0 h-full w-1/2 rounded-full bg-primary" />
                  <div className="absolute left-[50%] top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-primary ring-2 ring-background shadow" />
                </div>
              </div>

              <div className="flex justify-center">
                <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
                  <div />
                  <DpadBtn label="Up">↑</DpadBtn>
                  <div />
                  <DpadBtn label="Left">←</DpadBtn>
                  <DpadBtn emphasis label="Stop">■</DpadBtn>
                  <DpadBtn label="Right">→</DpadBtn>
                  <div />
                  <DpadBtn label="Down">↓</DpadBtn>
                  <div />
                </div>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">Waypoints</div>
                <div className="space-y-1">
                  {["Charging station", "Lab entrance"].map((w) => (
                    <button
                      key={w}
                      className="w-full flex items-center justify-between wireframe-block px-2.5 py-1.5 text-xs hover:border-muted-foreground/40 transition-colors"
                    >
                      <span className="text-muted-foreground">{w}</span>
                      <span className="text-muted-foreground/60">▶</span>
                    </button>
                  ))}
                  <button className="w-full text-left text-xs text-muted-foreground px-2.5 py-1.5 rounded-md border border-dashed border-muted-foreground/30 hover:text-foreground hover:bg-muted-foreground/5 transition-colors">
                    + Add waypoint
                  </button>
                </div>
              </div>

              <button className="mt-auto w-full h-10 rounded-md bg-red-500 text-white text-sm font-semibold uppercase tracking-widest hover:bg-red-600 active:bg-red-700 transition-colors shadow">
                Emergency Stop
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div className="shrink-0 flex items-center justify-between border-b border-muted-foreground/20 pb-2">
      <div className="flex items-center gap-2">
        <Tab active>Dashboard</Tab>
        <Link href="/wireframes/sensor"><Tab>Sensor Data</Tab></Link>
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

function Panel({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`wireframe-block p-3 flex flex-col min-h-0 ${className}`}>
      <h3 className="shrink-0 text-[10px] uppercase tracking-widest text-primary mb-2">{title}</h3>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </section>
  );
}

function DpadBtn({ children, emphasis = false, label }: { children: React.ReactNode; emphasis?: boolean; label: string }) {
  return (
    <button
      aria-label={label}
      className={`h-9 w-9 rounded-md border border-muted-foreground/20 flex items-center justify-center text-base hover:bg-muted-foreground/10 active:bg-muted-foreground/20 transition-colors ${
        emphasis ? "wireframe-emphasis-secondary" : ""
      }`}
    >
      {children}
    </button>
  );
}
