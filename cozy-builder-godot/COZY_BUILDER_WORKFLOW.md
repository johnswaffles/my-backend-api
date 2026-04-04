# Cozy Builder Workflow

This Godot project is the source of truth for the game.

## Active project files
- Main scene: [`scenes/main_scene.tscn`](/Users/johnshopinski/Documents/New%20project/cozy-builder-godot/scenes/main_scene.tscn)
- Main game script: [`scripts/building_system.gd`](/Users/johnshopinski/Documents/New%20project/cozy-builder-godot/scripts/building_system.gd)
- Upgrade data: [`scripts/property_upgrade_data.gd`](/Users/johnshopinski/Documents/New%20project/cozy-builder-godot/scripts/property_upgrade_data.gd)

## Export path
- Export the Web build to: [`../public/godot-playtest/index.html`](/Users/johnshopinski/Documents/New%20project/public/godot-playtest/index.html)
- The exported files should stay together in that folder (`index.html`, `index.js`, `index.wasm`, `index.pck`, and related assets).

## Deployment path
1. Export from Godot into `public/godot-playtest`.
2. Sync the exported build into the website repo at `johnny-chat/public/cozy-builder`.
3. Push `johnny-chat` to GitHub.
4. Let Cloudflare Pages deploy the site.

## Rules
- Do not merge the Godot source repo into the website repo.
- Do not revive the old Cozy Builder wrapper page.
- Keep `/cozy-builder/` pointed at the live game export only.
