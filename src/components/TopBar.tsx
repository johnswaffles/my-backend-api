interface TopBarProps {
  money: number;
  population: number;
  powerUsed: number;
  powerProduced: number;
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="panel-glass rounded-xl px-4 py-2 shadow-glow">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300">{label}</div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

export function TopBar({ money, population, powerUsed, powerProduced }: TopBarProps): JSX.Element {
  const net = powerProduced - powerUsed;
  return (
    <div className="pointer-events-auto absolute left-4 right-4 top-4 z-20 flex items-center justify-between gap-4">
      <div className="panel-glass rounded-2xl px-5 py-3">
        <div className="text-xl font-semibold text-white">Cozy Town Builder</div>
        <div className="text-xs text-slate-300">Vertical Slice: Isometric 2.5D Prototype</div>
      </div>
      <div className="flex gap-2">
        <Stat label="Money" value={`$${money.toLocaleString()}`} />
        <Stat label="Population" value={population.toLocaleString()} />
        <Stat label="Power" value={`${powerUsed}/${powerProduced} (${net >= 0 ? '+' : ''}${net})`} />
      </div>
    </div>
  );
}
