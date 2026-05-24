import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api/api';

const getToken = async () => await AsyncStorage.getItem('access_token');

const authHeader = async () => {
  const token = await getToken();
  return { Authorization: `Bearer ${token}` };
};

export interface MedicationCreate {
  name: string;
  period: '오전' | '오후';
  time: string;       // "HH:MM"
  count: number;
  duration_days: number;
  start_date: string; // "YYYY-MM-DD"
}

export interface MedicationDetail {
  id: number;
  user_id: number;
  name: string;
  period: string;
  time: string;
  time_label: string;
  count: number;
  duration_days: number;
  start_date: string;
  end_date: string;
}

export interface MedicationSummary {
  id: number;
  name: string;
  time_label: string;
  detail?: MedicationDetail;
}

// 복약 일정 조회
export const getMedicationsAPI = async (): Promise<MedicationSummary[]> => {
  const headers = await authHeader();
  const response = await apiClient.get('/medications', {
    headers,
    params: { show_detail: true },
  });
  return response.data;
};

// 복약 일정 등록
export const createMedicationAPI = async (data: MedicationCreate): Promise<MedicationDetail> => {
  const headers = await authHeader();
  const response = await apiClient.post('/medications', data, { headers });
  return response.data;
};

// 복약 일정 삭제
export const deleteMedicationAPI = async (id: number): Promise<void> => {
  const headers = await authHeader();
  await apiClient.delete(`/medications/${id}`, { headers });
};