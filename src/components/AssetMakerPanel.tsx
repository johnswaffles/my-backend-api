import { useMemo, useState } from 'react';
import { ASSET_GENERATION_COST, BUILDING_ECONOMY, removeAssetVariation, saveAssetVariation, setActiveAssetVariation, setPlacementMode } from '../game/actions';
import type { AssetVariation, BuildType, GameState } from '../game/state';

interface AssetMakerPanelProps {
  state: GameState;
}

interface GenerateAssetResponse {
  imageBase64?: string;
  savedTo?: string | null;
}

const ASSET_TYPES: BuildType[] = [
  'house',
  'shop',
  'restaurant',
  'groceryStore',
  'cornerStore',
  'bank',
  'policeStation',
  'fireStation',
  'hospital',
  'powerPlant'
];

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : {};
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data as T;
}

function buildPrompt(type: BuildType, details: string): string {
  const base = BUILDING_ECONOMY[type].name;
  const detailText = details.trim() ? ` Details: ${details.trim()}.` : '';
  return `Cozy isometric town-builder asset for a single ${base.toLowerCase()}. Isolated building only. Transparent or clean empty background. Soft polished illustration. Three-quarter angle. Charming, readable, premium game asset.${detailText} No text labels. No UI.`;
}

export function AssetMakerPanel({ state }: AssetMakerPanelProps): JSX.Element {
  const [type, setType] = useState<BuildType>('house');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState('Create a custom style, save up to 4 per type, and use one for new placements.');
  const [busy, setBusy] = useState(false);

  const variations = useMemo(() => state.assetLibrary[type] ?? [], [state.assetLibrary, type]);
  const activeId = state.activeAssetVariation[type] ?? null;
  const generationCost = ASSET_GENERATION_COST[type];

  const generate = async (): Promise<void> => {
    if (busy) return;
    if (state.resources.money < generationCost) {
      setStatus(`Not enough money. ${BUILDING_ECONOMY[type].name} styles cost $${generationCost}.`);
      return;
    }

    setBusy(true);
    setStatus(`Generating ${BUILDING_ECONOMY[type].name.toLowerCase()} style...`);

    try {
      const stamp = Date.now();
      const filename = `${type}-${stamp}.png`;
      const response = await postJson<GenerateAssetResponse>('/api/ai/generate-asset', {
        prompt: buildPrompt(type, details),
        size: '1024x1024',
        filename
      });

      const imageUrl =
        response.savedTo || (response.imageBase64 ? `data:image/png;base64,${response.imageBase64}` : null);
      if (!imageUrl) {
        throw new Error('No image was returned.');
      }

      const variation: AssetVariation = {
        id: `${type}-${stamp}`,
        type,
        name: details.trim() ? details.trim().slice(0, 32) : `${BUILDING_ECONOMY[type].name} Style ${variations.length + 1}`,
        prompt: buildPrompt(type, details),
        imageUrl,
        createdAt: stamp,
        cost: generationCost
      };

      const result = saveAssetVariation(type, variation);
      if (!result.ok) {
        throw new Error(result.error || 'Could not save the new asset.');
      }

      setStatus(`${BUILDING_ECONOMY[type].name} style saved. It is now active for new placements.`);
      setDetails('');
    } catch (error) {
      setStatus(`Asset generation failed: ${String((error as Error).message || error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="pointer-events-auto panel-glass rounded-2xl p-4 text-slate-100 shadow-glow">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.18em] text-amber-200">Asset Maker</div>
        <div className="text-[11px] text-slate-300">4 saved looks per type</div>
      </div>

      <label className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-slate-300">Building Type</label>
      <select
        value={type}
        onChange={(event) => setType(event.target.value as BuildType)}
        className="w-full rounded-xl border border-slate-500/40 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300"
      >
        {ASSET_TYPES.map((item) => (
          <option key={item} value={item}>
            {BUILDING_ECONOMY[item].name}
          </option>
        ))}
      </select>

      <div className="mt-3 rounded-xl border border-slate-500/30 bg-slate-900/35 px-3 py-2 text-xs text-slate-200">
        New {BUILDING_ECONOMY[type].name} style cost: ${generationCost}
      </div>

      <textarea
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        placeholder="Example: warm brick corner cafe with green awning and flower boxes"
        className="mt-3 h-24 w-full resize-none rounded-xl border border-slate-500/40 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300"
      />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            void generate();
          }}
          disabled={busy}
          className="rounded-xl border border-amber-300/60 bg-amber-400/16 px-3 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-400/28 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Generating...' : 'Make Asset'}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlacementMode(type);
          }}
          className="rounded-xl border border-cyan-300/50 bg-cyan-400/12 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/22"
        >
          Build {BUILDING_ECONOMY[type].name}
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-slate-500/30 bg-slate-900/45 p-3 text-sm text-slate-200">
        {status}
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-slate-300">Saved Variations</div>
        <div className="grid grid-cols-2 gap-2">
          {variations.map((variation) => {
            const active = variation.id === activeId;
            return (
              <div
                key={variation.id}
                className={`rounded-xl border p-2 ${
                  active ? 'border-cyan-300/70 bg-cyan-400/10' : 'border-slate-500/30 bg-slate-900/35'
                }`}
              >
                <img
                  src={variation.imageUrl}
                  alt={variation.name}
                  className="h-24 w-full rounded-lg object-cover"
                />
                <div className="mt-2 truncate text-xs font-medium text-slate-100">{variation.name}</div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAssetVariation(type, variation.id);
                      setPlacementMode(type);
                    }}
                    className="flex-1 rounded-lg border border-cyan-300/50 bg-cyan-400/12 px-2 py-1 text-[11px] text-cyan-100 transition hover:bg-cyan-400/22"
                  >
                    {active ? 'Active' : 'Use'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAssetVariation(type, variation.id)}
                    className="rounded-lg border border-rose-300/40 bg-rose-400/10 px-2 py-1 text-[11px] text-rose-100 transition hover:bg-rose-400/18"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
          {variations.length === 0 ? (
            <div className="col-span-2 rounded-xl border border-dashed border-slate-500/35 bg-slate-900/25 p-4 text-xs text-slate-300">
              No custom styles saved for this building type yet.
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
