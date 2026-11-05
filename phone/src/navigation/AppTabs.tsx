import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CuratorSheet } from "../components/CuratorSheet";
import { AccountScreen } from "../screens/AccountScreen";
import { AdminScreen } from "../screens/AdminScreen";
import { BookDetailScreen } from "../screens/BookDetailScreen";
import { CatalogScreen } from "../screens/CatalogScreen";
import { ShelfScreen } from "../screens/ShelfScreen";
import { useSession } from "../state/SessionContext";
import { PRESS_SCALE, palette, radius, raisedShadow } from "../theme";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function CatalogStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: palette.card },
        headerShadowVisible: true,
        headerTintColor: palette.emeraldText,
        headerTitleStyle: { color: palette.text, fontWeight: "800", fontSize: 18 },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: palette.background }
      }}
    >
      <Stack.Screen name="CatalogHome" component={CatalogScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: "Record" }} />
    </Stack.Navigator>
  );
}

/** Four tabs for readers, five-way only for curators (Admin tab appears after an admin signs in). */
export function AppTabs() {
  const { patron } = useSession();
  const [curatorOpen, setCuratorOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tabs.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: palette.white,
          tabBarActiveBackgroundColor: palette.emerald,
          tabBarInactiveTintColor: palette.muted,
          tabBarLabelStyle: { fontWeight: "700", fontSize: 13 },
          tabBarIcon: () => null,
          tabBarIconStyle: { display: "none" },
          tabBarLabelPosition: "beside-icon",
          tabBarItemStyle: { borderRadius: radius.control, marginHorizontal: 4, marginVertical: 8 },
          tabBarStyle: {
            backgroundColor: palette.card,
            borderTopColor: palette.border,
            borderTopWidth: 1,
            ...raisedShadow
          }
        }}
      >
        <Tabs.Screen name="Catalogue" component={CatalogStack} />
        <Tabs.Screen name="Shelf" component={ShelfScreen} />
        {patron?.role === "admin" && <Tabs.Screen name="Admin" component={AdminScreen} />}
        <Tabs.Screen name="Account" component={AccountScreen} />
      </Tabs.Navigator>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask the Curator"
        onPress={() => setCuratorOpen(true)}
        style={({ pressed }) => [
          styles.fab,
          { bottom: 76 + insets.bottom },
          pressed && { backgroundColor: palette.emeraldPress, transform: [{ scale: PRESS_SCALE }] }
        ]}
      >
        <Text style={styles.fabText}>Ask the Curator</Text>
      </Pressable>
      <CuratorSheet visible={curatorOpen} onClose={() => setCuratorOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: radius.control,
    backgroundColor: palette.emerald,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.emerald,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  },
  fabText: { color: palette.white, fontWeight: "700" }
});
