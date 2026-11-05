import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppTabs } from "./src/navigation/AppTabs";
import { SessionProvider } from "./src/state/SessionContext";
import { ShelfProvider } from "./src/state/ShelfContext";
import { palette } from "./src/theme";

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.background,
    card: palette.card,
    text: palette.text,
    border: palette.border,
    primary: palette.emerald
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <ShelfProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="dark" />
            <AppTabs />
          </NavigationContainer>
        </ShelfProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
