import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, 
  ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform,
  Keyboard, TouchableWithoutFeedback, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import {
  getAppointmentsAPI,
  createAppointmentAPI,
  updateAppointmentAPI,
  deleteAppointmentAPI,
  AppointmentDetail,
} from '@/api/calender';
import { scheduleAppointmentNotification } from '@/utils/localNotifications';

interface Schedule {
  id: number;
  date: string;
  title: string;
  time: string;       // 표시용 "오전 11시 20분"
  raw_time: string;   // 원본 "11:20"
  alarm: string;
  alarm_date: string;
  alarm_time: string;
}

const main_navy = '#00246D';
const light_navy = '#F1F4F9';
const red_point = '#D9534F';
const input_bg = '#F5F5F5';

export default function HospitalCalendarScreen() {
  const router = useRouter();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMonthView, setIsMonthView] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  const [hospitalName, setHospitalName] = useState('');
  const [scheduleTime, setScheduleTime] = useState<Date | null>(null);
  const [alarmTime, setAlarmTime] = useState<Date | null>(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showAlarmPicker, setShowAlarmPicker] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ───── 일정 불러오기 ─────
  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const data = await getAppointmentsAPI();
      console.log('API 응답:', JSON.stringify(data)); 
      const mapped: Schedule[] = data.map(appt => ({
        id: appt.id,
        date: appt.date,
        title: appt.hospital_name,
        time: formatTimeStr(appt.time),
        raw_time: appt.time,           // 원본 "HH:MM" 저장
        alarm: formatTimeStr(appt.alarm_time),
        alarm_date: appt.alarm_date,
        alarm_time: appt.alarm_time,
      }));
      setSchedules(mapped);
    } catch (error) {
      console.error('일정 불러오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const dismissAll = () => {
    Keyboard.dismiss();
    setShowSchedulePicker(false);
    setShowAlarmPicker(false);
  };

  // 날짜 하루 밀림 방지 - 로컬 시간 기준으로 변환
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // "HH:MM" → "오전/오후 H시 MM분"
  const formatTimeStr = (timeStr: string) => {
    if (!timeStr) return '미설정';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? '오후' : '오전';
    const hour = h % 12 || 12;
    return `${ampm} ${hour}시 ${m < 10 ? '0' + m : m}분`;
  };

  const formatTime = (date: Date | null, placeholder: string) => {
    if (!date) return placeholder;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const h = hours % 12 || 12;
    const m = minutes < 10 ? `0${minutes}` : minutes;
    return `${ampm} ${h}시 ${m}분`;
  };

  // Date → "HH:MM"
  const toTimeStr = (date: Date) => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // "HH:MM" 문자열 → Date 객체
  const timeStrToDate = (timeStr: string): Date => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  const changeDate = (offset: number) => {
    const newDate = new Date(selectedDate);
    if (isMonthView) newDate.setMonth(newDate.getMonth() + offset);
    else newDate.setDate(newDate.getDate() + (offset * 7));
    setSelectedDate(newDate);
  };

  const getWeekDays = () => {
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, fullStr: formatDate(d), dayNum: d.getDate() };
    });
  };

  const getMonthDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array(firstDay).fill(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  // ───── 등록/수정 저장 ─────
  const handleSave = async () => {
    console.log('=== handleSave 호출 ===');
  console.log('editId:', editId);
  console.log('hospitalName:', hospitalName);
    if (!hospitalName.trim() || !scheduleTime) {
      setShowSchedulePicker(false);
      setShowAlarmPicker(false);
      setAlertMsg("병원명과 방문 시간을\n모두 입력해주세요.");
      setIsAlertVisible(true);
      return;
    }

    setIsSaving(true);
    try {
      const dateStr = formatDate(selectedDate);
      const timeStr = toTimeStr(scheduleTime);
      const alarmDateStr = dateStr;
      const alarmTimeStr = alarmTime
        ? toTimeStr(alarmTime)
        : toTimeStr(new Date(scheduleTime.getTime() - 3 * 60 * 60 * 1000));

      const payload = {
        hospital_name: hospitalName,
        date: dateStr,
        time: timeStr,
        alarm_date: alarmDateStr,
        alarm_time: alarmTimeStr,
      };

      console.log('전송 payload:', payload);

      if (editId !== null && editId !== undefined) {
        await updateAppointmentAPI(editId, payload);
      } else {
        await createAppointmentAPI(payload);
      }
      await scheduleAppointmentNotification({
        hospitalName,
        alarmDate: alarmDateStr,
        alarmTime: alarmTimeStr,
        appointmentDate: dateStr,
        appointmentTime: timeStr,
      });

      setIsModalVisible(false);
      setHospitalName('');
      setScheduleTime(null);
      setAlarmTime(null);
      setEditId(null);
      fetchSchedules();
    } catch (error: any) {
      console.log('저장 실패:', error.message);
      console.log('422 에러 내용:', error.response?.data);
      setAlertMsg('저장에 실패했습니다.\n다시 시도해주세요.');
      setIsAlertVisible(true);
    } finally {
      setIsSaving(false);
    }
  };

  // ───── 삭제 ─────
  const handleDelete = async () => {
    if (!editId) return;
    try {
      await deleteAppointmentAPI(editId);
      setIsModalVisible(false);
      setIsAlertVisible(false);
      setEditId(null);
      fetchSchedules();
    } catch (error: any) {
      console.log('삭제 실패:', error.message);
      setIsAlertVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={32} color={main_navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>병원 일정 관리</Text>
        </View>
        <TouchableOpacity style={styles.viewToggle} onPress={() => setIsMonthView(!isMonthView)}>
          <Ionicons name={isMonthView ? "list-outline" : "calendar-outline"} size={24} color={main_navy} />
          <Text style={styles.viewToggleText}>{isMonthView ? "주간 보기" : "전체 달력"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.monthNavigator}>
        <TouchableOpacity onPress={() => changeDate(-1)}><Ionicons name="chevron-back" size={28} color={main_navy} /></TouchableOpacity>
        <TouchableOpacity style={styles.monthPickerBtn} onPress={() => setShowYearMonthPicker(true)}>
          <Text style={styles.monthText}>{selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월</Text>
          <Ionicons name="chevron-down" size={18} color="#333" style={{ marginLeft: 5 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeDate(1)}><Ionicons name="chevron-forward" size={28} color={main_navy} /></TouchableOpacity>
      </View>

      <View style={styles.calendarArea}>
        {!isMonthView ? (
          <View style={styles.weekContainer}>
            {getWeekDays().map((item, index) => {
              const isSun = index === 0;
              const isSat = index === 6;
              const isSelected = formatDate(selectedDate) === item.fullStr;
              const hasSchedule = schedules.some(s => s.date === item.fullStr);
              return (
                <TouchableOpacity key={item.fullStr} style={[styles.dayBox, isSelected && styles.selectedDayBox]} onPress={() => setSelectedDate(item.date)}>
                  <Text style={[styles.dayText, isSun && { color: red_point }, isSat && { color: main_navy }, isSelected && { color: '#FFF' }]}>
                    {['일','월','화','수','목','금','토'][index]}
                  </Text>
                  <Text style={[styles.dateText, isSun && { color: red_point }, isSat && { color: main_navy }, isSelected && { color: '#FFF' }]}>{item.dayNum}</Text>
                  {hasSchedule && <View style={[styles.dot, isSelected && { backgroundColor: '#FFF' }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.monthContainer}>
            <View style={styles.monthGrid}>
              {['일','월','화','수','목','금','토'].map((d, i) => (
                <Text key={i} style={[styles.monthWeekText, i === 0 && { color: red_point }, i === 6 && { color: main_navy }]}>{d}</Text>
              ))}
              {getMonthDays().map((d, index) => {
                const isSelected = d && formatDate(d) === formatDate(selectedDate);
                const dayOfWeek = index % 7;
                const hasSchedule = d && schedules.some(s => s.date === formatDate(d));
                return (
                  <TouchableOpacity key={index} style={[styles.monthDay, isSelected && styles.selectedMonthDay]} onPress={() => d && setSelectedDate(d)}>
                    <Text style={[styles.monthDayText, dayOfWeek === 0 && { color: red_point }, dayOfWeek === 6 && { color: main_navy }, isSelected && { color: '#FFF' }]}>
                      {d ? d.getDate() : ""}
                    </Text>
                    {hasSchedule && <View style={[styles.dot, isSelected && { backgroundColor: '#FFF' }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      <ScrollView style={styles.listArea} contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.listTitle}>{selectedDate.getMonth()+1}월 {selectedDate.getDate()}일 일정</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={main_navy} style={{ marginTop: 20 }} />
        ) : (
          schedules.filter(s => s.date === formatDate(selectedDate)).map(item => (
            <TouchableOpacity key={item.id} style={styles.scheduleCard} onPress={() => {
              setEditId(item.id);
              setHospitalName(item.title);
              setScheduleTime(timeStrToDate(item.raw_time));   // 방문 시간 세팅
              setAlarmTime(timeStrToDate(item.alarm_time));    // 알람 시간 세팅
              setIsModalVisible(true);
            }}>
              <View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardInfo}>방문 시간: {item.time}</Text>
                <Text style={styles.cardInfo}>알람 시간: {item.alarm}</Text>
              </View>
              <View style={styles.editBtn}>
              <Text style={styles.editBtnText}>수정하기</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity style={styles.addBtn} onPress={() => {
          setEditId(null);
          setHospitalName('');
          setScheduleTime(null);
          setAlarmTime(null);
          setIsModalVisible(true);
        }}>
          <Ionicons name="add-circle" size={28} color="#FFF" />
          <Text style={styles.addBtnText}>새로운 병원 일정 등록하기</Text>
        </TouchableOpacity>
      </ScrollView>

      {showYearMonthPicker && (
        <Modal transparent visible={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.pickerPopup}>
              <DateTimePicker value={selectedDate} mode="date" display="spinner" locale="ko-KR" onChange={(e, d) => d && setSelectedDate(d)} />
              <TouchableOpacity style={styles.saveBtn} onPress={() => setShowYearMonthPicker(false)}>
                <Text style={styles.saveBtnText}>선택 완료</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={isModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={dismissAll}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              <TouchableWithoutFeedback onPress={dismissAll}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{editId ? "병원 일정 수정하기" : "새로운 병원 일정 등록하기"}</Text>
                    <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                      <Ionicons name="close" size={32} color="#333" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>병원명</Text>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="병원명을 입력해주세요"
                    value={hospitalName}
                    onChangeText={setHospitalName}
                    returnKeyType="done"
                    onSubmitEditing={dismissAll}
                  />

                  <Text style={styles.inputLabel}>방문 시간 등록하기</Text>
                  <TouchableOpacity style={styles.selectBox} onPress={() => { dismissAll(); setShowSchedulePicker(true); }}>
                    <Text style={[styles.selectText, !scheduleTime && { color: '#999' }]}>
                      {formatTime(scheduleTime, "병원에 방문할 시간을 선택해주세요")}
                    </Text>
                    <Ionicons name="time-outline" size={24} color={main_navy} />
                  </TouchableOpacity>

                  {Platform.OS === 'ios' && showSchedulePicker && (
                    <View style={styles.iosPickerBox}>
                      <DateTimePicker value={scheduleTime || new Date()} mode="time" display="spinner" locale="ko-KR" onChange={(e, d) => d && setScheduleTime(d)} />
                      <TouchableOpacity style={styles.iosPickerConfirmBtn} onPress={() => setShowSchedulePicker(false)}>
                        <Text style={styles.iosPickerConfirmText}>시간 선택 완료</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <Text style={styles.inputLabel}>알람 받을 시간 등록하기</Text>
                  <TouchableOpacity style={styles.selectBox} onPress={() => { dismissAll(); setShowAlarmPicker(true); }}>
                    <Text style={[styles.selectText, !alarmTime && { color: '#999' }]}>
                      {formatTime(alarmTime, "알람 받을 시간을 등록해주세요")}
                    </Text>
                    <Ionicons name="notifications-outline" size={24} color={main_navy} />
                  </TouchableOpacity>
                  <Text style={styles.helperText}>*알람 미등록시 방문 3시간 전으로 자동 등록됩니다*</Text>

                  {Platform.OS === 'ios' && showAlarmPicker && (
                    <View style={styles.iosPickerBox}>
                      <DateTimePicker value={alarmTime || new Date()} mode="time" display="spinner" locale="ko-KR" onChange={(e, d) => d && setAlarmTime(d)} />
                      <TouchableOpacity style={styles.iosPickerConfirmBtn} onPress={() => setShowAlarmPicker(false)}>
                        <Text style={styles.iosPickerConfirmText}>알람 설정 완료</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.modalBtnRow}>
                    {editId ? (
                      <>
                        <TouchableOpacity style={styles.deleteBtnCustom} onPress={() => { setAlertMsg("정말 삭제하시겠습니까?"); setIsAlertVisible(true); }}>
                          <Text style={styles.deleteBtnTextCustom}>삭제하기</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editBtnCustom} onPress={handleSave} disabled={isSaving}>
                          {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>수정하기</Text>}
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity style={[styles.saveBtn, { width: '100%' }]} onPress={handleSave} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>등록하기</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>

        {Platform.OS === 'android' && showSchedulePicker && (
          <DateTimePicker value={scheduleTime || new Date()} mode="time" display="spinner"
            onChange={(e, d) => { setShowSchedulePicker(false); if(e.type === 'set' && d) setScheduleTime(d); }} />
        )}
        {Platform.OS === 'android' && showAlarmPicker && (
          <DateTimePicker value={alarmTime || new Date()} mode="time" display="spinner"
            onChange={(e, d) => { setShowAlarmPicker(false); if(e.type === 'set' && d) setAlarmTime(d); }} />
        )}

        <Modal visible={isAlertVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>{alertMsg}</Text>
              <TouchableOpacity style={styles.alertBtn} onPress={() => {
                if (alertMsg === "정말 삭제하시겠습니까?") handleDelete();
                else setIsAlertVisible(false);
              }}>
                <Text style={styles.saveBtnText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: main_navy },
  viewToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: light_navy, padding: 8, borderRadius: 10 },
  viewToggleText: { marginLeft: 5, color: main_navy, fontWeight: 'bold', fontSize: 14 },
  monthNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 15 },
  monthText: { fontSize: 20, fontWeight: '500', color: '#333' },
  monthPickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  calendarArea: { backgroundColor: light_navy, paddingVertical: 15 },
  weekContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  dayBox: { alignItems: 'center', padding: 10, borderRadius: 15, width: 50 },
  selectedDayBox: { backgroundColor: main_navy },
  dayText: { fontSize: 15, fontWeight: 'bold' },
  dateText: { fontSize: 20, fontWeight: 'bold' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: main_navy, marginTop: 3 },
  monthContainer: { paddingHorizontal: 10 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthWeekText: { width: '14.28%', textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  monthDay: { width: '14.28%', height: 45, justifyContent: 'center', alignItems: 'center' },
  monthDayText: { fontSize: 18, fontWeight: 'bold' },
  selectedMonthDay: { backgroundColor: main_navy, borderRadius: 22 },
  listArea: { flex: 1 },
  listTitle: { fontSize: 22, fontWeight: 'bold', color: main_navy, marginBottom: 15 },
  scheduleCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 15, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
  cardTitle: { fontSize: 20, fontWeight: 'bold' },
  cardInfo: { fontSize: 16, color: main_navy },
  addBtn: { backgroundColor: main_navy, flexDirection: 'row', padding: 20, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  addBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, width: '100%', position: 'absolute', bottom: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: main_navy },
  inputLabel: { fontSize: 16, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  inputBox: { backgroundColor: input_bg, borderRadius: 12, padding: 15, fontSize: 16 },
  selectText: { fontSize: 17, color: '#333' },
  helperText: { fontSize: 14, color: '#888', marginTop: 8, fontWeight: '600', marginBottom: 10 },
  selectBox: { backgroundColor: input_bg, borderRadius: 12, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveBtn: { backgroundColor: main_navy, paddingVertical: 18, borderRadius: 15, alignItems: 'center', marginTop: 20, width: '100%' },
  saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  pickerPopup: { backgroundColor: '#FFF', padding: 20, borderRadius: 25, width: '90%', alignItems: 'center' },
  alertBox: { backgroundColor: '#FFF', padding: 30, borderRadius: 25, width: '80%', alignItems: 'center' },
  alertText: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  deleteBtnCustom: { width: '32%', backgroundColor: '#FFF', borderWidth: 2, borderColor: red_point, paddingVertical: 18, borderRadius: 15, alignItems: 'center' },
  deleteBtnTextCustom: { color: red_point, fontSize: 20, fontWeight: 'bold' },
  editBtnCustom: { width: '63%', backgroundColor: main_navy, paddingVertical: 18, borderRadius: 15, alignItems: 'center' },
  iosPickerBox: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', borderRadius: 12, marginTop: 10, padding: 10, alignItems: 'center' },
  iosPickerConfirmBtn: { backgroundColor: main_navy, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10, marginTop: 10 },
  iosPickerConfirmText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  alertBtn: { backgroundColor: red_point, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 15 },
  editBtn: { backgroundColor: main_navy, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
editBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
