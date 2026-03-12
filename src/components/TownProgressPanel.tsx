import { milestoneSummary, toggleCityPolicy } from '../game/actions';
import type { GameState } from '../game/state';

interface TownProgressPanelProps {
  state: GameState;
}

function countByType(state: GameState, type: 'road' | 'house' | 'powerPlant'): number {
  return state.buildings.filter((b) => b.type === type).length;
}

function countBusinesses(state: GameState): number {
  return state.buildings.filter(
    (b) =>
      b.type === 'shop' ||
      b.type === 'restaurant' ||
      b.type === 'groceryStore' ||
      b.type === 'cornerStore' ||
      b.type === 'bank'
  ).length;
}

export function TownProgressPanel({ state }: TownProgressPanelProps): JSX.Element {
  const roads = countByType(state, 'road');
  const houses = countByType(state, 'house');
  const plants = countByType(state, 'powerPlant');
  const businesses = countBusinesses(state);
  const milestones = [
    { label: 'Build first road', done: roads >= 1 },
    { label: 'Build first house', done: houses >= 1 },
    { label: 'Build first power plant', done: plants >= 1 },
    { label: 'Open 3 businesses', done: businesses >= 3 },
    { label: 'Reach population 80', done: state.resources.population >= 80 },
    { label: 'Keep happiness above 70%', done: state.happiness >= 70 }
  ];
  const rewardMilestones = milestoneSummary(state);

  const warnings: string[] = [];
  if (state.resources.powerUsed > state.resources.powerProduced) warnings.push('Power deficit: build more plants.');
  if (state.resources.money < 0) warnings.push('Budget is negative. Slow expansion.');
  if (state.demand.jobs > 60) warnings.push('Job demand is high. Add workshops or commercial buildings.');
  if (state.demand.commerce > 60) warnings.push('Commerce demand is high. Add shops, restaurants, or a bank.');
  if (state.demand.essentials > 55) warnings.push('Residents need essentials. Add grocery or corner stores.');
  if (state.demand.health > 55) warnings.push('Health coverage is thin. Add a hospital.');
  if (state.demand.safety > 55) warnings.push('Safety coverage is low. Add police or fire services.');
  if (state.happiness < 45) warnings.push('Happiness is low. Improve roads and power coverage.');

  return (
    <aside className="pointer-events-auto panel-glass rounded-2xl p-4 text-slate-100 shadow-glow">
      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-amber-200">Town Progress</div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {[
          ['transitFirst', 'Transit First'],
          ['greenStandards', 'Green Standards'],
          ['businessIncentives', 'Business Push'],
          ['civicPride', 'Civic Pride']
        ].map(([key, label]) => {
          const active = state.policies[key as keyof typeof state.policies];
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleCityPolicy(key as keyof typeof state.policies)}
              className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                active
                  ? 'border-cyan-300/70 bg-cyan-500/18 text-cyan-100'
                  : 'border-slate-500/30 bg-slate-900/38 text-slate-300 hover:bg-slate-800/55'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="space-y-2 rounded-xl border border-slate-500/30 bg-slate-900/45 p-3">
        {milestones.map((item) => (
          <div key={item.label} className={`text-sm ${item.done ? 'text-emerald-200' : 'text-slate-300'}`}>
            {item.done ? '✓' : '○'} {item.label}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-slate-500/30 bg-slate-900/45 p-3">
        <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-cyan-200">City Milestones</div>
        <div className="space-y-2">
          {rewardMilestones.map((item) => (
            <div key={item.id} className={`rounded-lg border px-3 py-2 text-xs ${item.done ? 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100' : 'border-slate-500/25 bg-slate-950/25 text-slate-300'}`}>
              <div>{item.done ? '✓' : '○'} {item.label}</div>
              <div className="mt-1 text-[10px] text-slate-400">{item.reward}</div>
            </div>
          ))}
        </div>
      </div>
      {warnings.length > 0 && (
        <div className="mt-3 rounded-xl border border-rose-300/40 bg-rose-900/20 p-3 text-sm text-rose-100">
          {warnings[0]}
        </div>
      )}
    </aside>
  );
}
