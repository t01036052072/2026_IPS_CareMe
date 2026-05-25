import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, FlatList,
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
      console.log('=== HealthcareScreen 렌더링 ==='); // ← 맨 위에 추가
  const router = useRouter();

  const [diseases, setDiseases] = useState<DiseaseButton[]>([]);
  const [healthcareData, setHealthcareData] = useState<HealthcareItem[]>([]);
  const [selectedDisease, setSelectedDisease] = useState<string>('전체');
  const [isLoadingDiseases, setIsLoadingDiseases] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
  const checkProfile = async () => {
    const token = await getToken();
    const res = await apiClient.get('/friend/mypage/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('프로필 응답:', JSON.stringify(res.data));
  };
  checkProfile();
}, []);

  // ───── 질환 목록 조회 ─────


  const fetchDiseases = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await apiClient.get('/healthcare/diseases', {
        headers: { Authorization: `Bearer ${token}` },
        
      });
        console.log('건강관리 응답:', JSON.stringify(res.data)); // ← 추가

      setDiseases(res.data.diseases || []);
    } catch (error: any) {
      console.log('질환 목록 조회 실패:', error.message);
      console.log('건강관리 실패:', error.message); // ← 추가
    console.log('에러 상세:', error.response?.data); // ← 추가
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

  // 선택된 질환에 따라 필터링
  const filteredData = selectedDisease === '전체'
    ? healthcareData
    : healthcareData.filter(item => item.disease_name === selectedDisease);

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
              onPress={() => setSelectedDisease(d.disease_name)}
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
          <Text style={styles.loadingText}>AI가 건강관리 정보를 생성 중입니다...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {filteredData.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>건강관리 정보가 없습니다</Text>
            </View>
          ) : (
            filteredData.map((item, index) => (
              <View key={index} style={styles.diseaseSection}>
                {/* 질환명 */}
                <Text style={styles.diseaseName}>{item.disease_name}</Text>

                {/* 요약 */}
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryText}>{item.summary}</Text>
                </View>

                {/* 운동 */}
                <View style={styles.categoryBox}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name="walk" size={24} color={main_navy} />
                    <Text style={styles.categoryTitle}>운동</Text>
                  </View>
                  {item.exercise.map((ex, i) => (
                    <View key={i} style={styles.itemRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.itemText}>{ex}</Text>
                    </View>
                  ))}
                </View>

                {/* 식습관 */}
                <View style={styles.categoryBox}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name="restaurant" size={24} color={main_navy} />
                    <Text style={styles.categoryTitle}>식습관</Text>
                  </View>
                  {item.diet.map((d, i) => (
                    <View key={i} style={styles.itemRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.itemText}>{d}</Text>
                    </View>
                  ))}
                </View>

                {/* 생활습관 */}
                <View style={styles.categoryBox}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name="leaf" size={24} color={main_navy} />
                    <Text style={styles.categoryTitle}>생활습관</Text>
                  </View>
                  {item.lifestyle.map((l, i) => (
                    <View key={i} style={styles.itemRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.itemText}>{l}</Text>
                    </View>
                  ))}
                </View>

                {index < filteredData.length - 1 && <View style={styles.divider} />}
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
  filterBtn: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: 25, borderWidth: 1.5, borderColor: '#CCC', backgroundColor: '#FFF' },
  filterBtnActive: { backgroundColor: main_navy, borderColor: main_navy },
  filterBtnText: { fontSize: 18, fontWeight: '600', color: '#555' },
  filterBtnTextActive: { color: '#FFF' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  loadingText: { fontSize: 18, color: main_navy, fontWeight: '600', textAlign: 'center' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  diseaseSection: { marginBottom: 10 },

  diseaseName: { fontSize: 26, fontWeight: 'bold', color: main_navy, marginBottom: 14, marginTop: 10 },

  summaryBox: { backgroundColor: light_navy, borderRadius: 16, padding: 20, marginBottom: 16 },
  summaryText: { fontSize: 18, color: '#333', lineHeight: 30 },

  categoryBox: { backgroundColor: light_gray, borderRadius: 16, padding: 20, marginBottom: 14 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  categoryTitle: { fontSize: 22, fontWeight: 'bold', color: main_navy },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: main_navy, marginTop: 8 },
  itemText: { fontSize: 18, color: '#333', lineHeight: 28, flex: 1 },

  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 24 },

  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 18, color: '#888' },
});
