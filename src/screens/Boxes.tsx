import * as WebBrowser from 'expo-web-browser';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NTFY_TOPIC } from '../config';
import { Box, Latest, Product } from '../data';
import { c, euro, font } from '../theme';
import { Box3D, Empty, H1, H2, Icon, ShopChip, Thumb, tap } from '../ui';

const fmtDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
};

function BoxRow({ b, isNew, onPress }: { b: Box; isNew: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[st.row, !b.available && { opacity: 0.55 }]}
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${b.name}, ${euro(b.price)}${b.available ? '' : ', ausverkauft'}`}
    >
      <Thumb p={b} size={64} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <ShopChip shop={b.shop} />
          {isNew ? (
            <View style={[st.tag, { backgroundColor: c.mint }]}>
              <Text style={[st.tagText, { color: c.mintInk }]}>NEU</Text>
            </View>
          ) : null}
          {!b.available ? (
            <View style={[st.tag, { backgroundColor: '#EEE' }]}>
              <Text style={st.tagText}>ausverkauft</Text>
            </View>
          ) : null}
        </View>
        <Text style={st.name} numberOfLines={2}>
          {b.name}
        </Text>
        <Text style={st.meta}>
          <Text style={st.price}>{euro(b.price)}</Text>
          {b.was ? `  statt ${euro(b.was)}` : ''} · seit {fmtDay(b.firstSeen)}
        </Text>
      </View>
      <Icon name="chevron" size={18} color={c.inkSoft} />
    </Pressable>
  );
}

export function Boxes({ latest, newBoxes, loading, onRefresh, open }: { latest: Latest; newBoxes: Box[]; loading: boolean; onRefresh: () => void; open: (p: Product) => void }) {
  const fresh = new Set(newBoxes.map((b) => b.id));

  const subscribe = () => {
    tap();
    // Öffnet die ntfy-App (falls installiert) direkt beim Thema, sonst die Webseite
    Linking.openURL(`ntfy://ntfy.sh/${NTFY_TOPIC}`).catch(() => WebBrowser.openBrowserAsync(`https://ntfy.sh/${NTFY_TOPIC}`));
  };

  return (
    <ScrollView contentContainerStyle={st.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={c.hot} />}>
      <H1>Mystery-Boxen</H1>

      <View style={st.alarm}>
        <View style={st.alarmIcon}>
          <Icon name="bell" size={22} color={c.ink} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={st.alarmTitle}>Box-Alarm</Text>
          <Text style={st.alarmText}>
            {NTFY_TOPIC
              ? 'Alle 3 Stunden wird geprüft. Neue oder wieder lieferbare Boxen kommen als Push über die kostenlose App „ntfy“.'
              : 'Noch nicht eingerichtet: Thema in src/config.ts und als GitHub-Secret eintragen.'}
          </Text>
          {NTFY_TOPIC ? (
            <Pressable onPress={subscribe} style={st.alarmBtn} accessibilityRole="button">
              <Text style={st.alarmBtnText}>In ntfy abonnieren</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <H2>{latest.boxes.filter((b) => b.available).length} lieferbar</H2>
      <View style={{ gap: 10 }}>
        {latest.boxes.length ? (
          latest.boxes.map((b) => <BoxRow key={b.id} b={b} isNew={fresh.has(b.id)} onPress={() => open(b)} />)
        ) : (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Box3D />
            <Empty title="Gerade keine Boxen" text="Sobald eine auftaucht, bekommst du Bescheid." />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 16 },
  alarm: { backgroundColor: c.lavenderSoft, borderRadius: 26, padding: 16, flexDirection: 'row', gap: 14 },
  alarmIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  alarmTitle: { fontFamily: font.black, fontSize: 15, color: c.ink },
  alarmText: { fontFamily: font.body, fontSize: 14, color: '#5D5680', lineHeight: 20 },
  alarmBtn: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#7B6CD9', borderRadius: 16, paddingHorizontal: 14, height: 44, justifyContent: 'center' },
  alarmBtnText: { fontFamily: font.black, fontSize: 14, color: '#fff' },
  row: { backgroundColor: c.card, borderRadius: 22, padding: 10, paddingRight: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontFamily: font.black, fontSize: 11, color: c.ink },
  name: { fontFamily: font.bold, fontSize: 15, color: c.ink },
  meta: { fontFamily: font.semi, fontSize: 13, color: c.inkSoft },
  price: { fontFamily: font.display, fontSize: 16, color: c.roseInk },
});
