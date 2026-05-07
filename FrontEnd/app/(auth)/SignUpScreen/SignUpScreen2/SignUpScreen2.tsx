import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const main_navy = '#00246D';
const error_red = '#D32F2F';

export default function SignUpScreen2() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // 비밀번호 확인 체크 함수
  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (text.length > 0 && password !== text) {
      setPasswordError(true);
    } else {
      setPasswordError(false);
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
            
            {/* 비밀번호 입력창 */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>비밀번호</Text>
              <TextInput
                style={styles.input}
                placeholder="비밀번호를 입력해주세요"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* 비밀번호 확인 입력창 */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>비밀번호 확인</Text>
              <TextInput
                style={[
                  styles.input, 
                  passwordError && styles.inputError
                ]}
                placeholder="비밀번호를 한 번 더 입력해주세요"
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                secureTextEntry
              />
              {passwordError && (
                <Text style={styles.errorText}>비밀번호가 일치하지 않습니다</Text>
              )}
            </View>

            {/* 다음 버튼 */}
            <TouchableOpacity 
              style={[
                styles.loginButton, 
                { opacity: password && confirmPassword && !passwordError ? 1 : 0.5 }
              ]}
              disabled={!password || !confirmPassword || passwordError}
            onPress={() => router.push('/(auth)/SignUpScreen/SignUpScreen3/SignUpScreen3')}

            >
              <Text style={styles.loginButtonText}>완료</Text>
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
  color: 'main_navy',
},

  inputError: {
    borderColor: error_red,
    borderBottomWidth: 2,
  },
  errorText: {
    color: error_red,
    fontSize: 14,
    marginTop: 8,
    fontWeight: 'bold',
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
});