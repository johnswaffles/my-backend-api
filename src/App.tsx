import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { BuildMenu } from './components/BuildMenu';
import { InfoPanel } from './components/InfoPanel';
import { TopBar } from './components/TopBar';
import { TownProgressPanel } from './components/TownProgressPanel';
import { HoverTooltip } from './components/HoverTooltip';
import { MiniMapPanel } from './components/MiniMapPanel';
import { economySummary, selectedBuilding } from './game/actions';
import { InputController } from './game/input';
import { GameRenderer } from './game/render';
import { gameStore } from './game/state';

function useGameState() {
  return useSyncExternalStore(
    (listener) => gameStore.subscribe(listener),
    () => gameStore.getState()
  );
}

type MobilePanel = 'build' | 'info' | 'progress' | null;
type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

export default function App(): JSX.Element {
  const state = useGameState();
  const selected = useMemo(() => selectedBuilding(state), [state]);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const previousSelectedIdRef = useRef<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new GameRenderer(mountRef.current);
    const input = new InputController(renderer);
    rendererRef.current = renderer;
    renderer.setFrameHook((dt) => input.update(dt));

    return () => {
      rendererRef.current = null;
      input.dispose();
      renderer.dispose();
    };
  }, []);

  const economy = useMemo(() => economySummary(state), [state]);
  const counts = useMemo(() => {
    const byType = {
      homes: 0,
      stores: 0,
      civic: 0,
      utility: 0
    };
    state.buildings.forEach((building) => {
      if (building.type === 'house') byType.homes += 1;
      else if (['shop', 'restaurant', 'groceryStore', 'cornerStore', 'bank'].includes(building.type)) byType.stores += 1;
      else if (['hospital', 'policeStation', 'fireStation', 'park'].includes(building.type)) byType.civic += 1;
      else if (['workshop', 'powerPlant'].includes(building.type)) byType.utility += 1;
    });
    return byType;
  }, [state.buildings]);

  const focusCell = (x: number, z: number): void => {
    const building = state.buildings.find((entry) => entry.x === x && entry.z === z);
    rendererRef.current?.focusOnCell(x, z, 0.34, building?.type ?? 'road');
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === appRef.current);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px), (pointer: coarse)') as LegacyMediaQueryList;
    const sync = () => {
      const nextMobile = media.matches;
      setIsMobile(nextMobile);
      if (!nextMobile) {
        setMobilePanel(null);
      }
    };

    sync();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', sync);
    } else if (typeof media.addListener === 'function') {
      media.addListener(sync);
    }
    window.addEventListener('resize', sync);
    return () => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', sync);
      } else if (typeof media.removeListener === 'function') {
        media.removeListener(sync);
      }
      window.removeEventListener('resize', sync);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    if (state.placementMode) {
      setMobilePanel(null);
    } else if (selected && previousSelectedIdRef.current !== selected.id) {
      setMobilePanel('info');
    }
    previousSelectedIdRef.current = selected?.id ?? null;
  }, [isMobile, selected, state.placementMode]);

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
      <div ref={mountRef} className="absolute inset-0 touch-none" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_55%_at_50%_0%,rgba(255,255,255,0.35),rgba(255,255,255,0)_65%)]" />

      <TopBar
        money={state.resources.money}
        population={state.resources.population}
        jobs={state.resources.jobs}
        powerUsed={state.resources.powerUsed}
        powerProduced={state.resources.powerProduced}
        day={state.day}
        timeOfDay={state.timeOfDay}
        happiness={state.happiness}
        economy={economy}
        counts={counts}
        gameSpeed={state.gameSpeed}
        undoCount={state.undoCount}
        redoCount={state.redoCount}
        demand={state.demand}
        aiAutoplayEnabled={state.aiAutoplayEnabled}
        aiLastAction={state.aiLastAction}
        isFullscreen={isFullscreen}
        mobile={isMobile}
        onToggleFullscreen={() => {
          void toggleFullscreen();
        }}
      />

      {isMobile ? (
        <div
          className="pointer-events-none absolute inset-0 z-20 px-3 pb-3 pt-40"
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 10rem)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)'
          }}
        >
          {state.placementMode ? (
            <div className="pointer-events-none absolute left-3 right-3 top-[8.9rem] z-20">
              <div className="mx-auto w-fit rounded-full border border-cyan-200/40 bg-slate-950/70 px-4 py-2 text-xs text-cyan-100 backdrop-blur">
                Placing {state.placementMode}. Tap a tile to build. Drag to pan. Pinch to zoom.
              </div>
            </div>
          ) : null}

          <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-30 flex flex-col gap-3">
            {mobilePanel ? (
              <div className="pointer-events-auto max-h-[48vh] overflow-y-auto">
                {mobilePanel === 'build' ? <BuildMenu placementMode={state.placementMode} mobile /> : null}
                {mobilePanel === 'info' ? <InfoPanel building={selected} /> : null}
                {mobilePanel === 'progress' ? <TownProgressPanel state={state} /> : null}
                {mobilePanel === 'build' ? <MiniMapPanel state={state} mobile onFocusCell={focusCell} /> : null}
              </div>
            ) : null}

            <div className="pointer-events-auto panel-glass rounded-2xl p-2 shadow-glow">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMobilePanel((panel) => (panel === 'build' ? null : 'build'))}
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
                    mobilePanel === 'build'
                      ? 'bg-cyan-400/22 text-cyan-100'
                      : 'bg-slate-900/45 text-slate-100'
                  }`}
                >
                  Build
                </button>
                <button
                  type="button"
                  onClick={() => setMobilePanel((panel) => (panel === 'info' ? null : 'info'))}
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
                    mobilePanel === 'info'
                      ? 'bg-emerald-400/22 text-emerald-100'
                      : 'bg-slate-900/45 text-slate-100'
                  }`}
                >
                  Inspect
                </button>
                <button
                  type="button"
                  onClick={() => setMobilePanel((panel) => (panel === 'progress' ? null : 'progress'))}
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
                    mobilePanel === 'progress'
                      ? 'bg-amber-400/22 text-amber-100'
                      : 'bg-slate-900/45 text-slate-100'
                  }`}
                >
                  Goals
                </button>
              </div>
            </div>
          </div>

          <div className="hidden">
            <HoverTooltip state={state} />
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-20 px-4 pb-4 pt-44">
          <div className="grid h-full grid-cols-[17rem_minmax(0,1fr)_22rem] gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_23rem]">
            <div className="flex min-h-0 flex-col gap-4">
              <BuildMenu placementMode={state.placementMode} />
              <TownProgressPanel state={state} />
            </div>
            <div />
            <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
              <MiniMapPanel state={state} onFocusCell={focusCell} />
              <InfoPanel building={selected} onFocusBuilding={focusCell} />
            </div>
          </div>
          <HoverTooltip state={state} />
        </div>
      )}
    </div>
  );
}
