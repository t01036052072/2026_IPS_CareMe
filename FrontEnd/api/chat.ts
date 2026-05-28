import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "http://13.239.122.86:8000";

export const sendChatMessage = async (message: string) => {
  const token = await AsyncStorage.getItem("access_token");

  if (!token) {
    throw new Error("로그인 토큰이 없습니다.");
  }
  const res = await axios.post(
    `${BASE_URL}/chat/`, 
    {
    message,
    }, 
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};
