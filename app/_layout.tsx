import React, { useState } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { useFonts } from 'expo-font';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { NativeBaseProvider, extendTheme } from 'native-base';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Satoshi-Regular': require('@/assets/fonts/Satoshi-Regular.otf'),
    'Satoshi-Bold': require('@/assets/fonts/Satoshi-Bold.otf'),
  });

  // Determine the color scheme (light or dark mode)
  const colorScheme = useColorScheme();

  // Create a theme that respects the system theme
  const theme = extendTheme({
    colors: {
      primary: colorScheme === 'dark' ? '#ffffff' : '#E91E63',
      background: colorScheme === 'dark' ? '#000000' : '#ffffff',
    },
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NativeBaseProvider theme={theme}>
      <View style={styles.container}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: theme.colors.background,
            },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: colorScheme === 'dark' ? '#888888' : '#cccccc',
          }}
        >
          <Tabs.Screen
            name="(home)"
            options={{
              title: 'Home',
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon
                  name={focused ? 'home' : 'home-outline'}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="(favourites)"
            options={{
              title: 'Favorites',
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon
                  name={focused ? 'heart' : 'heart-outline'}
                  color={color}
                />
              ),
            }}
          />
        </Tabs>
      </View>
    </NativeBaseProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
