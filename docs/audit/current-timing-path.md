# Current Timing Arithmetic & Trace Report (Timing Checkpoint T-A & T-E)

**Date**: 2026-08-30  
**Target Game Version**: 1.0.4.0  

---

## 1. Trace of Current Timing Arithmetic (Cleaver Example)

### Step 1: Raw Compendium Inputs (`Melee_545299304.csv`)
- Cleaver has:
  - Attack & Combo Play Rate: `1.2x`
  - Charged Attack Play Rate: `1.2x`

### Step 2: Normalization (`scripts/normalize-data.py`)
- Base synthetic templates:
  - Quick base: `totalMs = 680`, `windupMs = 240`, `activeMs = 100`, `recoveryMs = 340`
  - Charged base: `totalMs = 1400`, `windupMs = 680`, `activeMs = 150`, `recoveryMs = 570`
- Scaled by `playRate = 1.2x`:
  - Quick: `totalMs = 680 / 1.2 = 566ms`, `windupMs = 240 / 1.2 = 200ms`, `activeMs = 83ms`, `recoveryMs = 283ms`
  - Charged: `totalMs = 1400 / 1.2 = 1166ms`, `windupMs = 680 / 1.2 = 566ms`, `activeMs = 125ms`, `recoveryMs = 475ms`

### Step 3: Transition Engine Execution (`src/engine/transition.ts`)
- **Hit 1 (Pre-Charged Opener)**:
  - `isPreChargedFirstHit = true` $\rightarrow$ `actionStartupMs = 0ms` (held during approach)
  - `impactDurationMs = 0 + 125 = 125ms`
  - `recoveryDurationMs = 475ms`
  - `actionDurationMs = 600ms`
  - `impactElapsedMs = 0 + 125 = 125ms`
  - `readyElapsedMs = 0 + 600 = 600ms`
- **Hit 2 (Quick Follow-up)**:
  - `actionStartupMs = 200ms`, `activeMs = 83ms`
  - `impactDurationMs = 200 + 83 = 283ms`
  - `impactElapsedMs = 600ms + 283ms = 883ms (~0.88s)`
  - `readyElapsedMs = 600ms + 566ms = 1166ms (~1.17s)`

### Step 4: UI Representation
- Under `fastest_kill`, the lethal impact is displayed as `~0.88s` (Lethal Impact) and `Ready: ~1.17s`.
- For standard uncharged Quick attacks:
  - `Quick 1 (566ms total)` + `Quick 2 impact (283ms)` = `849ms` lethal impact.

---

## 2. Explanation of Timing Limitations (T-E)
1. The raw input from the compendium provides only aggregate `playRate` multipliers (e.g. `1.2x`, `1.0x`, `0.85x`).
2. Exact Unreal Engine `AnimNotify_MeleeDamage` frame timestamps and combo input buffer open/close windows require de-serializing UE5 IoStore `.ucas`/`.utoc` animation montages.
3. Therefore, all displayed timing numbers are **PlayRate-Scaled Approximations**, not absolute hardware frame captures.
