import { useMemo, useState } from 'react';
import {
  applyGeneratedAssetToBuilding,
  ASSET_GENERATION_COST,
  BUILDING_ECONOMY,
  clearPendingBuildAsset,
  queueGeneratedAsset,
  setPlacementMode
} from '../game/actions';
import { INFINITE_MONEY } from '../game/state';
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

const TYPE_GUIDANCE: Record<BuildType, string> = {
  road: 'This game uses connected road kits, not standalone illustration props.',
  house:
    'Cozy small-town city-builder house for a single 1x1 parcel. Compact footprint, readable at close zoom, front door facing the street edge, leave 16-20% transparent margin around the whole building so no roof, porch, chimney, or corner touches the image border.',
  shop:
    'Neighborhood storefront for a single 1x1 parcel. Compact main-street scale, clearly commercial, front entrance toward the street edge, leave 16-20% transparent margin around the full silhouette.',
  restaurant:
    'Small cozy restaurant for a single 1x1 parcel. Distinct dining identity, compact street-facing frontage, leave 16-20% transparent margin around the full silhouette.',
  groceryStore:
    'Compact grocery market for a single 1x1 parcel. Slightly broader storefront massing, still fits one tile, street-facing entrance, leave 16-20% transparent margin around the full silhouette.',
  cornerStore:
    'Tiny neighborhood corner store for a single 1x1 parcel. Compact silhouette, street-facing entrance, leave 16-20% transparent margin around the full silhouette.',
  bank:
    'Small-town bank for a single 1x1 parcel. More civic and formal than a shop, still compact, street-facing entrance, leave 16-20% transparent margin around the full silhouette.',
  policeStation:
    'Distinct police station for a single 1x1 parcel. Civic silhouette, readable from isometric angle, leave 16-20% transparent margin around the full silhouette.',
  fireStation:
    'Distinct fire station for a single 1x1 parcel. Service-bay identity, civic silhouette, leave 16-20% transparent margin around the full silhouette.',
  hospital:
    'Hospital landmark for a 2x2 parcel. Wider campus-like building, premium cozy-builder proportions, readable at close zoom, leave 16-20% transparent margin around the full silhouette.',
  park: 'This panel is for buildings, not park tiles.',
  workshop:
    'Light industrial workshop for a single 1x1 parcel. Compact service-yard feel, fits cozy town scale, leave 16-20% transparent margin around the full silhouette.',
  powerPlant:
    'Power plant landmark for a 2x2 parcel. Utility complex with strong silhouette, compact enough for a cozy block builder, leave 16-20% transparent margin around the full silhouette.'
};

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
  const style = ART_STYLES.find((item) => item.id === artStyleId) ?? ART_STYLES[0];
  const detailText = details.trim() ? ` Details: ${details.trim()}.` : '';
  const guidance = TYPE_GUIDANCE[type];
  return `Create one premium isometric building asset for a cozy small-town city-builder game. ${style.prompt}. ${guidance} Building only, centered, clean silhouette, readable at close game zoom. Transparent background required. Sticker-style cutout asset. No ground tile. No grass base. No sidewalk. No road. No path. No trees. No bushes. No props outside the building footprint. No floating shadow plane. No cut-off corners. No clipped porch. No clipped roof. Three-quarter isometric angle.${detailText} No text labels. No UI.`;
}

