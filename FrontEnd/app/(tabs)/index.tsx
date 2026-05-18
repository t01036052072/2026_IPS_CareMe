import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

// 파일 삽입
import CareMeLogoText from '../../assets/images/StartScreen/CareMeLogoText.png';
import Profile from '../../assets/home/profileCircle.svg';
import PillHome from '../../assets/home/pillHome.svg';
import HealthHome from '../../assets/home/healthHome.svg';
import CalendarHome from '../../assets/home/calendarHome.svg';
import DocumentHome from '../../assets/home/documentHome.svg';


const MAIN_NAVY = '#00246D';
const LIGHT_BLUE = '#EFF5FF';
const ACCENT_BLUE = '#4A7FD4';

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api/api';

export default function HomeScreen() {
  const router = useRouter();
  const [name, setName] = useState('');

  useEffect(() => {
    const fetchName = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        const response = await apiClient.get('/friend/mypage/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setName(response.data.name);
      } catch (error) {
        console.log('이름 불러오기 실패:', error);
      }
    };
    fetchName();
  }, []);

  const buttons = [
    {
      title: '복약 관리',
      desc: '내 약 정보와\n복용 일정 관리하기',
      icon: <PillHome width={52} height={52} />,
      path: '/pill',
      color: '#E8F0FE',
      accent: MAIN_NAVY,
    },
    {
      title: '일정 관리',
      desc: '병원 예약 일정 확인하기',
      icon: <CalendarHome width={52} height={52} />,
      path: '/calendar',
      color: '#E8F0FE',
      accent: MAIN_NAVY,
    },
    {
      title: '건강 관리',
      desc: '내 건강 상태 기록과\n분석하기',
      icon: <HealthHome width={52} height={52} />,
      path: '/healthcare',
      color: '#E8F0FE',
      accent: MAIN_NAVY,
    },
    {
      title: '문서 관리',
      desc: '진단서와 처방전\n보관하기',
      icon: <DocumentHome width={52} height={52} />,
      path: '/document',
      color: '#E8F0FE',
      accent: MAIN_NAVY,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Image
          source={CareMeLogoText}
          style={{ width: 120, height: 40, resizeMode: 'contain' }}
        />
        <TouchableOpacity onPress={() => router.push('/mypage' as any)}>
          <Profile width={44} height={44} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 인사말 */}
        <View style={styles.greetingBox}>
          <Text style={styles.greetingText}>
            {name ? `${name}님, 안녕하세요!` : '안녕하세요!'}
          </Text>
              <Text style={styles.greetingSubText}>오늘도 건강한 하루 보내세요</Text>
              <Text style={styles.greetingSubText}>어떤 도움이 필요하세요?</Text>
        </View>

        {/* 카드 그리드 */}
        <View style={styles.grid}>
          {buttons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.card, { backgroundColor: button.color }]}
              onPress={() => router.push(button.path as any)}
              activeOpacity={0.85}
            >
              {/* 아이콘 영역 */}
              <View style={[styles.iconBox, { backgroundColor: '#fff' }]}>
                {button.icon}
              </View>

              {/* 텍스트 영역 */}
              <View style={styles.cardTextBox}>
                <Text style={[styles.cardTitle, { color: button.accent }]}>{button.title}</Text>
                <Text style={styles.cardDesc}>{button.desc}</Text>
              </View>

              {/* 화살표 */}
              <View style={[styles.arrowBox, { backgroundColor: button.accent }]}>
                <Text style={styles.arrow}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  greetingBox: {
    paddingVertical: 20,
    paddingHorizontal: 4,
    marginBottom: 8,
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
    gap: 14,
  },
  card: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 20,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 16,
  borderLeftWidth: 6,        // ← 추가
  borderLeftColor: MAIN_NAVY, // ← 추가
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
},
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MAIN_NAVY,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTextBox: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: MAIN_NAVY
  },
  cardDesc: {
    fontSize: 16,
    color: '#111',
    lineHeight: 20,
  },
  arrowBox: {
    width: 32,
    height: 32,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
