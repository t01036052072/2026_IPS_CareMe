import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/api/api';


const getToken = async () => await AsyncStorage.getItem('access_token');

const authHeader = async () => {
  const token = await getToken();
  if (!token) console.warn('[document] 토큰 없음 - 로그인 필요');
  return { Authorization: `Bearer ${token}` };
};

// ───── 문서 목록 조회 ─────
export const fetchDocumentList = async () => {
    const token = await getToken(); // ← 추가
  console.log('=== 토큰 확인 ===', token);
  const headers = await authHeader();
  const response = await apiClient.get('/friend/doc/documents/list', { headers });
  const data = response.data;
  return Array.isArray(data)
    ? data
    : data?.results ?? data?.documents ?? [];
};


// ───── 문서 상세 조회 ─────
export const fetchDocumentDetail = async (id: number) => {
  const headers = await authHeader();
  const response = await apiClient.get(`/friend/doc/documents/${id}`, { headers });
  return response.data;
};

// ───── 문서 업로드 ─────
export const uploadDocument = async (
  uri: string,
  docType: 'diagnosis' | 'prescription',
  uploadDate: string,
  hospitalName?: string,
) => {
  const headers = await authHeader();

  const formData = new FormData();
  formData.append('file', { uri, type: 'image/jpeg', name: 'document.jpg' } as any);
  formData.append('doc_type', docType);
  formData.append('upload_date', uploadDate);
  if (hospitalName?.trim()) formData.append('hospital_name', hospitalName.trim());

  const response = await apiClient.post('/friend/doc/documents/upload', formData, {
    headers: {
      ...headers,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// ───── 문서 삭제 ─────
export const deleteDocument = async (id: number) => {
  const headers = await authHeader();
  const response = await apiClient.delete(`/friend/doc/documents/${id}`, { headers });
  return response.data;
};
