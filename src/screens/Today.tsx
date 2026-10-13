import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Latest, Product } from '../data';
import { Glass } from '../glass';
import { c, euro, font, shopStyle } from '../theme';
import { ShopChip, Thumb, tap, useDetails } from '../ui';

const day = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
};

const endText = (iso?: string) => {
  if (!iso) return 'endet heute um 23:59 Uhr';
  const end = new Date(iso);
  const sameDay = end.toDateString() === new Date().toDateString();
  return sameDay ? `endet heute um ${end.getHours()}:${String(end.getMinutes()).padStart(2, '0')} Uhr` : `läuft bis ${day(iso)}`;
};

/** Preiszeile je nach Art: gratis ab Bestellwert, befristet oder normal reduziert */
function PriceLine({ p, big }: { p: Product; big?: boolean }) {
  if (p.price === 0) {
    return (
      <View style={{ gap: 2 }}>
        <Text style={[st.free, big && { fontSize: 24 }]}>Gratis</Text>
        <Text style={st.small}>
          {p.minOrder ? `ab ${euro(p.minOrder)} Bestellwert` : 'zur Bestellung'}
          {p.was || p.worth ? ` · Wert ${euro(p.was ?? p.worth ?? 0)}` : ''}
        </Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <Text style={[st.price, big && { fontSize: 24 }]}>{euro(p.price)}</Text>
        {p.was ? <Text style={st.was}>{euro(p.was)}</Text> : null}
      </View>
      {p.endsAt ? <Text style={st.small}>nur bis {day(p.endsAt)}</Text> : p.off ? <Text style={st.small}>−{p.off} %</Text> : null}
    </View>
  );
}

function Hero({ p, open }: { p: Product; open: (p: Product) => void }) {
  const details = useDetails();
  return (
    <Pressable
      onPress={() => {
        tap();
        open(p);
      }}
      onLongPress={() => details(p)}
      accessibilityRole="link"
      accessibilityLabel={`Deal des Tages: ${p.name}`}
    >
      <Glass style={st.hero} tint="rgba(255,214,232,0.45)">
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={st.kicker}>Deal des Tages · {shopStyle[p.shop].label}</Text>
          <Text style={st.heroName} numberOfLines={3}>
            {p.name}
          </Text>
          <PriceLine p={p} big />
          <Text style={st.small}>{endText(p.endsAt)}</Text>
        </View>
        <View style={st.heroPic}>{p.image ? <Image source={p.image} style={{ width: 112, height: 112 }} contentFit="contain" /> : null}</View>
      </Glass>
    </Pressable>
  );
}

function Mini({ p, open }: { p: Product; open: (p: Product) => void }) {
  const details = useDetails();
  return (
    <Pressable
      onPress={() => {
        tap();
        open(p);
      }}
      onLongPress={() => details(p)}
      style={({ pressed }) => [st.mini, pressed && { transform: [{ scale: 0.97 }] }]}
      accessibilityRole="link"
      accessibilityLabel={`${p.name}, im Shop öffnen`}
    >
      <Thumb p={p} size={126} />
      <ShopChip shop={p.shop} />
      <Text style={st.miniName} numberOfLines={2}>
        {p.name}
      </Text>
      <PriceLine p={p} />
    </Pressable>
  );
}

function Rail({ title, hint, items, open }: { title: string; hint?: string; items: Product[]; open: (p: Product) => void }) {
  if (!items.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <View>
        <Text style={st.railTitle}>{title}</Text>
        {hint ? <Text style={st.small}>{hint}</Text> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }} style={{ marginRight: -20 }}>
        {items.map((p) => (
          <Mini key={p.id} p={p} open={open} />
        ))}
      </ScrollView>
    </View>
  );
}

const mix = (a: Product[], b: Product[]) => a.flatMap((x, i) => (b[i] ? [x, b[i]] : [x])).concat(b.slice(a.length));

export function TodaySection({ latest, open }: { latest: Latest; open: (p: Product) => void }) {
  const d = latest.daily;
  if (!d) return null;
  return (
    <View style={{ gap: 20 }}>
      {(d.eis.deals ?? (d.eis.deal ? [d.eis.deal] : [])).map((p) => (
        <Hero key={p.id} p={p} open={open} />
      ))}
      <Rail title="Weitere Tagestipps" hint="eis.de · gratis zur Bestellung" items={d.eis.tips} open={open} />
      <Rail title="Gratis dazu" hint="Kostenlos ab Mindestbestellwert" items={d.eis.gifts} open={open} />
      <Rail title="Bundles & Sets" hint="Mehrere Produkte zum Paketpreis" items={mix(d.eis.bundles, d.amo.bundles)} open={open} />
      <Rail title="Nur für kurze Zeit" hint="Amorelie · Aktionen mit Enddatum" items={d.amo.actions} open={open} />
    </View>
  );
}

const st = StyleSheet.create({
  hero: { flexDirection: 'row', gap: 12, padding: 18, borderRadius: 28, alignItems: 'center' },
  heroPic: { width: 124, height: 124, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: font.black, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: c.roseInk },
  heroName: { fontFamily: font.display, fontSize: 20, lineHeight: 24, color: c.ink },
  free: { fontFamily: font.display, fontSize: 18, color: '#2F6B4F' },
  price: { fontFamily: font.display, fontSize: 17, color: c.roseInk },
  was: { fontFamily: font.semi, fontSize: 12, color: c.inkSoft, textDecorationLine: 'line-through' },
  small: { fontFamily: font.semi, fontSize: 12, color: c.inkSoft },
  railTitle: { fontFamily: font.displayMedium, fontSize: 19, color: c.ink },
  mini: { width: 150, gap: 6, padding: 12, borderRadius: 22, backgroundColor: c.card },
  miniName: { fontFamily: font.bold, fontSize: 13, color: c.ink, minHeight: 34 },
});
