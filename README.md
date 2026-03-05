# Cozy Town Builder (Vertical Slice)

Modern-looking web city builder prototype focused on visuals and interaction polish.

## Stack
- Vite + React + TypeScript
- Three.js (scene/rendering)
- Tailwind CSS (UI overlay)

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Folder Structure
```text
src/
  game/
    state.ts      # pure data model + lightweight store
    actions.ts    # placement/select/cancel/validity/resource updates
    render.ts     # Three.js scene, camera, lighting, meshes, loop
    input.ts      # raycast pointer input + camera controls + hotkeys
  components/
    BuildMenu.tsx
    InfoPanel.tsx
    TopBar.tsx
  App.tsx
  main.tsx
  index.css
```

## Controls
- Left click: place (in build mode) or select building
- Right click / Esc: cancel placement
- Mouse wheel: zoom
- Drag RMB/MMB: pan
- WASD / Arrow keys: pan

## Included Vertical Slice Features
- Isometric-style angled camera with smoothing
- 40x40 grid with subtle terrain variation
- Build menu: Road, House, Power Plant
- Hover highlight + ghost preview with valid/invalid color
- Placement with grid snap and no-overlap rules
- Selection and right-side info panel
- Top HUD with Money, Population, Power updates
- Soft shadows, directional + ambient light, subtle fog
- Placement feedback (pulse + small scale pop)
