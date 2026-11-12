/**
 * Pocket-Depo Robust Network & Connectivity Service
 * 
 * Android ve mobil tarayıcılarda `navigator.onLine` yanıltıcı olabileceğinden,
 * hem ağ durumunu hem de Google 204 canlı sinyal testini (connectivitycheck) birleştirir.
 */

type NetworkStatusListener = (isOnline: boolean) => void;

class NetworkService {
  private listeners: Set<NetworkStatusListener> = new Set();
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isManualOffline: boolean = false;
  private probeTimer: any = null;
  private isProbing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isManualOffline = localStorage.getItem('pocket_manual_offline') === 'true';
      this.initListeners();
      this.probe();
    }
  }

  private initListeners() {
    window.addEventListener('online', () => this.handleBrowserEvent(true));
    window.addEventListener('offline', () => this.handleBrowserEvent(false));
    window.addEventListener('focus', () => this.probe());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.probe();
      }
    });

    // Her 2.5 saniyede bir sessiz canlı ping (Android internet kesildiği an yakalanır)
    this.probeTimer = setInterval(() => this.probe(), 2500);
  }

  private handleBrowserEvent(browserOnline: boolean) {
    if (!browserOnline) {
      // Tarayıcı direkt offline diyorsa hiç bekletmeden çevrimdışına al
      this.updateState(false);
    } else {
      // Tarayıcı online diyorsa gerçek paket gönderip doğrula
      this.probe();
    }
  }

  /**
   * Gerçek internet çıkışını doğrulamak için Google 204 endpoint'ine hafif bir HEAD isteği atar.
   */
  public async probe(): Promise<boolean> {
    if (this.isManualOffline) {
      this.updateState(false);
      return false;
    }

    // Tarayıcı direkt offline diyorsa
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateState(false);
      return false;
    }

    if (this.isProbing) return this.isOnline;
    this.isProbing = true;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);

      // Google'ın resmi Android internet doğrulama adresi (204 No Content)
      await fetch(`https://connectivitycheck.gstatic.com/generate_204?_t=${Date.now()}`, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      this.updateState(true);
      return true;
    } catch (e) {
      // Fetch patladıysa (paket gitmedi, timeout veya internet yok)
      this.updateState(false);
      return false;
    } finally {
      this.isProbing = false;
    }
  }

  private updateState(realOnline: boolean) {
    const effectiveState = realOnline && !this.isManualOffline;
    if (this.isOnline !== effectiveState) {
      this.isOnline = effectiveState;
      this.notifyListeners();
    }
  }

  public getStatus(): boolean {
    return this.isOnline;
  }

  public getIsManualOffline(): boolean {
    return this.isManualOffline;
  }

  public setManualOffline(offline: boolean) {
    this.isManualOffline = offline;
    localStorage.setItem('pocket_manual_offline', offline ? 'true' : 'false');
    this.updateState(!offline);
    if (!offline) {
      this.probe();
    }
  }

  public toggleManualOffline(): boolean {
    const nextState = !this.isManualOffline;
    this.setManualOffline(nextState);
    return !nextState;
  }

  public subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.isOnline);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.isOnline);
      } catch (err) {
        console.error('Network listener error:', err);
      }
    });
  }

  public destroy() {
    if (this.probeTimer) clearInterval(this.probeTimer);
    this.listeners.clear();
  }
}

export const networkService = new NetworkService();
