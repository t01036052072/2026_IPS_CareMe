import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  FlatList, Modal, TextInput, ActionSheetIOS, Platform, ScrollView,
  ActivityIndicator, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api/api';
import Back from "../../../assets/images/LoginScreen/back.svg";

const main_navy = '#00246D';
const light_navy = '#F1F4F9';
const DOCUMENT_MAX_SIDE = 1600;
const DOCUMENT_JPEG_QUALITY = 0.7;

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

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [hospitalName, setHospitalName] = useState('');
  const [diagnosisFile, setDiagnosisFile] = useState<string | null>(null);
  const [prescriptionFile, setPrescriptionFile] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [detailItem, setDetailItem] = useState<Document | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  const getToken = async () => await AsyncStorage.getItem('access_token');

  const todayStr = (date: Date) =>
    `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;

  const compressDocumentImage = async (asset: ImagePicker.ImagePickerAsset) => {
    const { uri, width = 0, height = 0 } = asset;
    const maxSide = Math.max(width, height);
    const actions: ImageManipulator.Action[] = [];

    if (maxSide > DOCUMENT_MAX_SIDE) {
      const ratio = DOCUMENT_MAX_SIDE / maxSide;
      actions.push({
        resize: {
          width: Math.round(width * ratio),
          height: Math.round(height * ratio),
        },
      });
    }

    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: DOCUMENT_JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    return result.uri;
  };

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const response = await apiClient.get('/friend/doc/documents/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(response.data) ? response.data : response.data?.results || response.data?.documents || [];
      setDocuments(data);
    } catch (error: any) {
      console.log('문서 목록 조회 실패:', error.message);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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
            result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
          } else {
            result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
          }
          if (!result.canceled && result.assets[0].uri) {
            const compressedUri = await compressDocumentImage(result.assets[0]);
            if (type === 'diagnosis') setDiagnosisFile(compressedUri);
            else setPrescriptionFile(compressedUri);
          }
        }
      );
    }
  };

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
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
      };
      if (diagnosisFile) await uploadFile(diagnosisFile, 'diagnosis');
      if (prescriptionFile) await uploadFile(prescriptionFile, 'prescription');
      setIsModalVisible(false);
      setHospitalName('');
      setDiagnosisFile(null);
      setPrescriptionFile(null);
      setSelectedDate(new Date());
      fetchDocuments();
    } catch (error: any) {
      console.log('업로드 실패:', error.message);
      setAlertMsg('업로드에 실패했습니다.\n다시 시도해주세요.');
      setIsAlertVisible(true);
    } finally {
      setIsUploading(false);
    }
  };

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Back width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>문서 관리</Text>
        <View style={{ width: 28 }} />
      </View>

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
            // ✅ 카드 전체 + 바로가기 버튼 명확하게
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardDate}>{item.upload_date || item.date}</Text>
                <Text style={styles.cardTitle}>{item.hospital_name || item.hospital || '병원명 없음'}</Text>
                {(item.doc_type || item.type) && (
                  <View style={styles.docTypeBadge}>
                    <Text style={styles.docTypeText}>
                      {(item.doc_type === 'diagnosis' || item.type === 'diagnose') ? '진단서' :
                       (item.doc_type === 'prescription' || item.type === 'prescription') ? '처방전' :
                       (item.doc_type || item.type)}
                    </Text>
                  </View>
                )}
              </View>
              {/* ✅ 명확한 버튼 형태로 변경 */}
              <TouchableOpacity style={styles.goBtn} onPress={() => handleOpenDetail(item)}>
                <Text style={styles.goBtnText}>바로가기</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { marginBottom: 30, fontSize: 20 }]}>등록된 문서가 없습니다</Text>
              <TouchableOpacity style={[styles.addBtn, { width: '100%' }]} onPress={() => setIsModalVisible(true)}>
                <Text style={styles.addBtnText}>새로운 문서 등록하기</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            filteredDocs.length > 0 ? (
              <View style={{ marginTop: 16 }}>
                {/* ✅ 스크롤 힌트 추가 */}
                <Text style={styles.hint}>문서를 선택하면{'\n'}자세한 내용을 확인할 수 있어요 ↑</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalVisible(true)}>
                  <Text style={styles.addBtnText}>새로운 문서 등록하기</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* ───── 등록 모달 ───── */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>문서 등록하기</Text>
              <TouchableOpacity onPress={() => { setIsModalVisible(false); setHospitalName(''); setDiagnosisFile(null); setPrescriptionFile(null); setSelectedDate(new Date()); }}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={22} color={main_navy} />
              <Text style={styles.dateText}>{todayStr(selectedDate)}</Text>
              {/* ✅ 라이팅 변경: 질문형 → 행동형 */}
              <View style={styles.dateChangeBtn}>
                <Text style={styles.dateChangeBtnText}>날짜 변경</Text>
              </View>
            </TouchableOpacity>
            {showDatePicker && (
              <View style={styles.datePickerBox}>
                <DateTimePicker value={selectedDate} mode="date" display="spinner" locale="ko-KR" onChange={(e, d) => d && setSelectedDate(d)} />
                <TouchableOpacity style={styles.datePickerConfirmBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerConfirmText}>선택 완료</Text>
                </TouchableOpacity>
              </View>
            )}

            <TextInput style={styles.inputBox} placeholder="병원 이름을 입력해주세요" placeholderTextColor="#AAA" value={hospitalName} onChangeText={setHospitalName} />

            {/* ✅ 파일 등록 버튼 명확한 버튼 형태로 변경 */}
            <TouchableOpacity style={styles.fileRow} onPress={() => handlePickImage('diagnosis')}>
              <Text style={styles.fileLabel}>진단서</Text>
              <View style={[styles.fileActionBtn, diagnosisFile ? styles.fileActionBtnDone : {}]}>
                <Text style={styles.fileActionBtnText}>{diagnosisFile ? '등록 완료 ✓' : '사진 등록하기'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.fileRow} onPress={() => handlePickImage('prescription')}>
              <Text style={styles.fileLabel}>처방전 / 약봉투</Text>
              <View style={[styles.fileActionBtn, prescriptionFile ? styles.fileActionBtnDone : {}]}>
                <Text style={styles.fileActionBtnText}>{prescriptionFile ? '등록 완료 ✓' : '사진 등록하기'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} disabled={isUploading}>
              {isUploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.registerBtnText}>문서 등록 완료</Text>}
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
                  <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Back width={24} height={24} />
        </TouchableOpacity>
              <Text style={styles.detailTitle}>{detailItem?.hospital_name || '문서 상세'}</Text>
              <TouchableOpacity style={styles.deleteIconBtn} onPress={() => {
                setAlertMsg('이 문서를 삭제하시겠습니까?');
                setIsAlertVisible(true);
              }}>
                <Ionicons name="trash-outline" size={24} color={red} />
              </TouchableOpacity>
            </View>

            {isDetailLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={main_navy} />
                <Text style={{ color: main_navy, marginTop: 12, fontSize: 18 }}>문서를 불러오는 중...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.detailContent}>
                {detailItem?.image_url && (
                  <TouchableOpacity style={styles.originalBtn}>
                    <Text style={styles.originalBtnText}>원본 이미지 보기</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.detailDateRow}>
                  <Ionicons name="calendar-outline" size={22} color={main_navy} />
                  <Text style={styles.detailDate}>{detailItem?.upload_date}</Text>
                </View>

                {detailItem?.simplified_text && (
                  <>
                    <View style={styles.tagBox}><Text style={styles.tagText}>진단서 내용</Text></View>
                    <View style={styles.contentBox}>
                      <Text style={styles.contentText}>{detailItem.simplified_text}</Text>
                    </View>
                  </>
                )}

                {detailItem?.medication_info && (
                  <>
                    <View style={styles.tagBox}><Text style={styles.tagText}>처방약 정보</Text></View>
                    <View style={styles.contentBox}>
                      <Text style={styles.contentText}>{detailItem.medication_info}</Text>
                    </View>
                  </>
                )}

                {detailItem?.analysis_result && (
                  <>
                    <View style={styles.tagBox}><Text style={styles.tagText}>분석 결과</Text></View>
                    <View style={styles.contentBox}>
                      <Text style={styles.contentText}>{detailItem.analysis_result}</Text>
                    </View>
                  </>
                )}

                {!detailItem?.simplified_text && !detailItem?.medication_info && !detailItem?.analysis_result && (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>등록된 진단서 또는 처방전이 없습니다.</Text>
                    <TouchableOpacity style={styles.addMoreBtn} onPress={() => { setIsDetailVisible(false); setIsModalVisible(true); }}>
                      <Text style={styles.addMoreBtnText}>문서 추가 등록하기</Text>
                    </TouchableOpacity>
                    <Text style={styles.addMoreHint}>진단서나 처방전을 등록하시면{'\n'}더 자세한 내용을 확인하실 수 있어요</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </SafeAreaView>
        </View>

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
  dropdownItem: { paddingVertical: 14, paddingHorizontal: 16 },
  dropdownItemText: { fontSize: 18, color: '#333' },
  dropdownItemActive: { color: main_navy, fontWeight: 'bold' },

  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },

  // ✅ 카드: 가로 레이아웃으로 변경
  card: { backgroundColor: light_navy, borderRadius: 16, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: '#DDE6F5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1, marginRight: 12 },
  cardDate: { fontSize: 14, color: main_navy, marginBottom: 6, fontWeight: '600' },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#111', marginBottom: 6 },
  docTypeBadge: { backgroundColor: main_navy, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  docTypeText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },

  // ✅ 바로가기 버튼
  goBtn: { backgroundColor: main_navy, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  goBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  hint: { textAlign: 'center', color: main_navy, fontSize: 18, fontWeight: '600', marginTop: 10, lineHeight: 28, marginBottom: 16 },
  addBtn: { backgroundColor: main_navy, padding: 20, borderRadius: 15, alignItems: 'center' },
  addBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 28, width: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#111' },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dateText: { fontSize: 18, color: '#333', fontWeight: '500', flex: 1 },
  // ✅ 날짜 변경 버튼 형태로
  dateChangeBtn: { backgroundColor: light_navy, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: main_navy },
  dateChangeBtnText: { color: main_navy, fontSize: 14, fontWeight: 'bold' },

  datePickerBox: { backgroundColor: '#F5F5F5', borderRadius: 12, marginBottom: 12, alignItems: 'center', padding: 10 },
  datePickerConfirmBtn: { backgroundColor: main_navy, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 10, marginTop: 8 },
  datePickerConfirmText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  inputBox: { borderWidth: 1.5, borderColor: main_navy, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontSize: 18, color: '#000', marginBottom: 20 },

  fileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  fileLabel: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  // ✅ 파일 등록 버튼 형태로
  fileActionBtn: { backgroundColor: main_navy, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  fileActionBtnDone: { backgroundColor: '#2c822f' },
  fileActionBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },

  registerBtn: { backgroundColor: main_navy, paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginTop: 24 },
  registerBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 28, width: '75%', alignItems: 'center', gap: 12 },
  alertText: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#111', lineHeight: 28 },
  alertBtn: { backgroundColor: main_navy, paddingVertical: 14, paddingHorizontal: 30, borderRadius: 15 },
  alertBtnText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },

  detailOverlay: { flex: 1, backgroundColor: '#FFF' },
  detailContainer: { flex: 1 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  detailTitle: { fontSize: 20, fontWeight: 'bold', color: main_navy },
  deleteIconBtn: { padding: 4 },
  detailContent: { padding: 20 },

  originalBtn: { backgroundColor: '#7B9FE0', borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginBottom: 20 },
  originalBtnText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },

  detailDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  detailDate: { fontSize: 22, fontWeight: 'bold', color: '#111' },

  tagBox: { backgroundColor: main_navy, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  tagText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
  contentBox: { backgroundColor: light_navy, borderRadius: 12, padding: 18, marginBottom: 20 },
  contentText: { fontSize: 18, color: '#111', lineHeight: 30 },

  emptyBox: { alignItems: 'center', paddingTop: 30 },
  emptyText: { fontSize: 18, color: '#888', marginBottom: 20 },
  addMoreBtn: { backgroundColor: main_navy, paddingVertical: 16, paddingHorizontal: 30, borderRadius: 15, marginBottom: 12 },
  addMoreBtnText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
  addMoreHint: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 24 },
});
