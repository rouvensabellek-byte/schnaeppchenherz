import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { NTFY_TOPIC } from '../config';
import { Box, Latest, Product } from '../data';
import { Glass } from '../glass';
import { sendBoxSms, Settings } from '../settings';
import { c, euro, font } from '../theme';
import { Box3D, Empty, H1, H2, Icon, ShopChip, Thumb, tap, useDetails } from '../ui';

const fmtDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
};

function BoxRow({ b, isNew, inBudget, phone, onPress }: { b: Box; isNew: boolean; inBudget: boolean; phone: string; onPress: () => void }) {
  const details = useDetails();
  return (
    <Pressable
      style={[st.row, !b.available && { opacity: 0.55 }]}
      onPress={() => {
        tap();
        onPress();
      }}
      onLongPress={() => details(b)}
      accessibilityRole="link"
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
          {inBudget ? (
            <View style={[st.tag, { backgroundColor: c.vanilla }]}>
              <Text style={[st.tagText, { color: c.vanillaInk }]}>Wunschpreis</Text>
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
      {b.available ? (
        <Pressable
          onPress={async () => {
            tap();
            if (!(await sendBoxSms(phone, b))) Alert.alert('SMS geht hier nicht', 'Auf diesem Gerät kann keine SMS verschickt werden.');
          }}
          style={st.smsBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${b.name} per SMS schicken`}
        >
          <Icon name="message" size={20} color={c.roseInk} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const STEP = 500;

function PriceAlarm({ settings, update, serverKnows }: { settings: Settings; update: (p: Partial<Settings>) => void; serverKnows: boolean }) {
  const on = settings.boxMaxPrice !== null;
  const max = settings.boxMaxPrice ?? 4000;
  return (
    <Glass style={st.card} tint="rgba(255,240,184,0.4)">
      <View style={st.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={st.alarmTitle}>Preisalarm</Text>
          <Text style={st.alarmText}>Melden, sobald eine Box höchstens so viel kostet.</Text>
        </View>
        <Switch
          value={on}
          onValueChange={(v) => {
            tap();
            update({ boxMaxPrice: v ? max : null });
          }}
          trackColor={{ true: c.hot, false: '#E8DCE3' }}
          accessibilityLabel="Preisalarm an oder aus"
        />
      </View>
      {on ? (
        <>
          <View style={st.stepper}>
            <Pressable
              onPress={() => {
                tap();
                update({ boxMaxPrice: Math.max(STEP, max - STEP) });
              }}
              style={st.stepBtn}
              accessibilityRole="button"
              accessibilityLabel="5 Euro weniger"
            >
              <Text style={st.stepSign}>−</Text>
            </Pressable>
            <View style={{ alignItems: 'center' }}>
              <Text style={st.stepLabel}>bis</Text>
              <Text style={st.stepValue}>{euro(max)}</Text>
            </View>
            <Pressable
              onPress={() => {
                tap();
                update({ boxMaxPrice: max + STEP });
              }}
              style={st.stepBtn}
              accessibilityRole="button"
              accessibilityLabel="5 Euro mehr"
            >
              <Text style={st.stepSign}>+</Text>
            </Pressable>
          </View>
          <Text style={st.status}>
            {serverKnows ? '✓ Der Alarm-Server kennt deine Grenze.' : 'Wird beim nächsten Abruf übernommen (spätestens in 3 Std.).'}
          </Text>
        </>
      ) : null}
    </Glass>
  );
}

export function Boxes({
  latest,
  newBoxes,
  loading,
  onRefresh,
  open,
  settings,
  update,
  serverKnows,
}: {
  latest: Latest;
  newBoxes: Box[];
  loading: boolean;
  onRefresh: () => void;
  open: (p: Product) => void;
  settings: Settings;
  update: (p: Partial<Settings>) => void;
  serverKnows: boolean;
}) {
  const fresh = new Set(newBoxes.map((b) => b.id));
  const max = settings.boxMaxPrice;

  const subscribe = () => {
    tap();
    // Öffnet die ntfy-App (falls installiert) direkt beim Thema, sonst die Webseite
    Linking.openURL(`ntfy://ntfy.sh/${NTFY_TOPIC}`).catch(() => WebBrowser.openBrowserAsync(`https://ntfy.sh/${NTFY_TOPIC}`));
  };

  return (
    <ScrollView contentContainerStyle={st.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={c.hot} />}>
      <H1>Mystery-Boxen</H1>

      <PriceAlarm settings={settings} update={update} serverKnows={serverKnows} />

      <Glass style={st.card} tint="rgba(220,208,255,0.4)">
        <Text style={st.alarmTitle}>SMS an deine Freundin</Text>
        <Text style={st.alarmText}>Mit dem Sprechblasen-Knopf an jeder Box öffnet sich eine fertige SMS an diese Nummer. Sie bleibt nur auf diesem Handy.</Text>
        <TextInput
          value={settings.phone}
          onChangeText={(phone) => update({ phone })}
          placeholder="Handynummer, z. B. 0151 …"
          placeholderTextColor={c.inkSoft}
          keyboardType="phone-pad"
          style={st.input}
          accessibilityLabel="Handynummer für SMS"
        />
      </Glass>

      <Glass style={[st.card, st.alarm]} tint="rgba(255,255,255,0.3)">
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
      </Glass>

      <H2>{latest.boxes.filter((b) => b.available).length} lieferbar</H2>
      <View style={{ gap: 10 }}>
        {latest.boxes.length ? (
          latest.boxes.map((b) => <BoxRow
              key={b.id}
              b={b}
              isNew={fresh.has(b.id)}
              inBudget={!!max && b.available && b.price <= max}
              phone={settings.phone}
              onPress={() => open(b)}
            />)
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
  card: { borderRadius: 26, padding: 16, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alarm: { flexDirection: 'row', gap: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 22, padding: 6 },
  stepBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.rose, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontFamily: font.display, fontSize: 26, color: c.ink, marginTop: -2 },
  stepLabel: { fontFamily: font.bold, fontSize: 12, color: c.inkSoft },
  stepValue: { fontFamily: font.display, fontSize: 24, color: c.ink },
  status: { fontFamily: font.semi, fontSize: 13, color: c.inkSoft },
  input: { height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 14, fontFamily: font.semi, fontSize: 16, color: c.ink },
  smsBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.roseSoft, alignItems: 'center', justifyContent: 'center' },
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
