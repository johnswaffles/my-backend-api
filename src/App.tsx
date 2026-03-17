import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { BuildMenu } from './components/BuildMenu';
import { InfoPanel } from './components/InfoPanel';
import { TopBar } from './components/TopBar';
import { TownProgressPanel } from './components/TownProgressPanel';
import { HoverTooltip } from './components/HoverTooltip';
import { MiniMapPanel } from './components/MiniMapPanel';
import { HelpModal } from './components/HelpModal';
import {
  buildStarterTown,
  bulldozeAt,
  cancelPlacement,
  economySummary,
  selectedBuilding,
  upgradeBuildingById
} from './game/actions';
import { InputController } from './game/input';
import { CitySoundtrack } from './game/music';
import { GameRenderer } from './game/render';
import { gameStore } from './game/state';
import type { OverlayMode } from './game/state';

function useGameState() {
  return useSyncExternalStore(
    (listener) => gameStore.subscribe(listener),
    () => gameStore.getState()
  );
}

type MobilePanel = 'build' | 'info' | 'progress' | 'map' | 'help' | null;
type MobileSheetMode = 'peek' | 'half' | 'full';
type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

function shouldUseMobileUi(): boolean {
  if (typeof window === 'undefined') return false;
  const mediaMatches =
    typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches;
  const touchPoints = navigator.maxTouchPoints ?? 0;
  const isiPadLike =
    /iPad/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && touchPoints > 1);
  const touchTabletViewport = touchPoints > 1 && Math.max(window.innerWidth, window.innerHeight) <= 1400;
  return mediaMatches || isiPadLike || touchTabletViewport;
}

