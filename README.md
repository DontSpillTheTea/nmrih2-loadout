# NMRiH2 Loadouts (Early Alpha)

Deterministic combat optimizer, breakpoint analyzer, and loadout planner for **No More Room in Hell 2 (NMRiH2)**.

- **App Version**: `0.1.0-alpha`
- **Target Game Patch**: `1.0.4.0` (Steam Build `24830003`)

---

## 🎯 What the Application Does

- **Combat Optimization**: Calculates optimal attack sequences to eliminate zombie types under user goals (Lowest Stamina, Fast Kill, Safe Control, Fewest Hits).
- **Breakpoint Analysis**: Identifies which perks actually reduce the required hit count against specific zombies.
- **Stamina & Resource Accounting**: Models exact floating-point stamina consumption and ammo usage across attacks and control moves.
- **Stability & Posture Simulation**: Evaluates opening actions (Shove, Kick, Heavy swings) that force Flinch, Interrupt, Stagger, or Knockdown (with official 2.0x downed damage).
- **Breakpoint Comparison Matrix**: Interactive 2D matrix comparing all weapons against all zombie archetypes with 1-shot / 2-shot kill indicators.
- **Zero-URL Code Sharing**: Compact, compressed, checksummed share codes (`N2B1-` Builds, `N2C1-` Responders, `N2S1-` Scenarios, `N2A1-` Backups).

---

## ⚠️ Public Alpha Known Limitations

This is an **early public alpha** intended to help players explore builds and report discrepancies.

1. **Melee Timing**: Wall-clock animation timings are currently approximate PlayRate estimates (`~`) while engine animation notifies are being extracted.
2. **Armored Targets**: National Guard, SWAT / Riot, and Firefighter helmets reflect documented durability and penetration thresholds, but breaking-hit damage overflow and bullet penetration falloff are experimental.
3. **Hit Registration**: Calculations assume ideal hit-zone contact. In actual gameplay, melee hit registration may vary based on proximity and swing angles.

---

## 📝 Reporting Discrepancies & Feedback

If you find a calculation or in-game result that does not match:
1. Click **📝 Report Result** directly inside the Optimal Attacks card or recipe breakdown.
2. Enter what happened in game (e.g. *"expected 2 hits but took 3"*).
3. Click **📋 Copy Report** or **🔗 Open GitHub Issue** to submit the structured diagnostic bundle.

---

## 💻 Development & Building

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run test suite
npm test

# Production build
npm run build
```
