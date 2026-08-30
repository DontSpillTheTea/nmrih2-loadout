import React, { useState, useEffect } from 'react';
import { Navbar, type MainTab, type SubTab } from './components/Navbar';
import { OptimizerView } from './views/OptimizerView';
import { BuildPlannerView } from './views/BuildPlannerView';
import { PerkPickerView } from './views/PerkPickerView';
import { CompareMatrixView } from './views/CompareMatrixView';
import { DataMethodologyView } from './views/DataMethodologyView';
import { SettingsModal } from './components/SettingsModal';
import { ImportExportModal } from './components/ImportExportModal';
import { loadAppState, saveAppState } from './storage';
import type { AppState, Responder, Loadout, CombatScenario } from './types';
import './styles/app.css';

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [mainTab, setMainTab] = useState<MainTab>('combat');
  const [subTab, setSubTab] = useState<SubTab>('optimize');
  const [isDataMethodologyOpen, setIsDataMethodologyOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [importExportModal, setImportExportModal] = useState<{
    isOpen: boolean;
    mode: 'import' | 'export_build' | 'export_responder' | 'export_scenario';
  }>({
    isOpen: false,
    mode: 'import'
  });

  // Sync to localStorage
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  const activeResponder = appState.responders.find(r => r.id === appState.activeResponderId) || appState.responders[0];
  const activeLoadout = activeResponder.loadouts.find(l => l.id === activeResponder.activeLoadoutId) || activeResponder.loadouts[0];

  const handleSelectTab = (main: MainTab, sub: SubTab) => {
    setMainTab(main);
    setSubTab(sub);
  };

  const handleSelectResponder = (id: string) => {
    setAppState(prev => ({
      ...prev,
      activeResponderId: id
    }));
  };

  const handleUpdateResponder = (updated: Responder) => {
    setAppState(prev => ({
      ...prev,
      responders: prev.responders.map(r => (r.id === updated.id ? updated : r))
    }));
  };

  const handleCreateResponder = (newResp: Responder) => {
    setAppState(prev => ({
      ...prev,
      responders: [...prev.responders, newResp],
      activeResponderId: newResp.id
    }));
  };

  const handleDeleteResponder = (id: string) => {
    if (appState.responders.length <= 1) return;
    setAppState(prev => {
      const remaining = prev.responders.filter(r => r.id !== id);
      return {
        ...prev,
        responders: remaining,
        activeResponderId: remaining[0].id
      };
    });
  };

  const handleToggleOptimizerPerk = (perkId: number) => {
    const isEquipped = activeResponder.perkIds.includes(perkId);
    let newPerkIds: number[];
    if (isEquipped) {
      newPerkIds = activeResponder.perkIds.filter(id => id !== perkId);
    } else {
      if (activeResponder.perkIds.length >= 10) {
        alert('Maximum of 10 perk slots reached.');
        return;
      }
      newPerkIds = [...activeResponder.perkIds, perkId];
    }

    handleUpdateResponder({
      ...activeResponder,
      perkIds: newPerkIds,
      updatedAt: new Date().toISOString()
    });
  };

  const handleImportSuccess = (decoded: any) => {
    if (decoded.type === 'B') {
      const newLoadout = decoded.data as Loadout;
      const updated: Responder = {
        ...activeResponder,
        loadouts: [...activeResponder.loadouts.filter(l => l.id !== newLoadout.id), newLoadout],
        activeLoadoutId: newLoadout.id,
        updatedAt: new Date().toISOString()
      };
      handleUpdateResponder(updated);
      alert(`Imported build "${newLoadout.name}" successfully!`);
    } else if (decoded.type === 'C') {
      const newResp = decoded.data as Responder;
      handleCreateResponder(newResp);
      alert(`Imported Responder profile "${newResp.name}" successfully!`);
    } else if (decoded.type === 'S') {
      const scenario = decoded.data as CombatScenario;
      alert(`Imported combat scenario "${scenario.name}" successfully!`);
    } else if (decoded.type === 'A') {
      const restored = decoded.data as AppState;
      setAppState(restored);
      alert('Full application backup restored successfully!');
    }
  };

  return (
    <div className="app-root">
      <Navbar
        mainTab={mainTab}
        subTab={subTab}
        onSelectTab={handleSelectTab}
        onOpenDataMethodology={() => setIsDataMethodologyOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenImport={() => setImportExportModal({ isOpen: true, mode: 'import' })}
      />

      <main>
        {mainTab === 'combat' && subTab === 'optimize' && (
          <OptimizerView
            selectedPerkIds={activeResponder.perkIds}
            onTogglePerk={handleToggleOptimizerPerk}
          />
        )}

        {mainTab === 'combat' && subTab === 'compare' && (
          <CompareMatrixView selectedPerkIds={activeResponder.perkIds} />
        )}

        {mainTab === 'builds' && subTab === 'planner' && (
          <BuildPlannerView
            responders={appState.responders}
            activeResponderId={appState.activeResponderId}
            onSelectResponder={handleSelectResponder}
            onUpdateResponder={handleUpdateResponder}
            onCreateResponder={handleCreateResponder}
            onDeleteResponder={handleDeleteResponder}
            onOpenExport={mode => setImportExportModal({ isOpen: true, mode })}
          />
        )}

        {mainTab === 'builds' && subTab === 'perk-picker' && (
          <PerkPickerView activeResponder={activeResponder} />
        )}
      </main>

      {isDataMethodologyOpen && (
        <div className="modal-overlay" onClick={() => setIsDataMethodologyOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px' }}>
            <DataMethodologyView onClose={() => setIsDataMethodologyOpen(false)} />
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        appState={appState}
        onStateUpdate={setAppState}
      />

      <ImportExportModal
        isOpen={importExportModal.isOpen}
        onClose={() => setImportExportModal({ ...importExportModal, isOpen: false })}
        mode={importExportModal.mode}
        activeLoadout={activeLoadout}
        activeResponder={activeResponder}
        appState={appState}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
};
