import { useMemo, useState } from 'react';
import {
  applyAssetVariationToBuilding,
  ASSET_GENERATION_COST,
  BUILDING_ECONOMY,
  removeAssetVariation,
  saveAssetVariation,
  setActiveAssetVariation,
  setPlacementMode
} from '../game/actions';
import type { AssetVariation, BuildType, Building, GameState } from '../game/state';

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

const ART_STYLES = [
  {
    id: 'cozy-builder',
    label: 'Cozy Builder',
    prompt: 'cozy premium city-builder art, polished stylized illustration, warm and inviting, readable game asset'
  },
  {
    id: 'storybook',
    label: 'Storybook',
    prompt: 'storybook painted illustration, hand-crafted, soft brush detail, whimsical but readable game asset'
  },
  {
    id: 'clean-modern',
    label: 'Clean Modern',
    prompt: 'clean modern stylized game art, crisp forms, tasteful detail, premium simulation game asset'
  },
  {
    id: 'rustic-town',
    label: 'Rustic Town',
    prompt: 'rustic small-town illustration, warm materials, charming detail, cozy simulation asset'
  }
] as const;

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

function buildPrompt(type: BuildType, details: string, artStyleId: string): string {
  const base = BUILDING_ECONOMY[type].name;
  const style = ART_STYLES.find((item) => item.id === artStyleId) ?? ART_STYLES[0];
  const detailText = details.trim() ? ` Details: ${details.trim()}.` : '';
  return `Isometric town-builder building asset for a single ${base.toLowerCase()}. ${style.prompt}. Building only, centered, clean silhouette, readable at game scale. Transparent background required. No ground tile. No grass base. No sidewalk. No road. No path. No trees. No bushes. No props outside the building footprint. No floating shadow on a floor plane. Three-quarter isometric angle.${detailText} No text labels. No UI.`;
}

export function AssetMakerPanel({ state }: AssetMakerPanelProps): JSX.Element {
  const [type, setType] = useState<BuildType>('house');
  const [details, setDetails] = useState('');
  const [artStyle, setArtStyle] = useState<(typeof ART_STYLES)[number]['id']>('cozy-builder');
  const [status, setStatus] = useState('Create a custom style, save up to 4 per type, and use one for new placements.');
  const [busy, setBusy] = useState(false);

  const variations = useMemo(() => state.assetLibrary[type] ?? [], [state.assetLibrary, type]);
  const activeId = state.activeAssetVariation[type] ?? null;
  const generationCost = ASSET_GENERATION_COST[type];
  const selectedBuilding = useMemo<Building | null>(
    () => state.buildings.find((building) => building.id === state.selectedBuildingId) ?? null,
    [state.buildings, state.selectedBuildingId]
  );
  const selectedType = selectedBuilding?.type ?? null;
  const selectedTypeVariations = selectedType ? state.assetLibrary[selectedType] ?? [] : [];

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
        prompt: buildPrompt(type, details, artStyle),
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
        prompt: buildPrompt(type, details, artStyle),
        imageUrl,
        artStyle,
        createdAt: stamp,
        cost: generationCost
      };

      const result = saveAssetVariation(type, variation);
      if (!result.ok) {
        throw new Error(result.error || 'Could not save the new asset.');
      }

      if (selectedBuilding && selectedBuilding.type === type) {
        applyAssetVariationToBuilding(selectedBuilding.id, variation.id);
      }

      setStatus(
        selectedBuilding && selectedBuilding.type === type
          ? `${BUILDING_ECONOMY[type].name} style saved and applied to the selected building.`
          : `${BUILDING_ECONOMY[type].name} style saved. It is now active for new placements.`
      );
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
      {selectedBuilding && selectedBuilding.type !== 'road' && selectedBuilding.type !== 'park' && selectedBuilding.type !== 'workshop' ? (
        <button
          type="button"
          onClick={() => setType(selectedBuilding.type)}
          className="mt-2 w-full rounded-xl border border-slate-400/35 bg-slate-800/35 px-3 py-2 text-left text-xs text-slate-200 transition hover:border-cyan-300/50 hover:bg-slate-800/55"
        >
          Match selected building type: {BUILDING_ECONOMY[selectedBuilding.type].name}
        </button>
      ) : null}

      <label className="mt-3 mb-2 block text-[11px] uppercase tracking-[0.14em] text-slate-300">Art Style</label>
      <div className="grid grid-cols-2 gap-2">
        {ART_STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            onClick={() => setArtStyle(style.id)}
            className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
              artStyle === style.id
                ? 'border-amber-300/70 bg-amber-400/14 text-amber-100'
                : 'border-slate-500/35 bg-slate-900/35 text-slate-200 hover:border-cyan-300/50'
            }`}
          >
            {style.label}
          </button>
        ))}
      </div>

      <textarea
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        placeholder="Example: warm brick corner cafe with green awning and flower boxes, building only"
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
                <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  {ART_STYLES.find((style) => style.id === variation.artStyle)?.label ?? 'Custom'}
                </div>
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

      <div className="mt-4 border-t border-slate-500/25 pt-4">
        <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-slate-300">Restyle Selected</div>
        {!selectedBuilding || selectedBuilding.type === 'road' || selectedBuilding.type === 'park' || selectedBuilding.type === 'workshop' ? (
          <div className="rounded-xl border border-dashed border-slate-500/35 bg-slate-900/25 p-3 text-xs text-slate-300">
            Select a placed building to apply one of its saved styles.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-xl border border-slate-500/30 bg-slate-900/35 px-3 py-2 text-xs text-slate-200">
              Selected: {BUILDING_ECONOMY[selectedBuilding.type].name} at {selectedBuilding.x}, {selectedBuilding.z}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {selectedTypeVariations.map((variation) => (
                <button
                  key={variation.id}
                  type="button"
                  onClick={() => applyAssetVariationToBuilding(selectedBuilding.id, variation.id)}
                  className={`overflow-hidden rounded-xl border text-left transition ${
                    selectedBuilding.assetVariationId === variation.id
                      ? 'border-cyan-300/70 bg-cyan-400/10'
                      : 'border-slate-500/30 bg-slate-900/35 hover:border-cyan-300/50'
                  }`}
                >
                  <img src={variation.imageUrl} alt={variation.name} className="h-20 w-full object-cover" />
                  <div className="px-2 py-2 text-[11px] text-slate-100">{variation.name}</div>
                </button>
              ))}
              {selectedTypeVariations.length === 0 ? (
                <div className="col-span-2 rounded-xl border border-dashed border-slate-500/35 bg-slate-900/25 p-3 text-xs text-slate-300">
                  No saved variations for this building type yet.
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => applyAssetVariationToBuilding(selectedBuilding.id, null)}
              className="w-full rounded-xl border border-slate-400/40 bg-slate-700/30 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-700/45"
            >
              Restore Default Look
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
