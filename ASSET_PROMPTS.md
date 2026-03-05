# Cozy Town Asset Prompt Pack (OpenAI Image)

This game now supports higher-detail sprite art. The map is a cozy town scale and loads custom assets from `public/assets/`.

## Recommended model
- `gpt-image-1` (best quality)
- If available in your account, you can test smaller variants, but quality should be validated visually.

## Art direction (global)
Use this style prefix in every prompt:

"Top-down cozy town city-builder asset, hand-painted illustration style, soft lighting, high-detail, clean silhouette, readable at small scale, no text, no border, transparent background where appropriate, family-friendly, warm color palette, modern indie game quality."

## Resolution and export
- Generate at 1024x1024 or 1536x1536, then downscale/crop to 128x128 PNG.
- Final runtime asset size expected by the game: `128x128`.
- Keep filenames exact.

## Terrain assets
- `terrain_grass.png`
- `terrain_forest.png`
- `terrain_hill.png`
- `terrain_water0.png`
- `terrain_water1.png`

Prompt template (terrain):
"{global style}. Single seamless square ground tile for {terrain type}. Top-down orthographic. No buildings, no roads. 128x128 target composition."

## Roads
Generate all 16 road connection masks:
- `road_0.png` ... `road_15.png`

Prompt template (roads):
"{global style}. Single top-down road tile on transparent background, asphalt with painted lane details, mask variant {mask id} where connections are represented by north/east/south/west exits. 128x128 target composition."

## Zoning buildings (4 levels each)
Residential:
- `res_0.png`, `res_1.png`, `res_2.png`, `res_3.png`

Commercial:
- `com_0.png`, `com_1.png`, `com_2.png`, `com_3.png`

Industrial:
- `ind_0.png`, `ind_1.png`, `ind_2.png`, `ind_3.png`

Prompt template (zones):
"{global style}. Single top-down building tile for {zone type}, density level {0-3}, transparent background, centered footprint, soft baked shadow, visually consistent with cozy town style."

## Service buildings
- `service_powerplant.png`
- `service_park.png`
- `service_school.png`
- `service_police.png`

Prompt template (services):
"{global style}. Single top-down service building tile for {service}, transparent background, centered, clear silhouette, cozy town aesthetic."

## Save location
Put all PNGs in:
- `public/assets/`

The game auto-loads these files. Missing files fall back to built-in art.

## Optional API workflow (from this app)
You can generate an image via backend endpoint:
- `POST /api/ai/generate-asset`

Example body:
```json
{
  "prompt": "Top-down cozy town city-builder asset ...",
  "size": "1024x1024",
  "filename": "terrain_grass.png"
}
```

If `filename` is provided, the server saves it under `public/assets/`.