export function AssetMakerPanel({ state }: AssetMakerPanelProps): JSX.Element {
  const [type, setType] = useState<BuildType>('house');
  const [details, setDetails] = useState('');
  const [artStyle, setArtStyle] = useState<(typeof ART_STYLES)[number]['id']>('cozy-builder');
  const [status, setStatus] = useState('Generate one custom building, then place it once. Roads and core non-custom tools stay in the left palette.');
  const [busy, setBusy] = useState(false);

  const generationCost = ASSET_GENERATION_COST[type];
  const selectedBuilding = useMemo<Building | null>(
    () => state.buildings.find((building) => building.id === state.selectedBuildingId) ?? null,
    [state.buildings, state.selectedBuildingId]
  );
  const queuedAsset = state.pendingBuildAsset;
  const queuedMatchesType = queuedAsset?.type === type;
  const selectedMatchesType = selectedBuilding?.type === type;

  const generate = async (): Promise<void> => {
    if (busy) return;
    if (!INFINITE_MONEY && state.resources.money < generationCost) {
      setStatus(`Not enough money. ${BUILDING_ECONOMY[type].name} builds cost $${generationCost}.`);
      return;
    }

    setBusy(true);
    setStatus(`Generating a new ${BUILDING_ECONOMY[type].name.toLowerCase()}...`);

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
        name: details.trim() ? details.trim().slice(0, 32) : `${BUILDING_ECONOMY[type].name} ${new Date(stamp).toLocaleTimeString()}`,
        prompt: buildPrompt(type, details, artStyle),
        imageUrl,
        artStyle,
        createdAt: stamp,
        cost: generationCost
      };

      const result = queueGeneratedAsset(type, variation);
      if (!result.ok) {
        throw new Error(result.error || 'Could not queue the new building.');
      }

      setPlacementMode(type);
      setStatus(`${BUILDING_ECONOMY[type].name} queued. Place it once on the map, or apply it to the selected ${BUILDING_ECONOMY[type].name.toLowerCase()}.`);
      setDetails('');
    } catch (error) {
      setStatus(`Asset generation failed: ${String((error as Error).message || error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="pointer-events-auto panel-glass max-h-[calc(100vh-11.5rem)] overflow-y-auto rounded-2xl p-4 text-slate-100 shadow-glow">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.18em] text-amber-200">Asset Maker</div>
        <div className="text-[11px] text-slate-300">Single-use custom buildings</div>
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
        {INFINITE_MONEY
          ? `New ${BUILDING_ECONOMY[type].name} build cost: $${generationCost} (budget limits disabled)`
          : `New ${BUILDING_ECONOMY[type].name} build cost: $${generationCost}`}
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
        placeholder="Example: cozy tan cottage with red tile roof, amber windows, compact porch, extra transparent margin"
        className="mt-3 h-24 w-full resize-none rounded-xl border border-slate-500/40 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300"
      />

      <div className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-400/8 px-3 py-2 text-[11px] leading-5 text-cyan-100">
        Game art rules: cozy block-scale city builder, clean isometric silhouette, no base or scenery, fit the {BUILDING_ECONOMY[type].name.toLowerCase()} inside its parcel, and leave generous transparent margin on every side.
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void generate();
          }}
          disabled={busy}
          className="rounded-xl border border-amber-300/60 bg-amber-400/16 px-3 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-400/28 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Generating...' : 'Generate New Building'}
        </button>
        <button
          type="button"
          onClick={() => setPlacementMode(type)}
          disabled={!queuedMatchesType}
          className="rounded-xl border border-cyan-300/50 bg-cyan-400/12 px-3 py-2 text-sm font-medium text-cyan-100 transition enabled:hover:bg-cyan-400/22 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Place Queued Building
        </button>
        <button
          type="button"
          onClick={() => clearPendingBuildAsset()}
          disabled={!queuedAsset}
          className="rounded-xl border border-slate-400/40 bg-slate-700/30 px-3 py-2 text-sm text-slate-100 transition enabled:hover:bg-slate-700/45 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Clear Queue
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-slate-500/30 bg-slate-900/45 p-3 text-sm text-slate-200">
        {status}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-500/30 bg-slate-900/35 p-3">
        <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-slate-300">Queued Build</div>
        {queuedAsset ? (
          <>
            <img src={queuedAsset.imageUrl} alt={queuedAsset.name} className="h-36 w-full rounded-xl object-contain bg-slate-950/40" />
            <div className="mt-2 text-sm font-medium text-slate-100">{queuedAsset.name}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">
              {BUILDING_ECONOMY[queuedAsset.type].name} · {ART_STYLES.find((style) => style.id === queuedAsset.artStyle)?.label ?? 'Custom'}
            </div>
            {selectedBuilding && selectedMatchesType ? (
              <button
                type="button"
                onClick={() => applyGeneratedAssetToBuilding(selectedBuilding.id, queuedAsset)}
                className="mt-3 w-full rounded-xl border border-emerald-300/50 bg-emerald-400/14 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/24"
              >
                Apply Queued Look To Selected Building
              </button>
            ) : null}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-500/35 bg-slate-900/25 p-4 text-xs text-slate-300">
            No custom building is queued right now. Generate one, then place it once on the map.
          </div>
        )}
      </div>
    </aside>
  );
}
