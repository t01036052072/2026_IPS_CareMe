
export interface MedicalHistoryItem {
  name: string;
  is_diagnosed: boolean;
  is_medicated: boolean;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  age: number;
  gender: '남자' | '여자';
  height: number;
  weight: number;
  is_under_treatment: boolean;
  has_family_history: boolean;
  is_b_hepatitis_carrier: boolean;
  medical_history: MedicalHistoryItem[];

  smoked_regular: boolean;           // 일반담배 흡연 여부
  used_heated_tobacco: boolean;      // 궐련형 전자담배 사용 여부
  used_vaping: boolean;              // 액상형 전자담배 사용 여부
  drinking_frequency: string;        // 음주 빈도 (문자열)
}