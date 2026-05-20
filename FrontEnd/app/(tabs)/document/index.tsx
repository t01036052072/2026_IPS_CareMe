import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  FlatList, Modal, TextInput, ActionSheetIOS, Platform, ScrollView,
  ActivityIndicator, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api/api';

const main_navy = '#00246D';
const light_navy = '#F1F4F9';

const PERIOD_OPTIONS = ['3개월', '6개월', '1년', '전체'];
const SORT_OPTIONS = ['최신순으로 정렬', '오래된순으로 정렬'];

interface Document {
  id: number;
    hospital?: string; 
  title?: string;
  hospital_name: string;
  date?: string; 
  upload_date: string;
  type?: string; 
  doc_type?: string;
  image_url?: string;
  simplified_text?: string;
  medication_info?: string;
  analysis_result?: string;
  content?: string;
}

const parseDate = (dateStr: string) => {
  if (!dateStr) return new Date(0);
  const cleaned = dateStr.replace(/\./g, '-');
  return new Date(cleaned);
};

const filterByPeriod = (docs: Document[], period: string) => {
  if (period === '전체') return docs;
  const now = new Date();
  const months = period === '3개월' ? 3 : period === '6개월' ? 6 : 12;
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  return docs.filter(d => parseDate(d.upload_date) >= cutoff);
};

