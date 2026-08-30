
import { solveCombat } from "./src/solver/index.ts";
import { getWeaponById, getEnemyById, mechanics } from "./src/data/loader.ts";

const gruber = getWeaponById(107);
const walker = getEnemyById(1);

const recipes = solveCombat({
  weapon: gruber,
  perks: [],
  enemy: walker,
  mechanics,
  constraints: {
    requireFirstInterrupt: false,
    safeOpener: false,
    preChargedOpener: false,
    requireKnockdownBeforeKill: false,
    minStaminaReserve: 0,
    allowShove: true,
    allowKick: true,
    allowCharged: true,
    allowLimb: false,
    targetHitZone: "head",
    difficulty: "normal"
  },
  objective: "lowest_stamina",
  maxActions: 5
});

console.log("Found recipes:", recipes.length);
for (let i = 0; i < recipes.length; i++) {
  const r = recipes[i];
  console.log(i + 1, ":", r.actions.map(a => a.input.kind).join(" -> "), "Ammo:", r.totalAmmoSpent, "Stam:", r.totalStaminaSpent, "Actions:", r.totalActions);
}
