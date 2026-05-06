import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  SafeAreaView
} from 'react-native';

const MAIN_NAVY = '#00246D'; 

export default function SignupScreen1({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(true); // 이메일 유효성 상태

  const validateEmail = (text: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmail(text); // 이메일 형식 검사 함수
    
    if (text.length > 0) {
      setIsEmailValid(emailRegex.test(text)); // 조건에 안 맞으면 false
    } else {
      setIsEmailValid(true); 
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image 
              source={require('../../../../assets/images/SignUpScreen/SignUpScreen1/back.png')} 
              style={styles.backIcon}
            />
          </TouchableOpacity>
        </View> // 뒤로가기 아이콘

        <View style={styles.logoSection}>
          <View style={styles.logoRow}>
            <Image source={require('../../../../assets/images/SignUpScreen/SignUpScreen1/CareMeLogoIcon.png')} style={styles.logoIcon} resizeMode="contain" />
            <Image source={require('../../../../assets/images/SignUpScreen/SignUpScreen1/CareMeLogoText.png')} style={styles.textLogo} resizeMode="contain" />
          </View>
        </View> // 로고 icon, 로고 text 이미지 삽입 

        <View style={styles.titleSection}>
          <Text style={[styles.pageTitle, { color: MAIN_NAVY }]}>회원가입하기</Text>
        </View> // 회원가입하기 텍스트

        {/* 입력 폼 영역 */}
        <View style={styles.formSection}>
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: MAIN_NAVY }]}>이메일</Text>
            <TextInput 
              style={[
                styles.input, // 이메일 형식이 틀리면 빨간불 표시
                { borderColor: isEmailValid ? '#E5E5E5' : '#C62828' } 
              ]}
              placeholder="이메일을 입력해 주세요"
              placeholderTextColor="#bdbdbd"
              value={email}
              onChangeText={validateEmail} // 입력할 때마다 검사 실행
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {/* 조건이 안 맞을 때만 안내 문구 표시 */}
            {!isEmailValid && (
              <Text style={styles.errorText}>올바른 이메일 형식이 아닙니다.</Text>
            )}
          </View>

          {/* 다음 버튼 */}
          <View style={styles.loginActionSection}>
            <TouchableOpacity 
              style={[
                styles.nextButton, 
                { backgroundColor: (email.length > 0 && isEmailValid) ? '#5E91FF' : '#E0E0E0' }
              ]} 
              disabled={!(email.length > 0 && isEmailValid)}
              onPress={() => navigation.navigate('SignupScreen2')}
            >
              <Text style={styles.nextButtonText}>다음</Text>
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { height: 50, justifyContent: 'center', paddingHorizontal: 26 },
  backIcon: { width: 24, height: 24, resizeMode: 'contain' },
  logoSection: { alignItems: 'center', marginTop: 20, marginBottom: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoIcon: { width: 40, height: 40, marginRight: 8 },
  textLogo: { width: 100, height: 30 },
  titleSection: { paddingHorizontal: 26, marginBottom: 30 },
  pageTitle: { fontSize: 24, fontWeight: 'bold' },
  formSection: { paddingHorizontal: 26 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    width: '100%',
    height: 44,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  errorText: {
    color: '#C62828',
    fontSize: 12,
    marginTop: 5,
    fontWeight: '500'
  },
  loginActionSection: { marginTop: 35 },
  nextButton: {
    width: '100%',
    height: 44,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});