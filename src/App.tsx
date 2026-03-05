import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { BuildMenu } from './components/BuildMenu';
import { InfoPanel } from './components/InfoPanel';
import { TopBar } from './components/TopBar';
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

      <TopBar
        money={state.resources.money}
        population={state.resources.population}
        powerUsed={state.resources.powerUsed}
        powerProduced={state.resources.powerProduced}
      />

      <BuildMenu placementMode={state.placementMode} />
      <InfoPanel building={selected} />
    </div>
  );
}
