# Melee Stamina Audit & Origin Report (Contract V5 - Section 5)

**Date**: 2026-08-30  
**Target Game Version**: 1.0.4.0  

---

## 1. Investigation of Historical/Suspicious 6/8 Stamina Values
- **Origin**: An earlier synthetic heuristic branch attempted to generalize stamina by archetype (e.g. `blunt one-handed = 6 quick, 8 strong`).
- **Disproven Status**: These generic formulaic numbers are **NOT accepted as truth**.
- **Evidence-Based Reality**: Stamina costs are assigned on an individual weapon level in the source data (`data/raw/tabs/Melee_545299304.csv`).

---

## 2. Evidence-Derived Melee Stamina Master Table

| Weapon | Category | Handedness | Quick Stamina | Strong Stamina | Charged Stamina | Sourced Provenance |
|---|---|---|---|---|---|---|
| **Kitchen Knife** | Bladed | One-Handed | **5** | **7** | **13** | `compendium:melee:kitchen-knife` |
| **Cleaver** | Bladed | One-Handed | **5** | **7** | **13** | `compendium:melee:cleaver` |
| **Hatchet** | Bladed | One-Handed | **5** | **7** | **13** | `compendium:melee:hatchet` |
| **Machete** | Bladed | One-Handed | **5** | **7** | **13** | `compendium:melee:machete` |
| **Shovel** | Bladed | Two-Handed | **7** | **13** | **18** | `compendium:melee:shovel` |
| **Fire Axe** | Bladed | Two-Handed | **10** | **13** | **13** | `compendium:melee:fire-axe` |
| **Treetrimmer** | Bladed | Two-Handed | **10** | **13** | **15** | `compendium:melee:treetrimmer` |
| **Claw Hammer** | Blunt | One-Handed | **5** | **7** | **13** | `compendium:melee:claw-hammer` |
| **Pipe (Small)** | Blunt | One-Handed | **7** | **13** | **15** | `compendium:melee:pipe-small` |
| **Wrench (Small)** | Blunt | One-Handed | **7** | **10** | **13** | `compendium:melee:wrench-small` |
| **Tire Iron** | Blunt | One-Handed | **5** | **7** | **13** | `compendium:melee:tire-iron` |
| **Mallet** | Blunt | One-Handed | **7** | **10** | **13** | `compendium:melee:mallet` |
| **Crowbar** | Blunt | One-Handed | **5** | **7** | **13** | `compendium:melee:crowbar` |
| **Rebar** | Blunt | Two-Handed | **10** | **13** | **18** | `compendium:melee:rebar` |
| **Wrench (Large)** | Blunt | Two-Handed | **10** | **13** | **15** | `compendium:melee:wrench-large` |
| **Baseball Bat** | Blunt | Two-Handed | **10** | **13** | **15** | `compendium:melee:baseball-bat` |
| **Pipe (Large)** | Blunt | Two-Handed | **10** | **13** | **15** | `compendium:melee:pipe-large` |
| **Sledge Hammer** | Blunt | Two-Handed | **10** | **13** | **15** | `compendium:melee:sledge-hammer` |
| **Hockey Stick** | Blunt | Two-Handed | **10** | **13** | **15** | `compendium:melee:hockey-stick` |

---

## 3. Universal Control Actions
- **Shove**: **15 stamina** (Official 1.0 Patchnotes explicitly document reduction from 20 to 15).
- **Kick**: **50 stamina** (Verified from compendium unarmed row 15).
