import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  TextInput, FlatList, Image, ActionSheetIOS, Platform,
  ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@/api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import Back from "../../../assets/images/LoginScreen/back.svg";

const main_navy = '#00246D';
const light_navy = '#F1F4F9';
const green = '#2ECC71';
const red_point = '#D9534F';

interface Medicine {
  id: string;
  name: string;
}

interface MedicineDetail {
  id: string;
  name: string;
  efficacy?: string;
  side_effect?: string;
  image_url?: string;
  use_method?: string;
  warning?: string;
  interaction?: string;
}

interface PhotoCandidate {
  label: string;
  pill_name: string;
}

const sortMedicines = (medicines: Medicine[], query: string) => {
  const q = query.toLowerCase();
  const startsWith = medicines.filter(m => m.name.toLowerCase().startsWith(q)).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const includes = medicines.filter(m => !m.name.toLowerCase().startsWith(q) && m.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  return [...startsWith, ...includes];
};

export default function PillSearch() {
  const router = useRouter();

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [medicineDetail, setMedicineDetail] = useState<MedicineDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [photoCandidates, setPhotoCandidates] = useState<PhotoCandidate[]>([]);
  const [photoCandidateIndex, setPhotoCandidateIndex] = useState(0);

  const [isRegisterConfirmVisible, setIsRegisterConfirmVisible] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');
  const [showPillscheduleBtn, setShowPillscheduleBtn] = useState(false);

  // 💡 regPeriod 상태 삭제 (서버 전송 시 실시간 계산)
  const [regTime, setRegTime] = useState<Date>(new Date());
  const [regCount, setRegCount] = useState(1);
  const [regDays, setRegDays] = useState(7);
  const [showRegTimePicker, setShowRegTimePicker] = useState(false);

  const showAlert = (title: string, message: string, type: 'success' | 'error' = 'success', showBtn = false) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowPillscheduleBtn(showBtn);
    setIsAlertVisible(true);
  };

  const handleTextSearch = async () => {
    if (!searchText.trim()) return;
    setIsSearchLoading(true);
    setHasSearched(true);
    try {
      const res = await apiClient.get('/pills/search', { params: { name: searchText } });
      const mappedResults: Medicine[] = res.data.results.map((item: any) => ({
        id: String(item.id),
        name: item.pill_name,
      }));
      const sorted = sortMedicines(mappedResults, searchText);
      setSearchResults(sorted);
      setResultCount(sorted.length);
    } catch (error) {
      showAlert('검색 실패', '검색 결과가 없습니다.', 'error');
      setSearchResults([]);
      setResultCount(0);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleSelectMedicine = async (medicine: Medicine) => {
    setIsDetailLoading(true);
    setIsDetailVisible(true);
    try {
      const res = await apiClient.get(`/pills/detail/${medicine.id}`);
      const data = res.data.data;
      setMedicineDetail({
        id: String(data.id),
        name: data.pill_name,
        efficacy: data.effect,
        side_effect: data.side_effect,
        image_url: data.master_image_url,
        use_method: data.use_method,
        warning: data.warning,
        interaction: data.interaction,
      });
    } catch (error) {
      setIsDetailVisible(false);
      showAlert('오류', '상세 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleImageAnalyze = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsPhotoLoading(true);
    try {
      const uri = asset.uri;
      const fileName = asset.fileName || uri.split('/').pop() || 'pill.jpg';
      const extension = fileName.split('.').pop()?.toLowerCase();
      const mimeType = asset.mimeType || (extension === 'png' ? 'image/png' : 'image/jpeg');

      if (extension === 'heic' || extension === 'heif' || mimeType.includes('heic') || mimeType.includes('heif')) {
        showAlert('분석 실패', 'HEIC 이미지는 현재 분석하기 어렵습니다. JPG 또는 PNG로 변환한 뒤 다시 시도해주세요.', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('file', { uri, type: mimeType, name: fileName } as any);
      const analyzeRes = await apiClient.post('/pill-photo/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const prediction = analyzeRes.data.prediction;
      const candidates: PhotoCandidate[] = [
        { label: String(prediction.label), pill_name: prediction.pill_name },
        ...((prediction.top_candidates || []) as any[])
          .filter(candidate => String(candidate.label) !== String(prediction.label))
          .map(candidate => ({
            label: String(candidate.label),
            pill_name: candidate.pill_name,
          })),
      ];
      setPhotoCandidates(candidates);
      setPhotoCandidateIndex(0);
      setSelectedMedicine({ id: candidates[0].label, name: candidates[0].pill_name });
      setCapturedImageUri(uri);
      setIsConfirmVisible(true);
    } catch (error) {
      showAlert('분석 실패', '사진 분석에 실패했습니다.\n다시 시도해주세요.', 'error');
    } finally {
      setIsPhotoLoading(false);
    }
  };

  const handlePhotoSearch = async () => {
    const openPicker = async (buttonIndex: number) => {
      if (buttonIndex === 0) return;
      let result;
      if (buttonIndex === 1) {
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      }
      if (!result.canceled && result.assets[0].uri) {
        await handleImageAnalyze(result.assets[0]);
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: ['취소', '사진 촬영', '사진 선택'], cancelButtonIndex: 0 }, openPicker);
    } else {
      openPicker(2);
    }
  };

  const handleConfirmYes = async () => {
    if (!selectedMedicine) return;
    setIsConfirmVisible(false);
    
    setIsDetailLoading(true);
    setIsDetailVisible(true);
    try {
      const res = await apiClient.get(`/pill-photo/detail/${selectedMedicine.id}`);
      const data = res.data.data;
      setMedicineDetail({
        id: String(data.ai_label),
        name: data.pill_name,
        efficacy: data.effect,
        side_effect: data.side_effect,
        use_method: data.use_method,
        warning: data.warning,
      });
    } catch (error) {
      setIsDetailVisible(false);
      showAlert('오류', '상세 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleConfirmNo = () => {
    const nextIndex = photoCandidateIndex + 1;
    const nextCandidate = photoCandidates[nextIndex];

    if (nextCandidate) {
      setPhotoCandidateIndex(nextIndex);
      setSelectedMedicine({ id: nextCandidate.label, name: nextCandidate.pill_name });
      return;
    }

    setIsConfirmVisible(false);
    showAlert('분석 완료', '추가 후보를 찾지 못했습니다. 사진을 다시 찍거나 직접 검색해주세요.', 'error');
  };

 // 💡 서버 전송용 12시간제 포맷팅 함수 (period와 세트)
  const toTimeStr = (date: Date) => {
    const h = date.getHours() % 12 || 12; // 다시 12시간제로 복구!
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h.toString().padStart(2, '0')}:${m}`;
  };

  // 💡 화면 표시용 12시간제 포맷팅 함수
  const formatTime = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? '오후' : '오전';
    const hour = h % 12 || 12;
    return `${ampm} ${hour}:${m}`;
  };

  const handleRegisterMedication = async () => {
    if (!medicineDetail) return;
    setIsRegistering(true);
    
    try {
      const token = await AsyncStorage.getItem('access_token');
      const now = new Date();
      const toLocalDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      // 💡 서버로 보내기 직전, Date 객체에서 오전/오후를 확실하게 계산
      const calculatedPeriod = regTime.getHours() >= 12 ? '오후' : '오전';
      
      console.log('최종 등록 데이터:', { 
        name: medicineDetail.name,
        period: calculatedPeriod, 
        time: toTimeStr(regTime),
        count: regCount, 
        days: regDays 
      });

      await apiClient.post('/medications', {
        name: medicineDetail.name,
        period: calculatedPeriod,
        time: toTimeStr(regTime),
        count: regCount,
        duration_days: regDays,
        start_date: toLocalDate(now),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      setIsRegisterConfirmVisible(false);
      setIsDetailVisible(false);
      showAlert('등록 완료!', `추가된 약은 복약일정에서 확인 가능해요.`, 'success', true);
      
    } catch (error: any) {
      console.error('등록 에러:', error.response?.data || error);
      setIsRegisterConfirmVisible(false);
      setIsDetailVisible(false);
      showAlert('오류', '등록에 실패했습니다.\n다시 시도해주세요.', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Back width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>의약품 검색</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="약 이름을 입력해주세요"
          placeholderTextColor="#AAA"
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            if (!text.trim()) { setHasSearched(false); setSearchResults([]); setResultCount(0); }
          }}
          onSubmitEditing={handleTextSearch}
          returnKeyType="search"
        />
        {isSearchLoading ? (
          <ActivityIndicator size="small" color={main_navy} />
        ) : (
          <TouchableOpacity onPress={handleTextSearch}>
            <Ionicons name="search-outline" size={24} color="#AAA" />
          </TouchableOpacity>
        )}
      </View>

      {!hasSearched && (
        <TouchableOpacity style={styles.photoSearchBtn} onPress={handlePhotoSearch} disabled={isPhotoLoading}>
          {isPhotoLoading ? (
            <ActivityIndicator size="small" color={main_navy} />
          ) : (
            <>
              <Ionicons name="camera" size={24} color={main_navy} />
              <Text style={styles.photoSearchText}>사진으로 검색</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {hasSearched && (
        <View style={styles.resultContainer}>
          {resultCount > 0 && (
            <Text style={styles.resultCount}>검색결과 {resultCount}개</Text>
          )}
          <FlatList
            data={searchResults}
            keyExtractor={item => item.id}
            style={{ flex: 2 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectMedicine(item)}>
                <Ionicons name="ellipse" size={20} color={main_navy} style={{ marginRight: 14 }} />                
                <Text style={styles.resultName}>{item.name}</Text>
                <View style={styles.selectBtn}>
                  <Text style={styles.selectBtnText}>선택</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
              </View>
            }
          />
          
          {resultCount > 8 && (
            <View style={styles.scrollHintBox}>
              <Ionicons name="chevron-down" size={28} color={main_navy} />
              <Text style={styles.scrollHint}>아래로 내리면 더 많은 결과가 있어요</Text>
            </View>
          )}
        </View>
      )}

      {/* ───── 1. 상세 화면 모달 (유일한 찐 Modal) ───── */}
      <Modal visible={isDetailVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsDetailVisible(false)}>
                <Ionicons name="chevron-back" size={28} color={main_navy} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>의약품 정보</Text>
              <View style={{ width: 28 }} />
            </View>

            {isDetailLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={main_navy} />
                <Text style={styles.loadingText}>불러오는 중...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.detailContent}>
                {medicineDetail?.image_url && (
                  <View style={styles.imageBox}>
                    <Image source={{ uri: medicineDetail.image_url }} style={styles.pillImage} resizeMode="contain" />
                  </View>
                )}
                {medicineDetail?.name && <InfoCard label="제품명" value={medicineDetail.name} />}
                {medicineDetail?.efficacy && <InfoCard label="효능·효과" value={medicineDetail.efficacy} />}
                {medicineDetail?.use_method && <InfoCard label="복용법" value={medicineDetail.use_method} />}
                {medicineDetail?.warning && <InfoCard label="경고사항" value={medicineDetail.warning} />}
                {medicineDetail?.interaction && <InfoCard label="상호작용" value={medicineDetail.interaction} />}
                {medicineDetail?.side_effect && <InfoCard label="부작용" value={medicineDetail.side_effect} />}

                <TouchableOpacity style={styles.registerBtn} onPress={() => setIsRegisterConfirmVisible(true)}>
                  <Ionicons name="add-circle-outline" size={24} color="#FFF" />
                  <Text style={styles.registerBtnText}>복약일정에 등록하기</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </SafeAreaView>

          {/* 🌟 2. 복약일정 등록 확인 (가짜 모달 - View로 교체) 🌟 */}
          {isRegisterConfirmVisible && (
            <View style={[StyleSheet.absoluteFill, styles.customAlertOverlay, { zIndex: 9999, elevation: 9999 }]}>
              <View style={styles.customAlertBox}>
                <View style={[styles.alertIconBox, { backgroundColor: '#EEF3FB' }]}>
                  <Ionicons name="medical" size={48} color={main_navy} />
                </View>
                <Text style={styles.customAlertTitle}>복약일정에 추가하기</Text>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: main_navy, textAlign: 'center' }}>{medicineDetail?.name}</Text>
                  <Text style={{ fontSize: 18, color: '#555', textAlign: 'center' }}>복약일정에 추가하시겠습니까?{'\n'}</Text>
                </View>

                <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#333', alignSelf: 'flex-start' }}>복용 시간</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setShowRegTimePicker(true)}>
                  <Text style={styles.selectText}>{formatTime(regTime)}</Text>
                  <Ionicons name="time-outline" size={22} color={main_navy} />
                </TouchableOpacity>
                {showRegTimePicker && Platform.OS === 'ios' && (
                  <View style={styles.pickerBox}>
                    <DateTimePicker 
                      value={regTime} 
                      mode="time" 
                      display="spinner" 
                      locale="ko-KR" 
                      onChange={(e, d) => d && setRegTime(d)} 
                    />
                    <TouchableOpacity style={styles.pickerConfirmBtn} onPress={() => setShowRegTimePicker(false)}>
                      <Text style={styles.pickerConfirmText}>선택 완료</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#333', alignSelf: 'flex-start' }}>복용 개수 및 기간</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => setRegCount(Math.max(1, regCount - 1))}>
                    <Ionicons name="remove" size={20} color={main_navy} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{regCount}정</Text>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => setRegCount(regCount + 1)}>
                    <Ionicons name="add" size={20} color={main_navy} />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => setRegDays(Math.max(1, regDays - 1))}>
                    <Ionicons name="remove" size={20} color={main_navy} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{regDays}일</Text>
                  <TouchableOpacity style={styles.counterBtn} onPress={() => setRegDays(regDays + 1)}>
                    <Ionicons name="add" size={20} color={main_navy} />
                  </TouchableOpacity>
                </View>

                <View style={styles.alertBtnRow}>
                  <TouchableOpacity style={[styles.alertBtn, { backgroundColor: '#EEE' }]} onPress={() => setIsRegisterConfirmVisible(false)}>
                    <Text style={[styles.alertBtnText, { color: '#555' }]}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.alertBtn, { backgroundColor: main_navy }]} onPress={handleRegisterMedication} disabled={isRegistering}>
                    {isRegistering ? <ActivityIndicator color="#FFF" /> : <Text style={styles.alertBtnText}>추가하기</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* ───── 사진 확인 모달 ───── */}
      <Modal visible={isConfirmVisible} transparent animationType="slide">
        <View style={styles.photoConfirmOverlay}>
          <View style={styles.photoConfirmBox}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsConfirmVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>사진 분석 결과</Text>
              <View style={{ width: 28 }} />
            </View>
            {capturedImageUri && (
              <View style={styles.imageBox}>
                <Image source={{ uri: capturedImageUri }} style={styles.pillImage} resizeMode="contain" />
              </View>
            )}
            <Text style={styles.medicineName}>{selectedMedicine?.name}</Text>
            <View style={styles.photoConfirmQuestion}>
              <Text style={styles.confirmQuestionText}>이 약이 맞습니까?</Text>
              <View style={styles.photoBtns}>
                <TouchableOpacity style={styles.confirmYesBtn} onPress={handleConfirmYes}>
                  <Text style={styles.confirmYesBtnText}>예</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmNoBtn} onPress={handleConfirmNo}>
                  <Text style={styles.confirmNoBtnText}>아니오</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🌟 3. 커스텀 완료/오류 알림 (가짜 모달 - View로 교체) 🌟 */}
      {isAlertVisible && (
        <View style={[StyleSheet.absoluteFill, styles.customAlertOverlay, { zIndex: 99999, elevation: 99999 }]}>
          <View style={styles.customAlertBox}>
            <View style={[styles.alertIconBox, { backgroundColor: alertType === 'success' ? '#E8F8EF' : '#FEE8E8' }]}>
              <Ionicons
                name={alertType === 'success' ? 'checkmark-circle' : 'close-circle'}
                size={48}
                color={alertType === 'success' ? green : red_point}
              />
            </View>
            <Text style={styles.customAlertTitle}>{alertTitle}</Text>
            <Text style={styles.customAlertMessage}>{alertMessage}</Text>

            {showPillscheduleBtn ? (
              <View style={styles.alertBtnRow}>
                <TouchableOpacity style={[styles.alertBtn, { backgroundColor: '#EEE' }]} onPress={() => { setIsAlertVisible(false); setIsDetailVisible(false); }}>
                  <Text style={[styles.alertBtnText, { color: '#555' }]}>확인</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alertBtn, { backgroundColor: main_navy }]}
                  onPress={() => { setIsAlertVisible(false); setIsDetailVisible(false); router.push('/(tabs)/pillschedule' as any); }}
                >
                  <Text style={styles.alertBtnText}>복약일정 보기</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.alertBtn, { width: '100%', backgroundColor: main_navy }]} onPress={() => { setIsAlertVisible(false); setIsDetailVisible(false); }}>
                <Text style={styles.alertBtnText}>확인</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({

  backBtn: {
    padding: 4,
  },
  scrollHintBox: { alignItems: 'center', paddingVertical: 12, gap: 6 },
  scrollHint: { textAlign: 'center', color: main_navy, fontSize: 18, fontWeight: '600', lineHeight: 28 },
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: main_navy },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 20, marginBottom: 20 },
  searchInput: { flex: 1, fontSize: 16, color: '#000' },
  photoSearchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 },
  photoSearchText: { fontSize: 18, fontWeight: 'bold', color: main_navy },
  resultContainer: { flex: 1.8 },
  resultCount: { fontSize: 16, fontWeight: 'bold', color: main_navy, paddingHorizontal: 20, marginBottom: 8 },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  resultName: { flex: 1, fontSize: 20, color: '#111', marginRight: 10 },
  selectBtn: { backgroundColor: main_navy, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  selectBtnText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#888' },
  modalOverlay: { flex: 1, backgroundColor: '#FFF' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: main_navy },
  detailContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 },
  medicineName: { fontSize: 22, fontWeight: 'bold', color: '#111', marginBottom: 16, textAlign: 'center' },
  imageBox: { width: '100%', aspectRatio: 1.4, borderWidth: 1, borderColor: '#EEE', borderRadius: 16, overflow: 'hidden', marginBottom: 20, justifyContent: 'center', alignItems: 'center' },
  pillImage: { width: '100%', height: '100%' },
  infoCard: { backgroundColor: light_navy, borderRadius: 14, padding: 18, marginBottom: 12 },
  infoLabel: { fontSize: 14, fontWeight: 'bold', color: main_navy, marginBottom: 6 },
  infoValue: { fontSize: 16, color: '#333', lineHeight: 24 },
  registerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: main_navy, paddingVertical: 18, borderRadius: 15, marginTop: 20 },
  registerBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  photoConfirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  photoConfirmBox: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  photoConfirmQuestion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#DDD', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, marginTop: 16 },
  confirmQuestionText: { fontSize: 18, fontWeight: '600', color: '#111' },
  photoBtns: { flexDirection: 'row', gap: 12 },
  confirmYesBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: main_navy, borderRadius: 10 },
  confirmYesBtnText: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  confirmNoBtn: { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1.5, borderColor: red_point, borderRadius: 10 },
  confirmNoBtnText: { fontSize: 18, fontWeight: 'bold', color: red_point },
  alertBtnRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 4 },
  customAlertOverlay: { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  customAlertBox: { backgroundColor: '#FFF', borderRadius: 24, padding: 28, width: '82%', alignItems: 'center', gap: 12, overflow: 'visible', paddingVertical: 40 },
  alertIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  customAlertTitle: { fontSize: 22, fontWeight: 'bold', color: '#111', textAlign: 'center' },
  customAlertMessage: { fontSize: 17, color: '#555', textAlign: 'center', lineHeight: 28 },
  alertBtn: { flex: 1, backgroundColor: main_navy, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 49 },
  alertBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 18, color: main_navy, fontWeight: 'bold' },
  selectBox: { backgroundColor: light_navy, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  selectText: { fontSize: 16, color: '#111' },
  pickerBox: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', borderRadius: 12, marginTop: 8, alignItems: 'center', padding: 10, width: '100%', height: 200, overflow: 'hidden' },
  pickerConfirmBtn: { backgroundColor: main_navy, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 10, marginTop: 8 },
  pickerConfirmText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  counterBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: main_navy, alignItems: 'center', justifyContent: 'center' },
  counterValue: { fontSize: 18, fontWeight: 'bold', color: '#111', minWidth: 50, textAlign: 'center' },
});