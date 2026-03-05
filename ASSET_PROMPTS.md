# Skyline Protocol Asset Prompt Pack

Use these prompts in your image model workflow to generate 32x32 pixel-art sprites with transparent backgrounds.

## Global style prompt
Create a top-down 2D city-builder pixel-art sprite, exactly 32x32 pixels, transparent background, crisp edges, no anti-aliased blur, no text, no border, retro 1990s simulation game style, readable at small size.

## Terrain
### Grass
Top-down grass tile, rich green variation, subtle noise, seamless edge matching, 32x32, transparent outside tile bounds.

### Forest
Top-down dense forest tile with clustered tree canopies, dark and light green tones, seamless tile, 32x32.

### Hill
Top-down raised hill terrain tile with soft shading indicating elevation, earthy green palette, seamless tile, 32x32.

### Water A
Top-down water tile with small wave highlights, bright blue palette, seamless tile, 32x32.

### Water B
Top-down water tile variation with different wave pattern, bright blue palette, seamless tile, 32x32.

## Roads
Generate 16 road connection tiles, one for each bitmask (0-15), top-down asphalt road on transparent background where needed, subtle lane highlight.

Naming required:
- `road_0.png` ... `road_15.png`

## Zones (4 density levels each)
Generate 4 density levels for each zone type.

Residential:
- `res_0.png` low density house
- `res_1.png` small apartments
- `res_2.png` mid-rise block
- `res_3.png` high-rise block

Commercial:
- `com_0.png` corner shops
- `com_1.png` small office strip
- `com_2.png` mid-rise commercial block
- `com_3.png` high-rise business block

Industrial:
- `ind_0.png` small workshop
- `ind_1.png` factory shed
- `ind_2.png` large factory
- `ind_3.png` heavy industrial complex

## Services
- `service_powerplant.png` power plant
- `service_park.png` city park
- `service_school.png` school building
- `service_police.png` police station

## Export checklist
- PNG format
- 32x32 exact
- transparent background
- no padding/margins
- filename matches exactly

## Install path
Put all PNG files in:
`public/assets/`

The game auto-loads these assets and falls back to built-in sprites if any file is missing.
