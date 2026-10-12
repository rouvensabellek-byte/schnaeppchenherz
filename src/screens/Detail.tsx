import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { History, Latest, Product, catalog, stats } from '../data';
import { c, euro, font, shopStyle } from '../theme';
import { Icon, PriceChart, ShopChip, Thumb, tap } from '../ui';

export function Detail({ p, latest, history, watched, onToggleWatch, onClose }: { p: Product; latest: Latest; history: History; watched: boolean; onToggleWatch: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const entry = history[p.id];
  const st0 = stats(entry, p.price);

  // Gleiches Produkt im anderen Shop?
  const twinId = latest.twins[p.id];
  const twin = twinId ? catalog(latest).get(twinId) : undefined;
  const twinEntry = twinId ? history[twinId] : undefined;

  const series = [
    ...(entry ? [{ entry, color: shopStyle[p.shop].line }] : []),
    ...(twin && twinEntry ? [{ entry: twinEntry, color: shopStyle[twin.shop].line, dashed: true }] : []),
  ];
  const days = st0.since ? Math.round((Date.now() - Date.parse(st0.since)) / 864e5) : 0;

  let hint: string;
  if (twin && twin.price < p.price) hint = `Bei ${shopStyle[twin.shop].label} gerade günstiger: ${euro(twin.price)}.`;
  else if (days < 3) hint = 'Wird erst seit kurzem beobachtet. Der Verlauf füllt sich mit jedem Abruf.';
  else if (st0.isLow) hint = 'Guter Moment: so günstig war es im beobachteten Zeitraum noch nie.';
  else if (p.price < st0.avg) hint = 'Unter dem Durchschnitt, aber es war schon mal günstiger.';
  else hint = 'Gerade eher teurer als sonst – vielleicht auf die Merkliste?';

  return (
    <View style={[st.root, { paddingTop: insets.top + 8 }]}>
      <View style={st.top}>
        <Pressable onPress={onClose} style={st.round} accessibilityRole="button" accessibilityLabel="Zurück" hitSlop={8}>
          <Icon name="back" size={20} width={2.2} color="#3F2A1F" />
        </Pressable>
        <Pressable
          onPress={() => {
            tap();
            onToggleWatch();
          }}
          style={[st.round, { backgroundColor: watched ? '#FFD6CC' : '#fff' }]}
          accessibilityRole="button"
          accessibilityLabel={watched ? 'Von Merkliste entfernen' : 'Merken'}
        >
          <Icon name="heart" size={20} width={1.8} color="#C4553F" fill={watched ? '#E0715A' : 'none'} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[st.content, { paddingBottom: insets.bottom + 100 }]}>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <Thumb p={p} size={92} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={st.kicker}>Preisverlauf{days ? ` · ${days} Tage` : ''}</Text>
            <Text style={st.title} numberOfLines={3}>
              {p.name}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ShopChip shop={p.shop} style={st.legend} />
          {twin ? <ShopChip shop={twin.shop} style={st.legend} /> : null}
        </View>

        {series.length && entry && entry.points.length > 0 ? (
          <View style={st.chartCard}>
            <PriceChart series={series} width={width - 40 - 28} />
          </View>
        ) : null}

        <View style={st.tiles}>
          <View style={[st.tile, { backgroundColor: c.vanilla }]}>
            <Text style={[st.tileLabel, { color: c.vanillaInk }]}>Jetzt</Text>
            <Text style={st.tileValue}>{euro(p.price)}</Text>
          </View>
          <View style={[st.tile, { backgroundColor: c.mint }]}>
            <Text style={[st.tileLabel, { color: c.mintInk }]}>Tiefstpreis</Text>
            <Text style={st.tileValue}>{euro(st0.min)}</Text>
          </View>
          <View style={[st.tile, { backgroundColor: c.peach }]}>
            <Text style={[st.tileLabel, { color: c.peachInk }]}>Durchschnitt</Text>
            <Text style={st.tileValue}>{euro(st0.avg)}</Text>
          </View>
        </View>

        {p.was ? (
          <Text style={st.was}>
            {p.wasKind === 'uvp' ? 'Unverbindliche Preisempfehlung' : 'Vorher'}: {euro(p.was)} · du sparst {p.off} %
          </Text>
        ) : null}

        <View style={st.hint}>
          <Icon name={st0.isLow ? 'check' : 'chart'} size={22} color={c.mintInk} />
          <Text style={st.hintText}>{hint}</Text>
        </View>
      </ScrollView>

      <View style={[st.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          style={({ pressed }) => [st.cta, pressed && { opacity: 0.85 }]}
          onPress={() => {
            tap();
            WebBrowser.openBrowserAsync(p.url);
          }}
          accessibilityRole="link"
        >
          <Icon name="out" size={20} color="#FFF6EA" />
          <Text style={st.ctaText}>Bei {shopStyle[p.shop].label} ansehen</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF6EA' },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  round: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 16 },
  kicker: { fontFamily: font.black, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: '#8C4A1F' },
  title: { fontFamily: font.display, fontSize: 22, lineHeight: 27, color: '#3F2A1F' },
  legend: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  chartCard: { backgroundColor: '#fff', borderRadius: 26, paddingTop: 16, paddingHorizontal: 14, paddingBottom: 8 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 20, padding: 12, gap: 4 },
  tileLabel: { fontFamily: font.bold, fontSize: 12 },
  tileValue: { fontFamily: font.display, fontSize: 18, color: '#3F2A1F' },
  was: { fontFamily: font.semi, fontSize: 13, color: '#7A5A48' },
  hint: { backgroundColor: '#fff', borderRadius: 22, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  hintText: { flex: 1, fontFamily: font.semi, fontSize: 14, lineHeight: 20, color: '#3F2A1F' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#FFF6EA' },
  cta: { height: 58, borderRadius: 29, backgroundColor: '#3F2A1F', flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: font.black, fontSize: 16, color: '#FFF6EA' },
});
