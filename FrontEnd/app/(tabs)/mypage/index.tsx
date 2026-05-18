import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api/api';
import { Bold } from 'lucide-react-native';

const main_navy = '#00246D';
const light_navy = '#F1F4F9';
const red = '#C0392B';

interface UserInfo {
  email: string;
  name: string;
  gender: string;
  age: number;
  height: number;
  weight: number;
  is_under_treatment: boolean;
  has_family_history: boolean;
  is_b_hepatitis_carrier: boolean;
  medical_history: string;
  smoked_regular: boolean;
  used_heated_tobacco: boolean;
  used_vaping: boolean;
  drinking_frequency: string;
}

export default function MyPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    console.log('마이페이지 토큰:', token);  
    const response = await apiClient.get('/friend/mypage/profile', {  
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('마이페이지 응답:', response.data);  

    setUserInfo(response.data);
  } catch (error: any) {
    console.log('마이페이지 에러 status:', error.response?.status);  

    console.log('마이페이지 조회 실패:', error.message);
    Alert.alert('오류', '사용자 정보를 불러오지 못했습니다.');
  } finally {
    setIsLoading(false);
  }
};

  const handleLogout = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃', style: 'destructive',
      onPress: async () => {
  const token = await AsyncStorage.getItem('access_token');
  await apiClient.post('/friend/mypage/logout', {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await AsyncStorage.removeItem('access_token');
  router.replace('/(auth)/StartScreen/StartScreen' as any);
}

      }
    ]);
  };

  const handleWithdraw = () => {
    Alert.alert('회원탈퇴', '정말 탈퇴하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴', style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('access_token');
            await apiClient.delete('/friend/mypage/withdraw', {
              headers: { Authorization: `Bearer ${token}` },
            });
            await AsyncStorage.removeItem('access_token');
            router.replace('/(auth)/StartScreen/StartScreen' as any);
          } catch (error: any) {
            Alert.alert('오류', '회원탈퇴에 실패했습니다.');
          }
        }
      }
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={main_navy} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={main_navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>마이페이지</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* 회원 정보 */}
        <View style={styles.section}>
          <View style={styles.tagBox}>
            <Text style={styles.tagText}>회원 정보</Text>
          </View>
          <InfoRow label="아이디" value={userInfo?.email || '-'} />
          <TouchableOpacity>
            <Text style={styles.passwordReset}>비밀번호 재설정</Text>
          </TouchableOpacity>
        </View>

        {/* 기본 정보 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.tagBox}>
              <Text style={styles.tagText}>기본 정보</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.editText}>수정하기</Text>
            </TouchableOpacity>
          </View>
          <InfoRow label="이름" value={userInfo?.name || '-'} />
          <InfoRow label="성별" value={userInfo?.gender || '-'} />
          <InfoRow label="나이" value={userInfo?.age ? `${userInfo.age}세` : '-'} />
          <InfoRow label="키" value={userInfo?.height ? `${userInfo.height}cm` : '-'} />
          <InfoRow label="몸무게" value={userInfo?.weight ? `${userInfo.weight}kg` : '-'} />
        </View>

        {/* 건강 정보 */}
        <View style={styles.section}>
          <View style={styles.tagBox}>
            <Text style={styles.tagText}>건강 정보</Text>
          </View>

          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>질환력 (과거력, 가족력)</Text>
            <TouchableOpacity>
              <Text style={styles.editText}>수정하기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.healthRow}>
            <Text style={styles.healthLabel}>흡연 및 음주</Text>
            <TouchableOpacity>
              <Text style={styles.editText}>수정하기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        {/* 회원탈퇴 */}
        <TouchableOpacity onPress={handleWithdraw}>
          <Text style={styles.withdrawText}>회원 탈퇴하기</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: main_navy },
  content: { paddingHorizontal: 24, paddingBottom: 40 },

  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },

  tagBox: { backgroundColor: main_navy, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 },
  tagText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10,  marginLeft: 2 },
  infoLabel: { fontSize: 18, color: main_navy, fontWeight: '600', width: 80 },
  infoValue: { fontSize: 20, color: '#111', flex: 1 },

  passwordReset: { fontSize: 14, color: main_navy, textDecorationLine: 'underline', marginTop: 4 },
  editText: { fontSize: 14, color: main_navy, textDecorationLine: 'underline' },

  healthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: main_navy, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10 },
  healthLabel: { fontSize: 18, color: '#111', fontWeight: '600' },

  logoutBtn: { alignItems: 'center', marginTop: 30, marginBottom: 16 },
  logoutText: { fontSize: 20, color: red, fontWeight: 'bold', textDecorationLine: 'underline' },
  withdrawText: { textAlign: 'center', fontSize: 16, color: red, textDecorationLine: 'underline' },
});
