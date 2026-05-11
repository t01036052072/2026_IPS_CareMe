import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, 
  KeyboardAvoidingView, Platform, ScrollView, Modal, Alert, TextInput 
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

  const [isDiseaseModalVisible, setIsDiseaseModalVisible] = useState(false);
  const [isFamilyModalVisible, setIsFamilyModalVisible] = useState(false);

  const [diseaseData, setDiseaseData] = useState<{[key: string]: {diagnosed: boolean, treated: boolean, detail?: string}}>({});
  const [familyData, setFamilyData] = useState<{[key: string]: boolean & {detail?: string}}>({});
  const [etcDisease, setEtcDisease] = useState('');
  const [etcFamily, setEtcFamily] = useState('');

  const handleSelect1 = (val: string) => {
    setSelect1(val);
    if (val === '예') setIsDiseaseModalVisible(true);
  };

  const handleSelect2 = (val: string) => {
    setSelect2(val);
    if (val === '예') setIsFamilyModalVisible(true);
  };

  const handleSkip = () => {
    Alert.alert("정말 건너뛰시겠습니까?",  "건강 정보를 입력해주시면 더 정확한 맞춤 건강 분석을 해드릴 수 있어요!", [
      { text: "다시 작성하기", style: "cancel" },
      { text: "정말 건너뛰기", onPress: () => router.replace('/HomeScreen' as any), style: "destructive" }
    ]);
  };


  const renderSummary = (data: any, etcText: string) => {
    const selected = Object.entries(data)
      .filter(([_, v]: any) => v.diagnosed || v.treated || v === true)
      .map(([name, v]: any) => {
        let label = name;
        if (name === '기타' && etcText) label = `기타(${etcText})`;
        
        const details = [];
        if (v.diagnosed) details.push('진단');
        if (v.treated) details.push('약물치료');
        
        return details.length > 0 ? `✔️ ${label} (${details.join(', ')})` : `✔️ ${label}`;
      });

    if (selected.length === 0) return null;

    return (
      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>선택된 항목:{"\n"}{selected.join('\n')}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}><View style={[styles.progressBar, { width: '83%' }]} /></View>
      <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={main_navy} /></TouchableOpacity></View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>건강 정보 입력하기</Text>
        <Text style={styles.subTitle}>질환력</Text>

        <View style={styles.inputSection}>
          <Text style={styles.label}>현재 약물 치료 중인 질병이 있나요?</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity style={styles.radioButton} onPress={() => handleSelect1('예')}>
              <Ionicons name={select1 === '예' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} /><Text style={styles.radioLabel}>예</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioButton} onPress={() => { setSelect1('아니요'); setDiseaseData({}); setEtcDisease(''); }}>
              <Ionicons name={select1 === '아니요' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} /><Text style={styles.radioLabel}>아니요</Text>
            </TouchableOpacity>
          </View>
          {select1 === '예' && renderSummary(diseaseData, etcDisease)}
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>부모, 형제 중 질환 내력이 있나요?</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity style={styles.radioButton} onPress={() => handleSelect2('예')}>
              <Ionicons name={select2 === '예' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} /><Text style={styles.radioLabel}>예</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioButton} onPress={() => { setSelect2('아니요'); setFamilyData({}); setEtcFamily(''); }}>
              <Ionicons name={select2 === '아니요' ? "radio-button-on" : "radio-button-off"} size={24} color={main_navy} /><Text style={styles.radioLabel}>아니요</Text>
            </TouchableOpacity>
          </View>
          {select2 === '예' && renderSummary(familyData, etcFamily)}
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
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}><Text style={styles.skipBtnText}>건너뛰기</Text></TouchableOpacity>
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
            <Text style={styles.popupTitle}>질환 상세 선택</Text>
            <ScrollView>
              {DISEASE_LIST.map(d => (
                <View key={d}>
                  <View style={styles.diseaseRow}>
                    <Text style={styles.diseaseName}>{d}</Text>
                    <View style={styles.subBtnGroup}>
                      <TouchableOpacity style={[styles.subBtn, diseaseData[d]?.diagnosed && styles.activeSubBtn]} onPress={() => setDiseaseData(prev => ({...prev, [d]: {...(prev[d]||{}), diagnosed: !prev[d]?.diagnosed}}))}><Text style={[styles.subBtnText, diseaseData[d]?.diagnosed && styles.activeSubText]}>진단</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.subBtn, diseaseData[d]?.treated && styles.activeSubBtn]} onPress={() => setDiseaseData(prev => ({...prev, [d]: {...(prev[d]||{}), treated: !prev[d]?.treated}}))}><Text style={[styles.subBtnText, diseaseData[d]?.treated && styles.activeSubText]}>약물치료</Text></TouchableOpacity>
                    </View>
                  </View>
                  {d === '기타' && (diseaseData[d]?.diagnosed || diseaseData[d]?.treated) && (
                    <TextInput style={styles.modalEtcInput} placeholder="질환명을 입력해주세요" value={etcDisease} onChangeText={setEtcDisease} />
                  )}
                </View>
              ))}
            </ScrollView>
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
            <Text style={styles.popupTitle}>가족력 선택</Text>
            <ScrollView>
              {FAMILY_DISEASE_LIST.map(d => (
                <View key={d}>
                  <TouchableOpacity style={styles.simpleRow} onPress={() => setFamilyData(prev => ({...prev, [d]: !prev[d]}))}>
                    <Ionicons name={familyData[d] ? "checkbox" : "square-outline"} size={28} color={main_navy} />
                    <Text style={styles.simpleRowText}>{d}</Text>
                  </TouchableOpacity>
                  {d === '기타' && familyData[d] && (
                    <TextInput style={styles.modalEtcInput} placeholder="가족력 내용을 입력해주세요" value={etcFamily} onChangeText={setEtcFamily} />
                  )}
                </View>
              ))}
            </ScrollView>
            <View style={styles.popupFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {setSelect2(''); setFamilyData({}); setIsFamilyModalVisible(false);}}><Text style={styles.footerText}>취소하기</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => setIsFamilyModalVisible(false)}><Text style={styles.footerText}>선택 완료</Text></TouchableOpacity>
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
  
  // 요약 박스 (선 제거)
  summaryBox: { marginTop: 12, padding: 16, backgroundColor: '#F1F4F9', borderRadius: 15 },
  summaryText: { fontSize: 17, color: main_navy, fontWeight: 'bold', lineHeight: 26 },

  // 모달 내 기타 입력창
  modalEtcInput: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, marginVertical: 10, fontSize: 16 },

  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  skipBtn: { width: '30%', paddingVertical: 18, borderRadius: 30, borderWidth: 2, borderColor: red_cancel, alignItems: 'center' },
  skipBtnText: { color: red_cancel, fontSize: 16, fontWeight: 'bold' },
  nextBtn: { width: '65%', paddingVertical: 18, borderRadius: 30, alignItems: 'center' },
  nextBtnText: { fontSize: 20, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  popupBox: { width: '92%', height: '75%', backgroundColor: '#FFF', borderRadius: 25, padding: 20 },
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
  confirmBtn: { width: '60%', padding: 15, borderRadius: 30, backgroundColor: main_navy, alignItems: 'center' },
  footerText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});