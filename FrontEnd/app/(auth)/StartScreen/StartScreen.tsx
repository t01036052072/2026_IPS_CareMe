import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';

const { width, height } = Dimensions.get('window');

const MAIN_NAVY = '#00246D';   
const PRIMARY_BLUE = '#5E91FF'; 

export default function StartScreen({navigation}: any) {
  return (
    <View style={styles.container}>
      {}
      <View style={styles.logoSection}>
        {}
        <Image 
          source={require('../../assets/logo/CareMeIcon.svg')} 
          style={styles.logoIcon} 
          resizeMode="contain"
        />
        <Image 
          source={require('../../assets/logo/CareMeText.svg')} 
          style={styles.logoTextImg} 
          resizeMode="contain"
        />
      </View>

      {}
      <View style={styles.textSection}>
        <Text style={[styles.mainTitle, { color: MAIN_NAVY }]}>
          나만을 위한 건강관리
        </Text>
        <Text style={[styles.subDescriptionText, { color: MAIN_NAVY }]}>
          진단서 해석부터{"\n"}복약 · 일정관리까지
        </Text>
      </View>

      {}
      <View style={styles.bottomSection}>
        <TouchableOpacity style={[styles.loginButton, { backgroundColor: PRIMARY_BLUE }]} 
        onPress={() => navigation.navigate('Login')} //클릭시 로그인으로
        >
          <Text style={styles.loginButtonText}>로그인하기</Text>
        </TouchableOpacity>

        {}
        <View style={styles.signupGuideContainer}>
          <Text style={styles.guideText}>아직 회원이 아닌가요? </Text>
          <TouchableOpacity>
            <Text style={[styles.signupLinkText, { color: PRIMARY_BLUE }]}>회원가입</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    width: width,
    height: height,
  },
  logoSection: {
    marginTop: height * 0.18, // 아이폰 16 상단 여백 설정
    alignItems: 'center',
  },
  logoIcon: {
    width: 90,
    height: 90,
    marginBottom: 15,
  },
  logoTextImg: {
    width: 200,
    height: 60,
  },
  textSection: {
    marginTop: 80,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subDescriptionText: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 70,
    width: '100%',
    alignItems: 'center',
  },
  loginButton: {
    width: width * 0.85,
    paddingVertical: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
    // iOS용 그림자 효과 [cite: 291]
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupGuideContainer: {
    flexDirection: 'row',
  },
  guideText: {
    fontSize: 14,
    color: '#A4BFFF', // 가이드 문구는 연한 파란색 계열
  },
  signupLinkText: {
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});