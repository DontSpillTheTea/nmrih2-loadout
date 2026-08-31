import React from 'react';
import { CURRENT_GAME_VERSION } from '../data/loader';

export type MainTab = 'optimize' | 'compare' | 'builds';

interface NavbarProps {
  mainTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  onOpenDataMethodology: () => void;
  onOpenSettings: () => void;
  onOpenImport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mainTab,
  onSelectTab,
  onOpenDataMethodology,
  onOpenSettings,
  onOpenImport
}) => {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-title">NMRiH2 Loadouts</div>
        <button
          className="brand-badge"
          style={{ cursor: 'pointer', background: 'none', textAlign: 'left' }}
          title="Click to inspect verified Patch Data & Provenance"
          onClick={onOpenDataMethodology}
        >
          Game Patch {CURRENT_GAME_VERSION} 📚
        </button>
      </div>

      <nav className="nav-tabs">
        <button
          className={`nav-tab ${mainTab === 'optimize' ? 'active' : ''}`}
          onClick={() => onSelectTab('optimize')}
        >
          ⚔️ Combat Optimizer
        </button>
        <button
          className={`nav-tab ${mainTab === 'compare' ? 'active' : ''}`}
          onClick={() => onSelectTab('compare')}
        >
          📊 Compare Matrix
        </button>
        <button
          className={`nav-tab ${mainTab === 'builds' ? 'active' : ''}`}
          onClick={() => onSelectTab('builds')}
        >
          📋 Builds & Responders
        </button>
      </nav>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-sm" onClick={onOpenImport}>
          📥 Import Code
        </button>
        <button className="btn btn-sm" onClick={onOpenSettings}>
          ⚙️ Settings & Info
        </button>
      </div>
    </header>
  );
};
