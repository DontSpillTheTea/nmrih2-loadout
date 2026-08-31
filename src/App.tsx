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
import { decodeCode, parseShareUrlOrPath } from './serialization/codec';
import type { AppState, Responder, Loadout, CombatScenario, OptimizerConstraints, OptimizerObjective } from './types';
import './styles/app.css';

function getInitialAppStateAndTab(): {
  initialState: AppState;
  initialTab: MainTab;
  initialEnemyId: number;
} {
  const loaded = loadAppState();
  let initialTab: MainTab = 'optimize';
  let initialEnemyId = loaded.activeEnemyId ?? 1;
  let state = loaded;

  if (typeof window !== 'undefined' && window.location.pathname) {
    const parsed = parseShareUrlOrPath(window.location.pathname);
    if (parsed.code && parsed.type) {
      try {
        const decoded = decodeCode(parsed.code);
        if (decoded.type === parsed.type || (parsed.type === 'B' && decoded.type === 'B')) {
          if (decoded.type === 'B' || decoded.type === 'C') {
            const b = decoded.data;
            const newPerkIds = b.perkIds ?? [];
            const newLoadoutItems: [number | null, number | null, number | null] = b.loadoutItemIds ?? [null, null, null];
            state = {
              ...state,
              responders: state.responders.map(r => {
                if (r.id === state.activeResponderId) {
                  const activeL = r.loadouts.find(l => l.id === r.activeLoadoutId) || r.loadouts[0];
                  const updatedL: Loadout = {
                    ...activeL,
                    weaponId: b.weaponId ?? activeL.weaponId,
                    secondaryWeaponId: b.secondaryWeaponId ?? activeL.secondaryWeaponId,
                    loadoutItemIds: newLoadoutItems,
                    perkIds: newPerkIds,
                    constraints: b.constraints ?? activeL.constraints,
                    objective: b.objective ?? activeL.objective
                  };
                  return {
                    ...r,
                    name: b.name || r.name,
                    level: b.level ?? r.level,
                    perkIds: newPerkIds,
                    loadoutItemIds: newLoadoutItems,
                    loadouts: r.loadouts.map(l => (l.id === updatedL.id ? updatedL : l)),
                    updatedAt: new Date().toISOString()
                  };
                }
                return r;
              })
            };
            initialTab = 'optimize';
          } else if (decoded.type === 'S') {
            const scenario = decoded.data as CombatScenario;
            initialEnemyId = scenario.enemyId;
            state = {
              ...state,
              activeEnemyId: scenario.enemyId,
              responders: state.responders.map(r => {
                if (r.id === state.activeResponderId) {
                  const activeL = r.loadouts.find(l => l.id === r.activeLoadoutId) || r.loadouts[0];
                  const updatedL: Loadout = {
                    ...activeL,
                    weaponId: scenario.weaponId,
                    constraints: scenario.constraints,
                    objective: scenario.objective,
                    perkIds: scenario.perkIds
                  };
                  return {
                    ...r,
                    perkIds: scenario.perkIds,
                    loadouts: r.loadouts.map(l => (l.id === updatedL.id ? updatedL : l)),
                    updatedAt: new Date().toISOString()
                  };
                }
                return r;
              })
            };
            initialTab = 'optimize';
          }
        }
      } catch (e) {
        console.warn('Invalid or malformed share URL on initial load:', e);
      }
    }
  }

  return { initialState: state, initialTab, initialEnemyId };
}

