import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { dataUrl } from './config';

export type Shop = 'eis' | 'amo';

export type Product = {
  id: string;
  shop: Shop;
  name: string;
  url: string;
  image: string | null;
  price: number; // Cent
  was: number | null;
  wasKind: 'vorher' | 'uvp';
  off: number;
  /** Gratisartikel: kostenlos ab diesem Bestellwert (Cent) */
  minOrder?: number;
  /** Gratisartikel: Warenwert laut Shop (Cent) */
  worth?: number;
  /** Befristete Aktion: Ende als ISO-Zeit */
  endsAt?: string;
};

export type Ranked = Product & { rank: number; prevRank: number | null };
export type Box = Product & { available: boolean; firstSeen: string };

export type Category = {
  id: string;
  label: string;
  eis: Product[];
  amo: Product[];
  /** Gesamtzahl laut Shop; geladen werden nur die beliebtesten 40 je Shop */
  total?: Record<Shop, number | null>;
};

export type Latest = {
  updatedAt: string;
  errors: string[];
  deals: Product[];
  popular: Record<Shop, Ranked[]>;
  boxes: Box[];
  categories?: Category[];
  daily?: {
    eis: { deal: Product | null; tips: Product[]; gifts: Product[]; bundles: Product[] };
    amo: { bundles: Product[]; actions: Product[] };
  };
  /** Was der Server zuletzt an App-Einstellungen gelesen hat */
  settings?: { boxMaxPrice?: number | null; settingsAt?: string };
  twins: Record<string, string>;
};

export type HistoryEntry = {
  name: string;
  shop: Shop;
  url: string;
  image: string | null;
  seen: string;
  points: [string, number][];
};
export type History = Record<string, HistoryEntry>;

// Mitgelieferter Stand, damit die App auch ohne Netz/Repo etwas zeigt
const bundled = {
  latest: require('../data/latest.json') as Latest,
  history: require('../data/history.json') as History,
};

const CACHE = 'cache.v1';

async function fetchJson<T>(file: string): Promise<T | null> {
  const url = dataUrl(file);
  if (!url) return null;
  const res = await fetch(`${url}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useDeals() {
  const [latest, setLatest] = useState<Latest>(bundled.latest);
  const [history, setHistory] = useState<History>(bundled.history);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRef = useRef(bundled.latest);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l, h] = await Promise.all([fetchJson<Latest>('latest.json'), fetchJson<History>('history.json')]);
      // GitHub liefert manchmal noch ein paar Minuten den alten Stand aus – nie rückwärts gehen
      if (l && h && l.updatedAt >= latestRef.current.updatedAt) {
        latestRef.current = l;
        setLatest(l);
        setHistory(h);
        AsyncStorage.setItem(CACHE, JSON.stringify({ latest: l, history: h })).catch(() => {});
      }
    } catch {
      setError('Konnte keine neuen Daten laden – du siehst den letzten Stand.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CACHE)
      .then((raw) => {
        if (!raw) return;
        const cached = JSON.parse(raw) as { latest: Latest; history: History };
        if (cached.latest.updatedAt > bundled.latest.updatedAt) {
          latestRef.current = cached.latest;
          setLatest(cached.latest);
          setHistory(cached.history);
        }
      })
      .catch(() => {})
      .finally(refresh);
  }, [refresh]);

  return { latest, history, loading, error, refresh };
}

/** Alle bekannten Produkte nach ID – für Merkliste und Detailansicht */
export function catalog(latest: Latest): Map<string, Product> {
  const cats = (latest.categories ?? []).flatMap((cat) => [...cat.eis, ...cat.amo]);
  const d = latest.daily;
  const daily = d ? [...(d.eis.deal ? [d.eis.deal] : []), ...d.eis.tips, ...d.eis.gifts, ...d.eis.bundles, ...d.amo.bundles, ...d.amo.actions] : [];
  const all = [...cats, ...daily, ...latest.boxes, ...latest.popular.eis, ...latest.popular.amo, ...latest.deals];
  return new Map(all.map((p) => [p.id, p]));
}

export function stats(entry: HistoryEntry | undefined, current: number) {
  const prices = entry?.points.map((p) => p[1]) ?? [current];
  const min = Math.min(...prices, current);
  const max = Math.max(...prices, current);
  // Durchschnitt nach Tagen gewichtet, nicht nach Anzahl Änderungen
  let sum = 0;
  let days = 0;
  const pts = entry?.points ?? [];
  pts.forEach(([day, price], i) => {
    const next = pts[i + 1]?.[0] ?? new Date().toISOString().slice(0, 10);
    const d = Math.max(1, (Date.parse(next) - Date.parse(day)) / 864e5);
    sum += price * d;
    days += d;
  });
  const avg = days ? Math.round(sum / days) : current;
  const since = pts[0]?.[0] ?? null;
  return { min, max, avg, since, isLow: current <= min * 1.02 };
}
