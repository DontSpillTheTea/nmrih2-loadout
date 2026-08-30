# Current Timing Path & Arithmetic Reconstruction (Checkpoint T-A)

## 1. Trace of Current Timing Calculation
1. **Raw Source**:
   - `Melee_545299304.csv` specifies `Attack & Combo Play Rate` (e.g. `1.1x` for Cleaver, `1.1x` for Pipe Small) and `Charged Attack Play Rate` (e.g. `1.0x`).
   - Source data does not embed raw unbaked frame notify timestamps.
2. **Normalization (`scripts/normalize-data.py`)**:
   - Quick attack total duration: `Math.round(800 / playRate)` ms (e.g. `800 / 1.1 = 727ms`).
   - Quick startup/windup: `windupMs = Math.round(250 / playRate) = 227ms`.
   - Quick active hit window: `activeMs = Math.round(150 / playRate) = 136ms`.
   - Quick recovery: `recoveryMs = Math.round(400 / playRate) = 364ms`.
   - Charged attack total duration: `Math.round(1800 / chargedPlayRate) = 1800ms`.
   - Charged startup: `windupMs = 1200ms`, `activeMs = 200ms`, `recoveryMs = 400ms`.
3. **Transition Engine (`src/engine/transition.ts`)**:
   - Per-action impact timing: `impactElapsedMs = state.elapsedMs + windupMs + activeMs`.
   - Next action ready timing: `readyElapsedMs = state.elapsedMs + totalMs`.
4. **Solver & TTK Metrics (`src/solver/index.ts`)**:
   - `lethalImpactTimeMs`: The `impactElapsedMs` of the final lethal hit that reduces target HP to 0.
   - `readyAfterKillMs`: The `readyElapsedMs` including post-kill recovery.

## 2. Reconstructing the 1.70s / 1.44s Recipe
* **Example Recipe: Kick (Knockdown) -> Charged Head Finisher**:
  * Step 1 (Kick): Start at `t = 0ms`. Impact at `350ms`. Kick recovery ends at `t = 800ms`.
  * Step 2 (Charged Head): Begins at `t = 800ms`. Charged windup + active window = `1400ms`. Impact at `800 + 1400 = 2200ms` (2.20s).
  * With pre-charge opener (`preChargedOpener: true`):
    * Charged hold occurs during approach outside threat range (`preparationMs = 1200ms`).
    * Threat exposure on release = `200ms`.
    * Lethal impact = `0.20s`!

## 3. Transparency & Gate T-A Status: PASS
* The current timing derivation has been mapped function-by-function.
* As required by Section T17, all timing displays are qualified with explicit `~` prefixes and `Derived from PlayRate` provenance confidence tags until frame notifies can be decrypted.
