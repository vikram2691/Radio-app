import React, { useEffect, useState } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { SplashScreen, Tabs } from 'expo-router';
import { useFonts } from 'expo-font';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { NativeBaseProvider, extendTheme } from 'native-base';
import { RadioPlayerProvider } from '@/components/RadioPlayerContext';
import { BannerAd, TestIds, BannerAdSize } from 'react-native-google-mobile-ads';
import LoadingScreen from '@/components/Loadingscreen';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({   
    "roboto-light": require('@/assets/fonts/RobotoCondensed-Medium.ttf'),
    "roboto-bold": require('@/assets/fonts/RobotoCondensed-ExtraBold.ttf'),
  });

  // Determine the color scheme (light or dark mode)
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = useState(true);
  // Create a theme that respects the system theme
  const theme = extendTheme({
    colors: {
      primary: colorScheme === 'dark' ? '#ffffff' : '#E91E63',
      background: colorScheme === 'dark' ? '#000000' : '#ffffff',
    },
  });
  useEffect(() => {
    if (fontsLoaded) {
      const timer = setTimeout(() => setIsLoading(false), 5000);  // Show loading for 5 seconds
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  // Display loading screen if loading is true
  if (!fontsLoaded || isLoading) {
    return <LoadingScreen />;
  }
   return (
    <RadioPlayerProvider>
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
              name="(Nearby_stations)"
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
              name="(search)"
              options={{
                title: 'Search',
                tabBarIcon: ({ color, focused }) => (
                  <TabBarIcon
                    name={focused ? 'globe' : 'globe-outline'} // Use globe icon here
                    color={color}
                  />
                ),
              }}
            />
            <Tabs.Screen
              name="(player)"
              options={{
                title: 'Player',
                tabBarIcon: ({ color, focused }) => (
                  <TabBarIcon
                    name={focused ? 'radio' : 'radio-outline'}  // Use radio icon here
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
            <Tabs.Screen
              name="(recents)"
              options={{
                title: 'Recents',
                tabBarIcon: ({ color, focused }) => (
                  <TabBarIcon
                    name={focused ? 'time' : 'time-outline'}  // Suitable icon for recents
                    color={color}
                  />
                ),
              }}
            />
          </Tabs>
          <BannerAd
            unitId="ca-app-pub-3940256099942544/6300978111"
            size={BannerAdSize.FULL_BANNER}
           
            onAdLoaded={() => {
              console.log('Banner ad loaded');
            }}
            onAdFailedToLoad={(error) => {
              console.error('Banner ad failed to load:', error);
            }}
            onAdOpened={() => {
              console.log('Banner ad opened');
            }}
            onAdClosed={() => {
              console.log('Banner ad closed');
            }}
          />
        </View>
      </NativeBaseProvider>
    </RadioPlayerProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bannerAd: {
    alignSelf: 'center',  
    position: 'absolute',
    bottom: 0, 
  },
});
