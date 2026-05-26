import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';

import PillTime from '../../../assets/pill/pilltime.svg';
import Back from '../../../assets/images/LoginScreen/back.svg';

import { getMedicationsAPI, MedicationSummary } from '@/api/pillschedule';

const MAIN_NAVY = '#00246D';

export default function PillScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<MedicationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getMedicationsAPI();
        setMedications(data);
      } catch (e) {
        console.log('복약 미리보기 실패:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Back width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.title}>복약 관리</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* 인사말 */}
      <View style={styles.greetingBox}>
        <Text style={styles.greetingText}>어떤 도움이 필요하세요?</Text>
        <Text style={styles.greetingSubText}>아래 메뉴를 선택해주세요</Text>
      </View>

      {/* 카드 */}
      <View style={styles.grid}>
        {/* 의약품 검색 */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.navigate('/(tabs)/serchpill' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.iconBox}>
            <Ionicons name="search" size={52} color={MAIN_NAVY} />
          </View>
          <View style={styles.cardTextBox}>
            <Text style={styles.cardTitle}>의약품 검색</Text>
            <Text style={styles.cardDesc}>약 이름이나 사진으로{'\n'}의약품 정보 검색하기</Text>
          </View>
          <View style={styles.arrowBox}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </TouchableOpacity>

        {/* 복약 일정 */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.navigate('/(tabs)/pillschedule' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.iconBox}>
            <PillTime width={52} height={52} />
          </View>
          <View style={styles.cardTextBox}>
            <Text style={styles.cardTitle}>복약 일정</Text>
            <Text style={styles.cardDesc}>내 복약 일정 확인하고{'\n'}알림 설정하기</Text>
          </View>
          <View style={styles.arrowBox}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 오늘 복약 미리보기 */}
      <View style={styles.previewBox}>
        <View style={styles.previewHeader}>
          <Ionicons name="today-outline" size={22} color={MAIN_NAVY} />
          <Text style={styles.previewTitle}>오늘 복약 일정</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={MAIN_NAVY} style={{ marginTop: 12 }} />
        ) : medications.length === 0 ? (
          <Text style={styles.previewEmpty}>등록된 복약 일정이 없어요</Text>
        ) : (
          medications.slice(0, 3).map((med, index) => (
            <View key={med.id} style={styles.previewItem}>
              <Ionicons name="ellipse" size={10} color={MAIN_NAVY} />
              <Text style={styles.previewItemText}>{med.name}</Text>
              <Text style={styles.previewItemTime}>{med.time_label}</Text>
            </View>
          ))
        )}

        {medications.length > 3 && (
          <TouchableOpacity onPress={() => router.navigate('/(tabs)/pillschedule' as any)}>
            <Text style={styles.previewMore}>+ {medications.length - 3}개 더 보기</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  backImage: {
    width: 24,
    height: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: MAIN_NAVY,
  },
  greetingBox: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 25,
    fontWeight: 'bold',
    color: MAIN_NAVY,
    marginBottom: 4,
  },
  greetingSubText: {
    fontSize: 18,
    color: '#7A8FA6',
  },
  grid: {
    paddingHorizontal: 20,
    gap: 14,
  },
  card: {
    backgroundColor: '#E8F0FE',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderLeftWidth: 6,
    borderLeftColor: MAIN_NAVY,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    shadowColor: MAIN_NAVY,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTextBox: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: MAIN_NAVY,
  },
  cardDesc: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  arrowBox: {
    width: 36,
    height: 36,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MAIN_NAVY,
  },
  arrow: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // 오늘 복약 미리보기
  previewBox: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#F7F9FF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DDE6F5',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: MAIN_NAVY,
  },
  previewEmpty: {
    fontSize: 16,
    color: '#AAA',
    textAlign: 'center',
    paddingVertical: 8,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3FB',
  },
  previewItemText: {
    flex: 1,
    fontSize: 17,
    color: '#111',
    fontWeight: '500',
  },
  previewItemTime: {
    fontSize: 15,
    color: MAIN_NAVY,
    fontWeight: '600',
  },
  previewMore: {
    textAlign: 'center',
    color: MAIN_NAVY,
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 12,
  },
});