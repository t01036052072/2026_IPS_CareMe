import { Redirect } from "expo-router";

export default function Index() {
  // 앱이 켜지자마자 (auth) 폴더 안의 StartScreen으로 보내버립니다.
  return <Redirect href="/(auth)/StartScreen/StartScreen" />;
}