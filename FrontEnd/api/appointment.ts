import { apiClient } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getToken = async () => await AsyncStorage.getItem('access_token');

export interface AppointmentCreate {
  hospital_name: string;
  date: string;       // "YYYY-MM-DD"
  time: string;       // "HH:MM"
  alarm_date: string; // "YYYY-MM-DD"
  alarm_time: string; // "HH:MM"
}

export interface AppointmentDetail {
  id: number;
  user_id: number;
  hospital_name: string;
  date: string;
  time: string;
  alarm_date: string;
  alarm_time: string;
}

// 1. 병원 예약 목록 조회
export const getAppointmentsAPI = async (month?: string): Promise<AppointmentDetail[]> => {
  try {
    const token = await getToken();
    const params = month ? { month } : {};
    const response = await apiClient.get('/appointments', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return response.data;
  } catch (error: any) {
    console.log('예약 조회 실패:', error.message);
    return [];
  }
};

// 2. 병원 예약 등록
export const createAppointmentAPI = async (data: AppointmentCreate): Promise<AppointmentDetail> => {
  const token = await getToken();
  const response = await apiClient.post('/appointments', data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// 3. 병원 예약 수정
export const updateAppointmentAPI = async (id: number, data: AppointmentCreate): Promise<AppointmentDetail> => {
  const token = await getToken();
  console.log('예약 등록 데이터:', data); 
  const response = await apiClient.put(`/appointments/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// 4. 병원 예약 삭제
export const deleteAppointmentAPI = async (id: number): Promise<void> => {
  const token = await getToken();
  await apiClient.delete(`/appointments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
