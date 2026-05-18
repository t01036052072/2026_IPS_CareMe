import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
  ScrollView, Modal, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { signupAPI } from '@/api/auth';
import { SignupRequest } from '@/types/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const main_navy = '#00246D';
const light_gray = '#E0E0E0';
const red = '#C0392B';

const DISEASE_LIST = ["뇌졸중 (중풍)", "심근경색/협심증", "고혈압", "당뇨", "이상지질혈증", "폐결핵", "우울증", "조기정신증", "C형 간염", "기타"];
const FAMILY_DISEASE_LIST = ["뇌졸중 (중풍)", "심근경색/협심증", "고혈압", "당뇨병", "기타"];
const DRINK_OPTIONS = ["1회 미만", "1~2회", "3~4회", "5~9회", "10~14회", "15회 이상", "술을 마시지 않는다"];

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function SignUpScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1: 이메일
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [emailDuplicateError, setEmailDuplicateError] = useState(false);

  // Step 2: 비밀번호
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLengthError, setPasswordLengthError] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState(false);

  // Step 3: 이름
  const [name, setName] = useState('');

  // Step 4: 기본정보
  const [gender, setGender] = useState('');
  const [birth, setBirth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date(1960, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [age, setAge] = useState(0);

  // Step 5: 질환력
  const [select1, setSelect1] = useState('');
  const [select2, setSelect2] = useState('');
  const [select3, setSelect3] = useState('');
  const [diseaseData, setDiseaseData] = useState<{[key: string]: {diagnosed: boolean, treated: boolean}}>({});
  const [familyData, setFamilyData] = useState<string[]>([]);
  const [isDiseaseModalVisible, setIsDiseaseModalVisible] = useState(false);
  const [isFamilyModalVisible, setIsFamilyModalVisible] = useState(false);

  // Step 6: 흡연/음주
  const [smoke1, setSmoke1] = useState('');
  const [smoke2, setSmoke2] = useState('');
  const [smoke3, setSmoke3] = useState('');
  const [drinkFreq, setDrinkFreq] = useState('');
  const [accessToken, setAccessToken] = useState('');


  // 공통 모달
  const [isSkipModalVisible, setIsSkipModalVisible] = useState(false);
  const [isFinishModalVisible, setIsFinishModalVisible] = useState(false);

  // ───── Step 1 핸들러 ─────
  const handleEmailChange = (text: string) => {
    setEmail(text);
    setEmailDuplicateError(false);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(text.length > 0 && !emailRegex.test(text));
  };

  // ───── Step 2 핸들러 ─────
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    const hasLetter = /[a-zA-Z]/.test(text);
    const hasNumber = /[0-9]/.test(text);
    setPasswordLengthError(text.length > 0 && (text.length < 8 || !hasLetter || !hasNumber));
    if (confirmPassword.length > 0) setPasswordMatchError(text !== confirmPassword);
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    setPasswordMatchError(text.length > 0 && password !== text);
  };


  // ───── Step 4 핸들러 ─────
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      const formattedDate = `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;
      setBirth(formattedDate);
      const today = new Date();
      let calcAge = today.getFullYear() - selectedDate.getFullYear();
      const m = today.getMonth() - selectedDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < selectedDate.getDate())) calcAge--;
      setAge(calcAge);
    }
  };

  // 소수점 포함 숫자 입력 핸들러
  const handleDecimalInput = (text: string, setter: (v: string) => void) => {
    // 숫자와 소수점만 허용, 소수점은 하나만
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return; // 소수점 두 개 이상 방지
    if (parts[1] && parts[1].length > 1) return; // 소수점 이하 1자리만
    setter(cleaned);
  };

  // ───── Step 5 핸들러 ─────
  const toggleDisease = (diseaseName: string, type: 'diagnosed' | 'treated') => {
    setDiseaseData(prev => {
      const current = prev[diseaseName] || { diagnosed: false, treated: false };
      return { ...prev, [diseaseName]: { ...current, [type]: !current[type] } };
    });
  };

  const toggleFamily = (diseaseName: string) => {
    setFamilyData(prev => prev.includes(diseaseName) ? prev.filter(i => i !== diseaseName) : [...prev, diseaseName]);
  };

  // ───── 건너뛰기 (기본정보만 저장) ─────
  const handleSkipToHome = async () => {
    try {
      const skipData: SignupRequest = {
        email,
        password,
        name,
        age,
        gender: gender as '남자' | '여자',
        height: parseFloat(height) || 0,
        weight: parseFloat(weight) || 0,
        // 나머지는 기본값
        is_under_treatment: false,
        has_family_history: false,
        is_b_hepatitis_carrier: false,
        medical_history: [],
        smoked_regular: false,
        used_heated_tobacco: false,
        used_vaping: false,
        drinking_frequency: '',
      };

      console.log('건너뛰기 데이터:', skipData);
      const response = await signupAPI(skipData);
      console.log('건너뛰기 회원가입 응답:', response);

      setIsSkipModalVisible(false);
      await AsyncStorage.setItem('access_token', response.access_token);
      router.replace('/(tabs)' as any);
    } catch (error: any) {
      console.log('건너뛰기 오류:', error.message);
      setIsSkipModalVisible(false);
      Alert.alert('회원가입 실패', error.message || '입력 정보를 다시 확인해주세요.');
    }
  };

  // ───── 최종 제출 ─────
  const handleFinish = async () => {
    try {


      const medicalHistory = Object.entries(diseaseData)
        .filter(([_, v]) => v.diagnosed || v.treated)
        .map(([n, v]) => ({
          name: n,
          is_diagnosed: v.diagnosed,
          is_medicated: v.treated
        }));

      const finalData: SignupRequest = {
        email,
        password,
        name,
        age,
        gender: gender as '남자' | '여자',
        height: parseFloat(height),
        weight: parseFloat(weight),
        is_under_treatment: select1 === '예',
        has_family_history: select2 === '예',
        is_b_hepatitis_carrier: select3 === '예',
        medical_history: medicalHistory,
        smoked_regular: smoke1 === '예',
        used_heated_tobacco: smoke2 === '예',
        used_vaping: smoke3 === '예',
        drinking_frequency: drinkFreq,
      };

      console.log('최종 데이터:', finalData);
      const response = await signupAPI(finalData);
setAccessToken(response.access_token);  // ← 저장
setIsFinishModalVisible(true);
    } catch (error: any) {
      console.log('회원가입 catch 진입:', error.message);
      Alert.alert('회원가입 실패', error.message || '입력 정보를 다시 확인해주세요.');
    }
  };

  // ───── 공통 헤더 ─────
  const renderHeader = (onBack: () => void) => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={28} color={main_navy} />
      </TouchableOpacity>
    </View>
  );

  // ───── 건너뛰기 모달 (공통) ─────
  const renderSkipModal = () => (
    <Modal visible={isSkipModalVisible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.popupBox, { height: 'auto', paddingVertical: 30 }]}>
          <Text style={styles.customSkipTitle}>정말 건너뛰시겠습니까?</Text>
          <Text style={styles.customSkipContent}>건강 정보를 등록해주시면{'\n'}더 정확한 맞춤 건강 분석을{'\n'}해드릴 수 있어요!</Text>
          <View style={styles.popupFooter}>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: main_navy }]} onPress={() => setIsSkipModalVisible(false)}>
              <Text style={styles.footerText}>다시 작성</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleSkipToHome}>
              <Text style={styles.footerText}>건너뛰기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ═══════════════════════════════════════
  // STEP 1: 이메일
  // ═══════════════════════════════════════
  if (step === 1) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
            {renderHeader(() => router.back())}
            <View style={styles.content}>
              <Text style={styles.title}>회원가입하기</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>이메일</Text>
                <TextInput
                  style={[styles.input, (emailError || emailDuplicateError) && styles.inputError]}
                  placeholder="이메일을 입력해주세요"
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {emailError && <Text style={styles.errorText}>유효한 이메일을 입력해주세요</Text>}
                {emailDuplicateError && <Text style={styles.errorText}>이미 사용 중인 이메일입니다</Text>}
              </View>
              <TouchableOpacity
                style={[styles.nextButton, { opacity: email && !emailError ? 1 : 0.5 }]}
                disabled={!email || emailError}
                onPress={() => setStep(2)}
              >
                <Text style={styles.nextButtonText}>다음</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    );
  }

  // ═══════════════════════════════════════
  // STEP 2: 비밀번호
  // ═══════════════════════════════════════
  if (step === 2) {
    const isValid = password.length >= 8 && confirmPassword.length > 0 && !passwordLengthError && !passwordMatchError;
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
            {renderHeader(() => setStep(1))}
            <View style={styles.content}>
              <Text style={styles.title}>회원가입하기</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>비밀번호</Text>
                <TextInput
                  style={[styles.input, passwordLengthError && styles.inputError]}
                  placeholder="비밀번호를 입력해주세요 (8자 이상)"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry
                  maxLength={20}
                />
                {passwordLengthError && <Text style={styles.errorText}>영문자와 숫자를 포함하여 8자 이상 입력해주세요</Text>}
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>비밀번호 확인</Text>
                <TextInput
                  style={[styles.input, passwordMatchError && styles.inputError]}
                  placeholder="비밀번호를 한 번 더 입력해주세요"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  secureTextEntry
                  maxLength={20}
                />
                {passwordMatchError && <Text style={styles.errorText}>비밀번호가 일치하지 않습니다</Text>}
              </View>
              <TouchableOpacity
                style={[styles.nextButton, { opacity: isValid ? 1 : 0.5 }]}
                disabled={!isValid}
                onPress={() => setStep(3)}
              >
                <Text style={styles.nextButtonText}>다음</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    );
  }

  // ═══════════════════════════════════════
  // STEP 3: 이름
  // ═══════════════════════════════════════
  if (step === 3) {
    return (
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
            {renderHeader(() => setStep(2))}
            <View style={styles.content}>
              <Text style={styles.title}>회원가입하기</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>이름</Text>
                <TextInput
                  style={styles.input}
                  placeholder="이름을 입력해주세요"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity
                style={[styles.nextButton, { opacity: name ? 1 : 0.5, marginTop: 140 }]}
                disabled={!name}
                onPress={() => setStep(4)}
              >
                <Text style={styles.nextButtonText}>다음</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════
  // STEP 4: 기본정보
  // ═══════════════════════════════════════
  if (step === 4) {
    const isValid = !!(gender && birth && height && weight);
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
            {renderHeader(() => setStep(3))}
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.titleLarge}>기본 정보 입력하기</Text>

              <View style={styles.inputSection}>
                <Text style={styles.labelLarge}>이름</Text>
                <View style={styles.inputBoxLarge}>
                  <TextInput style={styles.inputTextLarge} value={name} onChangeText={setName} placeholder="이름을 입력해주세요" />
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.labelLarge}>성별</Text>
                <View style={styles.genderContainer}>
                  <TouchableOpacity style={styles.radioButton} onPress={() => setGender('남자')}>
                    <Ionicons name={gender === '남자' ? "radio-button-on" : "radio-button-off"} size={22} color={main_navy} />
                    <Text style={styles.radioLabel}>남성</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.radioButton} onPress={() => setGender('여자')}>
                    <Ionicons name={gender === '여자' ? "radio-button-on" : "radio-button-off"} size={22} color={main_navy} />
                    <Text style={styles.radioLabel}>여성</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.labelLarge}>생년월일</Text>
                <TouchableOpacity style={[styles.inputBoxLarge, styles.rowBetween]} onPress={() => setShowDatePicker(true)}>
                  <Text style={[styles.inputTextLarge, !birth && { color: '#ccc' }]}>{birth || "생년월일을 선택해주세요"}</Text>
                  <Ionicons name="calendar-outline" size={24} color={main_navy} />
                </TouchableOpacity>
              </View>

              {/* 키 - 소수점 입력 가능 (000.0) */}
              <View style={styles.inputSection}>
                <Text style={styles.labelLarge}>키</Text>
                <View style={[styles.inputBoxLarge, styles.rowEnd]}>
                  <TextInput
                    style={[styles.inputTextLarge, { flex: 1 }]}
                    value={height}
                    onChangeText={text => handleDecimalInput(text, setHeight)}
                    keyboardType="decimal-pad"
                    maxLength={5}
                    placeholder="000.0"
                    placeholderTextColor="#CCC"
                  />
                  <Text style={styles.unitText}>cm</Text>
                </View>
              </View>

              {/* 몸무게 - 소수점 입력 가능 (000.0) */}
              <View style={styles.inputSection}>
                <Text style={styles.labelLarge}>몸무게</Text>
                <View style={[styles.inputBoxLarge, styles.rowEnd]}>
                  <TextInput
                    style={[styles.inputTextLarge, { flex: 1 }]}
                    value={weight}
                    onChangeText={text => handleDecimalInput(text, setWeight)}
                    keyboardType="decimal-pad"
                    maxLength={5}
                    placeholder="000.0"
                    placeholderTextColor="#CCC"
                  />
                  <Text style={styles.unitText}>kg</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: isValid ? main_navy : light_gray, marginTop: 20 }]}
                disabled={!isValid}
                onPress={() => setStep(5)}
              >
                <Text style={[styles.nextButtonText, { color: isValid ? '#FFF' : '#888' }]}>다음</Text>
              </TouchableOpacity>
            </ScrollView>

            <Modal transparent visible={showDatePicker} animationType="slide">
              <View style={styles.modalContainer}>
                <View style={styles.dateModalContent}>
                  <View style={styles.dateModalHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.confirmText}>확인</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    locale="ko-KR"
                    minimumDate={new Date(1900, 0, 1)}
                    maximumDate={new Date()}
                  />
                </View>
              </View>
            </Modal>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    );
  }

  // ═══════════════════════════════════════
  // STEP 5: 질환력
  // ═══════════════════════════════════════
  if (step === 5) {
    const isValid = !!(select1 && select2 && select3);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.progressContainer}><View style={[styles.progressBar, { width: '83%' }]} /></View>
        {renderHeader(() => setStep(4))}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.titleLarge}>건강 정보 입력하기</Text>
          <Text style={styles.subTitle}>질환력</Text>

          <View style={styles.inputSection}>
            <Text style={styles.labelMedium}>현재 약물 치료 중인 질병이 있나요?</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity style={styles.radioButton} onPress={() => { setSelect1('예'); setIsDiseaseModalVisible(true); }}>
                <Ionicons name={select1 === '예' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} /><Text style={styles.radioLabel}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.radioButton} onPress={() => { setSelect1('아니요'); setDiseaseData({}); }}>
                <Ionicons name={select1 === '아니요' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} /><Text style={styles.radioLabel}>아니요</Text>
              </TouchableOpacity>
            </View>
            {select1 === '예' && Object.keys(diseaseData).length > 0 && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>
                  {Object.entries(diseaseData).filter(([_, v]) => v.diagnosed || v.treated).map(([k]) => `✔️ ${k}`).join(', ')}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.labelMedium}>부모, 형제 중 질환 내력이 있나요?</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity style={styles.radioButton} onPress={() => { setSelect2('예'); setIsFamilyModalVisible(true); }}>
                <Ionicons name={select2 === '예' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} /><Text style={styles.radioLabel}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.radioButton} onPress={() => { setSelect2('아니요'); setFamilyData([]); }}>
                <Ionicons name={select2 === '아니요' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} /><Text style={styles.radioLabel}>아니요</Text>
              </TouchableOpacity>
            </View>
            {select2 === '예' && familyData.length > 0 && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>{familyData.map(i => `✔️ ${i}`).join(', ')}</Text>
              </View>
            )}
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.labelMedium}>B형 간염 바이러스 보균자인가요?</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity style={styles.radioButton} onPress={() => setSelect3('예')}>
                <Ionicons name={select3 === '예' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} /><Text style={styles.radioLabel}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.radioButton} onPress={() => setSelect3('아니요')}>
                <Ionicons name={select3 === '아니요' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} /><Text style={styles.radioLabel}>아니요</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <TouchableOpacity style={styles.skipBtn} onPress={() => setIsSkipModalVisible(true)}>
              <Text style={styles.skipBtnText}>건너뛰기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtnWide, { backgroundColor: isValid ? main_navy : light_gray }]}
              disabled={!isValid}
              onPress={() => setStep(6)}
            >
              <Text style={[styles.nextBtnText, { color: isValid ? '#FFF' : '#888' }]}>다음</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal visible={isDiseaseModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.popupBox}>
              <Text style={styles.popupTitle}>해당 질환과 상태를 선택해주세요</Text>
              <ScrollView>{DISEASE_LIST.map(d => (
                <View key={d} style={styles.diseaseRow}>
                  <Text style={styles.diseaseName}>{d}</Text>
                  <View style={styles.subBtnGroup}>
                    <TouchableOpacity style={[styles.subBtn, diseaseData[d]?.diagnosed && styles.activeSubBtn]} onPress={() => toggleDisease(d, 'diagnosed')}>
                      <Text style={[styles.subBtnText, diseaseData[d]?.diagnosed && styles.activeSubText]}>진단</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.subBtn, diseaseData[d]?.treated && styles.activeSubBtn]} onPress={() => toggleDisease(d, 'treated')}>
                      <Text style={[styles.subBtnText, diseaseData[d]?.treated && styles.activeSubText]}>약물치료</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}</ScrollView>
              <View style={styles.popupFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setSelect1(''); setDiseaseData({}); setIsDiseaseModalVisible(false); }}>
                  <Text style={styles.footerText}>취소하기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={() => setIsDiseaseModalVisible(false)}>
                  <Text style={styles.footerText}>선택 완료</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={isFamilyModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.popupBox}>
              <Text style={styles.popupTitle}>해당하는 가족력을 모두 선택해주세요</Text>
              <ScrollView>{FAMILY_DISEASE_LIST.map(d => (
                <TouchableOpacity key={d} style={styles.simpleRow} onPress={() => toggleFamily(d)}>
                  <Ionicons name={familyData.includes(d) ? "checkbox" : "square-outline"} size={28} color={main_navy} />
                  <Text style={styles.simpleRowText}>{d}</Text>
                </TouchableOpacity>
              ))}</ScrollView>
              <View style={styles.popupFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setSelect2(''); setFamilyData([]); setIsFamilyModalVisible(false); }}>
                  <Text style={styles.footerText}>취소하기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={() => setIsFamilyModalVisible(false)}>
                  <Text style={styles.footerText}>선택 완료</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {renderSkipModal()}
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════
  // STEP 6: 흡연/음주
  // ═══════════════════════════════════════
  const isStep6Valid = !!(smoke1 && smoke2 && smoke3 && drinkFreq);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}><View style={[styles.progressBar, { width: '100%' }]} /></View>
      {renderHeader(() => setStep(5))}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.titleLarge}>건강 정보 입력하기</Text>
        <Text style={styles.subTitle}>흡연 및 음주</Text>

        {[
          { label: '지금까지 평생 총 5갑(100개비) 이상의\n일반담배(궐련)를 피운 적이 있나요?', val: smoke1, set: setSmoke1 },
          { label: '지금까지 궐련형 전자담배(아이코스, 글로, 릴 등)를 사용한 적이 있나요?', val: smoke2, set: setSmoke2 },
          { label: '액상형 전자담배를 사용한 적이 있나요?', val: smoke3, set: setSmoke3 },
        ].map((item, idx) => (
          <View key={idx} style={styles.inputSection}>
            <Text style={styles.labelMedium}>{item.label}</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity style={styles.radioButton} onPress={() => item.set('예')}>
                <Ionicons name={item.val === '예' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} />
                <Text style={styles.radioLabel}>예</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.radioButton} onPress={() => item.set('아니요')}>
                <Ionicons name={item.val === '아니요' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} />
                <Text style={styles.radioLabel}>아니요</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.inputSection}>
          <Text style={styles.labelMedium}>한 달에 몇 번 정도 술을 마시나요?</Text>
          <View style={styles.drinkGrid}>
            {DRINK_OPTIONS.map(option => (
              <TouchableOpacity
                key={option}
                style={[styles.drinkOption, drinkFreq === option && styles.activeDrinkOption]}
                onPress={() => setDrinkFreq(option)}
              >
                <Text style={[styles.drinkOptionText, drinkFreq === option && styles.activeDrinkOptionText]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={() => setIsSkipModalVisible(true)}>
            <Text style={styles.skipBtnText}>건너뛰기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextBtnWide, { backgroundColor: isStep6Valid ? main_navy : light_gray }]}
            disabled={!isStep6Valid}
            onPress={handleFinish}
          >
            <Text style={[styles.nextBtnText, { color: isStep6Valid ? '#FFF' : '#888' }]}>완료</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {renderSkipModal()}

      <Modal visible={isFinishModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.popupBox, { height: 'auto', paddingVertical: 40 }]}>
            <Ionicons name="checkmark-circle" size={60} color={main_navy} style={{ alignSelf: 'center', marginBottom: 15 }} />
            <Text style={styles.customFinishTitle}>가입 완료!</Text>
            <Text style={styles.customSkipContent}>건강 관리를 위한{'\n'}모든 준비가 끝났습니다.</Text>
            <TouchableOpacity
              style={[styles.nextButton, { marginTop: 10 }]}
              onPress={async () => {
                await AsyncStorage.setItem('access_token', accessToken);
                router.replace('/(tabs)' as any);
              }}
            >
              <Text style={styles.nextButtonText}>시작하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 10 },
  backButton: { padding: 4 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },

  title: { fontSize: 28, fontWeight: 'bold', color: main_navy, marginBottom: 40 },
  titleLarge: { fontSize: 30, fontWeight: 'bold', color: main_navy, marginBottom: 30 },
  subTitle: { fontSize: 24, fontWeight: 'bold', color: main_navy, marginBottom: 30 },

  inputContainer: { marginBottom: 24 },
  inputSection: { marginBottom: 30 },

  label: { fontSize: 16, fontWeight: '600', color: main_navy, marginBottom: 8 },
  labelLarge: { fontSize: 20, fontWeight: 'bold', color: main_navy, marginBottom: 8 },
  labelMedium: { fontSize: 18, color: '#000', marginBottom: 12, lineHeight: 26, fontWeight: '600' },

  input: { borderWidth: 1.5, borderColor: main_navy, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, fontSize: 16, color: '#000' },
  inputError: { borderColor: red, borderWidth: 2 },
  errorText: { color: red, fontSize: 14, marginTop: 8, fontWeight: 'bold' },

  inputBoxLarge: { borderWidth: 2, borderColor: main_navy, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#FFF' },
  inputTextLarge: { fontSize: 18, color: main_navy },

  genderContainer: { flexDirection: 'row', marginTop: 5 },
  radioGroup: { flexDirection: 'row' },
  radioButton: { flexDirection: 'row', alignItems: 'center', marginRight: 40 },
  radioLabel: { fontSize: 20, marginLeft: 8, fontWeight: 'bold' },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowEnd: { flexDirection: 'row', alignItems: 'center' },
  unitText: { fontSize: 20, color: main_navy, marginLeft: 8, fontWeight: 'bold' },

  nextButton: { backgroundColor: main_navy, paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginTop: 20 },
  nextButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },

  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  skipBtn: { width: '30%', paddingVertical: 18, borderRadius: 30, borderWidth: 2, borderColor: red, alignItems: 'center' },
  skipBtnText: { color: red, fontSize: 16, fontWeight: 'bold' },
  nextBtnWide: { width: '65%', paddingVertical: 18, borderRadius: 30, alignItems: 'center' },
  nextBtnText: { fontSize: 20, fontWeight: 'bold' },

  summaryBox: { marginTop: 10, padding: 15, backgroundColor: '#F1F4F9', borderRadius: 15 },
  summaryText: { fontSize: 17, color: main_navy, fontWeight: 'bold', lineHeight: 24 },

  drinkGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  drinkOption: { width: '48%', paddingVertical: 15, borderWidth: 1, borderColor: light_gray, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  activeDrinkOption: { backgroundColor: main_navy, borderColor: main_navy },
  drinkOptionText: { fontSize: 16, color: '#666', fontWeight: 'bold' },
  activeDrinkOptionText: { color: '#FFF' },

  progressContainer: { height: 6, backgroundColor: '#F0F0F0' },
  progressBar: { height: '100%', backgroundColor: main_navy },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  popupBox: { width: '92%', height: '70%', backgroundColor: '#FFF', borderRadius: 25, padding: 20 },
  popupTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  popupFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelBtn: { width: '35%', padding: 15, borderRadius: 30, backgroundColor: red, alignItems: 'center' },
  confirmBtn: { width: '60%', padding: 15, borderRadius: 30, backgroundColor: main_navy, alignItems: 'center' },
  footerText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  diseaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  diseaseName: { fontSize: 16, fontWeight: '600', width: '35%' },
  subBtnGroup: { flexDirection: 'row', width: '60%', justifyContent: 'flex-end' },
  subBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: light_gray, marginLeft: 5, alignItems: 'center' },
  subBtnText: { fontSize: 14, color: '#888' },
  activeSubBtn: { backgroundColor: main_navy, borderColor: main_navy },
  activeSubText: { color: '#FFF', fontWeight: 'bold' },

  simpleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  simpleRowText: { fontSize: 18, marginLeft: 15, fontWeight: '600' },

  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  dateModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  dateModalHeader: { padding: 15, alignItems: 'flex-end', borderBottomWidth: 0.5, borderBottomColor: '#EEE' },
  confirmText: { fontSize: 22, fontWeight: 'bold', color: main_navy },

  customSkipTitle: { fontSize: 26, fontWeight: 'bold', color: red, textAlign: 'center', marginBottom: 15 },
  customSkipContent: { fontSize: 20, color: '#000000', textAlign: 'center', lineHeight: 26, marginBottom: 10 },
  customFinishTitle: { fontSize: 26, fontWeight: 'bold', color: main_navy, textAlign: 'center', marginBottom: 15 },
});
