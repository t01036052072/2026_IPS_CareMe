import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  TextInput, FlatList, Image, ActionSheetIOS, Platform,
  ActivityIndicator, ScrollView, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@/api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';


const main_navy = '#00246D';
const light_navy = '#F1F4F9';

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

  // 상세 모달
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [medicineDetail, setMedicineDetail] = useState<MedicineDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // 사진 확인 모달
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);

  // 복약일정 등록 확인 모달
  const [isRegisterConfirmVisible, setIsRegisterConfirmVisible] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // ───── 텍스트 검색 ─────
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
      console.error('텍스트 검색 실패:', error);
      Alert.alert('검색 실패', '검색 결과가 없습니다.');
      setSearchResults([]);
      setResultCount(0);
    } finally {
      setIsSearchLoading(false);
    }
  };

  // ───── 검색 결과 클릭 → 상세 모달 ─────
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
      console.error('상세 정보 조회 실패:', error);
      Alert.alert('오류', '상세 정보를 불러오지 못했습니다.');
      setIsDetailVisible(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // ───── 사진 분석 ─────
  const handleImageAnalyze = async (uri: string) => {
    setIsPhotoLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri, type: 'image/jpeg', name: 'pill.jpg' } as any);
      const analyzeRes = await apiClient.post('/pills/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const detectedId = analyzeRes.data.detected_id;
      const checkRes = await apiClient.get(`/pills/check/${detectedId}`);
      const data = checkRes.data.data;
      setSelectedMedicine({ id: String(data.id), name: data.pill_name });
      setCapturedImageUri(uri);
      setIsConfirmVisible(true);
    } catch (error) {
      console.error('사진 분석 실패:', error);
      Alert.alert('분석 실패', '사진 분석에 실패했습니다.');
    } finally {
      setIsPhotoLoading(false);
    }
  };

  // ───── 사진 검색 버튼 ─────
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
        await handleImageAnalyze(result.assets[0].uri);
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: ['취소', '사진 촬영', '사진 선택'], cancelButtonIndex: 0 }, openPicker);
    } else {
      Alert.alert('사진 검색', '선택해주세요', [
        { text: '사진 촬영', onPress: () => openPicker(1) },
        { text: '사진 선택', onPress: () => openPicker(2) },
        { text: '취소', style: 'cancel' },
      ]);
    }
  };

  // ───── 사진 확인 모달 - 예 버튼 ─────
  const handleConfirmYes = async () => {
    if (!selectedMedicine) return;
    setIsConfirmVisible(false);
    setIsDetailLoading(true);
    setIsDetailVisible(true);
    try {
      const res = await apiClient.get(`/pills/detail/${selectedMedicine.id}`);
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
      Alert.alert('오류', '상세 정보를 불러오지 못했습니다.');
      setIsDetailVisible(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // ───── 복약일정 등록 ─────
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

    await apiClient.post('/medications', {
      name: medicineDetail.name,
      period: '오전',
      time: '08:00',
      count: 1,
      duration_days: 7,
      start_date: toLocalDate(now),
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setIsRegisterConfirmVisible(false);
    setIsDetailVisible(false);
    Alert.alert('등록 완료', `${medicineDetail.name}이(가) 복약일정에 추가됐어요!`, [
      { text: '복약일정 보기', onPress: () => router.push('/(tabs)/pillschedule' as any) },
      { text: '확인', style: 'cancel' },
    ]);
  } catch (error: any) {
    console.log('복약일정 등록 실패:', error.message);
    Alert.alert('오류', '등록에 실패했습니다.');
  } finally {
    setIsRegistering(false);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/pill' as any)}>
          <Ionicons name="chevron-back" size={28} color={main_navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>의약품 검색</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 검색창 */}
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

      {/* 사진 검색 버튼 */}
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

      {/* 검색 결과 */}
      {hasSearched && (
        <View style={styles.resultContainer}>
          {resultCount > 0 && (
            <Text style={styles.resultCount}>검색결과 {resultCount}개</Text>
          )}
          <FlatList
            data={searchResults}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectMedicine(item)}>
                <Ionicons name="ellipse-outline" size={28} color="#CCC" style={{ marginRight: 14 }} />
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
            ListFooterComponent={
  searchResults.length > 0 ? (
    <View style={styles.scrollHintBox}>
      <Ionicons name="chevron-down" size={28} color={main_navy} />
      <Text style={styles.scrollHint}>아래로 내리면 더 많은 결과가 있어요</Text>
    </View>
  ) : null
}
          />
        </View>
      )}

      {/* ───── 상세 모달 ───── */}
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

                {/* ───── 복약일정 등록 버튼 ───── */}
                <TouchableOpacity
                  style={styles.registerBtn}
                  onPress={() => setIsRegisterConfirmVisible(true)}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#FFF" />
                  <Text style={styles.registerBtnText}>복약일정에 등록하기</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </SafeAreaView>
        </View>

        {/* ───── 복약일정 등록 확인 모달 ───── */}
        <Modal visible={isRegisterConfirmVisible} transparent animationType="fade">
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>복약일정에 추가하기</Text>
              <Text style={styles.confirmDesc}>
                <Text style={{ fontWeight: 'bold', color: main_navy }}>{medicineDetail?.name}</Text>
                {'\n'}복약일정에 추가하시겠습니까?
              </Text>
              <Text style={styles.confirmHint}>* 기본값: 오전 08:00, 1정, 7일{'\n'}복약일정에서 수정할 수 있어요</Text>
              <View style={styles.confirmBtns}>
                <TouchableOpacity
                  style={styles.confirmNoBtn}
                  onPress={() => setIsRegisterConfirmVisible(false)}
                >
                  <Text style={styles.confirmNoBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmYesBtn}
                  onPress={handleRegisterMedication}
                  disabled={isRegistering}
                >
                  {isRegistering
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={styles.confirmYesBtnText}>네, 추가할게요</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
                <TouchableOpacity style={styles.confirmNoBtn} onPress={() => setIsConfirmVisible(false)}>
                  <Text style={styles.confirmNoBtnText}>아니오</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: main_navy },

  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 20, marginBottom: 20 },
  searchInput: { flex: 1, fontSize: 16, color: '#000' },

  photoSearchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 },
  photoSearchText: { fontSize: 18, fontWeight: 'bold', color: main_navy },

  resultContainer: { flex: 1 },
  resultCount: { fontSize: 16, fontWeight: 'bold', color: main_navy, paddingHorizontal: 20, marginBottom: 8 },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  resultName: { flex: 1, fontSize: 18, color: '#111' },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#888' },

  // 상세 모달
  modalOverlay: { flex: 1, backgroundColor: '#FFF' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: main_navy },
  detailContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 },
  medicineName: { fontSize: 24, fontWeight: 'bold', color: '#111', marginBottom: 20, textAlign: 'center' },
  imageBox: { width: '100%', aspectRatio: 1.4, borderWidth: 1, borderColor: '#EEE', borderRadius: 16, overflow: 'hidden', marginBottom: 20, justifyContent: 'center', alignItems: 'center' },
  pillImage: { width: '100%', height: '100%' },
  infoCard: { backgroundColor: light_navy, borderRadius: 14, padding: 18, marginBottom: 12 },
  infoLabel: { fontSize: 14, fontWeight: 'bold', color: main_navy, marginBottom: 6 },
  infoValue: { fontSize: 16, color: '#333', lineHeight: 24 },

  // 복약일정 등록 버튼
  registerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: main_navy, paddingVertical: 18, borderRadius: 15, marginTop: 20 },
  registerBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  // 복약일정 등록 확인 모달
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { backgroundColor: '#FFF', borderRadius: 24, padding: 28, width: '85%', alignItems: 'center', gap: 12 },
  confirmTitle: { fontSize: 20, fontWeight: 'bold', color: main_navy },
  confirmDesc: { fontSize: 16, textAlign: 'center', color: '#333', lineHeight: 26 },
  confirmHint: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },
  confirmBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  confirmYesBtn: { flex: 1, backgroundColor: main_navy, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmYesBtnText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  confirmNoBtn: { flex: 1, borderWidth: 1.5, borderColor: '#DDD', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmNoBtnText: { fontSize: 16, fontWeight: 'bold', color: '#888' },

  // 사진 확인 모달
  photoConfirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  photoConfirmBox: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  photoConfirmQuestion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#DDD', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, marginTop: 16 },
  confirmQuestionText: { fontSize: 18, fontWeight: '600', color: '#111' },
  photoBtns: { flexDirection: 'row', gap: 12 },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 18, color: main_navy, fontWeight: 'bold' },
<<<<<<< HEAD
  selectBtn: { backgroundColor: main_navy, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
selectBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },

scrollHintBox: { alignItems: 'center', paddingVertical: 20, gap: 6 },
scrollHint: { textAlign: 'center', color: main_navy, fontSize: 18, fontWeight: '600', lineHeight: 28 },
})
=======
});
>>>>>>> a82666532023d860343f080b6f66516b390169b6
