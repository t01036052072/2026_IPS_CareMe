import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // 뒤로가기 아이콘용

const main_navy = '#00246D';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
            <Text style={styles.title}>로그인하기</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>아이디</Text>
              <TextInput
                style={styles.input}
                placeholder="아이디를 입력해주세요"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

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

            <TouchableOpacity 
              style={[styles.loginButton, { opacity: email && password ? 1 : 0.5 }]}
              disabled={!email || !password}
            >
              <Text style={styles.loginButtonText}>로그인</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>아직 회원이 아니신가요? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/SignUpScreen/SignUpScreen1/SignUpScreen1')}>
                <Text style={styles.signupLink}>회원가입</Text>
              </TouchableOpacity>
            </View>
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    color: main_navy,
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});