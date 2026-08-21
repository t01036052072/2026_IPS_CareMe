import React from 'react';

/*import { Tabs } from 'expo-router';

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
}*/

import { Tabs, useSegments } from 'expo-router';
import CustomTabBar from '../../components/CustomTabBar';

export default function TabLayout() {
  const segments = useSegments();

  const hideTabBar = segments.some((segment) => segment === 'chatbot');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}

      tabBar={
        hideTabBar
          ? () => null
          : () => <CustomTabBar />
      }
    />
  );
}
