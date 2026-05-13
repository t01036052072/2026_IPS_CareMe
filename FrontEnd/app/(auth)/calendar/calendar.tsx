import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, 
  ScrollView, TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
  Keyboard, TouchableWithoutFeedback 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Schedule {
  id: number;
  date: string;
  title: string;
  time: string;
  alarm: string;
}

const main_navy = '#00246D';
const light_navy = '#F1F4F9';
const red_point = '#D9534F';
const input_bg = '#F5F5F5';

const initialSchedules: Schedule[] = [
  { id: 1, date: '2026-05-12', title: '내과 정기 검진', time: '오전 10시 30분', alarm: '오전 07시 30분' },
];

export default function HospitalCalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMonthView, setIsMonthView] = useState(false); 
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  const [hospitalName, setHospitalName] = useState('');
  const [scheduleTime, setScheduleTime] = useState<Date | null>(null);
  const [alarmTime, setAlarmTime] = useState<Date | null>(null);
  
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showAlarmPicker, setShowAlarmPicker] = useState(false);

  // 화면 빈 곳을 터치하면 꺼지도록 하는 함수
  const dismissAll = () => {
    Keyboard.dismiss(); // 키보드 내리기
    setShowSchedulePicker(false); // 시간 창 닫기
    setShowAlarmPicker(false); // 알람 창 닫기
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const formatTime = (date: Date | null, placeholder: string) => {
    if (!date) return placeholder;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const h = hours % 12 || 12;
    const m = minutes < 10 ? `0${minutes}` : minutes;
    return `${ampm} ${h}시 ${m}분`;
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

  const handleSave = () => {
    if (!hospitalName.trim() || !scheduleTime) {
      Alert.alert("알림", "병원명과 방문 시간을 모두 입력해주세요.");
      return;
    }
    
    let finalAlarm = alarmTime;
    if (!finalAlarm) {
      finalAlarm = new Date(scheduleTime);
      finalAlarm.setHours(finalAlarm.getHours() - 3);
    }

    const newEntry: Schedule = {
      id: editId || Date.now(),
      date: formatDate(selectedDate),
      title: hospitalName,
      time: formatTime(scheduleTime, ""),
      alarm: formatTime(finalAlarm, ""),
    };

    if (editId) setSchedules(schedules.map(s => s.id === editId ? newEntry : s));
    else setSchedules([...schedules, newEntry]);

    setIsModalVisible(false);
  };

  const deleteSchedule = (id: number) => {
    Alert.alert("일정 삭제", "이 일정을 정말 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "삭제하기", style: "destructive", onPress: () => {
        setSchedules(schedules.filter(s => s.id !== id));
        setIsModalVisible(false);
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>병원 일정 관리</Text>
        <TouchableOpacity style={styles.viewToggle} onPress={() => setIsMonthView(!isMonthView)}>
          <Ionicons name={isMonthView ? "list-outline" : "calendar-outline"} size={24} color={main_navy} />
          <Text style={styles.viewToggleText}>{isMonthView ? "주간 보기" : "전체 달력"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.monthNavigator}>
        <TouchableOpacity onPress={() => changeDate(-1)}><Ionicons name="chevron-back" size={28} color={main_navy} /></TouchableOpacity>
        <Text style={styles.monthText}>{selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월</Text>
        <TouchableOpacity onPress={() => changeDate(1)}><Ionicons name="chevron-forward" size={28} color={main_navy} /></TouchableOpacity>
      </View>

      <View style={styles.calendarArea}>
        {!isMonthView ? (
          <View style={styles.weekContainer}>
            {getWeekDays().map((item) => (
              <TouchableOpacity 
                key={item.fullStr}
                style={[styles.dayBox, formatDate(selectedDate) === item.fullStr && styles.selectedDayBox]}
                onPress={() => setSelectedDate(item.date)}
              >
                <Text style={[styles.dayText, formatDate(selectedDate) === item.fullStr && styles.selectedText]}>{['일','월','화','수','목','금','토'][item.date.getDay()]}</Text>
                <Text style={[styles.dateText, formatDate(selectedDate) === item.fullStr && styles.selectedText]}>{item.dayNum}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.monthContainer}>
            <View style={styles.monthGrid}>
              {['일','월','화','수','목','금','토'].map((d, i) => <Text key={i} style={styles.monthWeekText}>{d}</Text>)}
              {getMonthDays().map((d, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.monthDay, d && formatDate(d) === formatDate(selectedDate) && styles.selectedMonthDay]}
                  onPress={() => d && setSelectedDate(d)}
                >
                  <Text style={[styles.monthDayText, d && formatDate(d) === formatDate(selectedDate) && styles.selectedText]}>{d ? d.getDate() : ""}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      <ScrollView style={styles.listArea} contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.listTitle}>{selectedDate.getMonth()+1}월 {selectedDate.getDate()}일 일정</Text>
        
        {schedules.filter(s => s.date === formatDate(selectedDate)).map(item => (
          <TouchableOpacity key={item.id} style={styles.scheduleCard} onPress={() => { setEditId(item.id); setHospitalName(item.title); setIsModalVisible(true); }}>
            <View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardInfo}>방문 시간: {item.time}</Text>
              <Text style={styles.cardAlarm}>알람 설정: {item.alarm}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CCC" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditId(null); setHospitalName(''); setScheduleTime(null); setAlarmTime(null); setIsModalVisible(true); }}>
          <Ionicons name="add-circle" size={28} color="#FFF" />
          <Text style={styles.addBtnText}>새로운 병원 일정 등록하기</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={isModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={dismissAll}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
              
              <TouchableWithoutFeedback onPress={dismissAll}>
                <View style={styles.modalContent}>
                  
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{editId ? "병원 일정 확인" : "새로운 병원 일정 등록하기"}</Text>
                    <TouchableOpacity onPress={() => setIsModalVisible(false)}><Ionicons name="close" size={32} color="#333" /></TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>병원명</Text>
                  <TextInput 
                    style={styles.inputBox} 
                    placeholder="예: 서울안과 진료" 
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
                      <DateTimePicker value={scheduleTime || new Date()} mode="time" display="spinner" onChange={(e, d) => d && setScheduleTime(d)} />
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
                  <Text style={styles.helperText}>*미등록시 방문 3시간 전으로 자동 등록됩니다*</Text>

                  {Platform.OS === 'ios' && showAlarmPicker && (
                    <View style={styles.iosPickerBox}>
                      <DateTimePicker value={alarmTime || new Date()} mode="time" display="spinner" onChange={(e, d) => d && setAlarmTime(d)} />
                      <TouchableOpacity style={styles.iosPickerConfirmBtn} onPress={() => setShowAlarmPicker(false)}>
                        <Text style={styles.iosPickerConfirmText}>알람 설정 완료</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.modalBtnRow}>
                    {editId ? (
                      <>
                        <TouchableOpacity style={styles.deleteBtnCustom} onPress={() => deleteSchedule(editId)}>
                          <Text style={styles.deleteBtnTextCustom}>삭제하기</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editBtnCustom} onPress={handleSave}>
                          <Text style={styles.saveBtnText}>수정하기</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity style={[styles.saveBtn, { width: '100%' }]} onPress={handleSave}>
                        <Text style={styles.saveBtnText}>등록하기</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>

        {Platform.OS === 'android' && showSchedulePicker && (
          <DateTimePicker
            value={scheduleTime || new Date()} mode="time" display="spinner"
            onChange={(e, d) => { setShowSchedulePicker(false); if(e.type === 'set' && d) setScheduleTime(d); }}
          />
        )}
        {Platform.OS === 'android' && showAlarmPicker && (
          <DateTimePicker
            value={alarmTime || new Date()} mode="time" display="spinner"
            onChange={(e, d) => { setShowAlarmPicker(false); if(e.type === 'set' && d) setAlarmTime(d); }}
          />
        )}
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: main_navy },
  viewToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: light_navy, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  viewToggleText: { marginLeft: 5, color: main_navy, fontWeight: 'bold', fontSize: 16 },

  monthNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 15 },
  monthText: { fontSize: 22, fontWeight: 'bold', color: '#333' },

  calendarArea: { backgroundColor: light_navy, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  weekContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  dayBox: { alignItems: 'center', padding: 10, borderRadius: 15, width: 50 },
  selectedDayBox: { backgroundColor: main_navy },
  dayText: { fontSize: 15, color: '#666', marginBottom: 5 },
  dateText: { fontSize: 20, fontWeight: 'bold' },
  selectedText: { color: '#FFF' },

  monthContainer: { paddingHorizontal: 10 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthWeekText: { width: '14.28%', textAlign: 'center', fontSize: 16, color: '#666', marginBottom: 10, fontWeight: 'bold' },
  monthDay: { width: '14.28%', height: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  monthDayText: { fontSize: 18, color: '#333' },
  selectedMonthDay: { backgroundColor: main_navy, borderRadius: 22 },

  listArea: { flex: 1 },
  listTitle: { fontSize: 22, fontWeight: 'bold', color: main_navy, marginBottom: 15 },
  scheduleCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 20, borderRadius: 15, marginBottom: 12, borderWidth: 1, borderColor: '#EEE', elevation: 2 },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#111', marginBottom: 5 },
  cardInfo: { fontSize: 16, color: main_navy, marginBottom: 2 },
  cardAlarm: { fontSize: 15, color: '#666', fontWeight: 'bold' },
  emptyText: { fontSize: 18, color: '#AAA', textAlign: 'center', marginVertical: 30 },

  addBtn: { backgroundColor: main_navy, flexDirection: 'row', padding: 20, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 30 },
  addBtnText: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginLeft: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: main_navy },
  inputLabel: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10, marginBottom: 8 },
  inputBox: { backgroundColor: input_bg, borderRadius: 12, padding: 18, fontSize: 18 },
  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: input_bg, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#E0E0E0' },
  selectText: { fontSize: 17, color: '#333' },
  helperText: { fontSize: 14, color: '#888', marginTop: 8, fontWeight: '600', marginBottom: 10 },
  
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  deleteBtnCustom: { width: '32%', backgroundColor: '#FFF', borderWidth: 2, borderColor: red_point, paddingVertical: 18, borderRadius: 15, alignItems: 'center' },
  deleteBtnTextCustom: { color: red_point, fontSize: 20, fontWeight: 'bold' },
  editBtnCustom: { width: '63%', backgroundColor: main_navy, paddingVertical: 18, borderRadius: 15, alignItems: 'center' },
  saveBtn: { backgroundColor: main_navy, paddingVertical: 18, borderRadius: 15, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },

  iosPickerBox: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', borderRadius: 12, marginTop: 10, padding: 10, alignItems: 'center' },
  iosPickerConfirmBtn: { backgroundColor: main_navy, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10, marginTop: 10 },
  iosPickerConfirmText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});