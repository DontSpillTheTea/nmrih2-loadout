# V6 Starting State Baseline Audit

**Date**: 2026-08-30  
**Current Branch**: `correctness-recovery-v5`  
**Current HEAD Commit**: `d472827`  
**Installed Steam Game Path**: `/mnt/d/SteamLibrary/steamapps/common/nmrih2` (25.17 GB)  
**Detected Steam App ID**: `292000`  
**Detected Steam Build ID**: `24830003`  
**Target Game Version**: `1.0.4.0`  
**Current Passing Test Count**: 45 passed (across 8 test files)  
**Current Build State**: Clean (`tsc && vite build` in `dist/`)  

---

## Directives for Contract V6
1. Do not touch visual CSS styling or layout redesigns.
2. Do not merge to `main` during this pass.
3. Preserve full fractional floating-point precision for internal stamina calculations.
4. Disable unverified precise Fast Kill timing in authoritative solver logic.
5. Re-audit and honestly document all armor/helmet conflicts and overflow hypotheses.
6. Reclassify all test suites by strict evidence taxonomy.
