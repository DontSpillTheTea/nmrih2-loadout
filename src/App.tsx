import React, { useState, useEffect } from 'react';
import { Navbar, type MainTab } from './components/Navbar';
import { OptimizerView } from './views/OptimizerView';
import { BuildPlannerView } from './views/BuildPlannerView';
import { CompareMatrixView } from './views/CompareMatrixView';
import { DataMethodologyView } from './views/DataMethodologyView';
import { SettingsModal } from './components/SettingsModal';
import { ImportExportModal } from './components/ImportExportModal';
import { loadAppState, saveAppState } from './storage';
import { getLogicalPerkGroups } from './data/loader';
import type { AppState, Responder, Loadout, CombatScenario, OptimizerConstraints, OptimizerObjective } from './types';
import './styles/app.css';

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const [mainTab, setMainTab] = useState<MainTab>('optimize');
  const [activeEnemyId, setActiveEnemyId] = useState<number>(() => appState.activeEnemyId ?? 1); // 1 = Walker
  const [compareFilter, setCompareFilter] = useState<'all' | 'melee' | 'firearms'>(() => appState.compareWeaponFilter ?? 'all');
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
    saveAppState({
      ...appState,
      activeEnemyId,
      compareWeaponFilter: compareFilter
    });
  }, [appState, activeEnemyId, compareFilter]);

  const activeResponder = appState.responders.find(r => r.id === appState.activeResponderId) || appState.responders[0];
  const activeLoadout = activeResponder.loadouts.find(l => l.id === activeResponder.activeLoadoutId) || activeResponder.loadouts[0];

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

  const handleSelectWeaponId = (weaponId: number) => {
    const updatedLoadout: Loadout = {
      ...activeLoadout,
      weaponId
    };
    const updatedResp: Responder = {
      ...activeResponder,
      loadouts: activeResponder.loadouts.map(l => l.id === updatedLoadout.id ? updatedLoadout : l),
      updatedAt: new Date().toISOString()
    };
    handleUpdateResponder(updatedResp);
  };

  const handleSelectObjective = (objective: OptimizerObjective) => {
    const updatedLoadout: Loadout = {
      ...activeLoadout,
      objective
    };
    const updatedResp: Responder = {
      ...activeResponder,
      loadouts: activeResponder.loadouts.map(l => l.id === updatedLoadout.id ? updatedLoadout : l),
      updatedAt: new Date().toISOString()
    };
    handleUpdateResponder(updatedResp);
  };

  const handleUpdateConstraints = (constraints: OptimizerConstraints) => {
    const updatedLoadout: Loadout = {
      ...activeLoadout,
      constraints
    };
    const updatedResp: Responder = {
      ...activeResponder,
      loadouts: activeResponder.loadouts.map(l => l.id === updatedLoadout.id ? updatedLoadout : l),
      updatedAt: new Date().toISOString()
    };
    handleUpdateResponder(updatedResp);
  };

  const handleSetPerkTier = (baseSlug: string, tier: 'off' | 'standard' | 'expert') => {
    const groups = getLogicalPerkGroups();
    const group = groups.find(g => g.baseSlug === baseSlug);
    if (!group) return;

    // Collect IDs to remove for this logical perk
    const idsToRemove = [group.standardPerk?.id, group.expertPerk?.id].filter(Boolean) as number[];
    let newPerkIds = activeResponder.perkIds.filter(id => !idsToRemove.includes(id));

    if (tier === 'standard' && group.standardPerk) {
      if (newPerkIds.length >= 10) {
        alert('Maximum of 10 perk slots reached.');
        return;
      }
      newPerkIds.push(group.standardPerk.id);
    } else if (tier === 'expert' && group.expertPerk) {
      if (newPerkIds.length >= 10) {
        alert('Maximum of 10 perk slots reached.');
        return;
      }
      newPerkIds.push(group.expertPerk.id);
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
        onSelectTab={setMainTab}
        onOpenDataMethodology={() => setIsDataMethodologyOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenImport={() => setImportExportModal({ isOpen: true, mode: 'import' })}
      />

      <main>
        <div style={{ display: mainTab === 'optimize' ? 'block' : 'none' }}>
          <OptimizerView
            selectedWeaponId={activeLoadout.weaponId}
            onSelectWeaponId={handleSelectWeaponId}
            selectedEnemyId={activeEnemyId}
            onSelectEnemyId={setActiveEnemyId}
            objective={activeLoadout.objective}
            onSelectObjective={handleSelectObjective}
            constraints={activeLoadout.constraints}
            onUpdateConstraints={handleUpdateConstraints}
            selectedPerkIds={activeResponder.perkIds}
            onSetPerkTier={handleSetPerkTier}
          />
        </div>

        <div style={{ display: mainTab === 'compare' ? 'block' : 'none' }}>
          <CompareMatrixView
            weaponTypeFilter={compareFilter}
            onSelectWeaponTypeFilter={setCompareFilter}
            selectedPerkIds={activeResponder.perkIds}
          />
        </div>

        <div style={{ display: mainTab === 'builds' ? 'block' : 'none' }}>
          <BuildPlannerView
            responders={appState.responders}
            activeResponderId={appState.activeResponderId}
            onSelectResponder={handleSelectResponder}
            onUpdateResponder={handleUpdateResponder}
            onCreateResponder={handleCreateResponder}
            onDeleteResponder={handleDeleteResponder}
            onOpenExport={mode => setImportExportModal({ isOpen: true, mode })}
          />
        </div>
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
