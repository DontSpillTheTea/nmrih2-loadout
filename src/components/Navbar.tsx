import React from 'react';
import { CURRENT_GAME_VERSION, APP_VERSION, APP_BUILD_NAME } from '../data/loader';

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
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button
            className="brand-badge"
            style={{ cursor: 'pointer', background: 'none', textAlign: 'left' }}
            title="Click to inspect verified Patch Data & Provenance"
            onClick={onOpenDataMethodology}
          >
            Game Patch {CURRENT_GAME_VERSION} 📚
          </button>
          <span
            className="badge"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.18)',
              color: '#93c5fd',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              fontSize: '0.72rem',
              fontWeight: 700
            }}
            title="App Version and Build State"
          >
            App {APP_VERSION} ({APP_BUILD_NAME})
          </span>
        </div>
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
          ⚙️ Settings / Backup
        </button>
      </div>
    </header>
  );
};
