import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { useColorScheme, StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { AppProvider } from '@/context/AppContext';
// Font imports from Google Fonts packages
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold
} from '@expo-google-fonts/inter';

// Show an alert even while the app is foregrounded — otherwise a push that
// arrives while someone's actively using the app is silently swallowed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    'Inter': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Tapping a push notification (app backgrounded, or cold-launched from
  // one) navigates to whatever deep_link the notify() call attached —
  // the same field the in-app notifications list already uses.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const deepLink = response.notification.request.content.data?.deep_link;
      if (typeof deepLink === 'string' && deepLink) {
        router.push(deepLink as any);
      }
    });
    return () => subscription.remove();
  }, [router]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AppProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="join" />
          <Stack.Screen name="login" />
          <Stack.Screen name="password" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
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
  );
}
