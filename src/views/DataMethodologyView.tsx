import React from 'react';
import { CURRENT_GAME_VERSION, manifest } from '../data/loader';

export const DataMethodologyView: React.FC = () => {
  return (
    <div className="main-container">
      <div className="card">
        <div className="card-title">
          <span>📚 Data Provenance & Combat Engine Methodology</span>
          <span className="badge badge-official">Patch {CURRENT_GAME_VERSION}</span>
        </div>

        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.85rem' }}>
          <h3 style={{ color: '#fff', fontSize: '1rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
            1. Authoritative Data Sources
          </h3>
          <p style={{ marginBottom: '0.75rem' }}>
            This application ingests versioned data from structured game-file extractions and cross-checks official release patch notes. No numbers are fabricated or estimated.
          </p>

          <ul style={{ marginLeft: '1.25rem', marginBottom: '1rem' }}>
            {manifest.sources.map((s: any, idx: number) => (
              <li key={idx} style={{ marginBottom: '0.35rem' }}>
                <a href={s.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
                  {s.name}
                </a>
                <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>[{s.type}]</span>
              </li>
            ))}
          </ul>

          <h3 style={{ color: '#fff', fontSize: '1rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
            2. Verified Damage Formula
          </h3>
          <div style={{ backgroundColor: 'var(--bg-input)', padding: '0.85rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.8rem', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
            Damage = (Base Weapon Damage + Flat Additive Perks) * (1 + Sum of Multiplicative Perk Modifiers) * (Target Downed ? 2.0 : 1.0) * (1 - Armor Resistance)
          </div>

          <h3 style={{ color: '#fff', fontSize: '1rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
            3. Stability & Posture Thresholds
          </h3>
          <table className="matrix-table" style={{ marginBottom: '1rem' }}>
            <thead>
              <tr>
                <th>Accumulated Stability</th>
                <th>Resulting Posture</th>
                <th>Gameplay Effect</th>
                <th>Provenance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>0 - 19</td>
                <td><strong style={{ color: 'var(--accent-cyan)' }}>Flinch</strong></td>
                <td>Minor visual flinch; does not cancel heavy zombie swings.</td>
                <td><span className="badge badge-datamined">Datamined</span></td>
              </tr>
              <tr>
                <td>20 - 49</td>
                <td><strong style={{ color: 'var(--accent-purple)' }}>Interrupt</strong></td>
                <td>Cancels enemy attack animation immediately (Shove deals 20 stability).</td>
                <td><span className="badge badge-datamined">Datamined</span></td>
              </tr>
              <tr>
                <td>50 - 99</td>
                <td><strong style={{ color: 'var(--accent-amber)' }}>Stagger</strong></td>
                <td>Long stagger animation; zombie stumbles backwards.</td>
                <td><span className="badge badge-datamined">Datamined</span></td>
              </tr>
              <tr>
                <td>100+</td>
                <td><strong style={{ color: 'var(--accent-red)' }}>Knockdown (Downed)</strong></td>
                <td>Zombie falls flat on the ground and takes <strong>2.0x (100% increased) damage</strong> from all subsequent attacks. (Kick deals 100 stability).</td>
                <td><span className="badge badge-community">Community-Tested</span></td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ color: '#fff', fontSize: '1rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
            4. Verified Updates from Official 1.0 Patch Notes
          </h3>
          <ul style={{ marginLeft: '1.25rem', marginBottom: '1rem' }}>
            <li><strong>Shove Stamina:</strong> Reduced from 25 to 15 in Armageddon 1.0 update.</li>
            <li><strong>Melee Triples:</strong> Ordered Quick / Strong / Charged.</li>
            <li><strong>Reference HP:</strong> Normal Zombies 100 HP, Shamblers 70 HP, Primes 130 HP.</li>
            <li><strong>Slashing Weapons Stability:</strong> 5 on Quick, 10 on Strong.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
