import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';

// 1. 색상 변수를 미리 선언해둡니다.
const main_navy = '#00246D'; 

export default function StartScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.logoSection}>
        <Image 
          source={require('../../../assets/images/StartScreen/CareMeLogoIcon.png')} 
          style={styles.logoIcon}
          resizeMode="contain"
        />
        <Text style={styles.mainTitle}>나만을 위한 건강관리</Text>
        <Text style={styles.subTitle}>진단서 해석부터{"\n"}복약 · 일정관리까지</Text>
      </View>

      <View style={styles.buttonSection}>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => router.push('/(auth)/LoginScreen/LoginScreen')}
        >
          <Text style={styles.loginButtonText}>로그인하기</Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>아직 회원이 아니라면?</Text>
          <View style={styles.line} />
        </View>

        {/* 2. 오타 수정: TouchableOpacit. -> TouchableOpacity */}
        <TouchableOpacity 
          style={styles.signupButton}
              onPress={() => router.push('/(auth)/SignUpScreen/SignUpScreen1/SignUpScreen1')}
        >
          
          <Text style={styles.signupButtonText}>회원가입하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoIcon: {
    width: 120,
    height: 120,
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: main_navy, // 3. 따옴표 없이 변수명 그대로 사용
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 18,
    textAlign: 'center',
    color: main_navy,
    lineHeight: 26,
  },
  buttonSection: {
    width: '100%',
    marginTop: 20,
  },
  loginButton: {
    backgroundColor: main_navy,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: main_navy,
  },
  dividerText: {
    marginHorizontal: 10,
    color: main_navy,
    fontSize: 14,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: main_navy,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  signupButtonText: {
    color: main_navy,
    fontSize: 18,
    fontWeight: 'bold',
  },
});