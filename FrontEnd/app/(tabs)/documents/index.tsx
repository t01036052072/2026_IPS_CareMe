import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  FlatList, Modal, TextInput, ActionSheetIOS, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const main_navy = '#00246D';
const light_navy = '#F1F4F9';

// 백엔드 API
// POST /documents/upload (multipart/form-data)
// 요청: { file, doc_type: "diagnosis" | "prescription", upload_date: "YYYY.MM.DD" }
// 응답: { "status": "success", "document_id": 1 }
//
// 목록 조회: GET /documents (백엔드 담당자 확인 필요)
// 응답: [{ "id", "hospital_name", "upload_date", "doc_type", "image_url" }]
//
// 실제 연결 시 DUMMY_DOCUMENTS → API 응답으로 교체
// hospitalName → item.hospital_name
// date → item.upload_date

const DUMMY_DOCUMENTS = [
  { id: 1, date: '2026.04.28', hospitalName: '규린 이비인후과', diagnosisText: '상세불명의 좌측 검지 손가락뼈 부분 골절\n\n이 환자는 위와 같은 병명으로 타원에서 수술적 치료를 시행한 환자로 현재 손가락 관절 대활치료 중이며 본 진단서 발부일로부터 일주일 간 휴식과 안정을 기반으로한 치료를 요함.', prescriptionText: '대웅바이오에페리손정(에페리손염산염)\n모사린정(모사프리드시트르산염수화물)\n휴록스정(록소프로펜나트륨수화물)\n영일알마게이트정500밀리그램' },
  { id: 2, date: '2026.02.07', hospitalName: '정윤 내과', diagnosisText: null, prescriptionText: null },
  { id: 3, date: '2025.12.16', hospitalName: '가현 이비인후과', diagnosisText: null, prescriptionText: '아목시실린캡슐\n이부프로펜정' },
  { id: 4, date: '2025.11.30', hospitalName: '나경 정형외과', diagnosisText: '요추 추간판 탈출증', prescriptionText: null },
];

const PERIOD_OPTIONS = ['3개월', '6개월', '1년', '전체'];
const SORT_OPTIONS = ['최신순으로 정렬', '오래된순으로 정렬'];

// 날짜 문자열 "YYYY.MM.DD" → Date 객체
const parseDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('.').map(Number);
  return new Date(y, m - 1, d);
};

// 기간 필터
const filterByPeriod = (docs: typeof DUMMY_DOCUMENTS, period: string) => {
  if (period === '전체') return docs;
  const now = new Date();
  const months = period === '3개월' ? 3 : period === '6개월' ? 6 : 12;
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  return docs.filter(d => parseDate(d.date) >= cutoff);
};

