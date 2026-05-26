import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api/api';

const main_navy = '#00246D';
const light_navy = '#EEF3FB';
const light_gray = '#F7F8FA';

interface DiseaseButton {
  disease_id: number;
  disease_name: string;
}

interface HealthcareItem {
  disease_name: string;
  summary: string;
  exercise: string[];
  diet: string[];
  lifestyle: string[];
}

const getToken = async () => await AsyncStorage.getItem('access_token');

export default function HealthcareScreen() {
  const router = useRouter();
  const [diseases, setDiseases] = useState<DiseaseButton[]>([]);
  const [healthcareData, setHealthcareData] = useState<HealthcareItem[]>([]);
  const [selectedDisease, setSelectedDisease] = useState<string>('전체');
  const [isLoadingDiseases, setIsLoadingDiseases] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  // 각 섹션의 Y 위치 저장
  const sectionYPositions = useRef<{ [key: string]: number }>({});

  // ───── 질환 목록 조회 ─────
  const fetchDiseases = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await apiClient.get('/healthcare/diseases', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDiseases(res.data.diseases || []);
    } catch (error: any) {
      console.log('질환 목록 조회 실패:', error.message);
    } finally {
      setIsLoadingDiseases(false);
    }
  }, []);

  // ───── 건강관리 데이터 생성 ─────
  const fetchHealthcareData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      const token = await getToken();
      const res = await apiClient.post('/healthcare/generate', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHealthcareData(res.data.data || []);
    } catch (error: any) {
      console.log('건강관리 데이터 조회 실패:', error.message);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchDiseases();
    fetchHealthcareData();
  }, []);

  // 버튼 누르면 해당 섹션으로 스크롤
  const handleDiseaseSelect = (diseaseName: string) => {
    setSelectedDisease(diseaseName);
    if (diseaseName === '전체') {
      // 전체 누르면 맨 위로
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      // 해당 질환 섹션으로 이동
      const y = sectionYPositions.current[diseaseName];
      if (y !== undefined) {
        scrollRef.current?.scrollTo({ y, animated: true });
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={32} color={main_navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>건강 관리</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* 질환 필터 버튼 */}
      {isLoadingDiseases ? (
        <ActivityIndicator size="small" color={main_navy} style={{ margin: 16 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {diseases.map(d => (
            <TouchableOpacity
              key={d.disease_id}
              style={[styles.filterBtn, selectedDisease === d.disease_name && styles.filterBtnActive]}
              onPress={() => handleDiseaseSelect(d.disease_name)}
            >
              <Text style={[styles.filterBtnText, selectedDisease === d.disease_name && styles.filterBtnTextActive]}>
                {d.disease_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* 건강관리 데이터 */}
      {isLoadingData ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={main_navy} />
          <Text style={styles.loadingText}>AI가 건강관리 정보를{'\n'}생성 중입니다...</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          // 스크롤 위치에 따라 현재 질환 버튼 활성화
          onScroll={(e) => {
            const scrollY = e.nativeEvent.contentOffset.y;
            // 현재 보이는 섹션 찾기
            let currentDisease = '전체';
            for (const [name, y] of Object.entries(sectionYPositions.current)) {
              if (scrollY >= y - 50) {
                currentDisease = name;
              }
            }
            setSelectedDisease(currentDisease);
          }}
          scrollEventThrottle={100}
        >
          {healthcareData.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>건강관리 정보가 없습니다</Text>
            </View>
          ) : (
            healthcareData.map((item, index) => (
              <View
                key={index}
                style={styles.diseaseSection}
                // 각 섹션의 Y 위치 저장
                onLayout={(e) => {
                  sectionYPositions.current[item.disease_name] = e.nativeEvent.layout.y;
                }}
              >
                <Text style={styles.diseaseName}>{item.disease_name}</Text>

                <View style={styles.summaryBox}>
                  <Text style={styles.summaryText}>{item.summary}</Text>
                </View>

                <View style={styles.categoryBox}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name="walk" size={28} color={main_navy} />
                    <Text style={styles.categoryTitle}>운동</Text>
                  </View>
                  {item.exercise.map((ex, i) => (
                    <View key={i} style={styles.itemRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.itemText}>{ex}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.categoryBox}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name="restaurant" size={28} color={main_navy} />
                    <Text style={styles.categoryTitle}>식습관</Text>
                  </View>
                  {item.diet.map((d, i) => (
                    <View key={i} style={styles.itemRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.itemText}>{d}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.categoryBox}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name="leaf" size={28} color={main_navy} />
                    <Text style={styles.categoryTitle}>생활습관</Text>
                  </View>
                  {item.lifestyle.map((l, i) => (
                    <View key={i} style={styles.itemRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.itemText}>{l}</Text>
                    </View>
                  ))}
                </View>

                {index < healthcareData.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: main_navy },

  filterRow: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  filterBtn: { paddingVertical: 2, paddingHorizontal: 15, borderRadius: 25, borderWidth: 1.5, borderColor: '#CCC', backgroundColor: '#FFF', height: 50, justifyContent: 'center' },
  filterBtnActive: { backgroundColor: main_navy, borderColor: main_navy },
  filterBtnText: { fontSize: 20, fontWeight: '600', color: '#555' },
  filterBtnTextActive: { color: '#FFF' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20, paddingTop: 300 },
  loadingText: { fontSize: 18, color: main_navy, fontWeight: '600', textAlign: 'center', lineHeight: 30 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  diseaseSection: { marginBottom: 10 },
  diseaseName: { fontSize: 26, fontWeight: 'bold', color: main_navy, marginBottom: 12, marginTop: 10 },

  summaryBox: { backgroundColor: light_navy, borderRadius: 16, padding: 20, marginBottom: 12 },
  summaryText: { fontSize: 20, color: '#333', lineHeight: 32 },

  // ✅ 카테고리 간격 줄임
  categoryBox: { backgroundColor: light_gray, borderRadius: 16, padding: 20, marginBottom: 14 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  categoryTitle: { fontSize: 22, fontWeight: 'bold', color: main_navy },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: main_navy, marginTop: 8 },
  itemText: { fontSize: 18, color: '#333', lineHeight: 32, flex: 1 },

  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 24 },

  emptyBox: { alignItems: 'center', paddingTop: 300 },
  emptyText: { fontSize: 18, color: '#888' },
});