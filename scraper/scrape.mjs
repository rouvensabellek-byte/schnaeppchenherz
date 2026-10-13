// Holt Angebote, Beliebt-Listen und Mystery-Boxen von eis.de und Amorelie,
// schreibt sie nach data/ und meldet neue Boxen per ntfy.
// Läuft per GitHub Actions (siehe .github/workflows/scrape.yml), lokal: node scraper/scrape.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const MAX_HISTORY_DAYS = 400;
const BOX_RE = /mystery|überraschungsbox|ueberraschungsbox|wundertüte/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);

async function get(url) {
  await sleep(800); // freundlich bleiben
  const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'de-DE,de;q=0.9' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(value) + '\n');
}

const offPercent = (price, was) => (was && was > price ? Math.round((1 - price / was) * 100) : 0);

// ---------------------------------------------------------------- eis.de

/** eis.de ist eine Next.js-App: die Produktdaten stecken im RSC-Payload der Seite */
function rscPayload(html) {
  let out = '';
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) out += JSON.parse(m[1]);
  return out;
}

/** Liest das JSON-Objekt, das bei `start` mit `{` beginnt */
function objectAt(s, start) {
  let depth = 0;
  let inStr = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return JSON.parse(s.slice(start, i + 1));
  }
  return null;
}

const field = (chunk, re) => chunk.match(re)?.[1];