const initialSetup = getInitialAppStateAndTab();

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => initialSetup.initialState);
  const [mainTab, setMainTab] = useState<MainTab>(() => initialSetup.initialTab);
  const [activeEnemyId, setActiveEnemyId] = useState<number>(() => initialSetup.initialEnemyId);
  const [compareFilter, setCompareFilter] = useState<'all' | 'melee' | 'firearms'>(() => initialSetup.initialState.compareWeaponFilter ?? 'all');
  const [isDataMethodologyOpen, setIsDataMethodologyOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoadingShortLink, setIsLoadingShortLink] = useState(() => {
    if (typeof window !== 'undefined' && window.location.pathname) {
      const parsed = parseShareUrlOrPath(window.location.pathname);
      return parsed.type === 'short_build' && Boolean(parsed.shortId);
    }
    return false;
  });
  const [importExportModal, setImportExportModal] = useState<{
    isOpen: boolean;
    mode: 'import' | 'export_build' | 'export_responder' | 'export_scenario';
  }>({
    isOpen: false,
    mode: 'import'
  });

  // Resolve short build link on mount if URL is /b/<id>
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname) {
      const parsed = parseShareUrlOrPath(window.location.pathname);
      if (parsed.type === 'short_build' && parsed.shortId) {
        fetch(`/api/builds/${parsed.shortId}`)
          .then(res => {
            if (!res.ok) {
              throw new Error(res.status === 404 ? 'Short build link not found or expired.' : `HTTP ${res.status}`);
            }
            return res.json();
          })
          .then(data => {
            if (data?.code) {
              const decoded = decodeCode(data.code);
              if (decoded.type === 'B' || decoded.type === 'C') {
                const b = decoded.data;
                const newPerkIds = b.perkIds ?? [];
                const newLoadoutItems: [number | null, number | null, number | null] = b.loadoutItemIds ?? [null, null, null];
                setAppState(prevState => ({
                  ...prevState,
                  responders: prevState.responders.map(r => {
                    if (r.id === prevState.activeResponderId) {
                      const activeL = r.loadouts.find(l => l.id === r.activeLoadoutId) || r.loadouts[0];
                      const updatedL: Loadout = {
                        ...activeL,
                        weaponId: b.weaponId ?? activeL.weaponId,
                        secondaryWeaponId: b.secondaryWeaponId ?? activeL.secondaryWeaponId,
                        loadoutItemIds: newLoadoutItems,
                        perkIds: newPerkIds,
                        constraints: b.constraints ?? activeL.constraints,
                        objective: b.objective ?? activeL.objective
                      };
                      return {
                        ...r,
                        name: b.name || r.name,
                        level: b.level ?? r.level,
                        perkIds: newPerkIds,
                        loadoutItemIds: newLoadoutItems,
                        loadouts: r.loadouts.map(l => (l.id === updatedL.id ? updatedL : l)),
                        updatedAt: new Date().toISOString()
                      };
                    }
                    return r;
                  })
                }));
                setMainTab('builds');
              }
            }
          })
          .catch(err => {
            console.warn('Failed to resolve short build link:', err);
          })
          .finally(() => {
            setIsLoadingShortLink(false);
          });
      }
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (!isLoadingShortLink) {
      saveAppState({
        ...appState,
        activeEnemyId,
        compareWeaponFilter: compareFilter
      });
    }
  }, [appState, activeEnemyId, compareFilter, isLoadingShortLink]);

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
    if (decoded.type === 'B' || decoded.type === 'C') {
      const b = decoded.data;
      const newPerkIds = b.perkIds ?? [];
      const newLoadoutItems: [number | null, number | null, number | null] = b.loadoutItemIds ?? [null, null, null];
      const updatedLoadout: Loadout = {
        ...activeLoadout,
        weaponId: b.weaponId ?? activeLoadout.weaponId,
        secondaryWeaponId: b.secondaryWeaponId ?? activeLoadout.secondaryWeaponId,
        loadoutItemIds: newLoadoutItems,
        perkIds: newPerkIds,
        constraints: b.constraints ?? activeLoadout.constraints,
        objective: b.objective ?? activeLoadout.objective
      };
      const updatedResp: Responder = {
        ...activeResponder,
        name: b.name || activeResponder.name,
        level: b.level ?? activeResponder.level,
        perkIds: newPerkIds,
        loadoutItemIds: newLoadoutItems,
        loadouts: activeResponder.loadouts.map(l => (l.id === activeLoadout.id ? updatedLoadout : l)),
        updatedAt: new Date().toISOString()
      };
      handleUpdateResponder(updatedResp);
      setMainTab('builds');
      alert(`Imported build "${b.name || 'Shared Build'}" successfully!`);
    } else if (decoded.type === 'S') {
      const scenario = decoded.data as CombatScenario;
      setActiveEnemyId(scenario.enemyId);
      const updatedLoadout: Loadout = {
        ...activeLoadout,
        weaponId: scenario.weaponId,
        constraints: scenario.constraints,
        objective: scenario.objective,
        perkIds: scenario.perkIds
      };
      const updatedResp: Responder = {
        ...activeResponder,
        perkIds: scenario.perkIds,
        loadouts: activeResponder.loadouts.map(l => (l.id === updatedLoadout.id ? updatedLoadout : l)),
        updatedAt: new Date().toISOString()
      };
      handleUpdateResponder(updatedResp);
      setMainTab('optimize');
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
        {isLoadingShortLink && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.5rem' }}>⏳ Loading Shared Build...</div>
            <div style={{ fontSize: '0.85rem' }}>Retrieving build configuration from D1 storage</div>
          </div>
        )}

        <div style={{ display: !isLoadingShortLink && mainTab === 'optimize' ? 'block' : 'none' }}>
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

        <div style={{ display: !isLoadingShortLink && mainTab === 'compare' ? 'block' : 'none' }}>
          <CompareMatrixView
            weaponTypeFilter={compareFilter}
            onSelectWeaponTypeFilter={setCompareFilter}
            selectedPerkIds={activeResponder.perkIds}
            objective={activeLoadout.objective}
            constraints={activeLoadout.constraints}
            onSelectObjective={handleSelectObjective}
            onUpdateConstraints={handleUpdateConstraints}
          />
        </div>

        <div style={{ display: !isLoadingShortLink && mainTab === 'builds' ? 'block' : 'none' }}>
          <BuildPlannerView
            responders={appState.responders}
            activeResponderId={appState.activeResponderId}
            myAccountLevel={appState.myAccountLevel}
            onUpdateMyAccountLevel={lvl => setAppState(prev => ({ ...prev, myAccountLevel: lvl }))}
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
