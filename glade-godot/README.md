# Glade

Glade is an original, browser-first cozy diorama builder made in Godot 4.6. It is inspired by the tactile, low-pressure appeal of freeform building toys, but uses its own code-generated art, interface, rules, and assets.

## First playable slice

- Draw procedural stone walls with staggered blocks, end piers, ivy, flowers, and lanterns.
- Draw paths that react to walls by cutting arched gateways and react to ponds by becoming wooden crossings.
- Drag cottage footprints to generate different sizes, stories, rooflines, windows, doors, chimneys, smoke, and gardens.
- Place round towers, ponds, trees, thickets, and flower beds.
- Erase, undo, redo, reset the meadow, orbit, pan, zoom, and cycle four lighting moods.
- Watch sheep, butterflies, chimney smoke, and night fireflies bring the diorama to life.
- Creations autosave in the browser through `user://glade_creation.json`.

## Project structure

- `scenes/main_scene.tscn` is the minimal boot scene.
- `scripts/glade_world.gd` owns the procedural grammar, interaction state, ambient world, and first-slice UI.
- `export_presets.cfg` exports to `../public/glade-playtest/` for deployment through the Johnny site.

The command list is the durable game-state boundary. Each user gesture becomes a small dictionary (`wall`, `path`, `cottage`, `tower`, `pond`, or `nature`), and the scene is rebuilt from those commands. This keeps undo/redo and future serialization straightforward while allowing new procedural reactions to be added without changing old saves.

## Run and export

```sh
/path/to/Godot --path glade-godot
/path/to/Godot --headless --path glade-godot --export-release Web public/glade-playtest/index.html
```

Glade is not affiliated with Pounce Light or Tiny Glade and does not contain their code or assets.
