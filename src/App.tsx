import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { BuildMenu } from './components/BuildMenu';
import { InfoPanel } from './components/InfoPanel';
import { TopBar } from './components/TopBar';
import { AiDirectorPanel } from './components/AiDirectorPanel';
import { TownProgressPanel } from './components/TownProgressPanel';
import { HoverTooltip } from './components/HoverTooltip';
import { selectedBuilding } from './game/actions';
import { InputController } from './game/input';
import { GameRenderer } from './game/render';
import { gameStore } from './game/state';

function useGameState() {
  return useSyncExternalStore(
    (listener) => gameStore.subscribe(listener),
    () => gameStore.getState()
  );
}

export default function App(): JSX.Element {
  const state = useGameState();
  const selected = useMemo(() => selectedBuilding(state), [state]);
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new GameRenderer(mountRef.current);
    const input = new InputController(renderer);
    renderer.setFrameHook((dt) => input.update(dt));

    return () => {
      input.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_55%_at_50%_0%,rgba(255,255,255,0.35),rgba(255,255,255,0)_65%)]" />

      <TopBar
        money={state.resources.money}
        population={state.resources.population}
        jobs={state.resources.jobs}
        powerUsed={state.resources.powerUsed}
        powerProduced={state.resources.powerProduced}
        day={state.day}
        happiness={state.happiness}
        gameSpeed={state.gameSpeed}
        undoCount={state.undoCount}
        redoCount={state.redoCount}
        demand={state.demand}
        aiAutoplayEnabled={state.aiAutoplayEnabled}
        aiLastAction={state.aiLastAction}
      />

      <BuildMenu placementMode={state.placementMode} />
      <InfoPanel building={selected} />
      <TownProgressPanel state={state} />
      <AiDirectorPanel state={state} />
      <HoverTooltip state={state} />
    </div>
  );
}
