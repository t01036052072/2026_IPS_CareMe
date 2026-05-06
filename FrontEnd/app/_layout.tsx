import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/StartScreen/StartScreen" />
      <Stack.Screen name="(auth)/LoginScreen/LoginScreen" />
      <Stack.Screen name="(auth)/SignUpScreen/SignUpScreen1" />
    </Stack>
  );
}
