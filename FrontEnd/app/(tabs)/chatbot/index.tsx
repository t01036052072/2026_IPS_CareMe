import React, { useRef, useState, useEffect, use } from "react";
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
import { router } from "expo-router";
import * as Crypto from "expo-crypto";

import Jikimi from "../../../assets/ChatBot/Jikimi.svg";
import Back from "../../../assets/images/LoginScreen/back.png";

const MAIN_COLOR = "#00246D";
const BASE_URL = "http://172.20.97.245:8000";

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
      text: "안녕하세요 😊\nAI 상담 챗봇 지키미입니다.\n\n지원 기능은 아래 3가지입니다:\n\n• 약 정보\n• 증상 상담\n• 어플 사용 방법\n\n궁금한 내용을 자유롭게 질문해주세요.",
    },
  ]);

  const handleAction = (action?: string) => {
    if (!action) return;

    switch (action) {
      case "go_mypage":
        router.push("/mypage");
        break;
      case "go_pill":
        router.push("/pill");
        break;
      case "go_home":
        router.push("/");
        break;
    }
  };

  // 메시지 변경될 때마다 자동 스크롤
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [message]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const currentMessage = message;

    const userMessage: MessageType = {
      id: Crypto.randomUUID(),
      text: currentMessage,
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentMessage,
        }),
      });

      const data = await response.json();

      const botMessage: MessageType = {
        id: Crypto.randomUUID(),
        text: data.message,
        sender: "bot",
        action: data.action,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: MessageType = {
        id: Crypto.randomUUID(),
        text: "서버 연결에 실패했어요 😢",
        sender: "bot",
      };

      setMessages((prev) => [...prev, errorMessage]);
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
            <Jikimi width={38} height={38} />
          </View>
        )}

        <View>
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
              <Text style={styles.actionButtonText}>
                해당 화면으로 이동하기
              </Text>
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
          <Image source={Back} style={{ width: 26, height: 26 }} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>케미 상담</Text>

        <View style={{ width: 28 }} />
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
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="메시지 입력"
            placeholderTextColor="#999"
            value={message}
            onChangeText={setMessage}
            style={styles.input}
            multiline
            editable={!loading}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />

          <TouchableOpacity
            style={[styles.sendButton, loading && { opacity: 0.5 }]}
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
    height: 95,
    paddingTop: 48,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
    backgroundColor: "#FFFFFF",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },

  chatContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },

  messageWrapper: {
    flexDirection: "row",
    marginBottom: 18,
    alignItems: "flex-end",
  },

  botWrapper: {
    alignSelf: "flex-start",
  },

  userWrapper: {
    alignSelf: "flex-end",
  },

  botIconContainer: {
    marginRight: 8,
    marginBottom: 4,
  },

  messageBubble: {
    maxWidth: "78%",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 22,
  },

  botBubble: {
    backgroundColor: "#F1F1F1",
  },

  userBubble: {
    backgroundColor: MAIN_COLOR,
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
  },

  inputOuterContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 999,
    minHeight: 58,
    paddingLeft: 18,
    paddingRight: 6,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    maxHeight: 100,
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: MAIN_COLOR,
    justifyContent: "center",
    alignItems: "center",
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