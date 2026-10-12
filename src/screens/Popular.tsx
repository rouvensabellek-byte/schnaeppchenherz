import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Latest, Product, Ranked, Shop } from '../data';
import { c, euro, font } from '../theme';
import { Empty, H1, Segmented, Thumb, tap, useDetails } from '../ui';

const RANK_BG = [c.lavender, c.roseSoft, '#D6ECFF', c.mint];

function Trend({ r }: { r: Ranked }) {
  if (r.prevRank === null) return <Text style={[st.trend, { backgroundColor: c.vanilla }]}>neu</Text>;
  const diff = r.prevRank - r.rank;
  if (diff > 0) return <Text style={[st.trend, { backgroundColor: '#D4F1E2' }]}>▲ {diff}</Text>;
  if (diff < 0) return <Text style={[st.trend, { backgroundColor: '#FFE0E0' }]}>▼ {-diff}</Text>;
  return <Text style={[st.trend, { backgroundColor: '#EEEBFA' }]}>=</Text>;
}

export function Popular({ latest, loading, onRefresh, open }: { latest: Latest; loading: boolean; onRefresh: () => void; open: (p: Product) => void }) {
  const [shop, setShop] = useState<Shop>('eis');
  const details = useDetails();
  const list = latest.popular[shop];

  return (
    <ScrollView contentContainerStyle={st.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={c.hot} />}>
      <H1>Beliebt gerade</H1>
      <Text style={st.lead}>Die Top 10 der Toys, so wie die Shops sie gerade sortieren. Pfeile zeigen, wer seit dem letzten Abruf auf- oder abgestiegen ist.</Text>
      <Segmented<Shop>
        value={shop}
        onChange={setShop}
        options={[
          { id: 'eis', label: 'eis.de' },
          { id: 'amo', label: 'Amorelie' },
        ]}
      />
      <View style={{ gap: 10 }}>
        {list.length ? (
          list.map((r, i) => (
            <Pressable
              key={r.id}
              style={st.row}
              onPress={() => {
                tap();
                open(r);
              }}
              onLongPress={() => details(r)}
              accessibilityRole="button"
              accessibilityLabel={`Platz ${r.rank}: ${r.name}`}
            >
              <View style={[st.rank, { backgroundColor: RANK_BG[i % RANK_BG.length] }]}>
                <Text style={st.rankText}>{r.rank}</Text>
              </View>
              <Thumb p={r} size={52} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.name} numberOfLines={2}>
                  {r.name}
                </Text>
                <Text style={st.price}>
                  {euro(r.price)}
                  {r.off ? <Text style={st.off}>  −{r.off} %</Text> : null}
                </Text>
              </View>
              <Trend r={r} />
            </Pressable>
          ))
        ) : (
          <Empty title="Noch keine Liste" text="Beim nächsten Abruf kommt sie." />
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 16 },
  lead: { fontFamily: font.body, fontSize: 15, color: c.inkSoft, lineHeight: 21, marginTop: -6 },
  row: { backgroundColor: c.card, borderRadius: 22, padding: 10, paddingRight: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  rank: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: font.display, fontSize: 17, color: c.ink },
  name: { fontFamily: font.bold, fontSize: 14, color: c.ink },
  price: { fontFamily: font.semi, fontSize: 13, color: c.inkSoft },
  off: { fontFamily: font.black, color: c.roseInk },
  trend: { fontFamily: font.black, fontSize: 12, color: c.ink, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
});
