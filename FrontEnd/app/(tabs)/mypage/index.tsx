import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api/api';
import { KeyboardAvoidingView, Platform } from 'react-native'; // ← import에 추가
import Back from "../../../assets/images/LoginScreen/back.svg";


const main_navy = '#00246D';
const light_navy = '#F1F4F9';
const red = '#C0392B';

const DRINK_OPTIONS = ["1회 미만", "1~2회", "3~4회", "5~9회", "10~14회", "15회 이상", "술을 마시지 않는다"];
const DISEASE_LIST = ["뇌졸중 (중풍)", "심근경색/협심증", "고혈압", "당뇨", "이상지질혈증", "폐결핵", "우울증", "조기정신증", "C형 간염", "기타"];
const FAMILY_DISEASE_LIST = ["뇌졸중 (중풍)", "심근경색/협심증", "고혈압", "당뇨병", "기타"];

interface UserInfo {
  email: string;
  name: string;
  gender: string;
  age: number;
  height: number;
  weight: number;
  is_under_treatment: boolean;
  has_family_history: boolean;
  is_b_hepatitis_carrier: boolean;
  medical_history: string;
  smoked_regular: boolean;
  used_heated_tobacco: boolean;
  used_vaping: boolean;
  drinking_frequency: string;
}

export default function MyPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 기본정보 수정 모달
  const [isBasicModalVisible, setIsBasicModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editWeight, setEditWeight] = useState('');

  // 비밀번호 수정 모달
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // 질환력 수정 모달
  const [isDiseaseModalVisible, setIsDiseaseModalVisible] = useState(false);
  const [editIsUnderTreatment, setEditIsUnderTreatment] = useState(false);
  const [editHasFamilyHistory, setEditHasFamilyHistory] = useState(false);
  const [editIsHepatitis, setEditIsHepatitis] = useState(false);
  // 질환 선택: { 질환명: { diagnosed: bool, treated: bool } }
  const [diseaseData, setDiseaseData] = useState<{[key: string]: {diagnosed: boolean, treated: boolean}}>({});
  // 가족력 선택
  const [familyData, setFamilyData] = useState<string[]>([]);

  // 흡연/음주 수정 모달
  const [isLifestyleModalVisible, setIsLifestyleModalVisible] = useState(false);
  const [editSmokedRegular, setEditSmokedRegular] = useState(false);
  const [editUsedHeatedTobacco, setEditUsedHeatedTobacco] = useState(false);
  const [editUsedVaping, setEditUsedVaping] = useState(false);
  const [editDrinkingFrequency, setEditDrinkingFrequency] = useState('');

  useEffect(() => { fetchUserInfo(); }, []);

  const getToken = async () => await AsyncStorage.getItem('access_token');

  const fetchUserInfo = async () => {
    try {
      const token = await getToken();
      const response = await apiClient.get('/friend/mypage/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserInfo(response.data);
    } catch (error: any) {
      Alert.alert('오류', '사용자 정보를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 질환 데이터 → 문자열 변환
  const buildMedicalHistoryString = () => {
    const diseaseList = Object.entries(diseaseData)
      .filter(([_, v]) => v.diagnosed || v.treated)
      .map(([name, v]) => {
        const parts = [];
        if (v.diagnosed) parts.push('진단');
        if (v.treated) parts.push('약물치료');
        return `${name}(${parts.join('+')})`;
      });
    const familyList = familyData.map(d => `[가족력]${d}`);
    return [...diseaseList, ...familyList].join(', ');
  };

  // 질환력 모달 열기
  const openDiseaseModal = () => {
  setEditIsUnderTreatment(userInfo?.is_under_treatment || false);
  setEditHasFamilyHistory(userInfo?.has_family_history || false);
  setEditIsHepatitis(userInfo?.is_b_hepatitis_carrier || false);

  // ✅ 기존 질환 데이터 파싱
  const parsedDisease: {[key: string]: {diagnosed: boolean, treated: boolean}} = {};
  const parsedFamily: string[] = [];

  if (userInfo?.medical_history) {
    const items = userInfo.medical_history.split(', ');
    items.forEach(item => {
      if (item.startsWith('[가족력]')) {
        parsedFamily.push(item.replace('[가족력]', ''));
      } else {
        const match = item.match(/^(.+?)\((.+?)\)$/);
        if (match) {
          const name = match[1];
          const parts = match[2].split('+');
          parsedDisease[name] = {
            diagnosed: parts.includes('진단'),
            treated: parts.includes('약물치료'),
          };
        }
      }
    });
  }

  setDiseaseData(parsedDisease);
  setFamilyData(parsedFamily);
  setIsDiseaseModalVisible(true);
};


  const toggleDisease = (name: string, type: 'diagnosed' | 'treated') => {
    setDiseaseData(prev => {
      const current = prev[name] || { diagnosed: false, treated: false };
      return { ...prev, [name]: { ...current, [type]: !current[type] } };
    });
  };

  const toggleFamily = (name: string) => {
    setFamilyData(prev => prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]);
  };

  // 기본정보 저장
  const openBasicModal = () => {
    setEditName(userInfo?.name || '');
    setEditGender(userInfo?.gender || '');
    setEditHeight(String(userInfo?.height || ''));
    setEditWeight(String(userInfo?.weight || ''));
    setIsBasicModalVisible(true);
  };

  const handleSaveBasic = async () => {
    try {
      const token = await getToken();
      await apiClient.patch('/friend/mypage/profile/basic', {
        name: editName, age: userInfo?.age, gender: editGender,
        height: parseFloat(editHeight), weight: parseFloat(editWeight),
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('완료', '기본 정보가 수정되었습니다.');
      setIsBasicModalVisible(false);
      fetchUserInfo();
    } catch {
      Alert.alert('오류', '수정에 실패했습니다.');
    }
  };

  // 비밀번호 저장
  const handleSavePassword = async () => {
    if (newPassword !== confirmNewPassword) { Alert.alert('오류', '새 비밀번호가 일치하지 않습니다.'); return; }
    if (newPassword.length < 8) { Alert.alert('오류', '비밀번호는 8자 이상이어야 합니다.'); return; }
    try {
      const token = await getToken();
      await apiClient.patch('/friend/mypage/account/password', {
        current_password: currentPassword, new_password: newPassword,
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('완료', '비밀번호가 변경되었습니다.');
      setIsPasswordModalVisible(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
    } catch {
      Alert.alert('오류', '현재 비밀번호가 올바르지 않습니다.');
    }
  };

  // 질환력 저장
  const handleSaveDisease = async () => {
    try {
      const token = await getToken();
      await apiClient.patch('/friend/mypage/profile/health/disease', {
        is_under_treatment: editIsUnderTreatment,
        has_family_history: editHasFamilyHistory,
        is_b_hepatitis_carrier: editIsHepatitis,
        medical_history: buildMedicalHistoryString(),
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('완료', '질환력 정보가 수정되었습니다.');
      setIsDiseaseModalVisible(false);
      fetchUserInfo();
    } catch {
      Alert.alert('오류', '수정에 실패했습니다.');
    }
  };

  // 흡연/음주 저장
  const openLifestyleModal = () => {
    setEditSmokedRegular(userInfo?.smoked_regular || false);
    setEditUsedHeatedTobacco(userInfo?.used_heated_tobacco || false);
    setEditUsedVaping(userInfo?.used_vaping || false);
    setEditDrinkingFrequency(userInfo?.drinking_frequency || '');
    setIsLifestyleModalVisible(true);
  };

  const handleSaveLifestyle = async () => {
    try {
      const token = await getToken();
      await apiClient.patch('/friend/mypage/profile/health/lifestyle', {
        smoked_regular: editSmokedRegular,
        used_heated_tobacco: editUsedHeatedTobacco,
        used_vaping: editUsedVaping,
        drinking_frequency: editDrinkingFrequency,
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('완료', '흡연/음주 정보가 수정되었습니다.');
      setIsLifestyleModalVisible(false);
      fetchUserInfo();
    } catch {
      Alert.alert('오류', '수정에 실패했습니다.');
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: async () => {
        const token = await getToken();
        await apiClient.post('/friend/mypage/logout', {}, { headers: { Authorization: `Bearer ${token}` } });
        await AsyncStorage.removeItem('access_token');
        router.replace('/(auth)/StartScreen/StartScreen' as any);
      }}
    ]);
  };

  // 회원탈퇴
  const handleWithdraw = () => {
    Alert.alert('회원탈퇴', '정말 탈퇴하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '탈퇴', style: 'destructive', onPress: async () => {
        try {
          const token = await getToken();
          await apiClient.delete('/friend/mypage/withdraw', { headers: { Authorization: `Bearer ${token}` } });
          await AsyncStorage.removeItem('access_token');
          router.replace('/(auth)/StartScreen/StartScreen' as any);
        } catch { Alert.alert('오류', '회원탈퇴에 실패했습니다.'); }
      }}
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}><ActivityIndicator size="large" color={main_navy} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Back width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>마이페이지</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* 회원 정보 */}
        <View style={styles.section}>
          <View style={styles.tagBox}><Text style={styles.tagText}>회원 정보</Text></View>
          <InfoRow label="아이디" value={userInfo?.email || '-'} />
          <TouchableOpacity onPress={() => setIsPasswordModalVisible(true)}>
            <Text style={styles.passwordReset}>비밀번호 재설정</Text>
          </TouchableOpacity>
        </View>

        {/* 기본 정보 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.tagBox}><Text style={styles.tagText}>기본 정보</Text></View>
            <TouchableOpacity onPress={openBasicModal}><Text style={styles.editText}>수정하기</Text></TouchableOpacity>
          </View>
          <InfoRow label="이름" value={userInfo?.name || '-'} />
          <InfoRow label="성별" value={userInfo?.gender || '-'} />
          <InfoRow label="나이" value={userInfo?.age ? `${userInfo.age}세` : '-'} />
          <InfoRow label="키" value={userInfo?.height ? `${userInfo.height}cm` : '-'} />
          <InfoRow label="몸무게" value={userInfo?.weight ? `${userInfo.weight}kg` : '-'} />
        </View>

        {/* 건강 정보 */}
        <View style={styles.section}>
          <View style={styles.tagBox}><Text style={styles.tagText}>건강 정보</Text></View>

          {/* 질환력 */}
          <View style={styles.healthSection}>
            <View style={styles.healthSectionHeader}>
              <Text style={styles.healthSectionTitle}>질환력 (과거력, 가족력)</Text>
              <TouchableOpacity onPress={openDiseaseModal}><Text style={styles.editText}>수정하기</Text></TouchableOpacity>
            </View>
            <InfoRow label="약물치료 중" value={userInfo?.is_under_treatment ? '예' : '아니요'} />
            <InfoRow label="가족력" value={userInfo?.has_family_history ? '예' : '아니요'} />
            <InfoRow label="B형간염" value={userInfo?.is_b_hepatitis_carrier ? '예' : '아니요'} />
            {userInfo?.medical_history ? (
              <View style={styles.medicalHistoryBox}>
                <Text style={styles.medicalHistoryText}>{userInfo.medical_history}</Text>
              </View>
            ) : (
              <Text style={styles.emptyText}>등록된 질환 내역이 없습니다</Text>
            )}
          </View>

          {/* 흡연/음주 */}
          <View style={styles.healthSection}>
            <View style={styles.healthSectionHeader}>
              <Text style={styles.healthSectionTitle}>흡연 및 음주</Text>
              <TouchableOpacity onPress={openLifestyleModal}><Text style={styles.editText}>수정하기</Text></TouchableOpacity>
            </View>
            <InfoRow label="일반담배" value={userInfo?.smoked_regular ? '예' : '아니요'} />
            <InfoRow label="궐련형" value={userInfo?.used_heated_tobacco ? '예' : '아니요'} />
            <InfoRow label="액상형" value={userInfo?.used_vaping ? '예' : '아니요'} />
            <InfoRow label="음주빈도" value={userInfo?.drinking_frequency || '-'} />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleWithdraw}>
          <Text style={styles.withdrawText}>회원 탈퇴하기</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ───── 기본정보 수정 모달 ───── */}
      <Modal visible={isBasicModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>기본 정보 수정</Text>
              <TouchableOpacity onPress={() => setIsBasicModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput style={styles.inputBox} value={editName} onChangeText={setEditName} placeholder="이름" />
              <Text style={styles.inputLabel}>성별</Text>
              <View style={styles.twoRow}>
                <TouchableOpacity style={[styles.selectBtn, editGender === '남자' && styles.selectBtnActive]} onPress={() => setEditGender('남자')}>
                  <Text style={[styles.selectBtnText, editGender === '남자' && styles.selectBtnTextActive]}>남성</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.selectBtn, editGender === '여자' && styles.selectBtnActive]} onPress={() => setEditGender('여자')}>
                  <Text style={[styles.selectBtnText, editGender === '여자' && styles.selectBtnTextActive]}>여성</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.inputLabel}>키 (cm)</Text>
              <TextInput style={styles.inputBox} value={editHeight} onChangeText={setEditHeight} keyboardType="decimal-pad" placeholder="키" />
              <Text style={styles.inputLabel}>몸무게 (kg)</Text>
              <TextInput style={styles.inputBox} value={editWeight} onChangeText={setEditWeight} keyboardType="decimal-pad" placeholder="몸무게" />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBasic}>
                <Text style={styles.saveBtnText}>저장하기</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ───── 비밀번호 수정 모달 ───── */}
      <Modal visible={isPasswordModalVisible} transparent animationType="slide">
  <KeyboardAvoidingView 
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={{ flex: 1 }}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>비밀번호 변경</Text>
              <TouchableOpacity onPress={() => { setIsPasswordModalVisible(false); setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword(''); }}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>현재 비밀번호</Text>
              <TextInput style={styles.inputBox} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="현재 비밀번호" />
              <Text style={styles.inputLabel}>새 비밀번호</Text>
              <TextInput style={styles.inputBox} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="새 비밀번호 (8자 이상)" />
              <Text style={styles.inputLabel}>새 비밀번호 확인</Text>
              <TextInput style={styles.inputBox} value={confirmNewPassword} onChangeText={setConfirmNewPassword} secureTextEntry placeholder="새 비밀번호 확인" />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSavePassword}>
                <Text style={styles.saveBtnText}>변경하기</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
          </KeyboardAvoidingView>

      </Modal>

      {/* ───── 질환력 수정 모달 ───── */}
      <Modal visible={isDiseaseModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>질환력 수정</Text>
              <TouchableOpacity onPress={() => setIsDiseaseModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>현재 약물 치료 중인 질병이 있나요?</Text>
              <View style={styles.twoRow}>
                <TouchableOpacity style={[styles.selectBtn, editIsUnderTreatment && styles.selectBtnActive]} onPress={() => setEditIsUnderTreatment(true)}>
                  <Text style={[styles.selectBtnText, editIsUnderTreatment && styles.selectBtnTextActive]}>예</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.selectBtn, !editIsUnderTreatment && styles.selectBtnActive]} onPress={() => setEditIsUnderTreatment(false)}>
                  <Text style={[styles.selectBtnText, !editIsUnderTreatment && styles.selectBtnTextActive]}>아니요</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>부모, 형제 중 질환 내력이 있나요?</Text>
              <View style={styles.twoRow}>
                <TouchableOpacity style={[styles.selectBtn, editHasFamilyHistory && styles.selectBtnActive]} onPress={() => setEditHasFamilyHistory(true)}>
                  <Text style={[styles.selectBtnText, editHasFamilyHistory && styles.selectBtnTextActive]}>예</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.selectBtn, !editHasFamilyHistory && styles.selectBtnActive]} onPress={() => setEditHasFamilyHistory(false)}>
                  <Text style={[styles.selectBtnText, !editHasFamilyHistory && styles.selectBtnTextActive]}>아니요</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>B형 간염 바이러스 보균자인가요?</Text>
              <View style={styles.twoRow}>
                <TouchableOpacity style={[styles.selectBtn, editIsHepatitis && styles.selectBtnActive]} onPress={() => setEditIsHepatitis(true)}>
                  <Text style={[styles.selectBtnText, editIsHepatitis && styles.selectBtnTextActive]}>예</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.selectBtn, !editIsHepatitis && styles.selectBtnActive]} onPress={() => setEditIsHepatitis(false)}>
                  <Text style={[styles.selectBtnText, !editIsHepatitis && styles.selectBtnTextActive]}>아니요</Text>
                </TouchableOpacity>
              </View>

              {/* 질환 선택 */}
              <Text style={styles.inputLabel}>질환 선택 (해당사항 선택)</Text>
              {DISEASE_LIST.map(d => (
                <View key={d} style={styles.diseaseRow}>
                  <Text style={styles.diseaseName}>{d}</Text>
                  <View style={styles.diseaseBtnGroup}>
                    <TouchableOpacity
                      style={[styles.diseaseBtn, diseaseData[d]?.diagnosed && styles.diseaseBtnActive]}
                      onPress={() => toggleDisease(d, 'diagnosed')}
                    >
                      <Text style={[styles.diseaseBtnText, diseaseData[d]?.diagnosed && styles.diseaseBtnTextActive]}>진단</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.diseaseBtn, diseaseData[d]?.treated && styles.diseaseBtnActive]}
                      onPress={() => toggleDisease(d, 'treated')}
                    >
                      <Text style={[styles.diseaseBtnText, diseaseData[d]?.treated && styles.diseaseBtnTextActive]}>약물치료</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* 가족력 선택 */}
              <Text style={styles.inputLabel}>가족력 선택</Text>
              {FAMILY_DISEASE_LIST.map(d => (
                <TouchableOpacity key={d} style={styles.familyRow} onPress={() => toggleFamily(d)}>
                  <Ionicons name={familyData.includes(d) ? "checkbox" : "square-outline"} size={26} color={main_navy} />
                  <Text style={styles.familyRowText}>{d}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDisease}>
                <Text style={styles.saveBtnText}>저장하기</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ───── 흡연/음주 수정 모달 ───── */}
      <Modal visible={isLifestyleModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>흡연 및 음주 수정</Text>
              <TouchableOpacity onPress={() => setIsLifestyleModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>일반담배 흡연 경험</Text>
              <View style={styles.twoRow}>
                <TouchableOpacity style={[styles.selectBtn, editSmokedRegular && styles.selectBtnActive]} onPress={() => setEditSmokedRegular(true)}>
                  <Text style={[styles.selectBtnText, editSmokedRegular && styles.selectBtnTextActive]}>예</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.selectBtn, !editSmokedRegular && styles.selectBtnActive]} onPress={() => setEditSmokedRegular(false)}>
                  <Text style={[styles.selectBtnText, !editSmokedRegular && styles.selectBtnTextActive]}>아니요</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>궐련형 전자담배 사용 경험</Text>
              <View style={styles.twoRow}>
                <TouchableOpacity style={[styles.selectBtn, editUsedHeatedTobacco && styles.selectBtnActive]} onPress={() => setEditUsedHeatedTobacco(true)}>
                  <Text style={[styles.selectBtnText, editUsedHeatedTobacco && styles.selectBtnTextActive]}>예</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.selectBtn, !editUsedHeatedTobacco && styles.selectBtnActive]} onPress={() => setEditUsedHeatedTobacco(false)}>
                  <Text style={[styles.selectBtnText, !editUsedHeatedTobacco && styles.selectBtnTextActive]}>아니요</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>액상형 전자담배 사용 경험</Text>
              <View style={styles.twoRow}>
                <TouchableOpacity style={[styles.selectBtn, editUsedVaping && styles.selectBtnActive]} onPress={() => setEditUsedVaping(true)}>
                  <Text style={[styles.selectBtnText, editUsedVaping && styles.selectBtnTextActive]}>예</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.selectBtn, !editUsedVaping && styles.selectBtnActive]} onPress={() => setEditUsedVaping(false)}>
                  <Text style={[styles.selectBtnText, !editUsedVaping && styles.selectBtnTextActive]}>아니요</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>월 음주 빈도</Text>
              <View style={styles.drinkGrid}>
                {DRINK_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.drinkOption, editDrinkingFrequency === option && styles.drinkOptionActive]}
                    onPress={() => setEditDrinkingFrequency(option)}
                  >
                    <Text style={[styles.drinkOptionText, editDrinkingFrequency === option && styles.drinkOptionTextActive]}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveLifestyle}>
                <Text style={styles.saveBtnText}>저장하기</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    padding: 4,
  },
  container: { flex: 1, backgroundColor: '#FFF' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: main_navy },
  content: { paddingHorizontal: 24, paddingBottom: 40 },

  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  tagBox: { backgroundColor: main_navy, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
  tagText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginLeft: 2 },
  infoLabel: { fontSize: 16, color: main_navy, fontWeight: '600', width: 90 },
  infoValue: { fontSize: 17, color: '#111', flex: 1 },

  passwordReset: { fontSize: 14, color: main_navy, textDecorationLine: 'underline', marginTop: 4 },
  editText: { fontSize: 14, color: main_navy, textDecorationLine: 'underline' },

  healthSection: { borderWidth: 1, borderColor: '#DDE6F5', borderRadius: 14, padding: 16, marginBottom: 12 },
  healthSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  healthSectionTitle: { fontSize: 16, fontWeight: 'bold', color: main_navy },
  medicalHistoryBox: { backgroundColor: light_navy, borderRadius: 10, padding: 12, marginTop: 6 },
  medicalHistoryText: { fontSize: 15, color: '#333', lineHeight: 22 },
  emptyText: { fontSize: 14, color: '#AAA', marginTop: 4 },

  logoutBtn: { alignItems: 'center', marginTop: 30, marginBottom: 16 },
  logoutText: { fontSize: 20, color: red, fontWeight: 'bold', textDecorationLine: 'underline' },
  withdrawText: { textAlign: 'center', fontSize: 16, color: red, textDecorationLine: 'underline' },

  // 모달 - flex-end로 아래서 올라오게
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: main_navy },

  inputLabel: { fontSize: 16, fontWeight: '600', color: main_navy, marginBottom: 8, marginTop: 12 },
  inputBox: { borderWidth: 1.5, borderColor: main_navy, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, fontSize: 16, color: '#000' },

  twoRow: { flexDirection: 'row', gap: 12 },
  selectBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#DDD', alignItems: 'center' },
  selectBtnActive: { backgroundColor: main_navy, borderColor: main_navy },
  selectBtnText: { fontSize: 16, color: '#888', fontWeight: 'bold' },
  selectBtnTextActive: { color: '#FFF' },

  // 질환 선택
  diseaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  diseaseName: { fontSize: 15, fontWeight: '600', flex: 1 },
  diseaseBtnGroup: { flexDirection: 'row', gap: 8 },
  diseaseBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#DDD' },
  diseaseBtnActive: { backgroundColor: main_navy, borderColor: main_navy },
  diseaseBtnText: { fontSize: 13, color: '#888' },
  diseaseBtnTextActive: { color: '#FFF', fontWeight: 'bold' },

  // 가족력 선택
  familyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  familyRowText: { fontSize: 16, marginLeft: 12, fontWeight: '600' },

  // 음주빈도
  drinkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  drinkOption: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#DDD' },
  drinkOptionActive: { backgroundColor: main_navy, borderColor: main_navy },
  drinkOptionText: { fontSize: 14, color: '#666' },
  drinkOptionTextActive: { color: '#FFF', fontWeight: 'bold' },

  saveBtn: { backgroundColor: main_navy, paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginTop: 24, marginBottom: 10 },
  saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