/** eis.de markiert Sonderzeichen als [s], [nbhy] … und setzt Namen in Hochkommas */
const cleanName = (name) =>
  String(name)
    .replace(/\[s\]/g, ' ')
    .replace(/\[nbhy\]/g, '-')
    .replace(/\[\w+\]/g, '')
    .replace(/['‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function eisProducts(html) {
  const s = rscPayload(html);
  const starts = [...s.matchAll(/"referenceKey":"(pm\w+)","name":"((?:[^"\\]|\\.)*)","price":\{/g)];
  const seen = new Map();
  starts.forEach((m, i) => {
    const key = m[1];
    if (seen.has(key)) return;
    const priceObj = objectAt(s, m.index + m[0].length - 1);
    if (priceObj?.withTax == null) return;
    const chunk = s.slice(m.index, starts[i + 1]?.index ?? m.index + 20000);
    const name = cleanName(JSON.parse(`"${m[2]}"`));
    const price = priceObj.withTax;
    const was = priceObj.beforeSaleWithTax || priceObj.recommendedRetailPrice || null;
    seen.set(key, {
      id: `eis:${key}`,
      shop: 'eis',
      name,
      url: 'https://www.eis.de' + (field(chunk, /"href":"(\/p\/[^"]+)"/) ?? `/p/${key}`),
      image: field(chunk, /"coverImage":"([^"]+)"/)?.replace('width=688', 'width=300') ?? null,
      price,
      was: was && was > price ? was : null,
      // eis.de streicht meist die UVP durch, nicht einen echten Vorher-Preis
      wasKind: priceObj.beforeSaleWithTax ? 'vorher' : 'uvp',
      off: offPercent(price, was),
      soldOut: field(chunk, /"isSoldOut":(true|false)/) === 'true',
      bestseller: /"label":"bestseller","value":"bestseller"/.test(chunk),
      ean: field(chunk, /"key":"ean"[^}]*"value":"(\d{8,14})"/) ?? null,
      // Tagestipp / Gratisartikel: kostenlos ab Mindestbestellwert, „Warenwert“ = Vergleichspreis
      label: field(chunk, /"label":"([^"]*)","composedMaterials"/) ?? null,
      dealPos: Number(field(chunk, /"dailyDealPosition":\{[^{]*"values":\{"id":\d+,"label":"(\d+)"/) ?? 0),
      minOrder: Number(field(chunk, /"price\.minimumOrderValue":\{[^{]*"values":\[\{"fieldSet":\[\[\{"value":"(\d+)"/) ?? 0) || null,
      dealEnd: field(chunk, /"dailyDealEndDate":\{[^{]*"values":\[\{"fieldSet":\[\[\{"value":"([^"]+)"/) ?? null,
      worth: Number(field(chunk, /"price\.comparisonPrice":\{[^{]*"values":\[\{"fieldSet":\[\[\{"value":"(\d+)"/) ?? 0) || null,
    });
  });
  return [...seen.values()];
}

async function eisSale() {
  const first = await get('https://www.eis.de/sale');
  const lastPage = Math.min(Number(rscPayload(first).match(/"lastPage":(\d+)/)?.[1] ?? 1), 5);
  const all = eisProducts(first);
  for (let p = 2; p <= lastPage; p++) all.push(...eisProducts(await get(`https://www.eis.de/sale?page=${p}`)));
  return dedupe(all).filter((p) => p.price > 0 && p.off > 0 && !p.soldOut);
}

async function eisPopular() {
  // Die Kategorie-Seite ist ab Werk nach Beliebtheit sortiert
  return eisProducts(await get('https://www.eis.de/lovetoys')).filter((p) => p.price > 0 && !p.soldOut).slice(0, 10);
}

async function eisBoxes() {
  const sitemap = await get('https://www.eis.de/sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>(https:\/\/www\.eis\.de\/p\/[^<]*mystery-box[^<]*)<\/loc>/g)].map((m) => m[1]);
  const boxes = [];
  for (const url of urls.slice(0, 20)) {
    try {
      const html = await get(url);
      for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
        const j = JSON.parse(m[1]);
        if (j['@type'] !== 'Product') continue;
        const key = url.match(/(pm\w+)$/)?.[1] ?? j.sku;
        const price = Math.round(Number(j.offers?.price) * 100);
        const fromRsc = eisProducts(html).find((p) => p.id === `eis:${key}`);
        boxes.push({
          id: `eis:${key}`,
          shop: 'eis',
          name: cleanName(j.name),
          url,
          image: j.image ?? null,
          price,
          was: fromRsc?.was ?? null,
          wasKind: fromRsc?.wasKind ?? 'uvp',
          off: fromRsc?.off ?? 0,
          available: /InStock/i.test(j.offers?.availability ?? ''),
        });
      }
    } catch (e) {
      console.warn('eis box', url, e.message);
    }
  }
  return boxes;
}

// ---------------------------------------------------------------- Kategorien

// Gemeinsame Kacheln: je Kachel die passende Kategorie-Seite bei eis.de und der Algolia-Filter bei Amorelie
const MADE_FOR = 'multi_properties.made_for_the_pleasure_of.value';
const CATEGORIES = [
  { id: 'sie', label: 'Für sie', eis: '/lovetoys/fuer-frauen', amo: `${MADE_FOR}:"Für Sie"` },
  { id: 'ihn', label: 'Für ihn', eis: '/lovetoys/fuer-maenner', amo: `${MADE_FOR}:"Für Ihn"` },
  { id: 'paare', label: 'Für Paare', eis: '/lovetoys/fuer-paare', amo: 'hierarchicalCategories.lvl1:"Sexspielzeug > Paartoys"' },
  { id: 'vibratoren', label: 'Vibratoren', eis: '/lovetoys/vibratoren', amo: 'hierarchicalCategories.lvl1:"Sexspielzeug > Vibratoren"' },
  { id: 'dildos', label: 'Dildos', eis: '/lovetoys/dildos', amo: 'hierarchicalCategories.lvl1:"Sexspielzeug > Dildos"' },
  { id: 'anal', label: 'Analtoys', eis: '/lovetoys/anal-toys', amo: 'hierarchicalCategories.lvl1:"Sexspielzeug > Analtoys"' },
  { id: 'masturbatoren', label: 'Masturbatoren', eis: '/lovetoys/fuer-maenner/masturbatoren', amo: 'hierarchicalCategories.lvl1:"Sexspielzeug > Masturbatoren"' },
  { id: 'penisringe', label: 'Penisringe', eis: '/lovetoys/cockringe', amo: 'hierarchicalCategories.lvl1:"Sexspielzeug > Penisringe"' },
  { id: 'liebeskugeln', label: 'Liebeskugeln', eis: '/lovetoys/fuer-frauen/liebeskugeln', amo: 'hierarchicalCategories.lvl1:"Sexspielzeug > Liebeskugeln"' },
  { id: 'sets', label: 'Sets & Boxen', eis: '/lovetoys/sexspielzeug-sets', amo: 'hierarchicalCategories.lvl1:"Sexspielzeug > Sets & Boxen"' },
  { id: 'dessous', label: 'Dessous', eis: '/dessous', amo: 'hierarchicalCategories.lvl0:"Dessous"' },
  { id: 'bdsm', label: 'BDSM', eis: '/bdsm', amo: 'hierarchicalCategories.lvl0:"BDSM"' },
  { id: 'gleitgel', label: 'Gleitgel', eis: '/drogerie/gleitgele', amo: 'hierarchicalCategories.lvl1:"Zubehör & Drogerie > Gleitgele"' },
  { id: 'drogerie', label: 'Drogerie & Pflege', eis: '/drogerie', amo: 'hierarchicalCategories.lvl0:"Zubehör & Drogerie"' },
];
const PER_CATEGORY = 40;

/** Erste Seite jeder eis.de-Kategorie (dort ab Werk nach Beliebtheit sortiert) */
async function eisCategories() {
  const out = {};
  for (const cat of CATEGORIES) {
    try {
      const html = await get('https://www.eis.de' + cat.eis);
      const items = eisProducts(html)
        .filter((p) => p.price > 0 && !p.soldOut)
        .slice(0, PER_CATEGORY);
      // Gesamtzahl der Kategorie, wie eis.de sie selbst angibt
      const total = Number(rscPayload(html).match(/"totalProducts":(\d+)/)?.[1] ?? items.length);
      out[cat.id] = Object.assign(items, { total });
    } catch (e) {
      console.warn('eis Kategorie', cat.id, e.message);
    }
  }
  return out;
}

// ---------------------------------------------------------------- Tagesdeals

/** eis.de: Tagestipp (gratis ab Mindestbestellwert), weitere Gratisartikel und reduzierte Sets */
async function eisDaily() {
  const home = eisProducts(await get('https://www.eis.de/'));
  const freePage = eisProducts(await get('https://www.eis.de/lovetoys/kostenlose-toys'));
  const byPos = (a, b) => a.dealPos - b.dealPos;
  // Laufende Aktion = Enddatum liegt in der Zukunft; das Datum wird als endsAt mitgegeben
  const running = (p) => !p.soldOut && (!p.dealEnd || Date.parse(p.dealEnd.length === 10 ? p.dealEnd + 'T23:59:59+02:00' : p.dealEnd) > Date.now());
  const withEnd = (p) => ({ ...p, action: p.dealEnd ? { end: new Date(Date.parse(p.dealEnd.length === 10 ? p.dealEnd + 'T23:59:59+02:00' : p.dealEnd)).toISOString() } : null });
  const deals = home.filter((p) => p.label === 'Deal des Tages' && running(p)).sort(byPos).map(withEnd);
  const tips = home.filter((p) => p.label === 'Tagestipp' && p.dealPos > 0 && running(p)).sort(byPos).map(withEnd);
  const tipIds = new Set([...deals, ...tips].map((p) => p.id));
  const gifts = dedupe([...freePage, ...home.filter((p) => p.label === 'Kostenlos')]).filter((p) => p.price === 0 && !p.soldOut && !tipIds.has(p.id));
  const bundles = eisProducts(await get('https://www.eis.de/lovetoys/sexspielzeug-sets'))
    .filter((p) => p.price > 0 && p.off > 0 && !p.soldOut)
    .sort((a, b) => b.off - a.off)
    .slice(0, 20);
  // Ohne eigenen „Deal des Tages“ springt der erste Tagestipp ein
  const top = deals.length ? deals : tips.slice(0, 1);
  return { deal: top[0] ?? null, deals: top, tips: deals.length ? tips : tips.slice(1), gifts, bundles };
}

// ---------------------------------------------------------------- Amorelie

/** Amorelie lädt Produkte aus Algolia; den (kurzlebigen) Suchschlüssel liefert die Seite mit */
async function amorelieSearch() {
  const html = await get('https://www.amorelie.de/sale');
  const m = html.match(/"app":\{"id":"(\w+)","key":"([^"]+)"\},"indexes":\{[^}]*"products":"([^"]+)"/);
  if (!m) throw new Error('Amorelie: Suchschlüssel nicht gefunden');
  const [, app, key, index] = m;
  return async (params) => {
    await sleep(500);
    const res = await fetch(`https://${app}-dsn.algolia.net/1/indexes/${index}/query`, {
      method: 'POST',
      headers: {
        'x-algolia-application-id': app,
        'x-algolia-api-key': key,
        'content-type': 'application/json',
        referer: 'https://www.amorelie.de/',
        'user-agent': UA,
      },
      body: JSON.stringify({ params: new URLSearchParams({ attributesToHighlight: '[]', attributesToSnippet: '[]', ...params }).toString() }),
    });
    if (!res.ok) throw new Error(`Algolia ${res.status}`);
    const json = await res.json();
    return Object.assign(json.hits.map(amorelieProduct), { total: json.nbHits });
  };
}

/** Laufende, befristete Aktion („ACTIE“-Tag mit Enddatum in der Zukunft) */
function activeAction(tags) {
  const now = Date.now();
  for (const t of Object.values(tags ?? {})) {
    if (t.label_type !== 'ACTIE' || !t.end_date || t.end_date.startsWith('0000')) continue;
    const end = Date.parse(t.end_date.replace(' ', 'T') + '+02:00');
    if (end > now && (!t.start_date || Date.parse(t.start_date.replace(' ', 'T') + '+02:00') <= now)) return { end: new Date(end).toISOString() };
  }
  return null;
}

function amorelieProduct(h) {
  const eur = h.prices?.EUR ?? {};
  const regular = Math.round(Number(eur.prijs ?? h.prijs) * 100);
  const offer = Math.round(Number(eur.aanbiedingsprijs ?? 0) * 100);
  const price = offer > 0 && offer < regular ? offer : regular;
  const was = price < regular ? regular : null;
  const pid = h.link?.match(/-p-(\d+)/)?.[1] ?? h.objectID;
  return {
    id: `amo:${pid}`,
    shop: 'amo',
    name: h.titel,
    url: 'https://www.amorelie.de' + h.link,
    image: h.image?.replace('w=250', 'w=300') ?? null,
    price,
    was,
    wasKind: 'vorher',
    off: offPercent(price, was),
    soldOut: Number(h.voorraad) === 0,
    ean: h.ean ?? null,
    combi: Boolean(h.is_combideal),
    action: activeAction(h.tags),
  };
}

async function amorelie() {
  const search = await amorelieSearch();
  const sale = [];
  for (let page = 0; page < 2; page++) {
    sale.push(...(await search({ filters: 'label:SALE AND voorraad:1', hitsPerPage: '100', page: String(page) })));
  }
  const popular = await search({ filters: 'categories:Sexspielzeug AND voorraad:1', hitsPerPage: '10' });
  const boxes = (await search({ query: 'mystery box', hitsPerPage: '20' }))
    .concat(await search({ query: 'überraschungsbox', hitsPerPage: '20' }))
    .filter((p) => BOX_RE.test(p.name))
    .map(({ soldOut, ...p }) => ({ ...p, available: !soldOut }));
  const categories = {};
  for (const cat of CATEGORIES) {
    try {
      // Ohne Lager-Filter, damit die Gesamtzahl der des Shops entspricht; Ausverkauftes fliegt danach raus
      const hits = await search({ filters: cat.amo, hitsPerPage: String(PER_CATEGORY * 2) });
      categories[cat.id] = Object.assign(hits.filter((p) => !p.soldOut).slice(0, PER_CATEGORY), { total: hits.total });
    } catch (e) {
      console.warn('Amorelie Kategorie', cat.id, e.message);
    }
  }
  // Einmal über alles Lieferbare: Kombi-Deals (Bundles) und befristete Aktionen
  const all = [];
  for (let page = 0; page < 8; page++) {
    const hits = await search({
      filters: 'voorraad:1',
      hitsPerPage: '1000',
      page: String(page),
      attributesToRetrieve: 'titel,link,image,prices.EUR,prijs,voorraad,ean,tags,is_combideal',
    });
    all.push(...hits);
    if (hits.length < 1000) break;
  }
  const daily = {
    bundles: all.filter((p) => p.combi).sort((a, b) => b.off - a.off).slice(0, 30),
    actions: all
      .filter((p) => p.action && p.off > 0)
      .sort((a, b) => a.action.end.localeCompare(b.action.end) || b.off - a.off)
      .slice(0, 30),
  };
  return { sale: dedupe(sale).filter((p) => p.off > 0), popular, boxes: dedupe(boxes), categories, daily };
}

// ---------------------------------------------------------------- Zusammenführen

function dedupe(list) {
  return [...new Map(list.map((p) => [p.id, p])).values()];
}

const slim = ({ soldOut, bestseller, ean, label, dealPos, dealEnd, minOrder, worth, combi, action, ...p }) => ({
  ...p,
  ...(minOrder ? { minOrder } : {}),
  ...(worth && p.price === 0 ? { worth } : {}),
  ...(action ? { endsAt: action.end } : {}),
});

function withTrend(list, previous) {
  const before = new Map((previous ?? []).map((p, i) => [p.id, i]));
  return list.map((p, i) => ({ ...slim(p), rank: i + 1, prevRank: before.has(p.id) ? before.get(p.id) + 1 : null }));
}

const euro = (cents) => (cents / 100).toFixed(2).replace('.', ',') + ' €';

/** Einstellungen, die die App als JSON an ntfy.sh/<Thema>-config schickt (ntfy hält sie 12 Std.) */
async function appSettings() {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return {};
  try {
    const res = await fetch(`https://ntfy.sh/${topic}-config/json?poll=1&since=all`);
    const lines = (await res.text()).trim().split('\n').filter(Boolean);
    const last = lines.map((l) => JSON.parse(l)).filter((e) => e.event === 'message').at(-1);
    if (!last) return {};
    const cfg = JSON.parse(last.message);
    return { boxMaxPrice: Number.isFinite(cfg.boxMaxPrice) ? cfg.boxMaxPrice : null, settingsAt: new Date(last.time * 1000).toISOString() };
  } catch (e) {
    console.warn('Einstellungen', e.message);
    return {};
  }
}

/** SMS über Twilio – nur wenn die Zugangsdaten als Secrets gesetzt sind */
async function sms(body) {
  const { TWILIO_SID: sid, TWILIO_TOKEN: token, TWILIO_FROM: from, SMS_TO: to } = process.env;
  if (!sid || !token || !from || !to) return console.log('[SMS aus]', body);
  for (const number of to.split(',').map((n) => n.trim()).filter(Boolean)) {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') },
      body: new URLSearchParams({ To: number, From: from, Body: body }),
    }).catch((e) => ({ ok: false, statusText: e.message }));
    if (!res.ok) console.warn('SMS fehlgeschlagen', res.status ?? '', res.statusText);
  }
}

async function notify(title, message, url) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return console.log('[ntfy aus]', title, '–', message);
  await fetch(`https://ntfy.sh/${topic}`, {
    method: 'POST',
    headers: { Title: encodeURIComponent(title), Tags: 'gift', Click: url, 'X-Title-Encoding': 'utf-8' },
    body: message,
  }).catch((e) => console.warn('ntfy', e.message));
}

async function main() {
  fs.mkdirSync(DATA, { recursive: true });
  const prev = readJson('latest.json', null);
  const history = readJson('history.json', {});
  const state = readJson('state.json', { boxes: {} });

  const errors = [];
  const safe = async (label, fn, fallback) => {
    try {
      return await fn();
    } catch (e) {
      errors.push(`${label}: ${e.message}`);
      console.warn(label, e);
      return fallback;
    }
  };

  // eis.de sperrt die Server von GitHub aus; dort übernimmt das der Mac (scraper/mac-bot.sh)
  const skipEis = process.env.SKIP_EIS === '1';
  const eisDeals = skipEis ? null : await safe('eis Sale', eisSale, null);
  const eisTop = skipEis ? null : await safe('eis Beliebt', eisPopular, null);
  const eisBox = skipEis ? null : await safe('eis Boxen', eisBoxes, null);
  const eisCats = skipEis ? null : await safe('eis Kategorien', eisCategories, null);
  const eisDay = skipEis ? null : await safe('eis Tagesdeals', eisDaily, null);
  const amo = await safe('Amorelie', amorelie, null);

  // Was nicht geladen werden konnte, bleibt beim letzten Stand
  const keep = (fresh, shop, key) => fresh ?? (prev?.[key] ?? []).filter((p) => p.shop === shop);
  const deals = [...keep(eisDeals?.map(slim), 'eis', 'deals'), ...keep(amo?.sale.map(slim), 'amo', 'deals')].sort(
    (a, b) => b.off - a.off,
  );
  const popular = {
    eis: eisTop ? withTrend(eisTop, prev?.popular?.eis) : (prev?.popular?.eis ?? []),
    amo: amo ? withTrend(amo.popular, prev?.popular?.amo) : (prev?.popular?.amo ?? []),
  };
  const boxList = [...keep(eisBox, 'eis', 'boxes'), ...keep(amo?.boxes, 'amo', 'boxes')];

  // Mystery-Box-Alarm: neu entdeckt oder wieder lieferbar
  const now = new Date().toISOString();
  for (const box of boxList) {
    const known = state.boxes[box.id];
    const shopName = box.shop === 'eis' ? 'eis.de' : 'Amorelie';
    const price = (box.price / 100).toFixed(2).replace('.', ',') + ' €';
    if (!known) {
      if (prev) await notify(`Neue Mystery-Box bei ${shopName}`, `${box.name} – ${price}`, box.url);
      state.boxes[box.id] = { firstSeen: now, available: box.available };
    } else if (box.available && !known.available) {
      await notify(`Mystery-Box wieder da (${shopName})`, `${box.name} – ${price}`, box.url);
    }
    state.boxes[box.id].available = box.available;
    box.firstSeen = state.boxes[box.id].firstSeen;
  }
  boxList.sort((a, b) => Number(b.available) - Number(a.available) || b.firstSeen.localeCompare(a.firstSeen));

  const daily = {
    eis: eisDay
      ? {
          deal: eisDay.deal && slim(eisDay.deal),
          deals: eisDay.deals.map(slim),
          tips: eisDay.tips.map(slim),
          gifts: eisDay.gifts.map(slim),
          bundles: eisDay.bundles.map(slim),
        }
      : (prev?.daily?.eis ?? { deal: null, tips: [], gifts: [], bundles: [] }),
    amo: amo?.daily ? { bundles: amo.daily.bundles.map(slim), actions: amo.daily.actions.map(slim) } : (prev?.daily?.amo ?? { bundles: [], actions: [] }),
  };

  // Box-Preisalarm: Grenze kommt aus der App (über ntfy) und wird im state gemerkt
  const settings = (state.settings = { ...(state.settings ?? {}), ...(await appSettings()) });
  if (settings.boxMaxPrice) {
    for (const box of boxList) {
      const known = state.boxes[box.id];
      if (!box.available || box.price > settings.boxMaxPrice || known.alertedPrice === box.price) continue;
      const shopName = box.shop === 'eis' ? 'eis.de' : 'Amorelie';
      const text = `${box.name} bei ${shopName} für ${euro(box.price)} – unter deiner Grenze von ${euro(settings.boxMaxPrice)}`;
      await notify('Mystery-Box im Wunschpreis!', text, box.url);
      await sms(`Schnäppchenherz: ${text} ${box.url}`);
      known.alertedPrice = box.price;
    }
  }

  // Kategorien: was in diesem Lauf fehlt, bleibt beim letzten Stand
  const prevCats = new Map((prev?.categories ?? []).map((cat) => [cat.id, cat]));
  const categories = CATEGORIES.map(({ id, label }) => ({
    id,
    label,
    eis: eisCats?.[id]?.map(slim) ?? prevCats.get(id)?.eis ?? [],
    amo: amo?.categories?.[id]?.map(slim) ?? prevCats.get(id)?.amo ?? [],
    total: {
      eis: eisCats?.[id]?.total ?? prevCats.get(id)?.total?.eis ?? null,
      amo: amo?.categories?.[id]?.total ?? prevCats.get(id)?.total?.amo ?? null,
    },
  }));

  // Preisverlauf: ein Punkt pro Änderung, [Tag, Cent]
  const day = today();
  const cutoff = new Date(Date.now() - MAX_HISTORY_DAYS * 864e5).toISOString().slice(0, 10);
  const dailyItems = [...daily.eis.tips, ...daily.eis.gifts, ...daily.eis.bundles, ...daily.amo.bundles, ...daily.amo.actions];
  dailyItems.push(...(daily.eis.deals ?? (daily.eis.deal ? [daily.eis.deal] : [])));
  for (const p of [...deals, ...popular.eis, ...popular.amo, ...boxList, ...categories.flatMap((cat) => [...cat.eis, ...cat.amo]), ...dailyItems]) {
    const h = (history[p.id] ??= { name: p.name, shop: p.shop, url: p.url, image: p.image, points: [] });
    Object.assign(h, { name: p.name, url: p.url, image: p.image, seen: day });
    const last = h.points.at(-1);
    if (!last || last[1] !== p.price) {
      if (last?.[0] === day) last[1] = p.price;
      else h.points.push([day, p.price]);
    }
  }
  for (const [id, h] of Object.entries(history)) {
    if (h.seen < cutoff) delete history[id];
  }

  // Gleiches Produkt in beiden Shops (über die EAN)
  const byEan = new Map();
  const raw = [
    ...(eisDeals ?? []),
    ...(eisTop ?? []),
    ...Object.values(eisCats ?? {}).flat(),
    ...(amo?.sale ?? []),
    ...(amo?.popular ?? []),
    ...Object.values(amo?.categories ?? {}).flat(),
  ];
  for (const p of raw) {
    if (!p.ean) continue;
    const ids = byEan.get(p.ean) ?? new Set();
    ids.add(p.id);
    byEan.set(p.ean, ids);
  }
  const twins = {};
  for (const ids of byEan.values()) {
    const list = [...ids];
    const eis = list.find((i) => i.startsWith('eis:'));
    const am = list.find((i) => i.startsWith('amo:'));
    if (eis && am) Object.assign(twins, { [eis]: am, [am]: eis });
  }

  writeJson('latest.json', { updatedAt: now, errors, deals, popular, boxes: boxList, categories, daily, settings, twins });
  writeJson('history.json', history);
  writeJson('state.json', state);
  console.log(
    `Fertig: ${deals.length} Angebote, ${boxList.length} Boxen, ${Object.keys(history).length} Verläufe` +
      (errors.length ? `\nFehler: ${errors.join(' | ')}` : ''),
  );
  if (errors.length === (skipEis ? 1 : 4)) process.exit(1);
}

await main();
