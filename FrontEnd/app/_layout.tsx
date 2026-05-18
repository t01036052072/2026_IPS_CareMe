/*import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useRootNavigationState } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();*/
  
/* useEffect(() => {
  AsyncStorage.clear(); // ← 임시로 추가, 실행 후 바로 삭제
}, []); */

  /*useEffect(() => {
    if (!navigationState?.key) return;

    const checkAndRoute = async () => {
      const token = await AsyncStorage.getItem('access_token');
      const loggedIn = !!token;
      const inTabsGroup = segments[0] === "(tabs)";
      const inAuthGroup = segments[0] === "(auth)";

      console.log('segments:', segments);
      console.log('token:', token);
      console.log('loggedIn:', loggedIn);

      if (!loggedIn && inTabsGroup) {
        router.replace("/(auth)/StartScreen/StartScreen");
      } else if (!loggedIn && !inAuthGroup) {
        router.replace("/(auth)/StartScreen/StartScreen");
      } else if (loggedIn && !inTabsGroup) {
        router.replace("/(tabs)");
      }
    };

    checkAndRoute();
  }, [segments, navigationState?.key]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/StartScreen/StartScreen" />
      <Stack.Screen name="(auth)/LoginScreen/LoginScreen" />
      <Stack.Screen name="(auth)/SignUpScreen/SignUpScreen" />
     
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}*/

import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/StartScreen/StartScreen" />
      <Stack.Screen name="(auth)/LoginScreen/LoginScreen" />
      <Stack.Screen name="(auth)/SignUpScreen/SignUpScreen" />

      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
