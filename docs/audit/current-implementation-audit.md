# Current Implementation Audit & Discrepancy Analysis

## 1. Melee Action Legality Audit (Critical Fix)
* **Discrepancy**: The previous simulator generated illegal action sequences such as opening with a Strong melee attack from neutral (e.g., `Strong Head -> Strong Head -> Quick Head`).
* **Actual Gameplay Mechanics**:
  1. From neutral, tapping an attack direction (Left or Right) always performs a **Quick attack**.
  2. Alternating attack directions (`Left Tap -> Right Tap` or `Right Tap -> Left Tap`) performs chained **Quick attacks**.
  3. Repeating the same direction (`Left Tap -> Left Tap` or `Right Tap -> Right Tap`) performs a **Strong attack**.
  4. Holding an attack direction (`Hold Left` or `Hold Right`) performs a **Charged attack**.
  5. Shove (F key) and Kick (Space/V) are dedicated control inputs.
* **Remediation**: The combat model is refactored from searching abstract damage entries to searching **Legal Player Inputs** (`MeleeInput: { kind: 'tap' | 'hold' | 'shove' | 'kick', side: 'left' | 'right' }`). The combat state tracks `lastMeleeSide` and `lastAttackType` to deterministically resolve inputs into legal attacks.

## 2. Timing Accuracy & TTK Separation
* **Audit Finding**: Displaying a single time metric merged damage impact and recovery duration.
* **Remediation**:
  1. Separate **Lethal Impact Time** (`lethalImpactMs`: when lethal damage lands) from **Next Action Ready Time** (`readyAfterKillMs`: full swing recovery).
  2. Clearly tag timing provenance as `derived-from-playrate` with confidence `partially-verified`.

## 3. Share Code Families (N2S1 Scenario Code Gap)
* **Audit Finding**: Previous implementation supported `N2B1` (Build), `N2C1` (Character), and `N2A1` (Backup), but omitted `N2S1` (Scenario).
* **Remediation**: Implement `N2S1` scenario encoding/decoding and add comprehensive roundtrip tests.

## 4. UI Organization
* **Audit Finding**: Navigation was split across 5 top-level tabs.
* **Remediation**: Reorganize into standard 2-level hierarchy:
  * **Combat**: Optimize | Breakpoint Compare Matrix
  * **Builds**: Responder & Loadouts | In-Game RNG Perk Picker
  * **Data / Methodology**: Accessible via header patch badge and settings.
