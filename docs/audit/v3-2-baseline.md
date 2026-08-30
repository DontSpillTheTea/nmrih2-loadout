# Baseline Audit Report (Contract V3.2 - Gate 0)

Date: 2026-08-30
Current Commit: `925ffd6`

## 1. Current Source Inspection
* **Application Title**: Currently `NMRiH2 Combat Optimizer` (in `src/components/Navbar.tsx` line 20 and `index.html`). Needs rename to `NMRiH2 Loadouts`.
* **Optimizer Headings & Panel Titles**:
  * Heading: `Ranked Legal Combat Recipes` (in `src/views/OptimizerView.tsx`). Needs rename to `Optimal Attacks`.
  * Left Panel: `Target & Weapon` -> Needs rename to `Enemy and Weapon`.
  * Field 1: `Target Enemy` -> Needs rename to `Enemy`.
  * Field 2: `Active Weapon` -> Needs rename to `Weapon`.
  * Goal Panel: `Goal & Optimization Priority` -> Needs rename to `Goal`.
  * Right Rail: `Perks & Build Rail` -> Needs rename to `Perks`.
* **Action Sequence Rendering & Literal `&rarr;` Bug**:
  * In `src/views/OptimizerView.tsx`: `recipe.logs.map(l => `${l.resolvedActionName}`).join(' &rarr; ')` passed literal string `" &rarr; "` into JSX, rendering raw text `&rarr;` in browser!
  * Also in `src/components/StepBreakdownModal.tsx` lines 38, 48, 49.
  * Correct fix: Use unicode arrow character `" → "` or SVG `ArrowRight`.
* **Firearms Availability & Compare Matrix**:
  * Normalized data contains 15 firearms across 4 classes (Handguns, SMGs, Shotguns, Rifles).
  * `OptimizerView.tsx` has Melee and Firearms in dropdown.
  * `CompareMatrixView.tsx` currently only loops `getMeleeWeapons()`. Needs tabbed/filtered support for Firearms showing shots to kill and armor penetration status.
* **Control Action Generation Rules in Solver (`src/solver/index.ts`)**:
  * Currently pushes `shove` (body) and `kick` (body) into `legalInputs` on every node if `allowShove` or `allowKick` is true.
  * When target is already Downed or controlled, non-damaging Shoves/Kicks were still evaluated, causing redundant sequences like `Shove -> Kick -> Shove -> Shoot` or `Kick -> Shove` against armored targets (e.g., Gruber Mk VII vs National Guard).
  * Needs `getUsefulLegalActions(state, context)` to separate mechanical legality from goal-directed useful action generation.

GATE 0: PASS
