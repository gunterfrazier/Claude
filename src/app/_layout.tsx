import { Cinzel_600SemiBold, Cinzel_700Bold, Cinzel_800ExtraBold } from "@expo-google-fonts/cinzel";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { Lora_400Regular, Lora_400Regular_Italic, Lora_600SemiBold } from "@expo-google-fonts/lora";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppStateProvider } from "@/state/app-state";
import { UserDataProvider } from "@/state/user-data";
import { colors, fonts } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Cinzel_600SemiBold,
    Cinzel_700Bold,
    Cinzel_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_600SemiBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  // Fall back to system fonts rather than blocking the app if a font fails to load.
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.header }}>
      <UserDataProvider>
        <AppStateProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.header },
              headerTintColor: colors.amber200,
              headerTitleStyle: { fontFamily: fonts.display, color: colors.amber100 },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.canvas },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "BibliaTree" }} />
            <Stack.Screen name="person/[id]" options={{ title: "Dossier", headerBackTitle: "Back" }} />
            <Stack.Screen name="export/[id]" options={{ title: "Save & Print", presentation: "modal" }} />
            <Stack.Screen name="passage" options={{ title: "Scripture", headerBackTitle: "Back" }} />
            <Stack.Screen name="settings" options={{ title: "Settings", headerBackTitle: "Back" }} />
          </Stack>
        </AppStateProvider>
      </UserDataProvider>
    </GestureHandlerRootView>
  );
}
