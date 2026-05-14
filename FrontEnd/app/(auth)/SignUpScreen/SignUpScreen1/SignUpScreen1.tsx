import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const main_navy = '#00246D';
const error_red = '#D32F2F';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // 비밀번호 상태 유지
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
          {/* 상단 헤더 영역 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={main_navy} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>회원가입하기</Text>
            
            {/* 이메일 입력창 */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={[
                  styles.input, 
                  emailError && styles.inputError
                ]}
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
              onPress={() => router.push('/(auth)/SignUpScreen/SignUpScreen2/SignUpScreen2')}
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: main_navy,
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: main_navy,
    marginBottom: 8,
  },
  input: {
  borderWidth: 1.5,           // 1. 선 두께 (사방)
  borderColor: '#main_navy',    // 2. 기본 테두리 색상
  borderRadius: 12,          // 3. 박스 모서리 곡률
  paddingVertical: 12,
  paddingHorizontal: 16,     // 4. 박스 안쪽 좌우 여백 (필수)
  fontSize: 16,
  color: '#000',
},
 
  loginButton: {
    backgroundColor: main_navy,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputError: {
    borderBottomColor: error_red,
    borderBottomWidth: 2,
  },
  errorText: {
    color: error_red,
    fontSize: 14,
    marginTop: 8,
    fontWeight: 'bold',
  },
});