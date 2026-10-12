import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { HistoryEntry, Product, Shop } from './data';
import { c, euro, font, shopStyle } from './theme';

// ---------------------------------------------------------------- Icons (Strich-SVG wie im Entwurf)

const ICONS = {
  tag: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  star: 'M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z',
  gift: 'M3 8h18v13H3zM12 8v13M3 12h18M12 8c-2-4-6-4-6-1.5S10 8 12 8zM12 8c2-4 6-4 6-1.5S14 8 12 8z',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  check: 'M20 6L9 17l-5-5',
  out: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  chart: 'M3 3v18h18M7 14l4-4 3 3 5-6',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
};
export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, color = c.ink, fill = 'none', width = 2 }: { name: IconName; size?: number; color?: string; fill?: string; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <Path d={ICONS[name]} />
    </Svg>
  );
}

// ---------------------------------------------------------------- Kleinteile

export const tap = () => Haptics.selectionAsync().catch(() => {});

export function ShopChip({ shop, style }: { shop: Shop; style?: ViewStyle }) {
  return (
    <View style={[s.chip, { backgroundColor: shopStyle[shop].bg }, style]}>
      <Text style={s.chipText}>{shopStyle[shop].label}</Text>
    </View>
  );
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={s.h1}>{children}</Text>;
}

