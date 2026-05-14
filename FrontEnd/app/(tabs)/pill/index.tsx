import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';

import Back from '../../../assets/images/LoginScreen/back.png';
import PillTime from '../../../assets/pill/pilltime.svg';


const MAIN_NAVY = '#00246D';

export default function PillScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image source={Back} style={styles.backIcon} />
        </TouchableOpacity>

        <Text style={styles.title}>복약 관리</Text>

        <View style={{ width: 40 }} />
      </View>

      <View style={styles.grid}>

        <TouchableOpacity style={styles.card}>
          <Search size={100} color={MAIN_NAVY} />
          <Text style={styles.cardText}>의약품 검색</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <PillTime width={100} height={100} />
          <Text style={styles.cardText}>복약 일정</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 70,
    marginBottom: 70,
  },

  backIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },

  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },

  grid: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 60,
  },

  card: {
    width: '75%',
    height: 220,

    backgroundColor: '#EFF5FF',
    borderRadius: 20,
    borderColor: '#cedeff',
    borderWidth: 0.2,

    alignItems: 'center',
    justifyContent: 'center',

    gap: 20,

    shadowColor: '#3f3f3f',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },

  cardText: {
    fontSize: 25,
    fontWeight: '600',
    color: '#000320',
  },
});