export default function DocumentScreen() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState('전체');
  const [selectedSort, setSelectedSort] = useState('최신순으로 정렬');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // 등록 모달
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hospitalName, setHospitalName] = useState('');
  const [diagnosisFile, setDiagnosisFile] = useState<string | null>(null);
  const [prescriptionFile, setPrescriptionFile] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 상세 모달
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [detailItem, setDetailItem] = useState<Document | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // 경고창
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  const getToken = async () => await AsyncStorage.getItem('access_token');

  const todayStr = (date: Date) =>
    `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;

  // ───── 문서 목록 조회 ─────
  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
          console.log('문서 조회 시작');  

      const response = await apiClient.get('/friend/doc/documents/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // 응답이 배열이면 바로 사용, 아니면 빈 배열
      console.log('문서 응답:', response.data); 
      const data = Array.isArray(response.data) ? response.data : response.data?.results || response.data?.documents || [];
       
  console.log('파싱된 데이터:', data);
      setDocuments(data);
    } catch (error: any) {
      console.log('문서 목록 조회 실패:', error.message);
    console.log('문서 에러 응답:', error.response?.data); 
      console.log('문서 목록 조회 실패:', error.message);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ───── 상세 조회 ─────
  const handleOpenDetail = async (item: Document) => {
    setDetailItem(item);
    setIsDetailVisible(true);
    setIsDetailLoading(true);
    try {
      const token = await getToken();
      const response = await apiClient.get(`/friend/doc/documents/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDetailItem(response.data);
    } catch (error: any) {
      console.log('상세 조회 실패:', error.message);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // ───── 이미지 피커 ─────
  const handlePickImage = async (type: 'diagnosis' | 'prescription') => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['취소', '사진 촬영', '사진 선택'], cancelButtonIndex: 0 },
        async (buttonIndex) => {
          if (buttonIndex === 0) return;
          let result;
          if (buttonIndex === 1) {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') { setAlertMsg('카메라 권한을 허용해주세요.'); setIsAlertVisible(true); return; }
            result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
          } else {
            result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
          }
          if (!result.canceled && result.assets[0].uri) {
            if (type === 'diagnosis') setDiagnosisFile(result.assets[0].uri);
            else setPrescriptionFile(result.assets[0].uri);
          }
        }
      );
    }
  };

  // ───── 문서 업로드 ─────
  const handleRegister = async () => {
    if (!diagnosisFile && !prescriptionFile) {
      setAlertMsg('진단서 또는 처방전을\n등록해주세요.');
      setIsAlertVisible(true);
      return;
    }

    setIsUploading(true);
    try {
      const token = await getToken();
      const uploadFile = async (uri: string, docType: string) => {
        const formData = new FormData();
        formData.append('file', { uri, type: 'image/jpeg', name: 'document.jpg' } as any);
        formData.append('doc_type', docType);
        formData.append('upload_date', todayStr(selectedDate));
        if (hospitalName.trim()) formData.append('hospital_name', hospitalName.trim());

        await apiClient.post('/friend/doc/documents/upload', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      };

      if (diagnosisFile) await uploadFile(diagnosisFile, 'diagnosis');
      if (prescriptionFile) await uploadFile(prescriptionFile, 'prescription');

      setIsModalVisible(false);
      setHospitalName('');
      setDiagnosisFile(null);
      setPrescriptionFile(null);
      setSelectedDate(new Date());
      fetchDocuments(); // 목록 새로고침
    } catch (error: any) {
      console.log('업로드 실패:', error.message);
      setAlertMsg('업로드에 실패했습니다.\n다시 시도해주세요.');
      setIsAlertVisible(true);
    } finally {
      setIsUploading(false);
    }
  };

  // ───── 문서 삭제 ─────
  const handleDelete = async (id: number) => {
    try {
      const token = await getToken();
      await apiClient.delete(`/friend/doc/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsDetailVisible(false);
      fetchDocuments();
    } catch (error: any) {
      console.log('삭제 실패:', error.message);
      setAlertMsg('삭제에 실패했습니다.');
      setIsAlertVisible(true);
    }
  };

  const closeDropdowns = () => { setShowPeriodDropdown(false); setShowSortDropdown(false); };

  const filteredDocs = filterByPeriod(documents, selectedPeriod)
    .slice()
    .sort((a, b) => {
      const diff = parseDate(a.upload_date).getTime() - parseDate(b.upload_date).getTime();
      return selectedSort === '최신순으로 정렬' ? -diff : diff;
    });

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={32} color={main_navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>문서 관리</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 필터 */}
      <View style={styles.filterRow}>
        <View style={styles.dropdownWrapper}>
          <TouchableOpacity style={styles.dropdownBtn} onPress={() => { setShowPeriodDropdown(!showPeriodDropdown); setShowSortDropdown(false); }}>
            <Text style={styles.dropdownBtnText}>{selectedPeriod}</Text>
            <Ionicons name="chevron-down" size={24} color="#FFF" />
          </TouchableOpacity>
          {showPeriodDropdown && (
            <View style={styles.dropdownList}>
              {PERIOD_OPTIONS.map(option => (
                <TouchableOpacity key={option} style={styles.dropdownItem} onPress={() => { setSelectedPeriod(option); setShowPeriodDropdown(false); }}>
                  <Text style={[styles.dropdownItemText, selectedPeriod === option && styles.dropdownItemActive]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <View style={styles.dropdownWrapper}>
          <TouchableOpacity style={styles.dropdownBtn} onPress={() => { setShowSortDropdown(!showSortDropdown); setShowPeriodDropdown(false); }}>
            <Text style={styles.dropdownBtnText}>{selectedSort}</Text>
            <Ionicons name="chevron-down" size={24} color="#FFF" />
          </TouchableOpacity>
          {showSortDropdown && (
            <View style={styles.dropdownList}>
              {SORT_OPTIONS.map(option => (
                <TouchableOpacity key={option} style={styles.dropdownItem} onPress={() => { setSelectedSort(option); setShowSortDropdown(false); }}>
                  <Text style={[styles.dropdownItemText, selectedSort === option && styles.dropdownItemActive]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* 문서 목록 */}
      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={main_navy} />
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          onScrollBeginDrag={closeDropdowns}
          renderItem={({ item }) => (
  <TouchableOpacity style={styles.card} onPress={() => handleOpenDetail(item)}>
    <Text style={styles.cardDate}>{item.date || item.upload_date}</Text>
    <Text style={styles.cardTitle}>{item.hospital || item.hospital_name || '병원명 없음'}</Text>
    {item.type && (
      <View style={styles.docTypeBadge}>
        <Text style={styles.docTypeText}>
          {item.type === 'diagnose' ? '진단서' : item.type === 'prescription' ? '처방전' : item.type}
        </Text>
      </View>
    )}
  </TouchableOpacity>
)}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>등록된 문서가 없습니다</Text>
            </View>
          }
          ListFooterComponent={
            <View style={{ marginTop: 16 }}>
              <Text style={styles.hint}>상자를 클릭하면{'\n'}자세히 볼 수 있어요 !</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalVisible(true)}>
                <Text style={styles.addBtnText}>새로운 문서 등록하기</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ───── 등록 모달 ───── */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>등록하기</Text>
              <TouchableOpacity onPress={() => { setIsModalVisible(false); setHospitalName(''); setDiagnosisFile(null); setPrescriptionFile(null); setSelectedDate(new Date()); }}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={22} color={main_navy} />
              <Text style={styles.dateText}>{todayStr(selectedDate)}</Text>
              <Text style={styles.dateChangeHint}>변경하기</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <View style={styles.datePickerBox}>
                <DateTimePicker value={selectedDate} mode="date" display="spinner" onChange={(e, d) => d && setSelectedDate(d)} />
                <TouchableOpacity style={styles.datePickerConfirmBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerConfirmText}>선택 완료</Text>
                </TouchableOpacity>
              </View>
            )}

            <TextInput style={styles.inputBox} placeholder="병원 이름 입력" placeholderTextColor="#AAA" value={hospitalName} onChangeText={setHospitalName} />

            <TouchableOpacity style={styles.fileRow} onPress={() => handlePickImage('diagnosis')}>
              <Text style={styles.fileLabel}>진단서 등록</Text>
              <Text style={[styles.fileBtn, diagnosisFile ? styles.fileBtnDone : {}]}>{diagnosisFile ? '등록 완료' : '등록하기'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.fileRow} onPress={() => handlePickImage('prescription')}>
              <Text style={styles.fileLabel}>처방전 또는 약봉투 등록</Text>
              <Text style={[styles.fileBtn, prescriptionFile ? styles.fileBtnDone : {}]}>{prescriptionFile ? '등록 완료' : '등록하기'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={isUploading}>
              {isUploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.registerBtnText}>등록</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={isAlertVisible} transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>{alertMsg}</Text>
              <TouchableOpacity style={styles.alertBtn} onPress={() => setIsAlertVisible(false)}>
                <Text style={styles.alertBtnText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Modal>

      {/* ───── 상세 모달 ───── */}
      <Modal visible={isDetailVisible} transparent animationType="slide">
        <View style={styles.detailOverlay}>
          <SafeAreaView style={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={() => setIsDetailVisible(false)}>
                <Ionicons name="chevron-back" size={28} color={main_navy} />
              </TouchableOpacity>
              <Text style={styles.detailTitle}>{detailItem?.hospital_name || '문서 상세'}</Text>
              <TouchableOpacity onPress={() => {
                setAlertMsg('이 문서를 삭제하시겠습니까?');
                setIsAlertVisible(true);
              }}>
                <Ionicons name="trash-outline" size={24} color={red} />
              </TouchableOpacity>
            </View>

            {isDetailLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={main_navy} />
                <Text style={{ color: main_navy, marginTop: 12 }}>분석 중...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.detailContent}>
                {/* 원본 이미지 보기 */}
                {detailItem?.image_url && (
                  <TouchableOpacity style={styles.originalBtn}>
                    <Text style={styles.originalBtnText}>원본 보기</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.detailDateRow}>
                  <Ionicons name="calendar-outline" size={20} color={main_navy} />
                  <Text style={styles.detailDate}>{detailItem?.upload_date}</Text>
                </View>

                {/* 진단서 내용 */}
                {detailItem?.simplified_text && (
                  <>
                    <View style={styles.tagBox}><Text style={styles.tagText}>진단서</Text></View>
                    <View style={styles.contentBox}>
                      <Text style={styles.contentText}>{detailItem.simplified_text}</Text>
                    </View>
                  </>
                )}

                {/* 처방약 정보 */}
                {detailItem?.medication_info && (
                  <>
                    <View style={styles.tagBox}><Text style={styles.tagText}>처방약</Text></View>
                    <View style={styles.contentBox}>
                      <Text style={styles.contentText}>{detailItem.medication_info}</Text>
                    </View>
                  </>
                )}

                {/* 분석 결과 */}
                {detailItem?.analysis_result && (
                  <>
                    <View style={styles.tagBox}><Text style={styles.tagText}>분석 결과</Text></View>
                    <View style={styles.contentBox}>
                      <Text style={styles.contentText}>{detailItem.analysis_result}</Text>
                    </View>
                  </>
                )}

                {/* 내용 없을 때 */}
                {!detailItem?.simplified_text && !detailItem?.medication_info && !detailItem?.analysis_result && (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>등록된 진단서 또는 처방전이 없습니다.</Text>
                    <TouchableOpacity style={styles.addMoreBtn} onPress={() => { setIsDetailVisible(false); setIsModalVisible(true); }}>
                      <Text style={styles.addMoreBtnText}>추가 등록하기</Text>
                    </TouchableOpacity>
                    <Text style={styles.addMoreHint}>진단서나 처방전을 등록해주시면{'\n'}더 자세한 내용을 확인하실 수 있어요</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </SafeAreaView>
        </View>

        {/* 삭제 확인 경고창 */}
        <Modal visible={isAlertVisible} transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>{alertMsg}</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={[styles.alertBtn, { backgroundColor: '#888' }]} onPress={() => setIsAlertVisible(false)}>
                  <Text style={styles.alertBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.alertBtn} onPress={() => { setIsAlertVisible(false); if (detailItem) handleDelete(detailItem.id); }}>
                  <Text style={styles.alertBtnText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Modal>

    </SafeAreaView>
  );
}

const red = '#C0392B';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: main_navy },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, gap: 10, zIndex: 10 },
  dropdownWrapper: { position: 'relative' },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: main_navy, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, gap: 6 },
  dropdownBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  dropdownList: { position: 'absolute', top: 44, left: 0, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E0E0E0', zIndex: 100, minWidth: 180, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownItemText: { fontSize: 18, color: '#333' },
  dropdownItemActive: { color: main_navy, fontWeight: 'bold' },

  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  card: { backgroundColor: light_navy, borderRadius: 16, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: '#DDE6F5' },
  cardDate: { fontSize: 14, color: main_navy, marginBottom: 8, fontWeight: '600' },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#111' },
  docTypeBadge: { marginTop: 8, backgroundColor: main_navy, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  docTypeText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },

  hint: { textAlign: 'center', color: main_navy, fontSize: 18, fontWeight: '600', marginTop: 10, lineHeight: 24, marginBottom: 16 },
  addBtn: { backgroundColor: main_navy, padding: 20, borderRadius: 15, alignItems: 'center' },
  addBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 28, width: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#111' },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dateText: { fontSize: 18, color: '#333', fontWeight: '500' },
  dateChangeHint: { fontSize: 14, color: main_navy, marginLeft: 6, textDecorationLine: 'underline' },
  datePickerBox: { backgroundColor: '#F5F5F5', borderRadius: 12, marginBottom: 12, alignItems: 'center', padding: 10 },
  datePickerConfirmBtn: { backgroundColor: main_navy, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 10, marginTop: 8 },
  datePickerConfirmText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  inputBox: { borderWidth: 1.5, borderColor: main_navy, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, fontSize: 16, color: '#000', marginBottom: 20 },
  fileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  fileLabel: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  fileBtn: { fontSize: 16, color: main_navy, fontWeight: 'bold', textDecorationLine: 'underline' },
  fileBtnDone: { color: '#4CAF50' },

  registerBtn: { backgroundColor: main_navy, paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginTop: 24 },
  registerBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 28, width: '75%', alignItems: 'center', gap: 12 },
  alertText: { fontSize: 17, fontWeight: 'bold', textAlign: 'center', color: '#111', lineHeight: 26 },
  alertBtn: { backgroundColor: main_navy, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 15 },
  alertBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  detailOverlay: { flex: 1, backgroundColor: '#FFF' },
  detailContainer: { flex: 1 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  detailTitle: { fontSize: 20, fontWeight: 'bold', color: main_navy },
  detailContent: { padding: 20 },

  originalBtn: { backgroundColor: '#7B9FE0', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginBottom: 20 },
  originalBtnText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },

  detailDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  detailDate: { fontSize: 22, fontWeight: 'bold', color: '#111' },

  tagBox: { backgroundColor: main_navy, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  tagText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  contentBox: { backgroundColor: light_navy, borderRadius: 12, padding: 18, marginBottom: 20 },
  contentText: { fontSize: 16, color: '#111', lineHeight: 26 },

  emptyBox: { alignItems: 'center', paddingTop: 30 },
  emptyText: { fontSize: 16, color: '#888', marginBottom: 20 },
  addMoreBtn: { backgroundColor: main_navy, paddingVertical: 14, paddingHorizontal: 30, borderRadius: 15, marginBottom: 12 },
  addMoreBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  addMoreHint: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
});

