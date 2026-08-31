# Public Alpha Release Baseline Audit

**Date**: 2026-08-30  
**Release Branch**: `public-alpha`  
**Base Commit**: `f87355d`  
**Application Version**: `0.1.0-alpha`  
**NMRiH2 Target Version**: `1.0.4.0`  
**Steam App ID**: `292000` | **Steam Build ID**: `24830003`  
**Initial Passing Tests**: 48 passed (across 9 test files)  
**TypeScript Typecheck**: Passed (0 errors)  
**Vite Production Build**: Passed (`dist/`)  

---

## Release Hardening Goals for Public Alpha
1. Add unobtrusive `Early Alpha` indicator in the header bar.
2. Clearly label unverified timing and ensure approximate timing does not drive authoritative rankings.
3. Mark armored calculations with clear `Experimental armor model` tags.
4. Add compact dimension-specific confidence indicators (`Damage ✓`, `Stamina ✓`, `Timing —`, `Armor —`).
5. Implement client-side `Report a Bad Result` feedback workflow with structured diagnostic bundles and GitHub issue links.
6. Verify state persistence, perk tri-state toggles, and scenario share codes.
7. Update `README.md` and create `CHANGELOG.md`.
