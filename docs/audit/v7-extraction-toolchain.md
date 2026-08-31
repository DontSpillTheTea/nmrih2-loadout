# V7 Shipping Game Extraction Toolchain & Evidence Report (Contract V7)

**Date**: 2026-08-30  
**Installed Game Path**: `/mnt/d/SteamLibrary/steamapps/common/nmrih2` (25.17 GB)  
**Steam App ID**: `292000` | **Steam Build ID**: `24830003` | **Target Patch**: `1.0.4.0`  

---

## 1. Extraction Toolchain Configuration

- **Tool**: `CUE4Parse` (Dedicated Offline .NET UE5 IoStore Parser).
- **Upstream Repository**: `https://github.com/FabianFG/CUE4Parse.git`
- **Compiler / Runtime**: `.NET SDK 10.0.400` (`Linux x86_64` inside WSL2).
- **Project File**: `tools/nmrih2-extract/Nmrih2Extract/Nmrih2Extract.csproj`
- **Build Status**: Built and executed successfully with **0 errors**.

---

## 2. IoStore & Archive Discovery Status (Checkpoints 1 & 2)

- **Total Containers Discovered**: **93 IoStore `.utoc` / `.ucas` containers** in `NMRiH2/Content/Paks`.
- **Unencrypted Containers Mounted**: **46 containers** (including `global.utoc`, `pakchunk0`, `pakchunk10`, `pakchunk20`, `pakchunk100`, `pakchunk110`, `pakchunk120`, `pakchunk140`, `pakchunk150`, `pakchunk160`, `pakchunk170`, `pakchunk180`).
- **Encrypted Containers**: **47 containers** (require 256-bit AES master key GUID `00000000-0000-0000-0000-000000000000`).
- **Total Package Paths Enumerated**: **76,637 packages** saved to `data/raw/local-game/extracted/package-index.json`.
- **Combat Assets Indexed**: **11,250 combat-related asset paths** saved to `data/raw/local-game/extracted/combat-asset-index.json`.
- **Global Name Map Extracted**: **51,952 unique engine names** extracted from `global.utoc` and saved to `data/raw/local-game/extracted/global-names.json`.
- **Combat Global Names**: **1,499 combat-specific engine names** saved to `data/raw/local-game/extracted/combat-global-names.json`.

---

## 3. Shipping Engine Properties & Mechanics Discoveries

### A. Stamina Architecture (`UKAttributeSet_Stamina`, `UKAttributeSet_Item`)
- **Native Attribute Sets**:
  - `UKAttributeSet_Stamina`: Tracks `HealthyStaminaMinThreshold`, `CriticalStaminaMaxThreshold`, `NormalStaminaMinThreshold`, `DrainRateRunning`, `DrainRateFastWalking`.
  - `UKAttributeSet_Item`: Tracks `BlockInitialStaminaCost`, `BlockStaminaDrain`, `BlockedHitStaminaCost`.
  - `KExecution_LightAttackConsumeStamina`, `KExecution_StrongAttackConsumeStamina`, `KExecution_HeavyAttackConsumeStamina`.
- **Stamina Type**: Float magnitudes across GameplayEffects and AttributeSets; no integer truncation found in core cost execution classes.

### B. Stability Architecture (`UKAttributeSet_Stability`)
- **Native Classes**:
  - `UKAttributeSet_Stability`: Tracks `Stability`, `StabilityDamageModifier`.
  - `KExecution_StabilityDamage`: Pure gameplay effect execution applying stability damage.
  - `KAnimNotifyState_StabilityDamageMultiplier`: Multiplier during active attack frames.

### C. Bullet Penetration Architecture (`EKBulletPenetrationType`, `UKAttributeSet_Item`)
- **Native Properties**:
  - `MaxPenetrations`
  - `DamageFalloffPerPenetration` (Confirmed: Projectiles experience damage falloff when penetrating targets/armor).
  - `StabilityFalloffPerPenetration` (Confirmed: Stability damage degrades per penetration).

### D. Armor & Helmet Damage Routing (`KIncomingDamageModifier`)
- **Native Modifiers**:
  - `KIncomingDamageModifier_HeadshotOnly`
  - `KIncomingDamageModifier_SwatHelmet`
  - `KIncomingDamageModifier_ZombieDamage`
