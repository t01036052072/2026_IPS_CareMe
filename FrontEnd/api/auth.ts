// api/auth.ts
import { apiClient } from './api';
import { SignupRequest } from '../types/auth';

// 1. 회원가입 요청 함수
export const signupAPI = async (userData: SignupRequest) => {
  try {
    const response = await apiClient.post('/signup', userData); // Method: post 매서드 사용. url: /sign up
  } catch (error: any) {
    if (error.response) {
      // 400, 422 등 백엔드에서 보낸 에러 메세지 캐치
      throw new Error(error.response.data.detail); 
    }
    throw new Error('서버와 통신 중 오류가 발생했습니다.');
  }
};

// 2. 로그인 함수 
export const loginAPI = async (loginData: any) => {
  try {
    // Method: POST, URL: /login
    const response = await apiClient.post('/login', loginData);
    
    const { access_token } = response.data;
   
    console.log("발급된 토큰:", access_token);
    
    return response.data; 
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    throw new Error("서버와 통신 중 오류가 발생했습니다.");
  }
};

//3. 로그아웃 (POST, /logout)
export const logoutAPI = async () => {
  try {
    const response = await apiClient.post('/logout');
    return response.data;
  } catch (error: any) {
    throw new Error('로그아웃 실패');
  }
};

//4. 로그인 유지/토큰 재발급 (GET 또는 POST)
export const refreshTokenAPI = async () => {
  try {
    const response = await apiClient.get('/refresh'); // 백엔드 설정에 따라 경로가 다를 수 있음
    return response.data;
  } catch (error: any) {
    throw new Error('세션 만료');
  }
};

//회원탈퇴 (DELETE, /withdraw)
export const withdrawAPI = async () => {
  try {
    const response = await apiClient.delete('/withdraw');
    return response.data;
  } catch (error: any) {
    throw new Error('회원탈퇴 처리 중 오류 발생');
  }
};