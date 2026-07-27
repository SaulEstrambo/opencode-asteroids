# AGENTS.md

## Project

Single-file HTML5 Canvas game (Asteroids clone). Zero dependencies, no build step.

- `index.html` — entry point (opens `game.js`)
- `game.js` — all game logic (~560 lines)
- Language: Spanish (UI text, comments, README)

## Run

Open `index.html` in a browser, or `npx serve .` and visit `localhost:3000`.

No build, lint, test, or typecheck commands exist. The entire codebase is one vanilla JS file with `'use strict'`.

## Architecture

- Canvas is fixed 800x600. Game loop uses `requestAnimationFrame` with delta-time capped at 50ms.
- World wraps toroidally (edges connect). Use the `wrap()` helper for all position updates.
- Game states: `'menu'` | `'playing'` | `'dead'` | `'gameover'` — managed via the `state` variable, not classes.
- Input: `keys` map (held) and `justPressed` map (one-shot via `pressed()`). Never poll `keydown` directly in game logic.

## Skins System

- 5 ship skins defined in `SKINS[]` array (CLÁSICA, NÉON, FUEGO, FANTASMA, ROBO).
- Each skin has: `name`, `stroke` (color), `glow` (optional shadow color), `thrustColor`, `verts` (2D polygon vertices).
- `skinIndex` tracks selected skin (0–4). Persisted in `localStorage` key `'asteroids_skin'`.
- Menu state (`'menu'`): ← → to cycle skins, Space to start game.
- `Ship.draw()` and `drawLifeIcon()` read from `SKINS[skinIndex]` for silhouette and colors.

## Conventions

- All constants (radii, speeds, points) are in lookup arrays indexed by asteroid `size` (1=small, 2=medium, 3=large). Size 0 is unused padding.
- Collision detection uses circle-distance (`dist()`) with a 0.82 radius multiplier for ship-vs-asteroid.
- No modules, no imports, no transpilation. Keep it that way.