export function H2({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.h2Row}>
      <Text style={s.h2}>{children}</Text>
      {right}
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              tap();
              onChange(o.id);
            }}
            style={[s.segBtn, active && { backgroundColor: c.rose }]}
          >
            <Text style={[s.segText, active && { color: c.ink, fontFamily: font.black }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <View style={s.empty}>
      <Icon name="heart" size={34} color={c.hot} />
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- Preis-Grafiken

const TINTS = [c.roseSoft, c.lavenderSoft, '#FFF1D9', c.mint];

export function Thumb({ p, size = 70 }: { p: Product; size?: number }) {
  const tint = TINTS[p.name.length % TINTS.length];
  return (
    <View style={[s.thumb, { width: size, height: size, backgroundColor: tint }]}>
      {p.image ? <Image source={p.image} style={{ width: size - 8, height: size - 8 }} contentFit="contain" transition={150} /> : null}
    </View>
  );
}

export function Sparkline({ entry, color }: { entry?: HistoryEntry; color: string }) {
  const pts = entry?.points ?? [];
  if (pts.length < 2) return <View style={{ width: 56 }} />;
  const prices = pts.map((p) => p[1]);
  const min = Math.min(...prices);
  const span = Math.max(...prices) - min || 1;
  const d = prices.map((v, i) => `${i ? 'L' : 'M'}${2 + (i / (prices.length - 1)) * 52} ${4 + (1 - (v - min) / span) * 20}`).join(' ');
  return (
    <Svg width={56} height={28}>
      <Path d={d} stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const MONTHS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];

/** Treppen-Linie: der Preis gilt, bis er sich ändert. Mehrere Shops = mehrere Linien. */
export function PriceChart({ series, width, height = 170 }: { series: { entry: HistoryEntry; color: string; dashed?: boolean }[]; width: number; height?: number }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const all = series.flatMap((s) => s.entry.points);
  if (!all.length) return null;
  const t0 = Math.min(...all.map((p) => Date.parse(p[0])));
  const t1 = Math.max(Date.parse(todayStr), t0 + 864e5);
  const prices = all.map((p) => p[1]);
  const lo = Math.min(...prices) * 0.9;
  const hi = Math.max(...prices) * 1.05;
  const top = 12;
  const bottom = height - 26;
  const x = (t: number) => 6 + ((t - t0) / (t1 - t0)) * (width - 14);
  const y = (v: number) => top + (1 - (v - lo) / (hi - lo || 1)) * (bottom - top);

  const lines = series.map(({ entry, color, dashed }) => {
    const pts = entry.points;
    let d = '';
    pts.forEach(([day, price], i) => {
      const px = x(Date.parse(day));
      d += i === 0 ? `M${px} ${y(price)}` : `L${px} ${y(pts[i - 1][1])} L${px} ${y(price)}`;
    });
    const last = pts[pts.length - 1];
    d += ` L${x(t1)} ${y(last[1])}`;
    return { d, color, dashed, end: { cx: x(t1), cy: y(last[1]) } };
  });

  const first = new Date(t0);
  const mid = new Date((t0 + t1) / 2);
  return (
    <Svg width={width} height={height} accessibilityLabel="Preisverlauf">
      {[0.25, 0.55, 0.85].map((f) => (
        <Line key={f} x1={0} x2={width} y1={top + f * (bottom - top)} y2={top + f * (bottom - top)} stroke="#F3E6D6" strokeWidth={1} />
      ))}
      {lines.map((l, i) => (
        <Path key={i} d={l.d} stroke={l.color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={l.dashed ? '1 7' : undefined} />
      ))}
      {lines.map((l, i) => (
        <Circle key={`c${i}`} cx={l.end.cx} cy={l.end.cy} r={6} fill={l.color} stroke="#fff" strokeWidth={3} />
      ))}
      <SvgText x={2} y={height - 6} fontSize={11} fill={c.inkSoft} fontFamily={font.semi}>
        {`${first.getDate()}. ${MONTHS[first.getMonth()]}`}
      </SvgText>
      {t1 - t0 > 4 * 864e5 ? (
        <SvgText x={width / 2} y={height - 6} fontSize={11} fill={c.inkSoft} fontFamily={font.semi} textAnchor="middle">
          {`${mid.getDate()}. ${MONTHS[mid.getMonth()]}`}
        </SvgText>
      ) : null}
      <SvgText x={width - 2} y={height - 6} fontSize={11} fill={c.inkSoft} fontFamily={font.semi} textAnchor="end">
        heute
      </SvgText>
    </Svg>
  );
}

// ---------------------------------------------------------------- Produktkarte

export function ProductCard({ p, entry, onPress, right }: { p: Product; entry?: HistoryEntry; onPress: () => void; right?: ReactNode }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${euro(p.price)}`}
      style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View>
        <Thumb p={p} />
        {p.off > 0 ? (
          <View style={s.offBadge}>
            <Text style={s.offText}>−{p.off} %</Text>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <ShopChip shop={p.shop} />
        <Text style={s.cardName} numberOfLines={2}>
          {p.name}
        </Text>
        <View style={s.priceRow}>
          <Text style={s.price}>{euro(p.price)}</Text>
          {p.was ? <Text style={s.was}>{p.wasKind === 'uvp' ? 'UVP ' : ''}{euro(p.was)}</Text> : null}
        </View>
      </View>
      {right ?? <Sparkline entry={entry} color={c.hot} />}
    </Pressable>
  );
}

export function Box3D() {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke={c.mintInk} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={8} width={18} height={13} rx={2} />
      <Path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1.5S10 8 12 8zM12 8c2-4 6-4 6-1.5S14 8 12 8z" />
    </Svg>
  );
}

export const s = StyleSheet.create({
  h1: { fontFamily: font.display, fontSize: 30, color: c.ink },
  h2Row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  h2: { fontFamily: font.displayMedium, fontSize: 21, color: c.ink },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  chipText: { fontFamily: font.black, fontSize: 11, color: c.ink },
  seg: { flexDirection: 'row', gap: 6, backgroundColor: c.card, padding: 5, borderRadius: 22 },
  segBtn: { flex: 1, height: 44, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: font.bold, fontSize: 14, color: c.inkSoft },
  card: { backgroundColor: c.card, borderRadius: 24, padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  offBadge: { position: 'absolute', bottom: -6, left: 6, right: 6, backgroundColor: c.hot, borderRadius: 10, paddingVertical: 2, alignItems: 'center' },
  offText: { fontFamily: font.black, fontSize: 11, color: '#fff' },
  cardName: { fontFamily: font.bold, fontSize: 15, color: c.ink },
  priceRow: { flexDirection: 'row', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' },
  price: { fontFamily: font.display, fontSize: 18, color: c.roseInk },
  was: { fontFamily: font.semi, fontSize: 13, color: c.inkSoft, textDecorationLine: 'line-through' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: font.displayMedium, fontSize: 20, color: c.ink, textAlign: 'center' },
  emptyText: { fontFamily: font.body, fontSize: 15, color: c.inkSoft, textAlign: 'center', lineHeight: 21 },
});
