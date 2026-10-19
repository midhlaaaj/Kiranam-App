import React, { useEffect } from 'react';
import { DefaultTheme, ThemeProvider, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AppProvider, useApp } from '@/context/AppContext';
import { UpdateRequiredGate } from '@/components/UpdateRequiredGate';
// Font imports from Google Fonts packages
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold
} from '@expo-google-fonts/inter';

// Show an alert even while the app is foregrounded — otherwise a push that
// arrives while someone's actively using the app is silently swallowed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Tapping a push notification (app backgrounded, or cold-launched from one)
// navigates to whatever deep_link the notify() call attached — the same field
// the in-app notifications list already uses. Lives inside AppProvider so the
// link is only followed once a session exists; a tap that arrives before
// sign-in resolves is held and replayed, and a signed-out tap is dropped so
// index.tsx's own routing decides where the user lands.
function NotificationLinkHandler() {
  const router = useRouter();
  const { isLoggedIn, isVolunteer } = useApp();
  const pendingLink = React.useRef<string | null>(null);

  const follow = React.useCallback(
    (link: string) => {
      const target = isVolunteer && link.startsWith('/(tabs)/profile') ? '/(volunteer-tabs)/profile' : link;
      router.push(target as any);
    },
    [router, isVolunteer]
  );

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const deepLink = response.notification.request.content.data?.deep_link;
      if (typeof deepLink !== 'string' || !deepLink) return;
      if (isLoggedIn) follow(deepLink);
      else pendingLink.current = deepLink;
    });
    return () => subscription.remove();
  }, [isLoggedIn, follow]);

  useEffect(() => {
    if (isLoggedIn && pendingLink.current) {
      const link = pendingLink.current;
      pendingLink.current = null;
      follow(link);
    }
  }, [isLoggedIn, follow]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Inter-ExtraBold': Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <KeyboardProvider>
      <UpdateRequiredGate>
        <AppProvider>
          <ThemeProvider value={DefaultTheme}>
            <NotificationLinkHandler />
            <StatusBar barStyle="dark-content" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="join" />
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="pending" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(volunteer-tabs)" />
              <Stack.Screen name="campaign-detail" options={{ presentation: 'card' }} />
              <Stack.Screen name="event-detail" options={{ presentation: 'card' }} />
              <Stack.Screen name="choose-amount" />
              <Stack.Screen name="secure-payment" />
              <Stack.Screen name="receipt" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="support" />
              <Stack.Screen name="volunteer-application" options={{ presentation: 'card' }} />
              <Stack.Screen name="volunteer-contributor-detail" options={{ presentation: 'card' }} />
            </Stack>
          </ThemeProvider>
        </AppProvider>
      </UpdateRequiredGate>
    </KeyboardProvider>
  );
}
