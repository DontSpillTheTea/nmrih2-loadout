import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Shipping Game Extraction Verification (Contract V7)', () => {
  const extractedDir = path.resolve(__dirname, '../data/raw/local-game/extracted');

  it('SHIPPING_GAME_VERIFICATION: Validates local extraction manifest and package count', () => {
    const manifestPath = path.join(extractedDir, 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.steamAppId).toBe(292000);
    expect(manifest.steamBuildId).toBe(24830003);
    expect(manifest.gameVersion).toBe('1.0.4.0');
    expect(manifest.totalContainers).toBe(93);
    expect(manifest.unencryptedContainers).toBe(46);
    expect(manifest.totalPackagesEnumerated).toBeGreaterThan(50000);
    expect(manifest.globalNamesExtracted).toBeGreaterThan(40000);
  });

  it('SHIPPING_GAME_VERIFICATION: Confirms presence of native combat classes in global names', () => {
    const namesPath = path.join(extractedDir, 'combat-global-names.json');
    expect(fs.existsSync(namesPath)).toBe(true);

    const names: string[] = JSON.parse(fs.readFileSync(namesPath, 'utf-8'));
    expect(names).toContain('KAttributeSet_Stamina');
    expect(names).toContain('KAttributeSet_Stability');
    expect(names).toContain('KExecution_StabilityDamage');
    expect(names).toContain('KIncomingDamageModifier_SwatHelmet');
    expect(names).toContain('OnRep_DamageFalloffPerPenetration');
    expect(names).toContain('OnRep_StabilityFalloffPerPenetration');
    expect(names).toContain('EKBulletPenetrationType');
  });

  it('SHIPPING_RULE_CONFORMANCE: Validates Hitman 1h melee tag applicability', () => {
    const assetsPath = path.join(extractedDir, 'combat-asset-index.json');
    expect(fs.existsSync(assetsPath)).toBe(true);

    const assets: Array<{ path: string }> = JSON.parse(fs.readFileSync(assetsPath, 'utf-8'));
    const hitmanAssets = assets.filter(a => a.path.includes('Hitman'));
    expect(hitmanAssets.length).toBeGreaterThan(0);
    expect(hitmanAssets.some(a => a.path.includes('GE_Hitman'))).toBe(true);
    expect(hitmanAssets.some(a => a.path.includes('SD_1hMelee_Hitman'))).toBe(true);
  });
});
