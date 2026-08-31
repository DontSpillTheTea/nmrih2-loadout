import React, { useState, useMemo } from 'react';
import type { Responder, Loadout } from '../types';
import { weapons, perks, mechanics, getPerkById, loadoutItems } from '../data/loader';
import { createDefaultLoadout, createDefaultResponder } from '../storage';

interface BuildPlannerViewProps {
  responders: Responder[];
  activeResponderId: string;
  myAccountLevel?: number | null;
  onUpdateMyAccountLevel: (level: number | null) => void;
  onSelectResponder: (id: string) => void;
  onUpdateResponder: (responder: Responder) => void;
  onCreateResponder: (responder: Responder) => void;
  onDeleteResponder: (id: string) => void;
  onOpenExport: (mode: 'export_build') => void;
}

export const BuildPlannerView: React.FC<BuildPlannerViewProps> = ({
  responders,
  activeResponderId,
  myAccountLevel,
  onUpdateMyAccountLevel,
  onSelectResponder,
  onUpdateResponder,
  onCreateResponder,
  onDeleteResponder,
  onOpenExport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const activeResponder = useMemo(() => {
    return responders.find(r => r.id === activeResponderId) || responders[0];
  }, [responders, activeResponderId]);

  const activeLoadout = useMemo(() => {
    if (!activeResponder) return null;
    return activeResponder.loadouts.find(l => l.id === activeResponder.activeLoadoutId) || activeResponder.loadouts[0];
  }, [activeResponder]);

  const maxSlots = mechanics.maxPerkSlots; // 10 slots data-driven from mechanics.json

  const equippedPerks = useMemo(() => {
    if (!activeResponder) return [];
    return activeResponder.perkIds.map(id => getPerkById(id)).filter(Boolean);
  }, [activeResponder]);

  const groupedLoadoutItems = useMemo(() => {
    const groups: Record<string, typeof loadoutItems> = {};
    for (const item of loadoutItems) {
      const cat = item.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, []);

  const handleAddPerk = (perkId: number) => {
    if (!activeResponder) return;
    if (activeResponder.perkIds.length >= maxSlots) {
      alert(`Maximum of ${maxSlots} perk slots reached.`);
      return;
    }
    if (activeResponder.perkIds.includes(perkId)) {
      return;
    }
    const newPerkIds = [...activeResponder.perkIds, perkId];
    const updated: Responder = {
      ...activeResponder,
      perkIds: newPerkIds,
      loadouts: activeResponder.loadouts.map(l => (l.id === activeResponder.activeLoadoutId ? { ...l, perkIds: newPerkIds } : l)),
      updatedAt: new Date().toISOString()
    };
    onUpdateResponder(updated);
  };

  const handleRemovePerk = (perkId: number) => {
    if (!activeResponder) return;
    const newPerkIds = activeResponder.perkIds.filter(id => id !== perkId);
    const updated: Responder = {
      ...activeResponder,
      perkIds: newPerkIds,
      loadouts: activeResponder.loadouts.map(l => (l.id === activeResponder.activeLoadoutId ? { ...l, perkIds: newPerkIds } : l)),
      updatedAt: new Date().toISOString()
    };
    onUpdateResponder(updated);
  };

  const handleUpdateLoadoutSlot = (slotIndex: 0 | 1 | 2, itemId: number | null) => {
    if (!activeResponder) return;
    const currentSlots: [number | null, number | null, number | null] = [
      activeResponder.loadoutItemIds?.[0] ?? null,
      activeResponder.loadoutItemIds?.[1] ?? null,
      activeResponder.loadoutItemIds?.[2] ?? null
    ];
    currentSlots[slotIndex] = itemId;

    const updated: Responder = {
      ...activeResponder,
      loadoutItemIds: currentSlots,
      loadouts: activeResponder.loadouts.map(l => (l.id === activeResponder.activeLoadoutId ? { ...l, loadoutItemIds: currentSlots } : l)),
      updatedAt: new Date().toISOString()
    };
    onUpdateResponder(updated);
  };

  const handleUpdateWeapon = (weaponId: number) => {
    if (!activeResponder || !activeLoadout) return;
    const updatedLoadout: Loadout = {
      ...activeLoadout,
      weaponId
    };
    const updated: Responder = {
      ...activeResponder,
      loadouts: activeResponder.loadouts.map(l => (l.id === activeLoadout.id ? updatedLoadout : l)),
      updatedAt: new Date().toISOString()
    };
    onUpdateResponder(updated);
  };

  const handleCreateNewResponder = () => {
    const id = `resp-${Date.now()}`;
    const newResp = createDefaultResponder(id, `Responder ${responders.length + 1}`);
    onCreateResponder(newResp);
    onSelectResponder(id);
  };

  const filteredPerks = useMemo(() => {
    return perks.filter(p => {
      if (p.tier === 'retired') return false;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = selectedTag === 'all' || p.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [searchTerm, selectedTag]);

  return (
    <div className="main-container">
      <div className="grid-2col">
        {/* Left Column: Responder & Equipped Perk Slots */}
        <div>
          {/* Responder Profile Selector */}
          <div className="card">
            <div className="card-title">
              <span>Active Responder Profile</span>
              <button className="btn btn-sm btn-primary" onClick={handleCreateNewResponder}>
                + New Responder
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Select Character Profile</label>
              <select
                className="form-select"
                value={activeResponder.id}
                onChange={e => onSelectResponder(e.target.value)}
              >
                {responders.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} (Lvl {r.level} • {r.perkIds.length}/10 Perks)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Profile Name</label>
              <input
                className="form-input"
                value={activeResponder.name}
                onChange={e => onUpdateResponder({ ...activeResponder, name: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Character Level</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="form-input"
                  value={activeResponder.level}
                  onChange={e => onUpdateResponder({ ...activeResponder, level: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" title="Your account level for unlock requirement checks (local preference only)">
                  My Account Level
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="Not Set"
                  className="form-input"
                  value={myAccountLevel ?? ''}
                  onChange={e => {
                    const val = e.target.value === '' ? null : Math.max(1, Math.min(100, Number(e.target.value)));
                    onUpdateMyAccountLevel(val);
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={() => onOpenExport('export_build')}>
                📤 Share Build
              </button>
              {responders.length > 1 && (
                <button className="btn btn-sm btn-danger" onClick={() => onDeleteResponder(activeResponder.id)}>
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Starting Loadout (3 Slots) */}
          <div className="card">
            <div className="card-title">
              <span>Starting Deployment Loadout (3 Slots)</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {([0, 1, 2] as const).map(slotIdx => {
                const selectedItemId = activeResponder.loadoutItemIds?.[slotIdx] ?? null;
                const item = selectedItemId ? loadoutItems.find(it => it.id === selectedItemId) : null;
                const isUnderLevel = myAccountLevel !== null && myAccountLevel !== undefined && item && item.unlockAccountLevel > myAccountLevel;

                return (
                  <div key={slotIdx} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Slot #{slotIdx + 1}</span>
                      {item && item.unlockAccountLevel > 1 && (
                        <span style={{ fontSize: '0.75rem', color: isUnderLevel ? '#f59e0b' : 'var(--text-muted)' }}>
                          {isUnderLevel ? '⚠️ Requires Acc Lv ' : 'Acc Lv '}{item.unlockAccountLevel}
                        </span>
                      )}
                    </label>
                    <select
                      className="form-select"
                      value={selectedItemId ?? ''}
                      onChange={e => handleUpdateLoadoutSlot(slotIdx, e.target.value ? Number(e.target.value) : null)}
                      style={isUnderLevel ? { borderColor: '#f59e0b' } : undefined}
                    >
                      <option value="">(Empty Slot)</option>
                      {Object.entries(groupedLoadoutItems).map(([category, items]) => (
                        <optgroup key={category} label={category}>
                          {items.map(it => (
                            <option key={it.id} value={it.id}>
                              {it.name} {it.unlockAccountLevel > 1 ? `(Lv ${it.unlockAccountLevel})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Weapon for Analysis */}
          <div className="card">
            <div className="card-title">
              <span>Primary Combat Analysis Weapon</span>
            </div>

            {activeLoadout && (
              <div className="form-group">
                <select
                  className="form-select"
                  value={activeLoadout.weaponId}
                  onChange={e => handleUpdateWeapon(Number(e.target.value))}
                >
                  {weapons.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.category})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 10 Perk Slots (Data Driven) */}
          <div className="card">
            <div className="card-title">
              <span>Equipped Perks ({equippedPerks.length}/{maxSlots})</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Array.from({ length: maxSlots }).map((_, slotIdx) => {
                const perk = equippedPerks[slotIdx];
                return (
                  <div
                    key={slotIdx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-input)',
                      border: perk ? '1px solid var(--border-focus)' : '1px dashed var(--border-color)',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '6px'
                    }}
                  >
                    {perk ? (
                      <>
                        <div>
                          <span style={{ color: 'var(--accent-blue)', fontWeight: 600, marginRight: '0.4rem' }}>
                            Slot #{slotIdx + 1}:
                          </span>
                          <span style={{ fontWeight: 600, color: '#fff' }}>{perk.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                            ({perk.tier === 'expert' ? `Expert • Lv ${perk.unlockAccountLevel}` : perk.tier})
                          </span>
                          {perk.tier === 'expert' && myAccountLevel !== null && myAccountLevel !== undefined && myAccountLevel < perk.unlockAccountLevel && (
                            <span style={{ fontSize: '0.75rem', color: '#f59e0b', marginLeft: '0.4rem' }}>
                              ⚠️ Req Lv {perk.unlockAccountLevel}
                            </span>
                          )}
                        </div>
                        <button
                          className="btn btn-sm btn-danger"
                          style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem' }}
                          onClick={() => handleRemovePerk(perk.id)}
                        >
                          ✕ Remove
                        </button>
                      </>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                        Slot #{slotIdx + 1}: [Empty Slot - Click below to equip]
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Perk Catalog & Search */}
        <div>
          <div className="card">
            <div className="card-title">
              <span>Perk Compendium & Catalog</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {filteredPerks.length} Available
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                className="form-input"
                placeholder="Search perk name or effect..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <select
                className="form-select"
                style={{ width: '160px' }}
                value={selectedTag}
                onChange={e => setSelectedTag(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="damage">Damage</option>
                <option value="stamina">Stamina</option>
                <option value="melee">Melee</option>
                <option value="firearm">Firearms</option>
                <option value="stability">Stability</option>
                <option value="health">Health</option>
                <option value="utility">Utility</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', maxHeight: '700px', overflowY: 'auto' }}>
              {filteredPerks.map(perk => {
                const isEquipped = activeResponder.perkIds.includes(perk.id);
                const isUnderLevel = perk.tier === 'expert' && myAccountLevel !== null && myAccountLevel !== undefined && myAccountLevel < perk.unlockAccountLevel;

                return (
                  <div
                    key={perk.id}
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      border: isEquipped ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <strong style={{ color: '#fff' }}>{perk.name}</strong>
                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                          {isUnderLevel && (
                            <span style={{ fontSize: '0.7rem', color: '#f59e0b' }} title="Your account level is below requirement">
                              ⚠️
                            </span>
                          )}
                          <span className={`badge ${perk.tier === 'expert' ? 'badge-community' : 'badge-official'}`}>
                            {perk.tier === 'expert' ? `Expert · Lv ${perk.unlockAccountLevel}` : perk.tier}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', marginBottom: '0.5rem' }}>
                        {perk.description}
                      </p>
                      {perk.notes && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
                          ℹ️ {perk.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                      {isEquipped ? (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemovePerk(perk.id)}
                        >
                          ✕ Unequip
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={activeResponder.perkIds.length >= maxSlots}
                          onClick={() => handleAddPerk(perk.id)}
                        >
                          + Equip to Slot
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
