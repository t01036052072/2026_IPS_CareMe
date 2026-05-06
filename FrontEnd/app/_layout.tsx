import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* (auth) 폴더 안의 화면들을 자동으로 찾아줍니다 */}
      <Stack.Screen name="(auth)/StartScreen/StartScreen" />
      <Stack.Screen name="(auth)/LoginScreen/LoginScreen" />
      <Stack.Screen name="(auth)/SignUpScreen/SignUpScreen1" />
    </Stack>
  );
}
