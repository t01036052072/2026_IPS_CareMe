import { apiClient } from './api';

// 1. 📅 전체 병원 일정 조회 (GET)
export const getAppointmentsAPI = async () => {
  try {
    const response = await apiClient.get('/appointments');
    return response.data;
  } catch (error: any) {
    if (error.response) throw new Error(error.response.data.detail || '조회 실패');
    throw new Error('서버와 통신 중 오류가 발생했습니다.');
  }
};

// 2. 📝 새로운 병원 일정 등록 (POST)
// (appointmentData 에는 가현님이 모달창에서 입력한 병원명, 시간 등이 들어갑니다!)
export const createAppointmentAPI = async (appointmentData: any) => {
  try {
    const response = await apiClient.post('/appointments', appointmentData);
    return response.data;
  } catch (error: any) {
    if (error.response) throw new Error(error.response.data.detail || '등록 실패');
    throw new Error('서버와 통신 중 오류가 발생했습니다.');
  }
};