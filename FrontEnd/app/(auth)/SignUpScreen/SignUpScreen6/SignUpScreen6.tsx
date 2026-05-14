import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, 
  ScrollView, Alert, Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signupAPI } from '@/api/auth';
import { SignupRequest, MedicalHistoryItem } from '@/types/auth';


const main_navy = '#00246D';
const light_gray = '#E0E0E0';
const red_cancel = '#D9534F';

const DRINK_OPTIONS = [
  "1회 미만", "1~2회", "3~4회", 
  "5~9회", "10~14회", "15회 이상", 
  "술을 마시지 않는다"
];

export default function SignUpScreen6() {
  const [isSkipModalVisible, setIsSkipModalVisible] = useState(false);
  const [isFinishModalVisible, setIsFinishModalVisible] = useState(false); 
  const router = useRouter();
  const params = useLocalSearchParams(); 

  const [smoke1, setSmoke1] = useState('');
  const [smoke2, setSmoke2] = useState('');
  const [smoke3, setSmoke3] = useState('');
  const [drinkFreq, setDrinkFreq] = useState('');

   const handleSkip = () => {
    setIsSkipModalVisible(true); 
  };

  const handleFinish = async () => {
    try {
     
      const finalData: SignupRequest = {
        email: params.email as string,
        password: params.password as string,
        name: params.name as string,
        age: Number(params.age), // Integer
        gender: params.gender as '남자' | '여자',
        height: parseFloat(params.height as string), // Float
        weight: parseFloat(params.weight as string), // Float
        
        // 질환력/가족력 관련 (앞 페이지에서 넘어옴)
        is_under_treatment: params.is_under_treatment === 'true', 
        has_family_history: params.has_family_history === 'true',
        is_b_hepatitis_carrier: params.is_b_hepatitis_carrier === 'true',
        
        // 상세 질환 리스트 (앞 페이지에서 넘어옴)
        medical_history: JSON.parse(params.medical_history as string || '[]'), 
        
        smoked_regular: smoke1 === '예',        // Boolean으로 변환
        used_heated_tobacco: smoke2 === '예',   // Boolean으로 변환
        used_vaping: smoke3 === '예',           // Boolean으로 변환
        drinking_frequency: drinkFreq           // String 그대로 전달

      };

      console.log("백엔드로 넘어가는 최종 데이터:", finalData);

      // 백엔드 서버로 전송
      const response = await signupAPI(finalData);
      
      // 성공 시 가입 완료 모듈 띄움
      setIsFinishModalVisible(true); 

    } catch (error: any) {
      // 에러 발생 시 
      Alert.alert("회원가입 실패", error.message || "입력 정보를 다시 확인해주세요.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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


        <Modal visible={isSkipModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                  <View style={[styles.popupBox, { height: 'auto', paddingVertical: 30 }]}>
                    <Text style={styles.customSkipTitle}>정말 건너뛰시겠습니까?</Text>
                    <Text style={styles.customSkipContent}>
                      건강 정보를 등록해주시면{'\n'}더 정확한 맞춤 건강 분석을{'\n'}해드릴 수 있어요!
                    </Text>
                    <View style={styles.popupFooter}>
                      <TouchableOpacity 
                        style={[styles.cancelBtn, { backgroundColor: main_navy }]} 
                        onPress={() => setIsSkipModalVisible(false)}
                      >
                        <Text style={[styles.footerText, { color: "#ffffff" }]}>다시 작성</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.confirmBtn} 
                        onPress={() => {
                          setIsSkipModalVisible(false);
                          router.replace('/HomeScreen' as any);
                        }}
                      >
                        <Text style={styles.footerText}>건너뛰기</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>


              <Modal visible={isFinishModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.popupBox, { height: 'auto', paddingVertical: 40 }]}>
            
            <Ionicons name="checkmark-circle" size={60} color={main_navy} style={{ alignSelf: 'center', marginBottom: 15 }} />
            
            <Text style={styles.customFinishTitle}>가입 완료!</Text>
            
            <Text style={styles.customSkipContent}>
              건강 관리를 위한{'\n'}모든 준비가 끝났습니다.
            </Text>

            <View style={{ marginTop: 10 }}>
              <TouchableOpacity 
                style={[styles.FinishBtn, { width: '100%' }]} 
                onPress={() => {
                  setIsFinishModalVisible(false);
                  router.replace('/HomeScreen' as any);
                }}
              >
                <Text style={styles.footerText}>시작하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
        

    </SafeAreaView>
  );


}


const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  popupBox: { width: '92%', height: '70%', backgroundColor: '#FFF', borderRadius: 25, padding: 20 },
  popupTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
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


  popupFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelBtn: { width: '35%', padding: 15, borderRadius: 30, backgroundColor: red_cancel, alignItems: 'center' },
  confirmBtn: { width: '60%', padding: 15, borderRadius: 30, backgroundColor: red_cancel, alignItems: 'center' },
  footerText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  FinishBtn: { width: '30%', paddingVertical: 18, borderRadius: 30, borderWidth: 2, backgroundColor: main_navy, alignItems: 'center' },

  customSkipTitle: {
    fontSize: 26, 
    fontWeight: 'bold',
    color: red_cancel, 
    textAlign: 'center',
    marginBottom: 15,
  },
  customSkipContent: {
    fontSize: 20, 
    color: '#000000',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 10,
  },

    customFinishTitle: {
    fontSize: 26, 
    fontWeight: 'bold',
    color: main_navy, 
    textAlign: 'center',
    marginBottom: 15,
  },

});