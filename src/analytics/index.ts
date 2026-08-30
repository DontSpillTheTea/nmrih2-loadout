export type AnalyticsEvent =
  | { name: 'optimizer_run'; properties: { enemySlug: string; weaponSlug: string; objective: string; perkCount: number; allowKick?: boolean; allowShove?: boolean; safeOpener?: boolean; preChargedOpener?: boolean } }
  | { name: 'loadout_saved'; properties: { weaponId: number; perkCount: number } }
  | { name: 'code_exported'; properties: { format: string } }
  | { name: 'code_imported'; properties: { format: string } }
  | { name: 'data_version_switched'; properties: { version: string } }
  | { name: 'perk_eval_run'; properties: { choicesCount: number; hasBreakpointGain: boolean } }
  | { name: 'data_updated_offline'; properties: { timestamp: string } }
  | { name: 'user_state_cleared'; properties: {} };

class AnalyticsManager {
  private enabled: boolean = false;
  private queue: AnalyticsEvent[] = [];

  public init(enabled: boolean): void {
    this.enabled = enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.queue = [];
    }
  }

  public capture(event: AnalyticsEvent): void {
    if (!this.enabled) return;
    this.queue.push(event);
    if (this.queue.length > 50) {
      this.queue.shift();
    }
  }

  public getEvents(): AnalyticsEvent[] {
    return [...this.queue];
  }
}

export const analytics = new AnalyticsManager();
