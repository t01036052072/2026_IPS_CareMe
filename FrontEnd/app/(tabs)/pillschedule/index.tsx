import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator,
  Platform, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getMedicationsAPI,
  createMedicationAPI,
  deleteMedicationAPI,
  MedicationSummary,
} from '@/api/pillschedule';
import { scheduleMedicationNotifications, setupLocalNotifications } from '@/utils/localNotifications';

const main_navy = '#00246D';
const light_navy = '#F1F4F9';
const red_point = '#D9534F';
const green = '#2ECC71';

const toLocalDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getDateDisplayStr = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const weekday = weekdays[date.getDay()];
  const today = toLocalDateStr(new Date());
  const selected = toLocalDateStr(date);
  const suffix = today === selected ? ' (오늘)' : '';
  return `${year}년 ${month}월 ${day}일 (${weekday})${suffix}`;
};

const timeToMinutes = (timeLabel: string) => {
  if (!timeLabel) return 9999;
  const isPM = timeLabel.includes('오후');
  const match = timeLabel.match(/(\d+):(\d+)/);
  if (!match) return 9999;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return h * 60 + m;
};

// 날짜 필터링
const filterByDate = (medications: MedicationSummary[], date: Date) => {
  const dateStr = toLocalDateStr(date);
  return medications.filter(med => {
    if (!med.detail) return false;
    const start = med.detail.start_date;
    const end = med.detail.end_date;
    return dateStr >= start && dateStr <= end;
  });
};

