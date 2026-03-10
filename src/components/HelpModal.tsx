interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function HelpModal({ open, onClose }: HelpModalProps): JSX.Element | null {
  if (!open) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="panel-glass max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-cyan-300/25 p-6 shadow-glow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">How To Play</h2>
            <p className="mt-1 text-sm text-slate-300">Build a cozy city, wire up infrastructure, and let connected districts evolve into landmark structures.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300/40 bg-slate-800/45 px-3 py-2 text-sm font-medium text-slate-100"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-300/20 bg-slate-950/35 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Core Loop</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>Place roads, rail lines, power lines, homes, commerce, services, parks, workshops, and utilities.</li>
              <li>Watch money, happiness, power, jobs, and service demand in the top HUD.</li>
              <li>Buildings only go live once they are connected to transport and power.</li>
              <li>Grouped buildings merge into larger structures and can be upgraded through ten tiers.</li>
              <li>High appeal, city hall influence, stations, and surrounding services accelerate growth.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-300/20 bg-slate-950/35 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Controls</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>Mouse: left click places or selects. Right click or <code>Esc</code> cancels placement.</li>
              <li>Wheel zooms. Drag pans. On touch devices: one-finger drag pans, pinch zooms, tap places.</li>
              <li><code>1-7</code> selects common build tools quickly.</li>
              <li><code>Delete</code> or <code>Backspace</code> bulldozes the selected building.</li>
              <li><code>Ctrl/Cmd+Z</code> undo, <code>Ctrl/Cmd+Y</code> redo.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-300/20 bg-slate-950/35 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Building Rules</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>Buildings can be placed anywhere, but they stay offline until connected.</li>
              <li>Roads or rail lines must touch a building cluster to activate transport access.</li>
              <li>Power plants need transport access, then power lines, substations, and adjacent live buildings can carry electricity outward.</li>
              <li>Train stations count as transport hubs and boost nearby districts.</li>
              <li>City hall boosts appeal, happiness, and growth in the connected core.</li>
              <li>Workshops and power plants still dislike sensitive neighbors such as homes, parks, groceries, and hospitals.</li>
              <li>Hospitals and power plants use larger footprints and become much stronger when clustered.</li>
              <li>Four or more matching buildings often merge into one larger campus, block, or complex.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-300/20 bg-slate-950/35 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Cluster Logic</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>Homes can become apartment blocks and towers.</li>
              <li>Shops and restaurants can become strips, downtown blocks, and mixed-use districts.</li>
              <li>Parks can become plazas, greenways, and civic destinations.</li>
              <li>Hospitals, police, fire, workshops, and power plants become full campuses and industrial mega-districts.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-300/20 bg-slate-950/35 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Upgrades</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li>Select a building and upgrade it manually from the inspect panel.</li>
              <li>Entire connected same-type clusters upgrade together.</li>
              <li>Tier 1-2 are neighborhood scale, Tier 3-5 are district scale, and Tier 6-10 become skyline and mega-district scale.</li>
              <li>Higher tiers bring more housing, jobs, services, power, revenue, and visual detail.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-300/20 bg-slate-950/35 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">HUD Meaning</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li><strong>Growth</strong>: demand for homes, stores, and jobs.</li>
              <li><strong>Services</strong>: demand for food, health, and safety coverage.</li>
              <li><strong>Town Needs</strong>: leisure, transport, and power pressure.</li>
              <li>Higher numbers usually mean the city wants more of that category.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-300/20 bg-slate-950/35 p-4 md:col-span-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Useful Buttons</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              <li><strong>Starter Town</strong>: seeds a small playable town on an empty map. This is the new major upgrade in this pass.</li>
              <li><strong>Restart Map</strong>: resets the simulation instantly without leaving fullscreen.</li>
              <li><strong>AI Auto</strong>: lets the local planner keep building for you.</li>
              <li><strong>Fullscreen</strong>: expands the play area. Restart and Help both work while fullscreen is active.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
