# Cozy Town Asset Prompts (Simple Version)

Use short prompts. One asset per prompt.

## Model
- Use: `gpt-image-1`

## Core style line (prepend to every prompt)
Top-down cozy town game asset. Digital painting style. Warm colors. Clean shape. No text. No logo. Transparent background.

## Output rules
- Generate square image.
- Save as PNG.
- Crop/resize final file to `128x128`.
- Put files in `public/assets/`.
- Use exact filenames.

## Terrain prompts
- `terrain_grass.png`
  - "Create one seamless grass tile. Top-down view. No roads. No buildings."
- `terrain_forest.png`
  - "Create one seamless forest tile with tree canopy. Top-down view."
- `terrain_hill.png`
  - "Create one seamless hill tile with soft slope shading. Top-down view."
- `terrain_water0.png`
  - "Create one seamless water tile with soft ripples. Top-down view."
- `terrain_water1.png`
  - "Create one seamless water tile variant with a different ripple pattern. Top-down view."

## Road prompts
- `road_0.png` ... `road_15.png`
- For each file use:
  - "Create one road tile. Top-down view. Transparent background. Connection mask = X."
  - Replace `X` with the mask number.

## Zone prompts
- Residential: `res_0.png` ... `res_3.png`
  - "Create one residential building tile. Density level X. Top-down view."
- Commercial: `com_0.png` ... `com_3.png`
  - "Create one commercial building tile. Density level X. Top-down view."
- Industrial: `ind_0.png` ... `ind_3.png`
  - "Create one industrial building tile. Density level X. Top-down view."

## Service prompts
- `service_park.png`
  - "Create one park tile with paths and trees. Top-down view."
- `service_school.png`
  - "Create one school tile. Top-down view. Centered building."
- `service_police.png`
  - "Create one police station tile. Top-down view. Centered building."
- `service_powerplant.png`
  - "Create one small power plant tile. Top-down view. Centered building."

## API endpoint in this app
- `POST /api/ai/generate-asset`

Body example:
```json
{
  "prompt": "Top-down cozy town game asset... Create one seamless grass tile.",
  "size": "1024x1024",
  "filename": "terrain_grass.png"
}
```
