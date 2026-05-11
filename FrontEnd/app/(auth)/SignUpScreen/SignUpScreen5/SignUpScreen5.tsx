import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, 
  KeyboardAvoidingView, Platform, ScrollView, Modal
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const main_navy = '#00246D';
const light_gray = '#E0E0E0';
const red_cancel = '#D9534F';

const DISEASE_LIST = ["뇌졸중 (중풍)", "심근경색/협심증", "고혈압", "당뇨", "이상지질혈증", "폐결핵", "우울증", "조기정신증", "C형 간염", "기타"];
const FAMILY_DISEASE_LIST = ["뇌졸중 (중풍)", "심근경색/협심증", "고혈압", "당뇨병", "기타"];

export default function SignUpScreen5() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [select1, setSelect1] = useState('');
  const [select2, setSelect2] = useState('');
  const [select3, setSelect3] = useState('');
  const [isSkipModalVisible, setIsSkipModalVisible] = useState(false); 

  const [isDiseaseModalVisible, setIsDiseaseModalVisible] = useState(false);
  const [isFamilyModalVisible, setIsFamilyModalVisible] = useState(false);

  const [diseaseData, setDiseaseData] = useState<{[key: string]: {diagnosed: boolean, treated: boolean}}>({});
  const [familyData, setFamilyData] = useState<string[]>([]);

  const handleSkip = () => {
    setIsSkipModalVisible(true); 
  };

  const handleSelect1 = (val: string) => {
    setSelect1(val);
    if (val === '예') setIsDiseaseModalVisible(true);
  };

  const handleSelect2 = (val: string) => {
    setSelect2(val);
    if (val === '예') setIsFamilyModalVisible(true);
  };

  const toggleDisease = (name: string, type: 'diagnosed' | 'treated') => {
    setDiseaseData(prev => {
      const current = prev[name] || { diagnosed: false, treated: false };
      return { ...prev, [name]: { ...current, [type]: !current[type] } };
    });
  };

  const toggleFamily = (name: string) => {
    setFamilyData(prev => 
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}><View style={[styles.progressBar, { width: '83%' }]} /></View>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={main_navy} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>건강 정보 입력하기</Text>
        <Text style={styles.subTitle}>질환력</Text>

        <View style={styles.inputSection}>
          <Text style={styles.label}>현재 약물 치료 중인 질병이 있나요?</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity style={styles.radioButton} onPress={() => handleSelect1('예')}>
              <Ionicons name={select1 === '예' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} /><Text style={styles.radioLabel}>예</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioButton} onPress={() => { setSelect1('아니요'); setDiseaseData({}); }}>
              <Ionicons name={select1 === '아니요' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} /><Text style={styles.radioLabel}>아니요</Text>
            </TouchableOpacity>
          </View>
          {select1 === '예' && Object.keys(diseaseData).length > 0 && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                선택된 항목: {Object.entries(diseaseData).filter(([_, v]) => v.diagnosed || v.treated).map(([k]) => `✔️ ${k}`).join(', ')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>부모, 형제 중 질환 내력이 있나요?</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity style={styles.radioButton} onPress={() => handleSelect2('예')}>
              <Ionicons name={select2 === '예' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} /><Text style={styles.radioLabel}>예</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioButton} onPress={() => { setSelect2('아니요'); setFamilyData([]); }}>
              <Ionicons name={select2 === '아니요' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} /><Text style={styles.radioLabel}>아니요</Text>
            </TouchableOpacity>
          </View>
          {select2 === '예' && familyData.length > 0 && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>선택된 항목: {familyData.map(i => `✔️ ${i}`).join(', ')}</Text>
            </View>
          )}
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>B형 간염 바이러스 보균자인가요?</Text>
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
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipBtnText}>건너뛰기</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.nextBtn, { backgroundColor: (select1 && select2 && select3) ? main_navy : light_gray }]}
            disabled={!(select1 && select2 && select3)}
            onPress={() => router.push('/(auth)/SignUpScreen/SignUpScreen6/SignUpScreen6' as any)}
          >
            <Text style={[styles.nextBtnText, { color: (select1 && select2 && select3) ? '#FFF' : '#888' }]}>다음</Text>
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
                  <TouchableOpacity style={[styles.subBtn, diseaseData[d]?.diagnosed && styles.activeSubBtn]} onPress={() => toggleDisease(d, 'diagnosed')}><Text style={[styles.subBtnText, diseaseData[d]?.diagnosed && styles.activeSubText]}>진단</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.subBtn, diseaseData[d]?.treated && styles.activeSubBtn]} onPress={() => toggleDisease(d, 'treated')}><Text style={[styles.subBtnText, diseaseData[d]?.treated && styles.activeSubText]}>약물치료</Text></TouchableOpacity>
                </View>
              </View>
            ))}</ScrollView>
            <View style={styles.popupFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {setSelect1(''); setDiseaseData({}); setIsDiseaseModalVisible(false);}}><Text style={styles.footerText}>취소하기</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => setIsDiseaseModalVisible(false)}><Text style={styles.footerText}>선택 완료</Text></TouchableOpacity>
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
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {setSelect2(''); setFamilyData([]); setIsFamilyModalVisible(false);}}><Text style={styles.footerText}>취소하기</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => setIsFamilyModalVisible(false)}><Text style={styles.footerText}>선택 완료</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  inputSection: { marginBottom: 30 },
  label: { fontSize: 18, color: '#000', marginBottom: 12, lineHeight: 24 },
  radioGroup: { flexDirection: 'row' },
  radioButton: { flexDirection: 'row', alignItems: 'center', marginRight: 40 },
  radioLabel: { fontSize: 20, marginLeft: 8, fontWeight: 'bold' },
  
  summaryBox: { 
    marginTop: 10, 
    padding: 15, 
    backgroundColor: '#F1F4F9', 
    borderRadius: 15,
  },
  summaryText: { fontSize: 17, color: main_navy, fontWeight: 'bold', lineHeight: 24 },
  
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  skipBtn: { width: '30%', paddingVertical: 18, borderRadius: 30, borderWidth: 2, borderColor: red_cancel, alignItems: 'center' },
  skipBtnText: { color: red_cancel, fontSize: 16, fontWeight: 'bold' },
  nextBtn: { width: '65%', paddingVertical: 18, borderRadius: 30, alignItems: 'center' },
  nextBtnText: { fontSize: 20, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  popupBox: { width: '92%', height: '70%', backgroundColor: '#FFF', borderRadius: 25, padding: 20 },
  popupTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  diseaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  diseaseName: { fontSize: 16, fontWeight: '600', width: '35%' },
  subBtnGroup: { flexDirection: 'row', width: '60%', justifyContent: 'flex-end' },
  subBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: light_gray, marginLeft: 5, alignItems: 'center' },
  subBtnText: { fontSize: 14, color: '#888' },
  activeSubBtn: { backgroundColor: main_navy, borderColor: main_navy },
  activeSubText: { color: '#FFF', fontWeight: 'bold' },
  
  simpleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  simpleRowText: { fontSize: 18, marginLeft: 15, fontWeight: '600' },

  popupFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelBtn: { width: '35%', padding: 15, borderRadius: 30, backgroundColor: red_cancel, alignItems: 'center' },
  confirmBtn: { width: '60%', padding: 15, borderRadius: 30, backgroundColor: red_cancel, alignItems: 'center' },
  footerText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

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
});