import { apiClient } from './api';
import { SignupRequest } from '../types/auth';

// 1. 회원가입
export const signupAPI = async (userData: SignupRequest) => {
  try {
    const response = await apiClient.post('/friend/user/signup', userData); // ← 수정
    return response.data;
  } catch (error: any) {
    console.log('signupAPI 에러 response:', error.response?.data);
    console.log('signupAPI 에러 message:', error.message);
    if (error.response) {
      throw new Error(error.response.data.detail || '회원가입에 실패했습니다.');
    }
    throw new Error('서버와 통신 중 오류가 발생했습니다.');
  }
};

// 2. 로그인
export const loginAPI = async (loginData: any) => {
  try {
    const formData = new FormData();
    formData.append('username', loginData.email);
    formData.append('password', loginData.password);

    const response = await apiClient.post('/friend/user/login', formData, { // ← 수정
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const { access_token } = response.data;
    console.log("발급된 토큰:", access_token);

    return response.data;
  } catch (error: any) {
    console.log('loginAPI 에러 response:', error.response?.data);
    console.log('loginAPI 에러 message:', error.message);
    console.log('status:', error.response?.status);

    if (error.response?.status === 401) {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    } else if (error.response?.status === 422) {
      throw new Error('입력 형식이 올바르지 않습니다.');
    } else if (error.response?.status === 404) {
      throw new Error('가입되지 않은 이메일입니다.');
    } else {
      throw new Error('서버와 통신 중 오류가 발생했습니다.');
    }
  }
};

// 3. 로그아웃
export const logoutAPI = async () => {
  try {
    const response = await apiClient.post('/friend/user/logout'); // ← 수정
    return response.data;
  } catch (error: any) {
    throw new Error('로그아웃 실패');
  }
};

// 4. 로그인 유지/토큰 재발급
export const refreshTokenAPI = async () => {
  try {
    const response = await apiClient.get('/refresh');
    return response.data;
  } catch (error: any) {
    throw new Error('세션 만료');
  }
};

// 5. 회원탈퇴
export const withdrawAPI = async () => {
  try {
    const response = await apiClient.delete('/friend/user/withdraw'); // ← 수정
    return response.data;
  } catch (error: any) {
    throw new Error('회원탈퇴 처리 중 오류 발생');
  }
};
