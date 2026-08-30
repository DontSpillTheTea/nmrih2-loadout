import React from 'react';
import { CURRENT_GAME_VERSION } from '../data/loader';

export type MainTab = 'combat' | 'builds';
export type SubTab = 'optimize' | 'compare' | 'planner' | 'perk-picker' | 'data';

interface NavbarProps {
  mainTab: MainTab;
  subTab: SubTab;
  onSelectTab: (main: MainTab, sub: SubTab) => void;
  onOpenDataMethodology: () => void;
  onOpenSettings: () => void;
  onOpenImport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mainTab,
  subTab,
  onSelectTab,
  onOpenDataMethodology,
  onOpenSettings,
  onOpenImport
}) => {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-title">NMRiH2 Combat Optimizer</div>
        <button
          className="brand-badge"
          style={{ cursor: 'pointer', background: 'none', textAlign: 'left' }}
          title="Click to view Data Methodology & Provenance"
          onClick={onOpenDataMethodology}
        >
          Patch {CURRENT_GAME_VERSION} 📚
        </button>
      </div>

      <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <div className="nav-tabs">
          <button
            className={`nav-tab ${mainTab === 'combat' && subTab === 'optimize' ? 'active' : ''}`}
            onClick={() => onSelectTab('combat', 'optimize')}
          >
            ⚔️ Optimize
          </button>
          <button
            className={`nav-tab ${mainTab === 'combat' && subTab === 'compare' ? 'active' : ''}`}
            onClick={() => onSelectTab('combat', 'compare')}
          >
            📊 Compare Matrix
          </button>
        </div>

        <div className="nav-tabs">
          <button
            className={`nav-tab ${mainTab === 'builds' && subTab === 'planner' ? 'active' : ''}`}
            onClick={() => onSelectTab('builds', 'planner')}
          >
            📋 Responders & Builds
          </button>
          <button
            className={`nav-tab ${mainTab === 'builds' && subTab === 'perk-picker' ? 'active' : ''}`}
            onClick={() => onSelectTab('builds', 'perk-picker')}
          >
            🎲 RNG Perk Picker
          </button>
        </div>
      </nav>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-sm" onClick={onOpenImport}>
          📥 Import Code
        </button>
        <button className="btn btn-sm" onClick={onOpenSettings}>
          ⚙️ Settings / Backup
        </button>
      </div>
    </header>
  );
};