export default function App(): JSX.Element {
  const state = useGameState();
  const selected = useMemo(() => selectedBuilding(state), [state]);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const musicRef = useRef<CitySoundtrack | null>(null);
  const previousSelectedIdRef = useRef<number | null>(null);
  const mobileCornerFocusedRef = useRef(false);
  const mobilePanIntervalRef = useRef<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [mobileSheetMode, setMobileSheetMode] = useState<MobileSheetMode>('half');
  const [mobileHudExpanded, setMobileHudExpanded] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('base');

  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new GameRenderer(mountRef.current);
    const input = new InputController(renderer);
    const mobileViewport = shouldUseMobileUi();
    rendererRef.current = renderer;
    renderer.setFrameHook((dt) => input.update(dt));
    renderer.setOverlayMode(overlayMode);
    if (mobileViewport) {
      renderer.snapToMapCorner('nw');
      mobileCornerFocusedRef.current = true;
    }

    return () => {
      rendererRef.current = null;
      input.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setOverlayMode(overlayMode);
  }, [overlayMode]);

  useEffect(() => {
    const music = new CitySoundtrack();
    musicRef.current = music;
    setMusicEnabled(music.isEnabled());

    const unlockMusic = () => {
      void music.unlock();
    };

    window.addEventListener('pointerdown', unlockMusic, { passive: true, once: true });
    window.addEventListener('keydown', unlockMusic, { once: true });

    return () => {
      musicRef.current = null;
      window.removeEventListener('pointerdown', unlockMusic);
      window.removeEventListener('keydown', unlockMusic);
      music.dispose();
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      mobileCornerFocusedRef.current = false;
      return;
    }
    if (mobileCornerFocusedRef.current) return;

    rendererRef.current?.snapToMapCorner('nw');
    mobileCornerFocusedRef.current = true;
  }, [isMobile]);

  useEffect(() => {
    return () => {
      if (mobilePanIntervalRef.current != null) {
        window.clearInterval(mobilePanIntervalRef.current);
      }
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
      else if (['shop', 'restaurant', 'groceryStore', 'cornerStore', 'bank', 'trainStation'].includes(building.type)) byType.stores += 1;
      else if (['hospital', 'policeStation', 'fireStation', 'park', 'cityHall'].includes(building.type)) byType.civic += 1;
      else if (['workshop', 'powerPlant', 'substation', 'road', 'railLine', 'powerLine'].includes(building.type)) byType.utility += 1;
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
    const sync = () => {
      const nextMobile = shouldUseMobileUi();
      setIsMobile(nextMobile);
      if (!nextMobile) {
        setMobilePanel(null);
        setMobileHudExpanded(true);
      }
    };

    sync();
    const media = window.matchMedia('(max-width: 1024px), (pointer: coarse)') as LegacyMediaQueryList;
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
    if (state.placementMode && mobilePanel !== 'build') {
      setMobilePanel(null);
    } else if (selected && previousSelectedIdRef.current !== selected.id) {
      setMobilePanel('info');
    }
    previousSelectedIdRef.current = selected?.id ?? null;
  }, [isMobile, mobilePanel, selected, state.placementMode]);

  const toggleFullscreen = async (): Promise<void> => {
    const host = appRef.current;
    if (!host) return;

    if (document.fullscreenElement === host) {
      await document.exitFullscreen();
      return;
    }

    await host.requestFullscreen();
  };

  const focusTownCenter = (): void => {
    const center = Math.floor(state.gridSize / 2);
    rendererRef.current?.focusOnCell(center, center, 0.34, 'road');
  };

  const openBottomPanel = (): void => {
    if (mobilePanel) return;
    if (selected) {
      setMobilePanel('info');
      return;
    }
    setMobilePanel('build');
  };

  const panMobileView = (direction: 'up' | 'down' | 'left' | 'right'): void => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    const step = 0.32;
    if (direction === 'up') renderer.panBy(-step, -step);
    else if (direction === 'down') renderer.panBy(step, step);
    else if (direction === 'left') renderer.panBy(-step, step);
    else renderer.panBy(step, -step);
  };

  const stopMobilePan = (): void => {
    if (mobilePanIntervalRef.current == null) return;
    window.clearInterval(mobilePanIntervalRef.current);
    mobilePanIntervalRef.current = null;
  };

  const startMobilePan = (direction: 'up' | 'down' | 'left' | 'right'): void => {
    stopMobilePan();
    panMobileView(direction);
    mobilePanIntervalRef.current = window.setInterval(() => panMobileView(direction), 80);
  };

  const toggleMusic = (): void => {
    const music = musicRef.current;
    if (!music) return;
    const next = music.toggle();
    setMusicEnabled(next);
  };

  const mobileSheetHeightClass =
    mobileSheetMode === 'peek' ? 'max-h-[28vh]' : mobileSheetMode === 'half' ? 'max-h-[50vh]' : 'max-h-[76vh]';

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
        musicEnabled={musicEnabled}
        overlayMode={overlayMode}
        isFullscreen={isFullscreen}
        mobile={isMobile}
        onOpenHelp={() => setHelpOpen(true)}
        onToggleMusic={toggleMusic}
        onOverlayChange={setOverlayMode}
        onToggleMobileHud={() => setMobileHudExpanded((value) => !value)}
        mobileHudExpanded={mobileHudExpanded}
        onFocusHome={focusTownCenter}
        onToggleFullscreen={() => {
          void toggleFullscreen();
        }}
      />

      <HelpModal
        open={helpOpen || mobilePanel === 'help'}
        onClose={() => {
          setHelpOpen(false);
          if (mobilePanel === 'help') setMobilePanel(null);
        }}
      />

      {isMobile ? (
        <div
          className="pointer-events-none absolute inset-0 z-20 px-3 pb-3 pt-40"
          style={{
            paddingTop: mobileHudExpanded ? 'max(env(safe-area-inset-top), 8.5rem)' : 'max(env(safe-area-inset-top), 4.75rem)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)'
          }}
        >
          {state.placementMode ? (
            <div className={`pointer-events-none absolute left-3 right-3 z-20 ${mobileHudExpanded ? 'top-[7.3rem]' : 'top-[3.95rem]'}`}>
              <div className="mx-auto w-fit rounded-full border border-cyan-200/40 bg-slate-950/70 px-4 py-2 text-xs text-cyan-100 backdrop-blur">
                Placing {state.placementMode}. Tap to build. Tap an existing building to inspect or bulldoze it.
              </div>
            </div>
          ) : null}

          {(state.placementMode || selected) && mobilePanel !== 'help' ? (
            <div className="pointer-events-auto absolute bottom-28 left-24 right-3 z-30">
              <div className="panel-glass rounded-2xl p-2 shadow-glow">
                <div className="flex flex-wrap gap-2">
                  {state.placementMode ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setMobilePanel('build')}
                        className="rounded-xl border border-amber-300/60 bg-amber-500/16 px-3 py-2 text-xs font-medium text-amber-100"
                      >
                        Tools
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelPlacement()}
                        className="rounded-xl border border-rose-300/60 bg-rose-500/18 px-3 py-2 text-xs font-medium text-rose-100"
                      >
                        Cancel Tool
                      </button>
                      <div className="rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-100">
                        Tool: {state.placementMode}
                      </div>
                    </>
                  ) : null}
                  {selected ? (
                    <>
                      <button
                        type="button"
                        onClick={() => rendererRef.current?.focusOnCell(selected.x, selected.z, 0.32, selected.type)}
                        className="rounded-xl border border-emerald-300/60 bg-emerald-500/16 px-3 py-2 text-xs font-medium text-emerald-100"
                      >
                        Focus
                      </button>
                      <button
                        type="button"
                        onClick={() => upgradeBuildingById(selected.id)}
                        className="rounded-xl border border-cyan-300/60 bg-cyan-500/18 px-3 py-2 text-xs font-medium text-cyan-100"
                      >
                        Upgrade
                      </button>
                      <button
                        type="button"
                        onClick={() => bulldozeAt(selected.x, selected.z)}
                        className="rounded-xl border border-rose-300/60 bg-rose-500/18 px-3 py-2 text-xs font-medium text-rose-100"
                      >
                        Bulldoze
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="pointer-events-auto absolute bottom-28 left-3 z-30">
            <div className="panel-glass rounded-2xl p-1.5 shadow-glow">
              <div className="grid w-[4.75rem] grid-cols-3 gap-1">
                <div />
                <button
                  type="button"
                  onPointerDown={() => startMobilePan('up')}
                  onPointerUp={stopMobilePan}
                  onPointerLeave={stopMobilePan}
                  onPointerCancel={stopMobilePan}
                  className="rounded-lg bg-slate-900/55 px-0 py-2 text-base font-semibold text-slate-100"
                  aria-label="Pan up"
                >
                  ↑
                </button>
                <div />
                <button
                  type="button"
                  onPointerDown={() => startMobilePan('left')}
                  onPointerUp={stopMobilePan}
                  onPointerLeave={stopMobilePan}
                  onPointerCancel={stopMobilePan}
                  className="rounded-lg bg-slate-900/55 px-0 py-2 text-base font-semibold text-slate-100"
                  aria-label="Pan left"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={focusTownCenter}
                  className="rounded-lg border border-cyan-300/35 bg-cyan-500/16 px-0 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100"
                  aria-label="Recenter map"
                >
                  Home
                </button>
                <button
                  type="button"
                  onPointerDown={() => startMobilePan('right')}
                  onPointerUp={stopMobilePan}
                  onPointerLeave={stopMobilePan}
                  onPointerCancel={stopMobilePan}
                  className="rounded-lg bg-slate-900/55 px-0 py-2 text-base font-semibold text-slate-100"
                  aria-label="Pan right"
                >
                  →
                </button>
                <div />
                <button
                  type="button"
                  onPointerDown={() => startMobilePan('down')}
                  onPointerUp={stopMobilePan}
                  onPointerLeave={stopMobilePan}
                  onPointerCancel={stopMobilePan}
                  className="rounded-lg bg-slate-900/55 px-0 py-2 text-base font-semibold text-slate-100"
                  aria-label="Pan down"
                >
                  ↓
                </button>
                <div />
              </div>
            </div>
          </div>

          {!mobilePanel && !state.placementMode ? (
            <div className="pointer-events-auto absolute bottom-[7.2rem] left-1/2 z-30 -translate-x-1/2">
              <button
                type="button"
                onClick={openBottomPanel}
                className="panel-glass rounded-full border border-cyan-300/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100 shadow-glow"
              >
                {selected ? 'Show Inspect' : 'Show Build'}
              </button>
            </div>
          ) : null}

          <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-30 flex flex-col gap-3">
            {mobilePanel ? (
              <div className={`pointer-events-auto overflow-y-auto ${mobileSheetHeightClass}`}>
                {mobilePanel !== 'help' ? (
                  <div className="panel-glass mb-2 rounded-2xl p-2 shadow-glow">
                    <div className="flex items-center justify-between gap-2">
                      <div className="mx-auto h-1.5 w-14 rounded-full bg-slate-500/55" />
                      <button
                        type="button"
                        onClick={() => setMobilePanel(null)}
                        className="rounded-lg border border-slate-300/35 bg-slate-800/45 px-2 py-1 text-[10px] font-medium text-slate-100"
                        aria-label="Close options panel"
                      >
                        X
                      </button>
                    </div>
                  </div>
                ) : null}
                {mobilePanel === 'build' ? <BuildMenu placementMode={state.placementMode} mobile /> : null}
                {mobilePanel === 'info' ? <InfoPanel building={selected} onFocusBuilding={focusCell} /> : null}
                {mobilePanel === 'progress' ? <TownProgressPanel state={state} /> : null}
                {mobilePanel === 'map' ? <MiniMapPanel state={state} mobile onFocusCell={focusCell} mode={overlayMode} onModeChange={setOverlayMode} /> : null}
              </div>
            ) : null}

            <div className="pointer-events-auto panel-glass rounded-2xl p-2 shadow-glow">
              <div className="grid grid-cols-5 gap-2">
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
                  onClick={() => setMobilePanel((panel) => (panel === 'map' ? null : 'map'))}
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
                    mobilePanel === 'map'
                      ? 'bg-violet-400/22 text-violet-100'
                      : 'bg-slate-900/45 text-slate-100'
                  }`}
                >
                  Map
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
                <button
                  type="button"
                  onClick={() => setMobilePanel((panel) => (panel === 'help' ? null : 'help'))}
                  className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
                    mobilePanel === 'help'
                      ? 'bg-slate-300/22 text-white'
                      : 'bg-slate-900/45 text-slate-100'
                  }`}
                >
                  Help
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={focusTownCenter}
                  className="rounded-xl border border-slate-400/35 bg-slate-900/35 px-3 py-2 text-xs font-medium text-slate-100"
                >
                  Recenter
                </button>
                <button
                  type="button"
                  onClick={() => buildStarterTown()}
                  className="rounded-xl border border-emerald-300/60 bg-emerald-500/18 px-3 py-2 text-xs font-medium text-emerald-100"
                >
                  Starter
                </button>
                <button
                  type="button"
                  onClick={() => setMobileSheetMode((mode) => (mode === 'full' ? 'peek' : 'full'))}
                  className="rounded-xl border border-cyan-300/50 bg-cyan-400/12 px-3 py-2 text-xs font-medium text-cyan-100"
                >
                  {mobileSheetMode === 'full' ? 'Compact' : 'Expand'}
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
              <MiniMapPanel state={state} onFocusCell={focusCell} mode={overlayMode} onModeChange={setOverlayMode} />
              <InfoPanel building={selected} onFocusBuilding={focusCell} />
            </div>
          </div>
          <HoverTooltip state={state} />
        </div>
      )}
    </div>
  );
}
