import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot, Stack, Tabs } from 'expo-router';
import { useFonts } from 'expo-font';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Satoshi-Regular': require('@/assets/fonts/Satoshi-Regular.otf'),
    'Satoshi-Bold': require('@/assets/fonts/Satoshi-Bold.otf'),
  });
  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Tabs
      screenOptions={{      
        headerShown: false,
      }}>
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
          ),
        }}
      />
        <Tabs.Screen
        name="(favourites)"
        options={{
          title: 'favourites',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
          ),
        }}
      />      
    </Tabs>
     
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
