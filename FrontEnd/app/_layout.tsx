import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { useRootNavigationState } from "expo-router";

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  // 로그인 상태 (지금은 테스트용으로 false, 나중에 서버랑 연결)
  const [isLoggedIn, setIsLoggedIn] = useState(false); 

  useEffect(() => {
  
    if (!navigationState?.key) return;

    const timeout = setTimeout(() => {
      const inTabsGroup = segments[0] === "(tabs)";

      if (!isLoggedIn && inTabsGroup) {
        router.replace("/(auth)/StartScreen/StartScreen");
      } else if (isLoggedIn && !inTabsGroup) {
        router.replace("/(tabs)");
      }
    }, 1);

    return () => clearTimeout(timeout);
  }, [isLoggedIn, segments, navigationState?.key]);

    return (
    <Stack screenOptions={{ headerShown: false }}>

      {/* auth */}
      <Stack.Screen name="(auth)/StartScreen/StartScreen" />
      <Stack.Screen name="(auth)/LoginScreen/LoginScreen" />
      <Stack.Screen name="(auth)/SignUpScreen/SignUpScreen1" />

      {/* tabs */}
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
