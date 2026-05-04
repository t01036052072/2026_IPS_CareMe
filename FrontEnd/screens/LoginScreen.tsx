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

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isInputComplete = email.length > 0 && password.length > 0;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        
        {}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image 
              source={require('../../assets/back.svg')}
              style={styles.backIcon}
            />
          </TouchableOpacity>
        </View>

        {}
        <View style={styles.logoSection}>
          <View style={styles.logoRow}>
            <Image 
              source={require('../../assets/logo/CareMeIcon.svg')} 
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <Image 
              source={require('../../assets/logo/CareMeText.svg')} 
              style={styles.textLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        {}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>로그인하기</Text>
        </View>

        {}
        <View style={styles.formSection}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>아이디</Text>
            <TextInput 
              style={styles.input}
              placeholder="아이디를 입력해 주세요" 
              placeholderTextColor="#bdbdbd" 
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>비밀번호</Text>
            <TextInput 
              style={styles.input}
              placeholder="비밀번호를 입력해 주세요"
              placeholderTextColor="#bdbdbd"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true} 
            />
          </View>

          {}
          <View style={styles.loginActionSection}>
            <TouchableOpacity 
              style={[
                styles.loginButton, 
                { backgroundColor: isInputComplete ? '#5E91FF' : '#E0E0E0' } 
              ]} 
              disabled={!isInputComplete}
            >
              <Text style={[
                styles.loginButtonText, 
                { color: isInputComplete ? '#ffffff' : '#757575' } 
              ]}>
                로그인
              </Text>
            </TouchableOpacity>

            {}
            <View style={styles.linkContainer}>
              <TouchableOpacity><Text style={styles.subLinkText}>로그인이 안 되시나요?</Text></TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity><Text style={styles.subLinkText}>회원가입하기</Text></TouchableOpacity>
            </View>
          </View>
        </View>

      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 26, 
  },
  backButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 40,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  textLogo: {
    width: 100,
    height: 30,
  },
  titleSection: {
    paddingHorizontal: 26,
    marginBottom: 30,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold', 
    color: '#000000',
  },
  formSection: {
    paddingHorizontal: 26,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8, 
  },
  input: {
    width: '100%',
    height: 44, 
    borderWidth: 1.5,
    borderColor: '#E5E5E5', 
    borderRadius: 10, 
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
  },
  loginActionSection: {
    marginTop: 35, 
  },
  loginButton: {
    width: '100%',
    height: 44,
    borderRadius: 30, 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold', 
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  divider: {
    width: 1,
    height: 12,
    backgroundColor: '#bdbdbd', 
    marginHorizontal: 10,
  },

  subLinkText: {
    color: '#bdbdbd', 
  }
}
)
