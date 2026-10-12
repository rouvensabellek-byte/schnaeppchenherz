import { Fredoka_500Medium, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from '@expo-google-fonts/nunito';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Product, useDeals } from './src/data';
import { Boxes } from './src/screens/Boxes';
import { Categories } from './src/screens/Categories';
import { Deals } from './src/screens/Deals';
import { Detail } from './src/screens/Detail';
import { Popular } from './src/screens/Popular';
import { Watchlist } from './src/screens/Watchlist';
import { c, font } from './src/theme';
import { DetailsContext, Icon, IconName, tap } from './src/ui';
import { useWatch } from './src/watch';

type Tab = 'deals' | 'cats' | 'popular' | 'boxes' | 'watch';

const TABS: { id: Tab; icon: IconName; label: string }[] = [
  { id: 'deals', icon: 'tag', label: 'Angebote' },
  { id: 'cats', icon: 'grid', label: 'Kategorien' },
  { id: 'popular', icon: 'star', label: 'Beliebt' },
  { id: 'boxes', icon: 'gift', label: 'Mystery-Boxen' },
  { id: 'watch', icon: 'heart', label: 'Merkliste' },
];

export default function App() {
  const [fontsLoaded] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {fontsLoaded ? (
        <Shell />
      ) : (
        <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color={c.hot} />
        </View>
      )}
    </SafeAreaProvider>
  );
}

function Shell() {
  const insets = useSafeAreaInsets();
  const { latest, history, loading, error, refresh } = useDeals();
  const { watch, toggle, isWatched, newBoxes } = useWatch(latest);
  const [tab, setTab] = useState<Tab>('deals');
  const [open, setOpen] = useState<Product | null>(null);
  const boxBadge = newBoxes.length > 0;

  // Tipp auf ein Produkt: direkt zur Produktseite im Shop
  const openShop = (p: Product) => WebBrowser.openBrowserAsync(p.url).catch(() => {});
  const common = { latest, loading, onRefresh: refresh, open: openShop };

  return (
    <DetailsContext.Provider value={setOpen}>
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {tab === 'deals' && <Deals {...common} history={history} newBoxes={newBoxes} openBoxes={() => setTab('boxes')} />}
          {tab === 'cats' && <Categories {...common} history={history} />}
          {tab === 'popular' && <Popular {...common} />}
          {tab === 'boxes' && <Boxes {...common} newBoxes={newBoxes} />}
          {tab === 'watch' && <Watchlist latest={latest} history={history} watch={watch} open={openShop} />}
        </SafeAreaView>

        <View style={[styles.nav, { bottom: Math.max(insets.bottom, 12) + 4 }]}>
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  tap();
                  setTab(t.id);
                }}
                style={[styles.navBtn, active && { backgroundColor: c.rose }]}
                accessibilityRole="tab"
                accessibilityLabel={t.label}
                accessibilityState={{ selected: active }}
              >
                <Icon name={t.icon} color={active ? c.ink : c.navIcon} />
                {t.id === 'boxes' && boxBadge && !active ? <View style={styles.dot} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Modal visible={!!open} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setOpen(null)}>
          <SafeAreaProvider>
            {open ? (
              <Detail
                p={open}
                latest={latest}
                history={history}
                watched={isWatched(open.id)}
                onToggleWatch={() => toggle(open)}
                onClose={() => setOpen(null)}
              />
            ) : null}
          </SafeAreaProvider>
        </Modal>
      </View>
    </DetailsContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  error: { fontFamily: font.semi, fontSize: 13, color: c.roseInk, textAlign: 'center', paddingHorizontal: 20, paddingVertical: 6 },
  nav: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 68,
    borderRadius: 34,
    backgroundColor: c.plum,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: c.plum,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  navBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 10, right: 11, width: 10, height: 10, borderRadius: 5, backgroundColor: c.hot, borderWidth: 2, borderColor: c.plum },
});
