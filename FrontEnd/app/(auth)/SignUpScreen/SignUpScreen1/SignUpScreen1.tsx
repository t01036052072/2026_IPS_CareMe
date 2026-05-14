import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const main_navy = '#00246D';
const error_red = '#D32F2F';

export default function SignUpScreen1() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (text.length > 0 && !text.includes('@')) {
      setEmailError(true);
    } else {
      setEmailError(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={main_navy} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>회원가입하기</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={[styles.input, emailError && styles.inputError]}
                placeholder="이메일을 입력해주세요"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {emailError && (
                <Text style={styles.errorText}>유효한 이메일을 입력해주세요</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.loginButton, { opacity: email && !emailError ? 1 : 0.5 }]}
              disabled={!email || emailError}
              onPress={() => router.push({
                pathname: '/(auth)/SignUpScreen/SignUpScreen2/SignUpScreen2',
                params: { email }
              } as any)}
            >
              <Text style={styles.loginButtonText}>다음</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 10 },
  backButton: { padding: 4 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: main_navy, marginBottom: 40 },
  inputContainer: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: main_navy, marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: main_navy,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000',
  },
  inputError: { borderColor: error_red, borderWidth: 2 },
  errorText: { color: error_red, fontSize: 14, marginTop: 8, fontWeight: 'bold' },
  loginButton: {
    backgroundColor: main_navy,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
