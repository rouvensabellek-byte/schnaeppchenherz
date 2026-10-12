import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { ReactNode } from 'react';
import { Platform, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { blobs, c } from './theme';

const liquid = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * Glasfläche: echtes Liquid Glass ab iOS 26, sonst Milchglas (Blur) mit Pastell-Tönung.
 * `tint` färbt das Glas leicht ein, damit es zum Pastell-Hintergrund passt.
 */
export function Glass({
  children,
  style,
  tint = 'rgba(255,255,255,0.35)',
  interactive = false,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  tint?: string;
  interactive?: boolean;
}) {
  const flat = StyleSheet.flatten(style) ?? {};
  const radius = flat.borderRadius ?? 24;
  if (liquid) {
    return (
      <GlassView style={[{ borderRadius: radius, overflow: 'hidden' }, style]} glassEffectStyle="regular" tintColor={tint} isInteractive={interactive}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.9)', zIndex: 0 }, style]}>
      {/* zIndex -1: Unschärfe immer hinter dem Inhalt, auch bei Eingabefeldern im Web */}
      <BlurView intensity={40} tint="light" style={[StyleSheet.absoluteFill, { zIndex: -1 }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint, zIndex: -1 }]} />
      {children}
    </View>
  );
}

/** Weiche Pastell-Wolken hinter allem – geben dem Glas etwas zum Brechen */
export function Backdrop() {
  const { width, height } = useWindowDimensions();
  const spots = [
    { x: 0.1, y: 0.08, r: 0.55, col: blobs[0] },
    { x: 0.95, y: 0.2, r: 0.5, col: blobs[1] },
    { x: 0.2, y: 0.55, r: 0.5, col: blobs[2] },
    { x: 0.9, y: 0.7, r: 0.55, col: blobs[3] },
    { x: 0.35, y: 0.98, r: 0.5, col: blobs[4] },
  ];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}>
      <Svg width={width} height={height}>
        <Defs>
          {spots.map((s, i) => (
            <RadialGradient key={i} id={`b${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={s.col} stopOpacity={0.85} />
              <Stop offset="1" stopColor={s.col} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {spots.map((s, i) => (
          <Circle key={i} cx={s.x * width} cy={s.y * height} r={s.r * width} fill={`url(#b${i})`} />
        ))}
      </Svg>
    </View>
  );
}
