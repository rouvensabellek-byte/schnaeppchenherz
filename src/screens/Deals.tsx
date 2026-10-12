import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Box, History, Latest, Product, Shop } from '../data';
import { c, euro, font } from '../theme';
import { Box3D, Empty, H2, Icon, ProductCard, Segmented, tap } from '../ui';

type Filter = 'all' | Shop;
type Sort = 'off' | 'price';

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function ago(iso: string) {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 60) return `vor ${Math.max(min, 1)} Min.`;
  const h = Math.round(min / 60);
  if (h < 48) return `vor ${h} Std.`;
  return `vor ${Math.round(h / 24)} Tagen`;
}

export function Deals({
  latest,
  history,
  newBoxes,
  loading,
  onRefresh,
  open,
  openBoxes,
}: {
  latest: Latest;
  history: History;
  newBoxes: Box[];
  loading: boolean;
  onRefresh: () => void;
  open: (p: Product) => void;
  openBoxes: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('off');
  const now = new Date();

  const list = useMemo(() => {
    const l = latest.deals.filter((d) => filter === 'all' || d.shop === filter);
    return sort === 'off' ? l : [...l].sort((a, b) => a.price - b.price);
  }, [latest.deals, filter, sort]);

  // Banner: frisch entdeckte Box, sonst die neueste lieferbare
  const box = newBoxes[0] ?? latest.boxes.find((b) => b.available && Date.now() - Date.parse(b.firstSeen) < 3 * 864e5);

  const header = (
    <View style={{ gap: 18, paddingBottom: 12 }}>
      <View>
        <Text style={st.date}>
          {WEEKDAYS[now.getDay()]}, {now.getDate()}. {MONTHS[now.getMonth()]}
        </Text>
        <Text style={st.hello}>Hallo Süße</Text>
      </View>

      {box ? (
        <Pressable
          style={st.boxBanner}
          onPress={() => {
            tap();
            openBoxes();
          }}
          accessibilityRole="button"
        >
          <View style={st.boxIcon}>
            <Box3D />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={st.boxKicker}>{newBoxes.length > 1 ? `${newBoxes.length} neue Mystery-Boxen` : 'Neu · Mystery-Box'}</Text>
            <Text style={st.boxTitle} numberOfLines={1}>
              {box.name} · {euro(box.price)}
            </Text>
            <Text style={st.boxSub}>
              bei {box.shop === 'eis' ? 'eis.de' : 'Amorelie'} · {ago(box.firstSeen)}
            </Text>
          </View>
          <Icon name="chevron" size={20} color={c.mintInk} width={2.2} />
        </Pressable>
      ) : null}

      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: 'Alle' },
          { id: 'eis', label: 'eis.de' },
          { id: 'amo', label: 'Amorelie' },
        ]}
      />

      <H2
        right={
          <Pressable
            hitSlop={12}
            onPress={() => {
              tap();
              setSort(sort === 'off' ? 'price' : 'off');
            }}
            accessibilityRole="button"
          >
            <Text style={st.sort}>{sort === 'off' ? 'Höchster Rabatt' : 'Günstigste zuerst'} ⇅</Text>
          </Pressable>
        }
      >
        {list.length} im Angebot
      </H2>
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
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={c.hot} />}
      ListEmptyComponent={<Empty title="Gerade nichts im Angebot" text="Zieh nach unten, um neu zu laden." />}
      initialNumToRender={8}
    />
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },
  date: { fontFamily: font.semi, fontSize: 14, color: c.inkSoft },
  hello: { fontFamily: font.display, fontSize: 30, color: c.ink },
  boxBanner: { backgroundColor: c.mint, borderRadius: 26, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' },
  boxIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  boxKicker: { fontFamily: font.black, fontSize: 12, letterSpacing: 0.7, textTransform: 'uppercase', color: c.mintInk },
  boxTitle: { fontFamily: font.displayMedium, fontSize: 17, color: c.ink },
  boxSub: { fontFamily: font.semi, fontSize: 13, color: '#456B58' },
  sort: { fontFamily: font.bold, fontSize: 14, color: c.roseInk },
});
