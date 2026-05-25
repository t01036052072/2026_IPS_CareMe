import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  FlatList, Modal, ScrollView, ActivityIndicator,
  Platform, TouchableWithoutFeedback, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getMedicationsAPI,
  createMedicationAPI,
  deleteMedicationAPI,
  MedicationSummary,
} from '@/api/pillschedule';

const main_navy = '#00246D';
const light_navy = '#F1F4F9';
const red_point = '#D9534F';

export default function PillScheduleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [medications, setMedications] = useState<MedicationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 등록 모달
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalPillName, setModalPillName] = useState('');
  const [period, setPeriod] = useState<'오전' | '오후'>('오전');
  const [scheduleTime, setScheduleTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [count, setCount] = useState(1);
  const [durationDays, setDurationDays] = useState(7);
  const [isSaving, setIsSaving] = useState(false);

  // 상세 모달
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [selectedMed, setSelectedMed] = useState<MedicationSummary | null>(null);

  // 알림 미등록 약 (검색에서 넘어온 약)
  const [unregisteredPills, setUnregisteredPills] = useState<{ id: string; name: string }[]>([]);

  // 검색에서 약 이름 넘어왔을 때 처리
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
      setMedications(data);
    } catch (error: any) {
      console.log('복약일정 조회 실패:', error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const toLocalDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const toTimeStr = (date: Date) => {
    const h = date.getHours() % 12 || 12;
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h.toString().padStart(2, '0')}:${m}`;
  };

  const formatTime = (date: Date) => {
    const h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? '오후' : '오전';
    const hour = h % 12 || 12;
    return `${ampm} ${hour}:${m}`;
  };

  // 등록 모달 열기 (미등록 약 클릭 or 직접 등록)
  const openRegisterModal = (pillName: string = '') => {
    setModalPillName(pillName);
    setPeriod('오전');
    setScheduleTime(new Date());
    setCount(1);
    setDurationDays(7);
    setIsModalVisible(true);
  };

  // 복약 일정 등록
  const handleSave = async () => {
    if (!modalPillName.trim()) {
      Alert.alert('알림', '약 이름을 입력해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      await createMedicationAPI({
        name: modalPillName,
        period,
        time: toTimeStr(scheduleTime),
        count,
        duration_days: durationDays,
        start_date: toLocalDate(new Date()),
      });

      // 미등록 약에서 제거
      setUnregisteredPills(prev => prev.filter(p => p.name !== modalPillName));
      setIsModalVisible(false);
      fetchMedications();
    } catch (error: any) {
      console.log('등록 실패:', error.message);
      Alert.alert('오류', '등록에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 복약 일정 삭제
  const handleDelete = async (id: number) => {
    try {
      await deleteMedicationAPI(id);
      setIsDetailVisible(false);
      setSelectedMed(null);
      fetchMedications();
    } catch (error: any) {
      console.log('삭제 실패:', error.message);
      Alert.alert('오류', '삭제에 실패했습니다.');
    }
  };

  // 시간대별로 그룹핑
  const grouped = medications.reduce((acc, med) => {
    const label = med.time_label || '미설정';
    if (!acc[label]) acc[label] = [];
    acc[label].push(med);
    return acc;
  }, {} as Record<string, MedicationSummary[]>);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
  <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
    <Ionicons name="chevron-back" size={32} color={main_navy} />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>복약 일정</Text>
  <View style={{ width: 32 }} /> 
</View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator size="large" color={main_navy} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* 등록된 복약 일정 */}
            {Object.keys(grouped).length > 0 ? (
              Object.entries(grouped).map(([timeLabel, meds]) => (
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
                      <Ionicons name="chevron-forward" size={20} color="#CCC" />
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            ) : (
              <View style={styles.emptyBox}>
  <Text style={styles.emptyText}>등록된 복약 일정이 없습니다</Text>
  <Text style={[styles.emptyText, { fontSize: 18, marginTop: 8, color:main_navy }]}>
    등록할 약을 검색하러 갈까요?
  </Text>
  <TouchableOpacity
    style={styles.goSearchBtn}
    onPress={() =>
      Alert.alert('약 검색', '약 검색 화면으로 이동하시겠습니까?', [
        { text: '아니오', style: 'cancel' },
        { text: '예', onPress: () => router.push('/(tabs)/serchpill' as any) },
      ])
    }
  >
    <Ionicons name="search" size={20} color="#FFF" />
    <Text style={styles.goSearchBtnText}>약 검색하기</Text>
  </TouchableOpacity>
</View>

            )}

            {/* 알림 미등록 약 */}
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
      <Modal visible={isModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>복약 일정 등록</Text>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <Ionicons name="close" size={28} color="#333" />
                  </TouchableOpacity>
                </View>

                {/* 약 이름 */}
                <Text style={styles.inputLabel}>약 이름</Text>
                <View style={styles.pillNameBox}>
                  <Text style={styles.pillNameText}>{modalPillName || '약 이름 없음'}</Text>
                </View>

                {/* 오전/오후 */}
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

                {/* 시간 */}
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

                {/* 복용 개수 */}
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

                {/* 복용 기간 */}
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
      </Modal>

      {/* ───── 상세 모달 ───── */}
      <Modal visible={isDetailVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setIsDetailVisible(false)}>
          <View style={styles.modalOverlay}>
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
                  onPress={() => {
                    Alert.alert('삭제', '복약 일정을 삭제하시겠습니까?', [
                      { text: '취소', style: 'cancel' },
                      { text: '삭제', style: 'destructive', onPress: () => handleDelete(selectedMed!.id) },
                    ]);
                  }}
                >
                  <Text style={styles.deleteBtnText}>삭제하기</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  section: { marginBottom: 24 },
  timeLabel: { fontSize: 18, fontWeight: 'bold', color: main_navy, marginBottom: 10, marginTop: 16 },

  pillCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', borderRadius: 14, padding: 18, marginBottom: 10 },
  pillCardLeft: { flexDirection: 'row', alignItems: 'center' },
  pillName: { fontSize: 18, fontWeight: '600', color: '#111' },

  unregisteredHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 16 },
  unregisteredTitle: { fontSize: 18, fontWeight: 'bold', color: '#888' },
  unregisteredCard: { backgroundColor: light_navy, borderColor: '#DDE6F5' },
  registerBadge: { backgroundColor: main_navy, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  registerBadgeText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },

  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 20, color: '#888' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: main_navy },

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
});