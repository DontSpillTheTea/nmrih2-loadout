export type AnalyticsEvent =
  | { name: 'optimizer_run'; properties: { enemySlug: string; weaponSlug: string; objective: string; perkCount: number; allowKick: boolean; allowShove: boolean } }
  | { name: 'build_saved'; properties: { weaponId: number; perkCount: number } }
  | { name: 'build_exported'; properties: { format: string } }
  | { name: 'build_imported'; properties: { format: string } }
  | { name: 'perk_choice_compared'; properties: { offeredCount: number; weaponSlug: string } }
  | { name: 'weapon_compared'; properties: { weaponCount: number } }
  | { name: 'character_created'; properties: { perkCount: number } }
  | { name: 'data_source_opened'; properties: { sourceId: string } };

class AnalyticsService {
  private enabled: boolean = false;
  private posthogKey: string | null = null;
  private posthogHost: string | null = null;

  constructor() {
    // Read from Vite env if available
    try {
      const meta = import.meta as any;
      if (meta && meta.env) {
        this.posthogKey = meta.env.VITE_POSTHOG_KEY || null;
        this.posthogHost = meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
        if (this.posthogKey) {
          this.enabled = true;
        }
      }
    } catch {
      // noop
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled && !!this.posthogKey;
  }

  public capture(event: AnalyticsEvent): void {
    if (!this.enabled || !this.posthogKey) {
      return;
    }

    try {
      const payload = {
        api_key: this.posthogKey,
        event: event.name,
        properties: {
          ...event.properties,
          distinct_id: 'anonymous-browser-user',
          $lib: 'nmrih2-optimizer-web',
          time: new Date().toISOString()
        }
      };

      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(`${this.posthogHost}/capture/`, JSON.stringify(payload));
      }
    } catch (e) {
      // Analytics error should never affect app function
    }
  }
}

export const analytics = new AnalyticsService();
