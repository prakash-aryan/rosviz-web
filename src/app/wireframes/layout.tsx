import Link from "next/link";

export default function WireframesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground font-sans overflow-hidden">
      <header className="shrink-0 border-b border-muted-foreground/20 px-5 py-2 flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
          rosviz · wireframes
        </span>
        <nav className="flex gap-5 text-sm text-muted-foreground">
          <Link href="/wireframes/fleet" className="hover:text-foreground">Fleet</Link>
          <Link href="/wireframes/common" className="hover:text-foreground">Common</Link>
          <Link href="/wireframes/robot" className="hover:text-foreground">Robot</Link>
          <Link href="/wireframes/sensor" className="hover:text-foreground">Sensor</Link>
        </nav>
      </header>
      <main className="flex-1 min-h-0 p-4 overflow-hidden">{children}</main>
    </div>
  );
}
