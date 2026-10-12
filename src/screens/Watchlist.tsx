import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { History, Latest, Product, catalog } from '../data';
import { c, font } from '../theme';
import { Empty, H1, ProductCard } from '../ui';
import { Watch } from '../watch';

export function Watchlist({ latest, history, watch, open }: { latest: Latest; history: History; watch: Watch; open: (p: Product) => void }) {
  const all = catalog(latest);
  const items: Product[] = Object.keys(watch).flatMap((id) => {
    const p = all.get(id);
    if (p) return [p];
    // Nicht mehr in den aktuellen Listen: letzter bekannter Stand aus dem Verlauf
    const h = history[id];
    if (!h) return [];
    const price = h.points[h.points.length - 1][1];
    return [{ id, shop: h.shop, name: h.name, url: h.url, image: h.image, price, was: null, wasKind: 'vorher', off: 0 } as Product];
  });

  return (
    <ScrollView contentContainerStyle={st.content}>
      <H1>Merkliste</H1>
      {items.length ? (
        <>
          <Text style={st.lead}>Wenn hier etwas günstiger wird, bekommst du beim nächsten Öffnen eine Mitteilung.</Text>
          <View style={{ gap: 12 }}>
            {items.map((p) => (
              <ProductCard key={p.id} p={p} entry={history[p.id]} onPress={() => open(p)} />
            ))}
          </View>
        </>
      ) : (
        <Empty title="Noch nichts gemerkt" text="Tippe bei einem Produkt auf das Herz, dann landet es hier und du siehst, wenn der Preis fällt." />
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 16 },
  lead: { fontFamily: font.body, fontSize: 15, color: c.inkSoft, lineHeight: 21, marginTop: -6 },
});
