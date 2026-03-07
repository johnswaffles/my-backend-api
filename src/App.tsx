import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { BuildMenu } from './components/BuildMenu';
import { InfoPanel } from './components/InfoPanel';
import { TopBar } from './components/TopBar';
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
  const appRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === appRef.current);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async (): Promise<void> => {
    const host = appRef.current;
    if (!host) return;

    if (document.fullscreenElement === host) {
      await document.exitFullscreen();
      return;
    }

    await host.requestFullscreen();
  };

  return (
    <div ref={appRef} className="relative h-full w-full overflow-hidden">
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
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => {
          void toggleFullscreen();
        }}
      />

      <div className="pointer-events-none absolute inset-0 z-20 px-4 pb-4 pt-44">
        <div className="grid h-full grid-cols-[17rem_minmax(0,1fr)_22rem] gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_23rem]">
          <div className="flex min-h-0 flex-col gap-4">
            <BuildMenu placementMode={state.placementMode} />
            <TownProgressPanel state={state} />
          </div>
          <div />
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <InfoPanel building={selected} />
          </div>
        </div>
        <HoverTooltip state={state} />
      </div>
    </div>
  );
}
