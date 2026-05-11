import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, 
  ScrollView, Alert 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const main_navy = '#00246D';
const light_gray = '#E0E0E0';
const red_cancel = '#D9534F';

const DRINK_OPTIONS = [
  "1회 미만", "1~2회", "3~4회", 
  "5~9회", "10~14회", "15회 이상", 
  "술을 마시지 않는다"
];

export default function SignUpScreen6() {
  const router = useRouter();
  const params = useLocalSearchParams(); 

  const [smoke1, setSmoke1] = useState('');
  const [smoke2, setSmoke2] = useState('');
  const [smoke3, setSmoke3] = useState('');
  const [drinkFreq, setDrinkFreq] = useState('');

  const handleSkip = () => {
    Alert.alert(
      "정말 건너뛰시겠습니까?",
      "흡연 및 음주 정보를 알려주시면 더 정확한 맞춤 건강 분석을 해드릴 수 있어요!",
      [
        { text: "다시 작성하기", style: "cancel" },
        { 
          text: "정말 건너뛰기", 
          onPress: () => router.replace('/HomeScreen' as any), // 홈 화면으로 이동
          style: "destructive" 
        }
      ]
    );
  };

  const handleFinish = () => {
    const finalData = {
      ...params,
      smoke1, smoke2, smoke3, drinkFreq
    };
    console.log("최종 가입 데이터:", finalData);
    
    Alert.alert("가입 완료!", "규린님의 건강 관리를 위한 모든 준비가 끝났습니다.", [
      { text: "확인", onPress: () => router.replace('/HomeScreen' as any) }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 🔝 진행률 표시 바 (100% 완료) */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: '100%' }]} /> 
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={main_navy} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>건강 정보 입력하기</Text>
        <Text style={styles.subTitle}>흡연 및 음주</Text>

        {/* 질문 1: 일반담배 */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>지금까지 평생 총 5갑(100개비) 이상의{'\n'}일반담배(궐련)를 피운 적이 있나요?</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity style={styles.radioButton} onPress={() => setSmoke1('예')}>
              <Ionicons name={smoke1 === '예' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} />
              <Text style={styles.radioLabel}>예</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioButton} onPress={() => setSmoke1('아니요')}>
              <Ionicons name={smoke1 === '아니요' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} />
              <Text style={styles.radioLabel}>아니요</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 질문 2: 궐련형 전담 */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>지금까지 궐련형 전자담배(아이코스, 글로, 릴 등)를 사용한 적이 있나요?</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity style={styles.radioButton} onPress={() => setSmoke2('예')}>
              <Ionicons name={smoke2 === '예' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} />
              <Text style={styles.radioLabel}>예</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioButton} onPress={() => setSmoke2('아니요')}>
              <Ionicons name={smoke2 === '아니요' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} />
              <Text style={styles.radioLabel}>아니요</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>액상형 전자담배를 사용한 적이 있나요?</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity style={styles.radioButton} onPress={() => setSmoke3('예')}>
              <Ionicons name={smoke3 === '예' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} />
              <Text style={styles.radioLabel}>예</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioButton} onPress={() => setSmoke3('아니요')}>
              <Ionicons name={smoke3 === '아니요' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} />
              <Text style={styles.radioLabel}>아니요</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>한 달에 몇 번 정도 술을 마시나요?</Text>
          <View style={styles.drinkGrid}>
            {DRINK_OPTIONS.map((option) => (
              <TouchableOpacity 
                key={option}
                style={[
                  styles.drinkOption, 
                  drinkFreq === option && styles.activeDrinkOption
                ]}
                onPress={() => setDrinkFreq(option)}
              >
                <Text style={[
                  styles.drinkOptionText,
                  drinkFreq === option && styles.activeDrinkOptionText
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>


        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipBtnText}>건너뛰기</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.nextBtn, 
              { backgroundColor: (smoke1 && smoke2 && smoke3 && drinkFreq) ? main_navy : light_gray }
            ]}
            disabled={!(smoke1 && smoke2 && smoke3 && drinkFreq)}
            onPress={handleFinish}
          >
            <Text style={[styles.nextBtnText, { color: (smoke1 && smoke2 && smoke3 && drinkFreq) ? '#FFF' : '#888' }]}>
              완료
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  progressContainer: { height: 6, backgroundColor: '#F0F0F0' },
  progressBar: { height: '100%', backgroundColor: main_navy },
  header: { padding: 16 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: 'bold', color: main_navy, marginBottom: 5 },
  subTitle: { fontSize: 24, fontWeight: 'bold', color: main_navy, marginBottom: 30 },
  inputSection: { marginBottom: 35 },
  label: { fontSize: 18, color: '#000', marginBottom: 15, lineHeight: 26, fontWeight: '600' },
  radioGroup: { flexDirection: 'row' },
  radioButton: { flexDirection: 'row', alignItems: 'center', marginRight: 40 },
  radioLabel: { fontSize: 20, marginLeft: 8, fontWeight: 'bold' },


  drinkGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  drinkOption: { 
    width: '48%', 
    paddingVertical: 15, 
    borderWidth: 1, 
    borderColor: light_gray, 
    borderRadius: 12, 
    marginBottom: 10, 
    alignItems: 'center' 
  },
  activeDrinkOption: { backgroundColor: main_navy, borderColor: main_navy },
  drinkOptionText: { fontSize: 16, color: '#666', fontWeight: 'bold' },
  activeDrinkOptionText: { color: '#FFF' },


  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  skipBtn: { width: '30%', paddingVertical: 18, borderRadius: 30, borderWidth: 2, borderColor: red_cancel, alignItems: 'center' },
  skipBtnText: { color: red_cancel, fontSize: 16, fontWeight: 'bold' },
  nextBtn: { width: '65%', paddingVertical: 18, borderRadius: 30, alignItems: 'center' },
  nextBtnText: { fontSize: 20, fontWeight: 'bold' },
});