export default function PillScheduleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [medications, setMedications] = useState<MedicationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalPillName, setModalPillName] = useState('');
  const [period, setPeriod] = useState<'오전' | '오후'>('오전');
  const [scheduleTime, setScheduleTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [count, setCount] = useState(1);
  const [durationDays, setDurationDays] = useState(7);
  const [isSaving, setIsSaving] = useState(false);

  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'confirm'>('success');
  const [alertOnConfirm, setAlertOnConfirm] = useState<(() => void) | null>(null);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'confirm' = 'success', onConfirm?: () => void) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertOnConfirm(() => onConfirm || null);
    setIsAlertVisible(true);
  };

  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [selectedMed, setSelectedMed] = useState<MedicationSummary | null>(null);
  const [unregisteredPills, setUnregisteredPills] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (params.pillName && params.pillId) {
      const newPill = { id: String(params.pillId), name: String(params.pillName) };
      setUnregisteredPills(prev => {
        const exists = prev.some(p => p.id === newPill.id);
        if (exists) return prev;
        return [...prev, newPill];
      });
    }
  }, [params.pillName, params.pillId]);

  const fetchMedications = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getMedicationsAPI();
      console.log('복약일정 데이터:', JSON.stringify(data)); 
      setMedications(data);
    } catch (error: any) {
      console.log('복약일정 조회 실패:', error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
  useCallback(() => {
    fetchMedications();
  }, [fetchMedications])
);


  useEffect(() => {
    setupLocalNotifications().then(granted => {
      console.log('local notification permission:', granted);
    });
  }, []);

  const toTimeStr = (date: Date) => {
    const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
  
  };

  const formatTime = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? '오후' : '오전';
    const hour = h % 12 || 12;
    return `${ampm} ${hour}:${m}`;
  };

  const openRegisterModal = (pillName: string = '') => {
    setModalPillName(pillName);
    setPeriod('오전');
    setScheduleTime(new Date());
    setCount(1);
    setDurationDays(7);
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!modalPillName.trim()) {
      showAlert('알림', '약 이름을 입력해주세요.', 'error');
      return;
    }
    console.log('저장 데이터:', { count, durationDays });
    setIsSaving(true);
    try {
      const startDate = toLocalDateStr(new Date());
      const medicationTime = toTimeStr(scheduleTime);
      await createMedicationAPI({
        name: modalPillName,
        period,
        time: medicationTime,
        count,
        duration_days: durationDays,
        start_date: startDate,
      });
      await scheduleMedicationNotifications({
        name: modalPillName,
        startDate,
        time: medicationTime,
        durationDays,
        count,
      });
      setUnregisteredPills(prev => prev.filter(p => p.name !== modalPillName));
      setIsModalVisible(false);
      await fetchMedications();
      showAlert('등록 완료!', '복약 일정이 정상적으로 등록되었어요.', 'success');
    } catch (error: any) {
      console.log('등록 실패:', error.message);
      showAlert('오류', '등록에 실패했습니다.\n다시 시도해주세요.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMedicationAPI(id);
      setIsDetailVisible(false);
      setSelectedMed(null);
      await fetchMedications();
      showAlert('삭제 완료', '복약 일정이 삭제되었습니다.', 'success');
    } catch (error: any) {
      console.log('삭제 실패:', error.message);
      showAlert('오류', '삭제에 실패했습니다.', 'error');
    }
  };

  // 날짜 필터링된 데이터
  const filteredMedications = filterByDate(medications, selectedDate);

  const grouped = filteredMedications.reduce((acc, med) => {
    const label = med.time_label || '미설정';
    if (!acc[label]) acc[label] = [];
    acc[label].push(med);
    return acc;
  }, {} as Record<string, MedicationSummary[]>);

  const sortedGroupEntries = Object.entries(grouped).sort(
    ([a], [b]) => timeToMinutes(a) - timeToMinutes(b)
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
  <Ionicons name="chevron-back" size={32} color={main_navy} />
</TouchableOpacity>
          </TouchableOpacity>
        <Text style={styles.headerTitle}>복약 일정</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* ✅ 날짜 선택 */}
      <TouchableOpacity style={styles.dateBox} onPress={() => setShowDatePicker(true)}>
        <Ionicons name="calendar-outline" size={24} color={main_navy} />
        <Text style={styles.dateText}>{getDateDisplayStr(selectedDate)}</Text>
        <View style={styles.dateChangeBtn}>
          <Text style={styles.dateChangeBtnText}>날짜 변경</Text>
        </View>
      </TouchableOpacity>

      {/* ✅ 달력 피커 */}
      {showDatePicker && Platform.OS === 'ios' && (
        <View style={styles.datePickerBox}>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="spinner"
            locale="ko-KR"
            onChange={(_e: any, d?: Date) => d && setSelectedDate(d)}
          />
          <TouchableOpacity style={styles.datePickerConfirmBtn} onPress={() => setShowDatePicker(false)}>
            <Text style={styles.datePickerConfirmText}>선택 완료</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator size="large" color={main_navy} style={{ marginTop: 40 }} />
        ) : (
          <>
            {sortedGroupEntries.length > 0 ? (
              sortedGroupEntries.map(([timeLabel, meds]) => (
                <View key={timeLabel} style={styles.section}>
                  <Text style={styles.timeLabel}>{timeLabel}</Text>
                  {meds.map(med => (
                    <TouchableOpacity
                      key={med.id}
                      style={styles.pillCard}
                      onPress={() => { setSelectedMed(med); setIsDetailVisible(true); }}
                    >
                      <View style={styles.pillCardLeft}>
                        <Ionicons name="ellipse" size={20} color={main_navy} style={{ marginRight: 12 }} />
                        <Text style={styles.pillName}>{med.name}</Text>
                      </View>
                      <View style={styles.infoBtn}>
                        <Text style={styles.infoBtnText}>정보 보기</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>이 날의 복약 일정이 없습니다</Text>
                <Text style={[styles.emptyText, { fontSize: 18, marginTop: 8, color: main_navy }]}>
                  등록할 약을 검색하러 갈까요?
                </Text>
                <TouchableOpacity
                  style={styles.goSearchBtn}
                  onPress={() => showAlert('약 검색 이동', '약 검색 화면으로 이동하시겠습니까?', 'confirm', () => router.push('/(tabs)/serchpill' as any))}
                >
                  <Ionicons name="search" size={20} color="#FFF" />
                  <Text style={styles.goSearchBtnText}>약 검색하기</Text>
                </TouchableOpacity>
              </View>
            )}

            {unregisteredPills.length > 0 && (
              <View style={styles.section}>
                <View style={styles.unregisteredHeader}>
                  <Text style={styles.unregisteredTitle}>알림 미등록 약</Text>
                </View>
                {unregisteredPills.map(pill => (
                  <TouchableOpacity
                    key={pill.id}
                    style={[styles.pillCard, styles.unregisteredCard]}
                    onPress={() => openRegisterModal(pill.name)}
                  >
                    <View style={styles.pillCardLeft}>
                      <Ionicons name="ellipse-outline" size={20} color="#999" style={{ marginRight: 12 }} />
                      <Text style={[styles.pillName, { color: '#555' }]}>{pill.name}</Text>
                    </View>
                    <View style={styles.registerBadge}>
                      <Text style={styles.registerBadgeText}>등록하기</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ───── 등록 모달 ───── */}
      {isModalVisible && (
        <View style={[StyleSheet.absoluteFill, styles.modalOverlay]}>
          <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>복약 일정 등록</Text>
                    <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                      <Ionicons name="close" size={28} color="#333" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>약 이름</Text>
                  <View style={styles.pillNameBox}>
                    <Text style={styles.pillNameText}>{modalPillName || '약 이름 없음'}</Text>
                  </View>

                  <Text style={styles.inputLabel}>복용 시간대</Text>
                  <View style={styles.periodRow}>
                    {(['오전', '오후'] as const).map(p => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                        onPress={() => setPeriod(p)}
                      >
                        <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>복용 시간</Text>
                  <TouchableOpacity style={styles.selectBox} onPress={() => setShowTimePicker(true)}>
                    <Text style={styles.selectText}>{formatTime(scheduleTime)}</Text>
                    <Ionicons name="time-outline" size={22} color={main_navy} />
                  </TouchableOpacity>
                  {showTimePicker && Platform.OS === 'ios' && (
                    <View style={styles.pickerBox}>
                      <DateTimePicker value={scheduleTime} mode="time" display="spinner" locale="ko-KR" onChange={(e, d) => d && setScheduleTime(d)} />
                      <TouchableOpacity style={styles.pickerConfirmBtn} onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.pickerConfirmText}>선택 완료</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.inputLabel}>복용 개수</Text>
                  <View style={styles.counterRow}>
                    <TouchableOpacity style={styles.counterBtn} onPress={() => setCount(Math.max(1, count - 1))}>
                      <Ionicons name="remove" size={20} color={main_navy} />
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{count}정</Text>
                    <TouchableOpacity style={styles.counterBtn} onPress={() => setCount(count + 1)}>
                      <Ionicons name="add" size={20} color={main_navy} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>복용 기간</Text>
                  <View style={styles.counterRow}>
                    <TouchableOpacity style={styles.counterBtn} onPress={() => setDurationDays(Math.max(1, durationDays - 1))}>
                      <Ionicons name="remove" size={20} color={main_navy} />
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{durationDays}일</Text>
                    <TouchableOpacity style={styles.counterBtn} onPress={() => setDurationDays(durationDays + 1)}>
                      <Ionicons name="add" size={20} color={main_navy} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>등록하기</Text>}
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}

      {/* ───── 상세 모달 ───── */}
      {isDetailVisible && (
        <View style={[StyleSheet.absoluteFill, styles.modalOverlay]}>
          <TouchableWithoutFeedback onPress={() => setIsDetailVisible(false)}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{selectedMed?.name}</Text>
                    <TouchableOpacity onPress={() => setIsDetailVisible(false)}>
                      <Ionicons name="close" size={28} color="#333" />
                    </TouchableOpacity>
                  </View>

                  {selectedMed?.detail && (
                    <View style={styles.detailBox}>
                      <DetailRow label="복용 시간" value={selectedMed.detail.time_label} />
                      <DetailRow label="복용 개수" value={`${selectedMed.detail.count}정`} />
                      <DetailRow label="복용 기간" value={`${selectedMed.detail.duration_days}일`} />
                      <DetailRow label="시작일" value={selectedMed.detail.start_date} />
                      <DetailRow label="종료일" value={selectedMed.detail.end_date} />
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => showAlert('복약 일정 삭제', '이 복약 일정을\n삭제하시겠습니까?', 'confirm', () => handleDelete(selectedMed!.id))}
                  >
                    <Text style={styles.deleteBtnText}>삭제하기</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </View>
      )}

      {/* ───── 커스텀 알림창 ───── */}
      {isAlertVisible && (
        <View style={[StyleSheet.absoluteFill, styles.customAlertOverlay]}>
          <View style={styles.customAlertBox}>
            <View style={[styles.alertIconBox, {
              backgroundColor: alertType === 'success' ? '#E8F8EF' : alertType === 'error' ? '#FEE8E8' : '#EEF3FB'
            }]}>
              <Ionicons
                name={alertType === 'success' ? 'checkmark-circle' : alertType === 'error' ? 'close-circle' : 'help-circle'}
                size={48}
                color={alertType === 'success' ? green : alertType === 'error' ? red_point : main_navy}
              />
            </View>
            <Text style={styles.customAlertTitle}>{alertTitle}</Text>
            <Text style={styles.customAlertMessage}>{alertMessage}</Text>

            {alertType === 'confirm' ? (
              <View style={styles.alertBtnRow}>
                <TouchableOpacity style={[styles.alertBtn, { backgroundColor: '#EEE' }]} onPress={() => setIsAlertVisible(false)}>
                  <Text style={[styles.alertBtnText, { color: '#555' }]}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alertBtn, { backgroundColor: main_navy }]}
                  onPress={() => { setIsAlertVisible(false); if (alertOnConfirm) alertOnConfirm(); }}
                >
                  <Text style={styles.alertBtnText}>확인</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.alertBtn, { width: '100%', backgroundColor: main_navy }]}
                onPress={() => setIsAlertVisible(false)}
              >
                <Text style={styles.alertBtnText}>확인</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: main_navy },

  // ✅ 날짜 박스
  dateBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: light_navy, marginHorizontal: 20, borderRadius: 14, marginBottom: 8 },
  dateText: { fontSize: 20, fontWeight: 'bold', color: main_navy, flex: 1 },
  dateChangeBtn: { backgroundColor: main_navy, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  dateChangeBtnText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },

  // ✅ 달력 피커
  datePickerBox: { backgroundColor: '#F5F5F5', marginHorizontal: 20, borderRadius: 14, marginBottom: 8, alignItems: 'center', padding: 10 },
  datePickerConfirmBtn: { backgroundColor: main_navy, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 10, marginTop: 8, marginBottom: 4 },
  datePickerConfirmText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  timeLabel: { fontSize: 18, fontWeight: 'bold', color: main_navy, marginBottom: 10, marginTop: 16 },

  pillCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', borderRadius: 14, padding: 18, marginBottom: 10 },
  pillCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  pillName: { fontSize: 18, fontWeight: '600', color: '#111', flex: 1, flexWrap: 'wrap' },

  unregisteredHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 16 },
  unregisteredTitle: { fontSize: 18, fontWeight: 'bold', color: '#888' },
  unregisteredCard: { backgroundColor: light_navy, borderColor: '#DDE6F5' },
  registerBadge: { backgroundColor: main_navy, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  registerBadgeText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },

  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 20, color: '#888' },

  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: main_navy, flex: 1, marginRight: 8 },

  inputLabel: { fontSize: 15, fontWeight: 'bold', color: '#333', marginTop: 14, marginBottom: 6 },
  pillNameBox: { backgroundColor: light_navy, borderRadius: 12, padding: 14 },
  pillNameText: { fontSize: 16, color: '#111', fontWeight: '600' },

  periodRow: { flexDirection: 'row', gap: 12 },
  periodBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#DDD', alignItems: 'center' },
  periodBtnActive: { backgroundColor: main_navy, borderColor: main_navy },
  periodBtnText: { fontSize: 16, fontWeight: 'bold', color: '#888' },
  periodBtnTextActive: { color: '#FFF' },

  selectBox: { backgroundColor: light_navy, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectText: { fontSize: 16, color: '#111' },

  pickerBox: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', borderRadius: 12, marginTop: 8, alignItems: 'center', padding: 10 },
  pickerConfirmBtn: { backgroundColor: main_navy, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 10, marginTop: 8 },
  pickerConfirmText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },

  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  counterBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: main_navy, alignItems: 'center', justifyContent: 'center' },
  counterValue: { fontSize: 18, fontWeight: 'bold', color: '#111', minWidth: 50, textAlign: 'center' },

  saveBtn: { backgroundColor: main_navy, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  detailBox: { backgroundColor: light_navy, borderRadius: 14, padding: 18, marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E0E8F5' },
  detailLabel: { fontSize: 15, color: '#666', fontWeight: '600' },
  detailValue: { fontSize: 15, color: '#111', fontWeight: 'bold' },

  deleteBtn: { borderWidth: 2, borderColor: red_point, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  deleteBtnText: { color: red_point, fontSize: 16, fontWeight: 'bold' },
  goSearchBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: main_navy, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, marginTop: 20 },
  goSearchBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  infoBtn: { backgroundColor: main_navy, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  infoBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },

  customAlertOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 99999, elevation: 99999 },
  customAlertBox: { backgroundColor: '#FFF', borderRadius: 24, paddingVertical: 40, paddingHorizontal: 28, width: '88%', alignItems: 'center', gap: 12 },
  alertIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  customAlertTitle: { fontSize: 22, fontWeight: 'bold', color: '#111', textAlign: 'center' },
  customAlertMessage: { fontSize: 17, color: '#555', textAlign: 'center', lineHeight: 28 },
  alertBtnRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 4 },
  alertBtn: { flex: 1, backgroundColor: main_navy, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  alertBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
