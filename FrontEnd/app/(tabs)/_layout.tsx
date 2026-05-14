import React from 'react';

import { Tabs } from 'expo-router';

import CustomTabBar from '../../components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}

      tabBar={() => <CustomTabBar />}
    />
  );
}
