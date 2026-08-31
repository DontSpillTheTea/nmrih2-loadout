# V7 Local Shipping Game vs. Compendium Cross-Check Report (Section 19)

**Date**: 2026-08-30  
**Target Game Version**: 1.0.4.0  

---

## Comparison Summary Table

| Mechanic Entity | Local Shipping Game Evidence | Compendium / Sheet Model | Classification | Selected Production Handling |
|---|---|---|---|---|
| **Stamina Cost Execution** | `KExecution_LightAttackConsumeStamina` (Float Attribute) | Integer base costs (5/7/13 etc.) | `MATCH` | Model preserves full floating precision internally. |
| **Hitman 1-Handed Perk** | `GE_Hitman`, `SD_1hMelee_Hitman` | +30% Damage, +15% Stamina | `MATCH` | Applies to all 1-handed melee attacks (Quick, Strong, Charged). |
| **Bullet Penetration Routing**| `DamageFalloffPerPenetration` & `StabilityFalloffPerPenetration` in `UKAttributeSet_Item` | Binary pass/fail penetration threshold (0-3) | `SHIPPING_DIFFERS` | Penetration falloff acknowledged as game feature; binary threshold used as conservative lower bound. |
| **SWAT / Riot Helmet Hit** | `KIncomingDamageModifier_SwatHelmet` | 60 HP Durability, Pen Req 2 | `MATCH` | Handled via dedicated incoming damage routing. |
| **Knockdown / Downed 2x** | `KGameplayAbility_BecomeDowned`, `IsDowned` | 2.0x Damage Bonus on Knocked down | `MATCH` | Official 2.0x multiplier active across transitions. |
| **Melee Timing Montages** | `Play_Cleaver_Action_Attack_*` audio/anim events | PlayRate approximations (1.2x etc.) | `LOCAL_ONLY` | Authoritative exact Fast Kill disabled; labeled as PlayRate estimates (`~`). |
