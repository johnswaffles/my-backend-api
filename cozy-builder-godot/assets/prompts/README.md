# GPT-Image Prompt Workflow

These prompt templates define how art assets should be generated for the game.

Workflow:
1. Choose an asset category and prompt template.
2. Generate a transparent-background image with GPT-Image.
3. Save the asset into the mapped folder under `assets/`.
4. Update `asset_manifest.json` if the asset name, variation, or direction changes.
5. The game loads the asset dynamically at runtime through `scripts/asset_loader.gd`.

Target pipeline:

`definition -> prompt template -> image file -> asset manifest -> runtime loader -> render node`
