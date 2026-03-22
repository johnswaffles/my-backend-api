# Cozy Builder Asset Guidelines

Use these rules for every generated asset so the game stays rotation-safe and cohesive.

## Core visual direction
- Cozy isometric 3/4 builder aesthetic
- Stylized hand-painted indie look
- Neutral lighting only
- Soft, readable silhouettes at gameplay zoom
- Clean transparent backgrounds

## Lighting rules
- Do not bake top-left lighting into textures
- Do not bake hard directional highlights into one wall side
- Do not bake cast shadows into the image
- Allow only subtle ambient occlusion near contact points like wall bases, porch posts, stones, and props
- Let Godot handle the main light, shadow, and time-of-day response

## Perspective and framing
- Isometric 3/4 perspective
- Consistent horizon and camera angle across all assets
- Consistent scale relative to doors, windows, fences, sidewalks, cars, and people
- Keep front entrances and silhouettes readable from all four 90-degree camera rotations

## Materials and shapes
- Prefer rounded, cozy, handcrafted forms over sharp boxes
- Use slightly irregular roof lines, trim, fence posts, awnings, chimneys, and garden edges
- Avoid plastic surfaces and oversaturated colors
- Use warm earthy palettes with soft contrast

## Property design
- Every building sits on a full parcel, not just a single object
- Homes should include combinations of:
  - front yard
  - driveway
  - mailbox
  - fence
  - shrubs
  - flower beds
  - garden or pool
- Grocery stores should include:
  - parking
  - carts or crate areas
  - storefront signage
- Police stations should include:
  - forecourt
  - jail wing / secure yard feel
  - clear civic entrance
- Fire stations should include:
  - truck apron
  - bay frontage
  - civic signage

## Prompt template
Use a prompt like:

`Cozy isometric town-builder asset, stylized hand-painted indie aesthetic, neutral lighting, no baked directional light, no baked cast shadows, transparent background, readable silhouette, rounded cozy forms, consistent scale, production-quality game asset`

Then append the specific object description, for example:

- `single-family cozy house with fenced yard, mailbox, flower beds, and small pool`
- `small-town grocery store with storefront awning, parking lot, carts, and produce display`
- `corner fire station with truck apron, rounded bay doors, and civic sign`
