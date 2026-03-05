import { useMemo, useState } from 'react';
import { executeAiCommands, setAiLastAction } from '../game/actions';
import type { GameState } from '../game/state';

interface AiDirectorPanelProps {
  state: GameState;
}

interface AdvisorResponse {
  advice: string;
}

interface CommandResponse {
  message: string;
  commands: Array<{ action: 'place'; type: 'road' | 'house' | 'powerPlant'; x: number; z: number }>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = (await response.json()) as T & { error?: string; details?: unknown };
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
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
      const data = await postJson<CommandResponse>('/api/ai/game-command', {
        prompt: text.trim(),
        snapshot
      });
      const outcome = executeAiCommands(data.commands || []);
      const actionMessage = `${data.message} Applied ${outcome.placed} placement(s), ${outcome.failed} skipped.`;
      setAiLastAction(actionMessage);
      setResult(actionMessage);
    } catch (error) {
      const message = `Command error: ${String((error as Error).message || error)}`;
      setAiLastAction(message);
      setResult(message);
    } finally {
      setLoadingCommand(false);
    }
  };

  return (
    <aside className="pointer-events-auto panel-glass absolute bottom-4 right-4 z-20 w-[26rem] rounded-2xl p-4 text-slate-100">
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
