import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, 
  SafeAreaView, KeyboardAvoidingView, Platform, 
  TouchableWithoutFeedback, Keyboard, ScrollView, Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const main_navy = '#00246D';

export default function SignUpScreen4() {
  const router = useRouter();
  // ⭐ 1~3페이지에서 넘어온 데이터를 받기 위해 추가
  const params = useLocalSearchParams(); 
  
  // 이전 페이지에서 넘어온 username이 있으면 기본값으로 사용
  const [name, setName] = useState((params.username as string) || (params.name as string) || '');
  const [gender, setGender] = useState('');
  const [birth, setBirth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date(1960, 0, 1)); 
  const [showPicker, setShowPicker] = useState(false);

  const handleHeightChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, ''); 
    setHeight(cleaned);
  };

  const handleWeightChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setWeight(cleaned);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      const formattedDate = `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;
      setBirth(formattedDate);
    }
  };

  // ⭐ 데이터 조립 및 이동 함수
  const handleNext = () => {
    // 1. 만 나이 계산
    const today = new Date();
    let calculatedAge = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
      calculatedAge--;
    }

    // 2. 보따리 싸서 5페이지로 이동
    router.push({
      pathname: '/(auth)/SignUpScreen/SignUpScreen5/SignUpScreen5' as any,
      params: { 
        ...params,           // 이전 데이터
        name: name,          // 이름
        gender: gender,      // 성별
        age: calculatedAge,  // 계산된 나이 (숫자)
        height: height,      // 키
        weight: weight       // 몸무게
      }
    });
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

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>기본 정보 입력하기</Text>

            <View style={styles.inputSection}>
              <Text style={styles.label}>이름</Text>
              <View style={styles.inputBox}>
                <TextInput 
                  style={styles.inputtextbox} 
                  value={name} 
                  onChangeText={setName} // 이름 수정 가능하게 변경
                  placeholder="이름을 입력해주세요"
                />
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>성별</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity style={styles.radioButton} onPress={() => setGender('남성')}>
                  <Ionicons name={gender === '남성' ? "radio-button-on" : "radio-button-off"} size={22} color={main_navy} />
                  <Text style={styles.radioLabel}>남성</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.radioButton} onPress={() => setGender('여성')}>
                  <Ionicons name={gender === '여성' ? "radio-button-on" : "radio-button-off"} size={22} color={main_navy} />
                  <Text style={styles.radioLabel}>여성</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>생년월일</Text>
              <TouchableOpacity style={[styles.inputBox, styles.rowBetween]} onPress={() => setShowPicker(true)}>
                <Text style={[styles.inputText, !birth && { color: '#ccc' }]}>{birth || "생년월일을 선택해주세요"}</Text>
                <Ionicons name="calendar-outline" size={24} color={main_navy} /> 
              </TouchableOpacity>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>키</Text>
              <View style={[styles.inputBox, styles.rowEnd]}>
                <TextInput
                  style={[styles.inputText, { flex: 1 }]}
                  value={height}
                  onChangeText={handleHeightChange}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="000"
                  placeholderTextColor="#CCC"
                />
                <Text style={styles.unitText}>cm</Text>
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>몸무게</Text>
              <View style={[styles.inputBox, styles.rowEnd]}>
                <TextInput
                  style={[styles.inputText, { flex: 1 }]}
                  value={weight}
                  onChangeText={handleWeightChange}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="000"
                  placeholderTextColor="#CCC"
                />
                <Text style={styles.unitText}>kg</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.nextButton, { backgroundColor: (gender && birth && height && weight) ? main_navy : '#E0E0E0' }]}
              disabled={!(gender && birth && height && weight)}
              onPress={handleNext} 
            >
              <Text style={[styles.nextButtonText, { color: (gender && birth && height && weight) ? '#FFF' : '#888' }]}>다음</Text>
            </TouchableOpacity>
          </ScrollView>

          <Modal transparent={true} visible={showPicker} animationType="slide">
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 10 },
  backButton: { padding: 4 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: 'bold', color: main_navy, marginBottom: 30 },
  inputSection: { marginBottom: 20 },
  label: { fontSize: 20, fontWeight: 'bold', color: main_navy, marginBottom: 8 },
  inputBox: {
    borderWidth: 2,
    borderColor: main_navy, 
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
  },
  inputtextbox: { fontSize: 18, color: main_navy },
  inputText: { fontSize: 18, color: main_navy },
  genderContainer: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: 5 },
  radioButton: { flexDirection: 'row', alignItems: 'center', marginRight: 30 },
  radioLabel: { fontSize: 20, marginLeft: 8, color: '#000000', fontWeight: 'bold' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowEnd: { flexDirection: 'row', alignItems: 'center' },
  unitText: { fontSize: 20, color: main_navy, marginLeft: 8, fontWeight: 'bold' },
  nextButton: { paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginTop: 20 },
  nextButtonText: { fontSize: 20, fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  modalHeader: { padding: 15, alignItems: 'flex-end', borderBottomWidth: 0.5, borderBottomColor: '#EEE' },
  confirmText: { fontSize: 22, fontWeight: 'bold', color: main_navy },
});