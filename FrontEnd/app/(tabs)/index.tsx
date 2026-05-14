import React from 'react';

import {View, Text, StyleSheet, TouchableOpacity, Image, } from 'react-native';
import {useRouter} from 'expo-router';

import {CircleUserRound, User,} from 'lucide-react-native';

// 파일 삽입
import CareMeLogoText from '../../assets/images/StartScreen/CareMeLogoText.png';
import Profile from '../../assets/home/profileCircle.svg';
import PillHome from '../../assets/home/pillHome.svg';
import HealthHome from '../../assets/home/healthHome.svg';
import CalendarHome from '../../assets/home/calendarHome.svg';
import DocumentHome from '../../assets/home/documentHome.svg';

const MAIN_NAVY = '#00246D';

export default function HomeScreen() {
  const router = useRouter();

  const buttons = [
    {
      title: '복약 관리',
      icon: <PillHome width={100} height={100} />,
      path: '/pill'
    },
    {
      title: '일정 관리',
      icon: <CalendarHome width={100} height={100} />,
      path: '/calendar'
    },
    {
      title: '건강 관리',
      icon: <HealthHome width={100} height={100} />,
      path: '/healthcare'
    },
    {
      title: '문서 관리',
      icon: <DocumentHome width={100} height={100} />,
      path: '/documents'
    }
  ];

  return (
    <View style={styles.container}>
      <View style = {styles.header}>

        <Image source={CareMeLogoText} 
          style={{
            width: 120,
            height: 40,
            resizeMode: 'contain',
          }} />

        <TouchableOpacity>
          <Profile width={40} height={40} />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {buttons.map((button, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            onPress={() => router.push(button.path as any)}
          >
            {button.icon}
            <Text style={styles.cardText}>{button.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 70,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 60,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 30,
    rowGap: 30,
  },

  card: {
    width: '40%',
    height: 230,
    backgroundColor: '#EFF5FF',
    borderRadius: 20,
    borderColor: '#cedeff',
    borderWidth: 0.05,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 25,
    shadowColor: '#3f3f3f',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },

  cardText: {
    fontSize: 25,
    fontWeight: '600',
    color: '#000320',
  }
})
