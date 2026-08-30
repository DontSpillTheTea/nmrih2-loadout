# Melee Timing Coverage Audit (Timing Checkpoint T-F)

**Date**: 2026-08-30  

---

## Timing Status Matrix across All 19 Melee Weapons

| Weapon | PlayRate Sourced | Impact AnimNotify Extracted | Combo Buffer Window Extracted | Timing Verification Status |
|---|---|---|---|---|
| **Kitchen Knife** | YES (1.2x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Cleaver** | YES (1.2x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Hatchet** | YES (1.0x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Machete** | YES (1.0x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Shovel** | YES (1.0x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Fire Axe** | YES (1.0x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Treetrimmer** | YES (1.0x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Claw Hammer** | YES (1.2x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Pipe (Small)** | YES (1.0x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Wrench (Small)** | YES (1.0x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Tire Iron** | YES (1.0x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Mallet** | YES (1.0x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Crowbar** | YES (1.2x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Rebar** | YES (1.0x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Wrench (Large)** | YES (1.0x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Baseball Bat** | YES (1.0x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Pipe (Large)** | YES (1.0x) | NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Sledge Hammer** | YES (0.85x)| NO | NO | APPROXIMATE (PlayRate Scaled) |
| **Hockey Stick** | YES (1.0x) | NO | NO | APPROXIMATE (PlayRate Scaled) |

---

## Conclusion & Governance Policy
- No weapon currently possesses verified frame-by-frame Unreal AnimNotify timing.
- All displayed timing metrics in the application are strictly labeled with `~` and annotated as **PlayRate-Scaled Estimates**.
- Fast Kill optimization ranks primary by action count and PlayRate-weighted speed, with full transparency.
