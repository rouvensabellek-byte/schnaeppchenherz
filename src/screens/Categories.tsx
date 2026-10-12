import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Category, History, Latest, Product, Shop } from '../data';
import { c, font } from '../theme';
import { Empty, H1, Icon, ProductCard, Segmented, tap } from '../ui';

// Pastell-Paare: Kachelgrund und dunkle Schrift dazu (Kontrast ≥ 4.5:1)
const TILE = [
  { bg: '#FFD9E6', ink: '#7A2149' },
  { bg: '#E4DCFF', ink: '#4B3F8F' },
  { bg: '#D9F2E6', ink: '#2F6B4F' },
  { bg: '#FFE6CC', ink: '#8C4A1F' },
  { bg: '#FFF0B8', ink: '#6B5414' },
  { bg: '#D6ECFF', ink: '#24527A' },
];

type Filter = 'all' | Shop;
type Sort = 'popular' | 'off' | 'price';

/** Beliebt: abwechselnd eis.de und Amorelie, jeweils in Shop-Reihenfolge */
function interleave(a: Product[], b: Product[]) {
  const out: Product[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

function Tile({ cat, i, onPress }: { cat: Category; i: number; onPress: () => void }) {
  const t = TILE[i % TILE.length];
  const count = cat.eis.length + cat.amo.length;
  const pics = interleave(cat.eis, cat.amo)
    .filter((p) => p.image)
    .slice(0, 2);
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [st.tile, { backgroundColor: t.bg }, pressed && { transform: [{ scale: 0.97 }] }]}
      accessibilityRole="button"
      accessibilityLabel={`${cat.label}, ${count} Produkte`}
    >
      <View style={{ gap: 2 }}>
        <Text style={[st.tileLabel, { color: t.ink }]} numberOfLines={2}>
          {cat.label}
        </Text>
        <Text style={[st.tileCount, { color: t.ink }]}>{count} Produkte</Text>
      </View>
      <View style={st.pics}>
        {pics.map((p, k) => (
          <View key={p.id} style={[st.pic, { marginLeft: k ? -18 : 0, zIndex: 2 - k }]}>
            <Image source={p.image} style={{ width: 46, height: 46 }} contentFit="contain" />
          </View>
        ))}
      </View>
    </Pressable>
  );
}

function CategoryList({ cat, history, onBack, open }: { cat: Category; history: History; onBack: () => void; open: (p: Product) => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('popular');

  const list = useMemo(() => {
    const base = filter === 'eis' ? cat.eis : filter === 'amo' ? cat.amo : interleave(cat.eis, cat.amo);
    if (sort === 'off') return [...base].sort((a, b) => b.off - a.off);
    if (sort === 'price') return [...base].sort((a, b) => a.price - b.price);
    return base;
  }, [cat, filter, sort]);

  const SORTS: { id: Sort; label: string }[] = [
    { id: 'popular', label: 'Beliebt' },
    { id: 'off', label: 'Rabatt' },
    { id: 'price', label: 'Preis' },
  ];

  const header = (
    <View style={{ gap: 16, paddingBottom: 12 }}>
      <View style={st.titleRow}>
        <Pressable onPress={onBack} style={st.back} accessibilityRole="button" accessibilityLabel="Zurück zu allen Kategorien" hitSlop={8}>
          <Icon name="back" size={20} width={2.2} />
        </Pressable>
        <H1>{cat.label}</H1>
      </View>
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: 'Alle' },
          { id: 'eis', label: 'eis.de' },
          { id: 'amo', label: 'Amorelie' },
        ]}
      />
      <View style={st.sorts}>
        {SORTS.map((o) => {
          const active = o.id === sort;
          return (
            <Pressable
              key={o.id}
              onPress={() => {
                tap();
                setSort(o.id);
              }}
              style={[st.sortChip, active && { backgroundColor: c.plum }]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[st.sortText, active && { color: '#fff' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <FlatList
      data={list}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={header}
      renderItem={({ item }) => <ProductCard p={item} entry={history[item.id]} onPress={() => open(item)} />}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      contentContainerStyle={st.content}
      ListEmptyComponent={<Empty title="Hier ist gerade nichts" text="Beim nächsten Abruf füllt sich die Kategorie." />}
      initialNumToRender={8}
    />
  );
}

export function Categories({ latest, history, loading, onRefresh, open }: { latest: Latest; history: History; loading: boolean; onRefresh: () => void; open: (p: Product) => void }) {
  const cats = latest.categories ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const current = cats.find((cat) => cat.id === selected);

  if (current) return <CategoryList cat={current} history={history} onBack={() => setSelected(null)} open={open} />;

  return (
    <ScrollView contentContainerStyle={st.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={c.hot} />}>
      <H1>Stöbern</H1>
      <Text style={st.lead}>Beide Shops zusammen, nach Kategorie sortiert.</Text>
      {cats.length ? (
        <View style={st.grid}>
          {cats.map((cat, i) => (
            <Tile key={cat.id} cat={cat} i={i} onPress={() => setSelected(cat.id)} />
          ))}
        </View>
      ) : (
        <Empty title="Noch keine Kategorien" text="Zieh nach unten, um neu zu laden." />
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 16 },
  lead: { fontFamily: font.body, fontSize: 15, color: c.inkSoft, lineHeight: 21, marginTop: -6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '47.5%', flexGrow: 1, height: 132, borderRadius: 26, padding: 16, overflow: 'hidden' },
  tileLabel: { fontFamily: font.display, fontSize: 19, lineHeight: 23 },
  tileCount: { fontFamily: font.bold, fontSize: 12, opacity: 0.85 },
  pics: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row' },
  pic: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  sorts: { flexDirection: 'row', gap: 8 },
  sortChip: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center' },
  sortText: { fontFamily: font.bold, fontSize: 13, color: c.ink },
});
