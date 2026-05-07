import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, 
  SafeAreaView, KeyboardAvoidingView, Platform, 
  TouchableWithoutFeedback, Keyboard, ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router'; // 추가


const main_navy = '#00246D';

export default function SignUpScreen4() {
  const router = useRouter();
  const { userName } = useLocalSearchParams<{ userName: string }>(); // 이전 페이지에서 보낸 userName 받기
  
  // 초기값을 userName으로 설정 (없을 경우 빈 문자열)
  const [name, setName] = useState(userName || '');
const [gender, setGender] = useState(''); // '남성' 또는 '여성'
  const [birth, setBirth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          {/* 상단 헤더 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={main_navy} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>기본 정보 입력하기</Text>

            {/* 이름 입력 */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>이름</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputText}
                  value={name}
                  onChangeText={setName}
                  placeholder="이름을 입력해주세요"
                />
              </View>
            </View>

            {/* 성별 선택 */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>성별</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity 
                  style={styles.radioButton} 
                  onPress={() => setGender('남성')}
                >
                  <Ionicons 
                    name={gender === '남성' ? "radio-button-on" : "radio-button-off"} 
                    size={20} color={main_navy} 
                  />
                  <Text style={styles.radioLabel}>남성</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.radioButton} 
                  onPress={() => setGender('여성')}
                >
                  <Ionicons 
                    name={gender === '여성' ? "radio-button-on" : "radio-button-off"} 
                    size={20} color={main_navy} 
                  />
                  <Text style={styles.radioLabel}>여성</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 생년월일 */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>생년월일</Text>
              <View style={[styles.inputBox, styles.rowBetween]}>
                <TextInput
                  style={styles.inputText}
                  value={birth}
                  onChangeText={setBirth}
                  placeholder="생년월일을 선택해주세요"
                  editable={true} 
                />
                <Ionicons name="chevron-down" size={20} color="#CCC" />
              </View>
            </View>

            {/* 키 */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>키</Text>
              <View style={[styles.inputBox, styles.rowEnd]}>
                <TextInput
                  style={[styles.inputText, { flex: 1 }]}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                />
                <Text style={styles.unitText}>cm</Text>
              </View>
            </View>

            {/* 몸무게 */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>몸무게</Text>
              <View style={[styles.inputBox, styles.rowEnd]}>
                <TextInput
                  style={[styles.inputText, { flex: 1 }]}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                />
                <Text style={styles.unitText}>kg</Text>
              </View>
            </View>

            {/* 다음 버튼 */}
            <TouchableOpacity 
              style={[
                styles.nextButton, 
                { opacity: name && gender && birth && height && weight ? 1 : 0.5 }
              ]}
              disabled={!(name && gender && birth && height && weight)}
              onPress={() => router.push('/(auth)/SignUpScreen/SignUpScreen5/SignUpScreen5')}
            >
              <Text style={styles.nextButtonText}>다음</Text>
            </TouchableOpacity>
          </ScrollView>
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
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#000', marginBottom: 30 },
  inputSection: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 8 },
  inputBox: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
  },
  inputText: { fontSize: 16, color: '#000' },
  genderContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5 },
  radioButton: { flexDirection: 'row', alignItems: 'center', marginLeft: 20 },
  radioLabel: { fontSize: 16, marginLeft: 6, color: '#000' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowEnd: { flexDirection: 'row', alignItems: 'center' },
  unitText: { fontSize: 16, color: '#000', marginLeft: 8 },
  nextButton: {
    backgroundColor: '#E0E0E0', // 초기값 회색
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 30,
  },
  nextButtonText: { color: '#888', fontSize: 18, fontWeight: 'bold' },
});