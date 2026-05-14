import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons';

const main_navy = '#00246D';

export default function SignUpScreen3() {
  const router = useRouter();
  const params = useLocalSearchParams(); //1, 2페이지에서 넘어온 데이터 받기
  const [name, setName] = useState('');

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
            <Text style={styles.label}>이름</Text>

            <View style={styles.input}>
              <TextInput
                style={{ fontSize: 16, color: '#000' }}
                value={name}
                onChangeText={(text) => setName(text)}
                placeholder="이름을 입력해주세요"
                autoCapitalize="none"
              />
            </View>
          
            <TouchableOpacity 
              style={[styles.loginButton, { opacity: name ? 1 : 0.5 }]} 
              disabled={!name}
              onPress={() => router.push({
                pathname: '/(auth)/SignUpScreen/SignUpScreen4/SignUpScreen4',
                params: { 
                  ...params,      // 1, 2페이지 데이터(email, password) 유지
                  name: name,     // 현재 페이지 입력값 추가
                  username: name  
                } 
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: main_navy,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: main_navy, // 따옴표 없는 변수명 그대로 사용
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center', // 텍스트 중앙 정렬용
  },
  loginButton: {
    backgroundColor: main_navy,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 140,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});