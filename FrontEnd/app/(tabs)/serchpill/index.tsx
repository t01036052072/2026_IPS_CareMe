import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  FlatList,
  Image,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@/api/api';

const main_navy = '#00246D';
const light_navy = '#F1F4F9';

type Step = 'main' | 'textResult' | 'photoConfirm' | 'detail';

interface Medicine {
  id: string;
  name: string;
}

interface MedicineDetail {
  id: string;
  name: string;
  efficacy?: string;
  enterprise?: string;
  side_effect?: string;
  image_url?: string;
  fromPhoto?: boolean;
}

const sortMedicines = (
  medicines: Medicine[],
  query: string
) => {
  const q = query.toLowerCase();

  const startsWith = medicines
    .filter((m) =>
      m.name.toLowerCase().startsWith(q)
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'ko')
    );

  const includes = medicines
    .filter(
      (m) =>
        !m.name.toLowerCase().startsWith(q) &&
        m.name.toLowerCase().includes(q)
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'ko')
    );

  return [...startsWith, ...includes];
};

export default function PillSearch() {
  const router = useRouter();

  const [step, setStep] =
    useState<Step>('main');

  const [searchText, setSearchText] =
    useState('');

  const [searchResults, setSearchResults] =
    useState<Medicine[]>([]);

  const [selectedMedicine, setSelectedMedicine] =
    useState<Medicine | null>(null);

  const [medicineDetail, setMedicineDetail] =
    useState<MedicineDetail | null>(null);

  const [capturedImageUri, setCapturedImageUri] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(false);

  const [resultCount, setResultCount] =
    useState(0);

  // =========================
  // 직접 검색
  // =========================
  const handleTextSearch = async () => {
    if (!searchText.trim()) return;

    setIsLoading(true);

    try {
      const res = await apiClient.get(
        '/pills/search',
        {
          params: {
            name: searchText,
          },
        }
      );

      const mappedResults: Medicine[] =
        res.data.results.map((item: any) => ({
          id: String(item.id),
          name: item.pill_name,
        }));

      const sorted = sortMedicines(
        mappedResults,
        searchText
      );

      setSearchResults(sorted);
      setResultCount(sorted.length);

      setStep('textResult');

    } catch (error) {
      console.error(
        '텍스트 검색 실패:',
        error
      );

      Alert.alert(
        '검색 실패',
        '검색 결과가 없습니다.'
      );

    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // 사진 분석
  // =========================
  const handleImageAnalyze = async (
    uri: string
  ) => {
    setIsLoading(true);

    try {
      const formData = new FormData();

      formData.append(
        'file',
        {
          uri,
          type: 'image/jpeg',
          name: 'pill.jpg',
        } as any
      );

      const analyzeRes = await apiClient.post(
        '/pills/analyze',
        formData,
        {
          headers: {
            'Content-Type':
              'multipart/form-data',
          },
        }
      );

      const detectedId =
        analyzeRes.data.detected_id;

      const checkRes = await apiClient.get(
        `/pills/check/${detectedId}`
      );

      const data = checkRes.data.data;

      setSelectedMedicine({
        id: String(data.id),
        name: data.pill_name,
      });

      setCapturedImageUri(uri);

      setStep('photoConfirm');

    } catch (error) {
      console.error(
        '사진 분석 실패:',
        error
      );

      Alert.alert(
        '분석 실패',
        '사진 분석에 실패했습니다.'
      );

    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // 사진 검색 버튼
  // =========================
  const handlePhotoSearch = async () => {
    const options = [
      '취소',
      '사진 촬영',
      '사진 선택',
    ];

    const openPicker = async (
      buttonIndex: number
    ) => {
      if (buttonIndex === 0) return;

      let result;

      if (buttonIndex === 1) {
        result =
          await ImagePicker.launchCameraAsync({
            mediaTypes:
              ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });

      } else {
        result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes:
                ImagePicker.MediaTypeOptions.Images,
              quality: 0.8,
            }
          );
      }

      if (
        !result.canceled &&
        result.assets[0].uri
      ) {
        await handleImageAnalyze(
          result.assets[0].uri
        );
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
        },
        openPicker
      );

    } else {
      Alert.alert(
        '사진 검색',
        '선택해주세요',
        [
          {
            text: '사진 촬영',
            onPress: () => openPicker(1),
          },
          {
            text: '사진 선택',
            onPress: () => openPicker(2),
          },
          {
            text: '취소',
            style: 'cancel',
          },
        ]
      );
    }
  };

  // =========================
  // 직접 검색 결과 클릭
  // =========================
  const handleSelectMedicine = async (medicine: Medicine) => {
  setIsLoading(true);

  try {
    const res = await apiClient.get(`/pills/detail/${medicine.id}`);
    const data = res.data.data;

    setMedicineDetail({
      id: String(data.id),
      name: data.pill_name,
      efficacy: data.effect,
      enterprise: data.enterprise,
      side_effect: data.side_effect,
      image_url: undefined,
      fromPhoto: false,
    });

    setStep('detail');
  } catch (error) {
    console.error('상세 정보 조회 실패:', error);
    Alert.alert('오류', '상세 정보를 불러오지 못했습니다.');
  } finally {
    setIsLoading(false);
  }
};

  // =========================
  // confirm 예 버튼
  // =========================
  const handleConfirmYes = async () => {
  if (!selectedMedicine) return;

  setIsLoading(true);

  try {
    const res = await apiClient.get(`/pills/detail/${selectedMedicine.id}`);
    const data = res.data.data;

    setMedicineDetail({
      id: String(data.id),
      name: data.pill_name,
      efficacy: data.effect,
      enterprise: data.enterprise,
      side_effect: data.side_effect,
      image_url: data.master_image_url,
      fromPhoto: true,
    });

    setStep('detail');
  } catch (error) {
    console.error('상세 정보 조회 실패:', error);
    Alert.alert('오류', '상세 정보를 불러오지 못했습니다.');
  } finally {
    setIsLoading(false);
  }
};
  // =========================
  // 아니오 버튼
  // =========================
  const handleConfirmNo = () => {
    setStep('main');
  };

  // =========================
  // 로딩 화면
  // =========================
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator
            size="large"
            color={main_navy}
          />

          <Text style={styles.loadingText}>
            분석 중...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =========================
  // STEP 1
  // =========================
  if (step === 'main') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              setStep(medicineDetail?.fromPhoto ? 'photoConfirm' : 'textResult')
            }
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={main_navy}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            의약품 검색
          </Text>

          <View style={{ width: 28 }} />
        </View>

        <View style={styles.mainContent}>
          <Text style={styles.sectionLabel}>
            직접 검색
          </Text>

          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="약 이름을 입력해주세요"
              placeholderTextColor="#AAA"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleTextSearch}
              returnKeyType="search"
            />

            <TouchableOpacity
              onPress={handleTextSearch}
            >
              <Ionicons
                name="search-outline"
                size={24}
                color="#AAA"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.photoSearchBtn}
            onPress={handlePhotoSearch}
          >
            <Ionicons
              name="camera"
              size={24}
              color={main_navy}
            />

            <Text style={styles.photoSearchText}>
              사진으로 검색
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // =========================
  // STEP 2
  // =========================
  if (step === 'textResult') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setStep('main')}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={main_navy}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            의약품 검색
          </Text>

          <View style={{ width: 28 }} />
        </View>

        <View style={styles.searchBox2}>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleTextSearch}
            returnKeyType="search"
            autoFocus
          />

          <TouchableOpacity
            onPress={handleTextSearch}
          >
            <Ionicons
              name="search-outline"
              size={24}
              color="#AAA"
            />
          </TouchableOpacity>
        </View>

        {resultCount > 0 && (
          <Text style={styles.resultCount}>
            검색결과 {resultCount}개
          </Text>
        )}

        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() =>
                handleSelectMedicine(item)
              }
            >
              <Ionicons
                name="ellipse-outline"
                size={28}
                color="#CCC"
                style={{ marginRight: 14 }}
              />

              <Text style={styles.resultName}>
                {item.name}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#CCC"
              />
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    );
  }

  // =========================
  // STEP 3
  // =========================
  if (step === 'photoConfirm') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setStep('main')}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={main_navy}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            의약품 검색
          </Text>

          <View style={{ width: 28 }} />
        </View>

        <View style={styles.confirmContent}>
          <View style={styles.imageBox}>
            {capturedImageUri ? (
              <Image
                source={{
                  uri: capturedImageUri,
                }}
                style={styles.pillImage}
                resizeMode="contain"
              />
            ) : (
              <View
                style={
                  styles.pillImagePlaceholder
                }
              >
                <Ionicons
                  name="medical-outline"
                  size={80}
                  color="#CCC"
                />
              </View>
            )}
          </View>

          <Text style={styles.medicineName}>
            {selectedMedicine?.name}
          </Text>

          <View style={styles.confirmBox}>
            <Text
              style={styles.confirmQuestion}
            >
              이 약이 맞습니까?
            </Text>

            <View style={styles.confirmBtns}>
              <TouchableOpacity
                onPress={handleConfirmYes}
              >
                <Text style={styles.confirmYes}>
                  예
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmNo}
              >
                <Text style={styles.confirmNo}>
                  아니오
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // =========================
  // STEP 4
  // =========================
  if (step === 'detail') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              setStep('textResult')
            }
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={main_navy}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            의약품 검색
          </Text>

          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          contentContainerStyle={
            styles.detailContent
          }
        >
          <Text style={styles.medicineName}>
            {medicineDetail?.name}
          </Text>

          {medicineDetail?.fromPhoto && medicineDetail?.image_url && (
            <View style={styles.imageBox}>
              <Image
                source={{
                  uri: medicineDetail.image_url,
                }}
                style={styles.pillImage}
                resizeMode="contain"
              />
            </View>
          )}

          {medicineDetail?.enterprise && (
            <InfoCard
              label="제약회사"
              value={
                medicineDetail.enterprise
              }
            />
          )}

          {medicineDetail?.efficacy && (
            <InfoCard
              label="효능·효과"
              value={
                medicineDetail.efficacy
              }
            />
          )}

          {medicineDetail?.side_effect && (
            <InfoCard
              label="부작용"
              value={
                medicineDetail.side_effect
              }
            />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: main_navy,
  },

  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },

  sectionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: main_navy,
    marginBottom: 12,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 40,
  },

  searchBox2: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },

  photoSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  photoSearchText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: main_navy,
  },

  resultCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: main_navy,
    paddingHorizontal: 20,
    marginBottom: 8,
  },

  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  resultName: {
    flex: 1,
    fontSize: 18,
    color: '#111',
  },

  confirmContent: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingTop: 30,
  },

  imageBox: {
    width: '100%',
    aspectRatio: 1.4,
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  pillImage: {
    width: '100%',
    height: '100%',
  },

  pillImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },

  medicineName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 24,
  },

  confirmBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    justifyContent: 'space-between',
  },

  confirmQuestion: {
    fontSize: 18,
    color: '#111',
    fontWeight: '600',
  },

  confirmBtns: {
    flexDirection: 'row',
    gap: 24,
  },

  confirmYes: {
    fontSize: 18,
    fontWeight: 'bold',
    color: main_navy,
  },

  confirmNo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D32F2F',
  },

  detailContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  infoCard: {
    backgroundColor: light_navy,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
  },

  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: main_navy,
    marginBottom: 6,
  },

  infoValue: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },

  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },

  loadingText: {
    fontSize: 18,
    color: main_navy,
    fontWeight: 'bold',
  },
});