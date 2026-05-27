import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api/api';
import { useRouter, useFocusEffect } from 'expo-router';


import Back from "../../../assets/images/LoginScreen/back.svg";

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
  const [selectedDisease, setSelectedDisease] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const hasFetched = useRef(false);

  // 각 섹션의 Y 위치 저장
  const sectionYPositions = useRef<{ [key: string]: number }>({});


 const fetchHealthcareData = useCallback(async () => {
        console.log('=== 건강관리 데이터 조회 시작 ===');

  try {
    setIsLoadingData(true);
    const token = await getToken();
    const res = await apiClient.post('/healthcare/generate', {}, {
      headers: { Authorization: `Bearer ${token}` },
      
    });
    console.log('응답 데이터:', JSON.stringify(res.data.data?.map((i: any) => i.disease_name)));
    const data = res.data.data || [];
    setHealthcareData(data);
    const mapped = data.map((item: HealthcareItem, index: number) => ({
      disease_id: index + 1,
      disease_name: item.disease_name,
    }));
    setDiseases(mapped);
    setSelectedDisease(mapped[0]?.disease_name || '');
  } catch (error: any) {
    console.log('건강관리 데이터 조회 실패:', error.message);
    console.log('에러 상세:', error.response?.data);  // ← 이거 있나요?
  console.log('상태코드:', error.response?.status); // ← 추가
  } finally {
    setIsLoadingData(false);
  }
}, []);


useFocusEffect(
  useCallback(() => {
    hasFetched.current = false;  // ← 초기화
    fetchHealthcareData();
  }, [fetchHealthcareData])
);



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
          <Back width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>건강 관리</Text>
        <View style={{ width: 32 }} />
      </View>

    

     {isLoadingData ? (
  <View style={styles.loadingBox}>
    <ActivityIndicator size="large" color={main_navy} />
    <Text style={styles.loadingText}>건강관리 정보를 생성 중입니다...{'\n'}잠시만 기다려주세요.</Text>
  </View>
) : (
  <>
    {/* 필터 버튼 */}
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

    {/* 데이터 */}
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.scrollContent}
      onScroll={(e) => {
        const scrollY = e.nativeEvent.contentOffset.y;
        let currentDisease = diseases[0]?.disease_name || '';
        for (const [name, y] of Object.entries(sectionYPositions.current)) {
          if (scrollY >= y - 50) currentDisease = name;
        }
        setSelectedDisease(prev => prev === currentDisease ? prev : currentDisease);
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
  </>
)}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backImage: {
    width: 24,
    height: 24,
  },
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: main_navy },

  filterRow: { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  filterBtn: { paddingVertical: 2, paddingHorizontal: 15, borderRadius: 25, borderWidth: 1.5, borderColor: '#CCC', backgroundColor: '#FFF', height: 50, justifyContent: 'center' },
  filterBtnActive: { backgroundColor: main_navy, borderColor: main_navy },
  filterBtnText: { fontSize: 20, fontWeight: '600', color: '#555' },
  filterBtnTextActive: { color: '#FFF' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20},
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