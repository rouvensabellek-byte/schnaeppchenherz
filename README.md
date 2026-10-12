# Schnäppchenherz

Expo-App (läuft in Expo Go) mit Angeboten, Beliebt-Listen, Preisverlauf und Mystery-Box-Alarm für eis.de und Amorelie.

## So hängt alles zusammen

```
GitHub Actions (alle 3 Std.)          iPhone
  scraper/scrape.mjs  ──► data/*.json ──► App liest raw.githubusercontent.com
          │
          └─► ntfy.sh/<Thema> ──► ntfy-App: Push bei neuer Mystery-Box
```

- `scraper/scrape.mjs`: eis.de liefert die Produktdaten im Next.js-Payload der Seite mit, Amorelie über die Algolia-Suche. Der Suchschlüssel dafür kommt jedes Mal frisch aus der Seite.
- `data/latest.json` enthält die aktuellen Angebote, Beliebt-Listen und Boxen.
- `data/history.json` speichert den Preisverlauf: ein Punkt pro Preisänderung, höchstens 400 Tage.
- `data/state.json` merkt sich, welche Boxen schon bekannt sind (für den Alarm).

## Einrichten

1. Auf github.com ein **öffentliches** Repo `schnaeppchenherz` anlegen. Es muss öffentlich sein, damit die App die Daten ohne Login lesen kann.
2. Pushen:
   ```bash
   git remote add origin https://github.com/<DEIN-NAME>/schnaeppchenherz.git
   git push -u origin main
   ```
3. Im Repo unter *Settings → Secrets and variables → Actions* das Secret `NTFY_TOPIC` anlegen. Der Wert ist derselbe wie `NTFY_TOPIC` in `src/config.ts`.
4. In `src/config.ts` bei `GITHUB_USER` deinen GitHub-Namen eintragen, committen und pushen.
5. Unter *Actions → Deals abholen → Run workflow* einmal von Hand starten. Danach läuft es automatisch.
6. Auf dem iPhone die kostenlose App **ntfy** installieren. In Schnäppchenherz dann unter *Mystery-Boxen* auf „In ntfy abonnieren“ tippen.

## Starten

```bash
npx expo start
```

Den QR-Code mit der iPhone-Kamera scannen, dann öffnet sich Expo Go.

Lokal testen geht mit `node scraper/scrape.mjs`. Ohne `NTFY_TOPIC` werden die Alarme nur in die Konsole geschrieben.

## Grenzen

- Es gibt keine offiziellen Schnittstellen. Wenn ein Shop seine Seite umbaut, kann der Scraper brechen. Fehler landen in `latest.json → errors`, und für den betroffenen Shop bleibt der letzte Stand erhalten.
- Bei eis.de ist der durchgestrichene Preis meist die UVP. Die App schreibt dann „UVP“ dazu, und die Rabatte wirken dadurch sehr hoch.
- „Beliebt“ zeigt die Reihenfolge, in der die Shops ihre Toys standardmäßig sortieren. Echte Verkaufszahlen veröffentlicht keiner der beiden.
- Push-Benachrichtigungen direkt aus der App gehen in Expo Go nicht. Dafür ist ntfy da. Preisalarme für die Merkliste kommen als lokale Mitteilung, sobald die App geöffnet wird.
