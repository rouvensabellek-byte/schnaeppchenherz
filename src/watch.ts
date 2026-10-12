import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Box, Product, catalog, Latest } from './data';
import { euro } from './theme';

const KEY = 'watch.v1';
const SEEN_BOXES = 'boxes-seen.v1';

/** Merkliste: ID → Preis beim letzten Hinschauen */
export type Watch = Record<string, number>;

const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensurePermission() {
  if (!supported) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

function notifyNow(title: string, body: string) {
  if (!supported) return;
  Notifications.scheduleNotificationAsync({ content: { title, body, sound: true }, trigger: null }).catch(() => {});
}

export function useWatch(latest: Latest) {
  const [watch, setWatch] = useState<Watch>({});
  const [newBoxes, setNewBoxes] = useState<Box[]>([]);
  const ready = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setWatch(JSON.parse(raw)))
      .catch(() => {})
      .finally(() => (ready.current = true));
  }, []);

  const save = useCallback((next: Watch) => {
    setWatch(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const toggle = useCallback(
    (p: Product) => {
      const next = { ...watch };
      if (next[p.id] !== undefined) delete next[p.id];
      else {
        next[p.id] = p.price;
        ensurePermission();
      }
      save(next);
    },
    [watch, save],
  );

  // Bei neuen Daten: gesunkene Preise auf der Merkliste melden
  useEffect(() => {
    if (!ready.current) return;
    const all = catalog(latest);
    const drops: { p: Product; before: number }[] = [];
    const next = { ...watch };
    for (const [id, before] of Object.entries(watch)) {
      const p = all.get(id);
      if (!p || p.price === before) continue;
      if (p.price < before) drops.push({ p, before });
      next[id] = p.price;
    }
    if (drops.length) {
      const [first] = drops;
      notifyNow(
        drops.length === 1 ? 'Preis gesunken!' : `${drops.length} Preise gesunken!`,
        `${first.p.name}: ${euro(first.before)} → ${euro(first.p.price)}`,
      );
    }
    if (JSON.stringify(next) !== JSON.stringify(watch)) save(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest.updatedAt]);

  // Neue Mystery-Boxen seit dem letzten Öffnen
  useEffect(() => {
    AsyncStorage.getItem(SEEN_BOXES)
      .then((raw) => {
        const seen: string[] | null = raw ? JSON.parse(raw) : null;
        const fresh = seen ? latest.boxes.filter((b) => b.available && !seen.includes(b.id)) : [];
        setNewBoxes(fresh);
        AsyncStorage.setItem(SEEN_BOXES, JSON.stringify(latest.boxes.map((b) => b.id))).catch(() => {});
      })
      .catch(() => {});
  }, [latest.updatedAt, latest.boxes]);

  return { watch, toggle, isWatched: (id: string) => watch[id] !== undefined, newBoxes };
}
