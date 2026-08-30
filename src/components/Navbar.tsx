import React from 'react';
import { CURRENT_GAME_VERSION } from '../data/loader';

export type ActiveView = 'optimizer' | 'planner' | 'perk-picker' | 'compare' | 'data';

interface NavbarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onOpenSettings: () => void;
  onOpenImport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  onOpenSettings,
  onOpenImport
}) => {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-title">NMRiH2 Combat Optimizer</div>
        <span className="brand-badge">Patch {CURRENT_GAME_VERSION}</span>
      </div>

      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeView === 'optimizer' ? 'active' : ''}`}
          onClick={() => setActiveView('optimizer')}
        >
          ⚔️ Combat Optimizer
        </button>
        <button
          className={`nav-tab ${activeView === 'planner' ? 'active' : ''}`}
          onClick={() => setActiveView('planner')}
        >
          📋 Build Planner
        </button>
        <button
          className={`nav-tab ${activeView === 'perk-picker' ? 'active' : ''}`}
          onClick={() => setActiveView('perk-picker')}
        >
          🎲 RNG Perk Picker
        </button>
        <button
          className={`nav-tab ${activeView === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveView('compare')}
        >
          📊 Breakpoint Matrix
        </button>
        <button
          className={`nav-tab ${activeView === 'data' ? 'active' : ''}`}
          onClick={() => setActiveView('data')}
        >
          📚 Data & Methodology
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
