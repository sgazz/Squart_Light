# Change: Introduce inactive squares to Squart boards

## Why
We are defining the Squart ruleset, which extends Domineering by including blocked squares. The game needs a formal rule for the number and handling of inactive squares so that gameplay logic and UI can be implemented consistently.

## What Changes
- Specify how many squares become inactive based on the board size (17-19% of total) by default.
- Allow players to override the inactive percentage via UI (0–90%) while keeping a one-click default.
- Allow players to set independent horizontal and vertical dimensions (5–20 each) so rectangular boards are supported.
- Add turn management so Horizontal and Vertical players alternate automatically, enforce legal moves, and detect victories when an opponent cannot move.
- Define requirements for random distribution, visual indication of inactive squares, and move validation.

## Impact
- Affected specs: game-board
- Affected code: forthcoming Three.js board generator, game state logic
