import { useMemo, useState } from 'react';
import { executeAiCommands, setAiLastAction } from '../game/actions';
import type { BuildType, GameState } from '../game/state';

interface AiDirectorPanelProps {
  state: GameState;
}

interface AdvisorResponse {
  advice: string;
}

interface CommandResponse {
  message: string;
  commands: Array<
    | {
        action: 'place';
        type:
          | 'road'
          | 'house'
          | 'restaurant'
          | 'shop'
          | 'park'
          | 'workshop'
          | 'powerPlant'
          | 'groceryStore'
          | 'cornerStore'
          | 'bank'
          | 'policeStation'
          | 'fireStation'
          | 'hospital';
        x: number;
        z: number;
      }
    | { action: 'bulldoze'; x: number; z: number }
  >;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const raw = await response.text();
  let data: (T & { error?: string; details?: unknown }) | null = null;
  try {
    data = JSON.parse(raw) as T & { error?: string; details?: unknown };
  } catch {
    throw new Error(raw.slice(0, 180) || `Request failed (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

function localPlan(state: GameState, prompt: string): CommandResponse {
  const text = prompt.toLowerCase();
  const center = Math.floor(state.gridSize / 2);
  const occupied = new Set(state.buildings.map((b) => `${b.x}:${b.z}`));
  const hasRoads = state.buildings.some((b) => b.type === 'road');
  const roads = state.buildings.filter((b) => b.type === 'road');
  const around = (radius: number, offsetX = 0, offsetZ = 0) => {
    for (let z = -radius; z <= radius; z += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        const tx = center + x + offsetX;
        const tz = center + z + offsetZ;
        if (tx < 0 || tz < 0 || tx >= state.gridSize || tz >= state.gridSize) continue;
        if (!occupied.has(`${tx}:${tz}`)) return { x: tx, z: tz };
      }
    }
    return { x: center, z: center };
  };
  const nearRoad = () => {
    const roadLike = [
      ...roads,
      ...(commands
        .filter((command) => command.action === 'place' && 'type' in command && command.type === 'road')
        .map((command) => ({ x: command.x, z: command.z })) as Array<{ x: number; z: number }>)
    ];

    for (const road of roadLike) {
      const options = [
        { x: road.x + 1, z: road.z },
        { x: road.x - 1, z: road.z },
        { x: road.x, z: road.z + 1 },
        { x: road.x, z: road.z - 1 }
      ];
      for (const option of options) {
        if (
          option.x >= 0 &&
          option.z >= 0 &&
          option.x < state.gridSize &&
          option.z < state.gridSize &&
          !occupied.has(`${option.x}:${option.z}`)
        ) {
          return option;
        }
      }
    }
    return around(3);
  };

  const pickType = (): BuildType => {
    if (text.includes('hospital')) return 'hospital';
    if (text.includes('police')) return 'policeStation';
    if (text.includes('fire')) return 'fireStation';
    if (text.includes('bank')) return 'bank';
    if (text.includes('grocery')) return 'groceryStore';
    if (text.includes('corner')) return 'cornerStore';
    if (text.includes('park')) return 'park';
    if (text.includes('restaurant')) return 'restaurant';
    if (text.includes('shop')) return 'shop';
    if (text.includes('power')) return 'powerPlant';
    if (text.includes('road') || text.includes('street') || text.includes('block')) return 'road';
    if (text.includes('work')) return 'workshop';
    return state.demand.housing >= state.demand.commerce ? 'house' : 'shop';
  };

  const type = pickType();
  const commands: CommandResponse['commands'] = [];
  const count = text.includes('4') ? 4 : text.includes('3') ? 3 : text.includes('2') ? 2 : 1;

  if (!hasRoads && type !== 'road' && type !== 'powerPlant') {
    commands.push({ action: 'place', type: 'road', x: center, z: center });
  }

  for (let i = 0; i < count; i += 1) {
    const cell =
      type === 'road'
        ? around(3 + i, i, 0)
        : hasRoads || commands.some((c) => c.action === 'place' && c.type === 'road')
          ? nearRoad()
          : around(3 + i, 0, i);
    commands.push({ action: 'place', type, x: cell.x, z: cell.z });
    occupied.add(`${cell.x}:${cell.z}`);
  }

  return {
    message: 'Local planner fallback generated a build plan.',
    commands
  };
}

export function AiDirectorPanel({ state }: AiDirectorPanelProps): JSX.Element {
  const [text, setText] = useState('');
  const [result, setResult] = useState('Ask GPT to plan or execute actions in your town.');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [loadingCommand, setLoadingCommand] = useState(false);

  const snapshot = useMemo(
    () => ({
      gridSize: state.gridSize,
      day: state.day,
      happiness: state.happiness,
      demand: state.demand,
      gameSpeed: state.gameSpeed,
      resources: state.resources,
      placementMode: state.placementMode,
      selectedBuildingId: state.selectedBuildingId,
      buildings: state.buildings.slice(-250)
    }),
    [state]
  );

  const busy = loadingAdvice || loadingCommand;

  const askAdvice = async (): Promise<void> => {
    if (!text.trim() || busy) return;
    setLoadingAdvice(true);
    try {
      const data = await postJson<AdvisorResponse>('/api/ai/city-advisor', {
        prompt: text.trim(),
        snapshot
      });
      setResult(data.advice || 'No advice returned.');
    } catch (error) {
      setResult(`Advisor error: ${String((error as Error).message || error)}`);
    } finally {
      setLoadingAdvice(false);
    }
  };

  const executeWithGpt = async (): Promise<void> => {
    if (!text.trim() || busy) return;
    setLoadingCommand(true);
    try {
      const remote = await postJson<CommandResponse>('/api/ai/game-command', {
        prompt: text.trim(),
        snapshot
      });
      const data = remote.commands?.length ? remote : localPlan(state, text.trim());
      const outcome = executeAiCommands(data.commands || []);
      if (outcome.placed === 0 && outcome.removed === 0) {
        const fallback = localPlan(state, text.trim());
        const fallbackOutcome = executeAiCommands(fallback.commands);
        const fallbackMessage = `${fallback.message} Applied ${fallbackOutcome.placed} placement(s), bulldozed ${fallbackOutcome.removed}, skipped ${fallbackOutcome.failed}.`;
        setAiLastAction(fallbackMessage);
        setResult(fallbackMessage);
        return;
      }

      const actionMessage = `${data.message} Applied ${outcome.placed} placement(s), bulldozed ${outcome.removed}, skipped ${outcome.failed}.`;
      setAiLastAction(actionMessage);
      setResult(actionMessage);
    } catch (_error) {
      const fallback = localPlan(state, text.trim());
      const outcome = executeAiCommands(fallback.commands);
      const message = `${fallback.message} Applied ${outcome.placed} placement(s), bulldozed ${outcome.removed}, skipped ${outcome.failed}.`;
      setAiLastAction(message);
      setResult(message);
    } finally {
      setLoadingCommand(false);
    }
  };

  return (
    <aside className="pointer-events-auto panel-glass rounded-2xl p-4 text-slate-100 shadow-glow">
      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-fuchsia-200">AI Director (GPT)</div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Examples: Build 6 houses near roads. Or: What should I do next?"
        className="h-24 w-full resize-none rounded-xl border border-slate-500/40 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={askAdvice}
          disabled={busy || !text.trim()}
          className="rounded-xl border border-cyan-300/50 bg-cyan-400/15 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingAdvice ? 'Thinking...' : 'Ask Strategy'}
        </button>
        <button
          type="button"
          onClick={executeWithGpt}
          disabled={busy || !text.trim()}
          className="rounded-xl border border-fuchsia-300/50 bg-fuchsia-400/15 px-3 py-2 text-sm font-medium text-fuchsia-100 transition hover:bg-fuchsia-400/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingCommand ? 'Executing...' : 'Do It In Game'}
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-slate-500/30 bg-slate-900/45 p-3 text-sm text-slate-200">
        {result}
      </div>
    </aside>
  );
}
