import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Touchable } from 'react-native';
import {useRouter, usePathname} from 'expo-router';

import {
  House,
  Pill,
  CalendarDays,
  MessageCircleMore,
} from 'lucide-react-native';

import HealthTab from '../assets/CustomTabBar/HealthTab.svg';

const MAIN_NAVY = '#00246D';
const GRAY = '#777';
const WHITE = '#fff';

export default function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    // 약 아이콘
    { name: '약 검색', path: '/pill', 
      icon: (
        <Pill
          size = {24}
          color={pathname === '/pill' ? MAIN_NAVY : GRAY}
        />
      )
    },

    // 건강 아이콘
    { name: '건강 관리', path: '/healthcare',
      icon: <HealthTab width={24} height={24} />
    },

    // 홈 아이콘
    { name: 'Home', path: '/',
      icon: <House size={24} color={pathname === '/,' ? MAIN_NAVY : WHITE} />,
      isCenter: true
    },

    // 달력 아이콘
    { name: '일정 관리', path: '/calendar',
      icon: (
        <CalendarDays
          size={24}
          color={pathname === '/calendar' ? MAIN_NAVY : GRAY}
        />
      ),
    },

    // 챗봇 아이콘
    { name: '케미 상담', path: '/chatbot',
      icon: (
        <MessageCircleMore
          size={24}
          color={pathname === '/chatbot' ? MAIN_NAVY : GRAY}
        />
      ),
    },
  ];

  return (
    <View style={styles.navBar}>
      {tabs.map((tab, index) => {
        const isActive = pathname === tab.path;

        // ===== 가운데 홈 버튼 =====
        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key={index}
              style={styles.homeButton}
              onPress={() => router.push(tab.path as any)}
            >
              {tab.icon}
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={index}
            style={styles.navItem}
            onPress={() => router.push(tab.path as any)}
          >
            {tab.icon}

            <Text
              style={[
                styles.navText,
                isActive && styles.activeText,
              ]}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    height: 85,

    borderTopWidth: 1,
    borderColor: '#E5E5E5',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',

    backgroundColor: WHITE,

    paddingBottom: 10,
  },

  navItem: {
    alignItems: 'center',
    justifyContent: 'center',

    gap: 4,
  },

  navText: {
    fontSize: 12,
    color: GRAY,
  },

  activeText: {
    color: MAIN_NAVY,
    fontWeight: '700',
  },

  homeButton: {
    width: 64,
    height: 64,

    borderRadius: 32,

    backgroundColor: MAIN_NAVY,

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: -25,
  },
});