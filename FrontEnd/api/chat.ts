import axios from "axios";

const BASE_URL = "http://52.63.115.68:8000";

export const sendChatMessage = async (message: string) => {
  const res = await axios.post(`${BASE_URL}/chat/`, {
    message,
  });

  return res.data;
};