import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as SMS from 'expo-sms';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { NTFY_TOPIC } from './config';
import { Box, Latest } from './data';
import { euro } from './theme';

const KEY = 'settings.v1';
const ALERTED = 'box-alerted.v1';

export type Settings = {
  /** Box-Alarm ab diesem Preis oder günstiger (Cent); null = aus */
  boxMaxPrice: number | null;
  /** Handynummer für „Per SMS schicken“ – bleibt nur auf diesem Gerät */
  phone: string;
};

const DEFAULTS: Settings = { boxMaxPrice: null, phone: '' };

/** Schickt die Grenze an ntfy; der Scraper liest sie beim nächsten Lauf und merkt sie sich */
async function publish(boxMaxPrice: number | null) {
  if (!NTFY_TOPIC) return;
  await fetch(`https://ntfy.sh/${NTFY_TOPIC}-config`, { method: 'POST', body: JSON.stringify({ boxMaxPrice }) }).catch(() => {});
}

export function useSettings(latest: Latest) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setSettings({ ...DEFAULTS, ...JSON.parse(raw) }))
      .catch(() => {});
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      if ('boxMaxPrice' in patch) {
        // Erst senden, wenn sie mit dem Tippen fertig ist
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => publish(next.boxMaxPrice), 1500);
        if (next.boxMaxPrice && Platform.OS !== 'web') Notifications.requestPermissionsAsync().catch(() => {});
      }
      return next;
    });
  }, []);

  // Beim Öffnen: passt eine Box schon jetzt? Dann einmal lokal melden
  useEffect(() => {
    const max = settings.boxMaxPrice;
    if (!max || Platform.OS === 'web') return;
    AsyncStorage.getItem(ALERTED).then((raw) => {
      const done: Record<string, number> = raw ? JSON.parse(raw) : {};
      const hits = latest.boxes.filter((b) => b.available && b.price <= max && done[b.id] !== b.price);
      if (!hits.length) return;
      const [first] = hits;
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Mystery-Box im Wunschpreis!',
          body: hits.length === 1 ? `${first.name} für ${euro(first.price)}` : `${hits.length} Boxen für höchstens ${euro(max)}`,
          sound: true,
        },
        trigger: null,
      }).catch(() => {});
      hits.forEach((b) => (done[b.id] = b.price));
      AsyncStorage.setItem(ALERTED, JSON.stringify(done)).catch(() => {});
    });
  }, [latest.updatedAt, latest.boxes, settings.boxMaxPrice]);

  const serverKnows = (latest.settings?.boxMaxPrice ?? null) === settings.boxMaxPrice;

  return { settings, update, serverKnows };
}

/** Öffnet die Nachrichten-App mit fertigem Text – sie muss nur noch auf Senden tippen */
export async function sendBoxSms(phone: string, box: Box) {
  const shop = box.shop === 'eis' ? 'eis.de' : 'Amorelie';
  const body = `Mystery-Box bei ${shop}: ${box.name} für ${euro(box.price)} ${box.url}`;
  if (await SMS.isAvailableAsync()) {
    await SMS.sendSMSAsync(phone ? [phone] : [], body);
    return true;
  }
  return false;
}
