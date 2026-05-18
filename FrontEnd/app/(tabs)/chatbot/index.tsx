import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { sendChatMessage } from "@/api/chat";
import { router } from "expo-router";
import * as Crypto from "expo-crypto";

import Jikimi from "../../../assets/ChatBot/Jikimi.svg";
import Back from "../../../assets/images/LoginScreen/back.png";

const MAIN_COLOR = "#00246D";

type MessageType = {
  id: string;
  text: string;
  sender: "bot" | "user";
  action?: string;
};

export default function ChatScreen() {
  const flatListRef = useRef<FlatList>(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "init",
      sender: "bot",
      text: "안녕하세요 😊\nAI 상담 챗봇 지키미입니다.\n\n• 약 정보\n• 증상 상담\n• 어플 사용 방법",
    },
  ]);

  const handleAction = (action?: string) => {
    if (!action) return;
    switch (action) {
      case "go_mypage":
        router.push("/(tabs)/mypage" as any);
        break;
      case "go_pill":
        router.push("/(tabs)/pill" as any);
        break;
      case "go_home":
        router.push("/");
        break;
    }
  };

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userText = message;

    const userMessage: MessageType = {
      id: Crypto.randomUUID(),
      text: userText,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      const data = await sendChatMessage(userText);

      const botMessage: MessageType = {
        id: Crypto.randomUUID(),
        text: data.message,
        sender: "bot",
        action: data.action,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Crypto.randomUUID(),
          text: "서버 연결에 실패했어요 😢",
          sender: "bot",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: MessageType }) => {
    const isBot = item.sender === "bot";

    return (
      <View
        style={[
          styles.messageWrapper,
          isBot ? styles.botWrapper : styles.userWrapper,
        ]}
      >
        {isBot && (
          <View style={styles.botIconContainer}>
            <Jikimi width={47} height={47} />
          </View>
        )}

        <View style={isBot ? {} : styles.userMessageContainer}>
          <View
            style={[
              styles.messageBubble,
              isBot ? styles.botBubble : styles.userBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isBot ? styles.botText : styles.userText,
              ]}
            >
              {item.text}
            </Text>
          </View>

          {item.action && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleAction(item.action)}
            >
              <Text style={styles.actionButtonText}>해당 화면으로 이동</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={Back} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>케미 상담</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* CHAT */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* LOADING */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={MAIN_COLOR} />
        </View>
      )}

      {/* INPUT */}
      <View style={styles.inputOuterContainer}>
        <View style={styles.inputRow}>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="메시지 입력"
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              style={styles.input}
              underlineColorAndroid="transparent"
              cursorColor={MAIN_COLOR}
            />
          </View>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            disabled={loading}
          >
            <Ionicons name="arrow-up" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginTop: 70,
    marginBottom: 12,  // ← 70 → 12
  },

  backIcon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: MAIN_COLOR,
  },

  chatContainer: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },

  messageWrapper: {
    flexDirection: "row",
    marginBottom: 18,
    width: "100%",
  },

  botWrapper: {
    alignSelf: "flex-start",
  },

  userWrapper: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",  
  },

  userMessageContainer: {
    alignItems: "flex-end",  
  },

  botIconContainer: {
    marginRight: 8,
    marginBottom: 4,
  },

  messageBubble: {
    maxWidth: "85%",
    minWidth: "35%",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 22,
  },

  botBubble: {
    backgroundColor: "#F1F1F1",
    alignSelf: "flex-start",  
  },

  userBubble: {
    backgroundColor: MAIN_COLOR,
    alignSelf: "flex-end",   
  },

  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },

  botText: {
    color: "#111",
  },

  userText: {
    color: "#FFFFFF",
  },

  loadingContainer: {
    paddingBottom: 8,
    paddingLeft: 16,
  },

  inputOuterContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 24,
    marginBottom: 20,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  inputContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 999,
    height: 50,
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  input: {
    fontSize: 18,
    color: "#111",
    paddingVertical: 0,
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: MAIN_COLOR,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  actionButton: {
    marginTop: 8,
    backgroundColor: "#E8EEF9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    alignSelf: "flex-start",
  },

  actionButtonText: {
    color: MAIN_COLOR,
    fontSize: 13,
    fontWeight: "600",
  },
});