export default function DocumentScreen() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState('6개월');
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
  const [detailItem, setDetailItem] = useState<typeof DUMMY_DOCUMENTS[0] | null>(null);

  // 경고창
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  const todayStr = (date: Date) =>
    `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;

  // 실제 이미지 피커
  const handlePickImage = async (type: 'diagnosis' | 'prescription') => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['취소', '사진 촬영', '사진 선택'], cancelButtonIndex: 0 },
        async (buttonIndex) => {
          if (buttonIndex === 0) return;
          let result;
          if (buttonIndex === 1) {
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

  const handleRegister = () => {
    if (!hospitalName.trim() && !diagnosisFile && !prescriptionFile) {
      setAlertMsg('병원 이름, 진단서, 처방전 중\n하나는 반드시 등록해주세요.');
      setIsAlertVisible(true);
      return;
    }
    // 실제 연결 시:
    // POST /documents/upload (multipart/form-data)
    // { file, doc_type: 'diagnosis' or 'prescription', upload_date: todayStr(selectedDate) }
    console.log('등록할 데이터:', { hospitalName, diagnosisFile, prescriptionFile, date: todayStr(selectedDate) });
    setIsModalVisible(false);
    setHospitalName('');
    setDiagnosisFile(null);
    setPrescriptionFile(null);
    setSelectedDate(new Date());
  };

  const closeDropdowns = () => {
    setShowPeriodDropdown(false);
    setShowSortDropdown(false);
  };

  // 정렬 + 필터 적용
  const filteredDocs = filterByPeriod(DUMMY_DOCUMENTS, selectedPeriod)
    .slice()
    .sort((a, b) => {
      const diff = parseDate(a.date).getTime() - parseDate(b.date).getTime();
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
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => { setShowPeriodDropdown(!showPeriodDropdown); setShowSortDropdown(false); }}
          >
            <Text style={styles.dropdownBtnText}>{selectedPeriod}</Text>
            <Ionicons name="chevron-down" size={24} color="#FFF" />
          </TouchableOpacity>
          {showPeriodDropdown && (
            <View style={styles.dropdownList}>
              {PERIOD_OPTIONS.map(option => (
                <TouchableOpacity key={option} style={styles.dropdownItem}
                  onPress={() => { setSelectedPeriod(option); setShowPeriodDropdown(false); }}>
                  <Text style={[styles.dropdownItemText, selectedPeriod === option && styles.dropdownItemActive]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.dropdownWrapper}>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => { setShowSortDropdown(!showSortDropdown); setShowPeriodDropdown(false); }}
          >
            <Text style={styles.dropdownBtnText}>{selectedSort}</Text>
            <Ionicons name="chevron-down" size={24} color="#FFF" />
          </TouchableOpacity>
          {showSortDropdown && (
            <View style={styles.dropdownList}>
              {SORT_OPTIONS.map(option => (
                <TouchableOpacity key={option} style={styles.dropdownItem}
                  onPress={() => { setSelectedSort(option); setShowSortDropdown(false); }}>
                  <Text style={[styles.dropdownItemText, selectedSort === option && styles.dropdownItemActive]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* 문서 목록 */}
      <FlatList
        data={filteredDocs}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={closeDropdowns}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => { setDetailItem(item); setIsDetailVisible(true); }}>
            <Text style={styles.cardDate}>{item.date}</Text>
            <Text style={styles.cardTitle}>{item.hospitalName}</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <View>
            <Text style={styles.hint}>상자를 클릭하면{'\n'}자세히 볼 수 있어요 !</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalVisible(true)}>
              <Text style={styles.addBtnText}>새로운 문서 등록하기</Text>
            </TouchableOpacity>
          </View>
        }
      />

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

            {/* 날짜 선택 */}
            <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={22} color={main_navy} />
              <Text style={styles.dateText}>{todayStr(selectedDate)}</Text>
              <Text style={styles.dateChangeHint}>변경하기</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <View style={styles.datePickerBox}>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={(e, d) => d && setSelectedDate(d)}
                />
                <TouchableOpacity style={styles.datePickerConfirmBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerConfirmText}>선택 완료</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 병원 이름 */}
            <TextInput
              style={styles.inputBox}
              placeholder="병원 이름 입력"
              placeholderTextColor="#AAA"
              value={hospitalName}
              onChangeText={setHospitalName}
            />

            {/* 진단서 */}
            <TouchableOpacity style={styles.fileRow} onPress={() => handlePickImage('diagnosis')}>
              <Text style={styles.fileLabel}>진단서 등록</Text>
              <Text style={[styles.fileBtn, diagnosisFile && styles.fileBtnDone]}>
                {diagnosisFile ? '등록 완료' : '등록하기'}
              </Text>
            </TouchableOpacity>

            {/* 처방전 */}
            <TouchableOpacity style={styles.fileRow} onPress={() => handlePickImage('prescription')}>
              <Text style={styles.fileLabel}>처방전 또는 약봉투 등록</Text>
              <Text style={[styles.fileBtn, prescriptionFile && styles.fileBtnDone]}>
                {prescriptionFile ? '등록 완료' : '등록하기'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.registerBtn} onPress={handleRegister}>
              <Text style={styles.registerBtnText}>등록</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 경고창 - 등록 모달 안에 */}
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
              <Text style={styles.detailTitle}>{detailItem?.hospitalName}</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.detailContent}>
              {/* 원본 보기 버튼 */}
              <TouchableOpacity style={styles.originalBtn}>
                <Text style={styles.originalBtnText}>원본 보기</Text>
              </TouchableOpacity>

              {/* 날짜 */}
              <View style={styles.detailDateRow}>
                <Ionicons name="calendar-outline" size={20} color={main_navy} />
                <Text style={styles.detailDate}>{detailItem?.date}</Text>
              </View>

              {/* 진단서 */}
              {detailItem?.diagnosisText ? (
                <>
                  <View style={styles.tagBox}>
                    <Text style={styles.tagText}>진단서</Text>
                  </View>
                  <View style={styles.contentBox}>
                    <Text style={styles.contentText}>{detailItem.diagnosisText}</Text>
                  </View>
                </>
              ) : null}

              {/* 처방약 */}
              {detailItem?.prescriptionText ? (
                <>
                  <View style={styles.tagBox}>
                    <Text style={styles.tagText}>처방약</Text>
                  </View>
                  <View style={styles.contentBox}>
                    <Text style={styles.contentText}>{detailItem.prescriptionText}</Text>
                  </View>
                </>
              ) : null}

              {/* 진단서/처방전 둘 다 없을 때 */}
              {!detailItem?.diagnosisText && !detailItem?.prescriptionText && (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>등록된 진단서 또는 처방전이 없습니다.</Text>
                  <TouchableOpacity style={styles.addMoreBtn} onPress={() => { setIsDetailVisible(false); setIsModalVisible(true); }}>
                    <Text style={styles.addMoreBtnText}>추가 등록하기</Text>
                  </TouchableOpacity>
                  <Text style={styles.addMoreHint}>진단서나 처방전을 등록해주시면{'\n'}더 자세한 내용을 확인하실 수 있어요</Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: main_navy },

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

  hint: { textAlign: 'center', color: main_navy, fontSize: 18, fontWeight: '600', marginTop: 10, lineHeight: 24, marginBottom: 16 },
  addBtn: { backgroundColor: main_navy, padding: 20, borderRadius: 15, alignItems: 'center' },
  addBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  // 등록 모달
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

  // 경고창
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 28, width: '75%', alignItems: 'center' },
  alertText: { fontSize: 17, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#111', lineHeight: 26 },
  alertBtn: { backgroundColor: main_navy, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 15 },
  alertBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // 상세 모달
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
