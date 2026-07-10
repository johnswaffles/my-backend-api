# Cozy Builder authored texture kit

These textures are the first vertical-slice materials for the upgraded visual
pipeline. Keep them as shared, reusable albedo resources rather than duplicating
them per building.

## Current materials

- `grass_meadow_albedo-v1.png`: painterly meadow albedo used by the continuous
  island surface.
- `asphalt_albedo-v1.png`: fine charcoal aggregate used by road surfaces.
- `cedar_shingles_albedo-v1.png`: warm handcrafted shingles used by red-roof
  house variants.

All three textures are generated without directional lighting so the Godot sun
and day/night cycle remain the source of lighting. Their import settings enable
mipmaps for stable isometric viewing in the WebGL build.

## Expansion rules

1. Use suffixes such as `-v2` rather than overwriting a reviewed texture.
2. Keep albedo textures free of baked shadows and strong highlights.
3. Prefer a small shared material library: plaster, timber, stone, brick,
   concrete, glass, painted metal, roof, road, grass, and soil.
4. Validate every material in the Web export; desktop renderer previews are not
   authoritative for this project.
5. Move new building visuals toward imported `.glb` scenes while retaining the
   gameplay placement and upgrade data.
