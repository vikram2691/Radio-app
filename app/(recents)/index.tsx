import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VStack, Text, Icon, Pressable, HStack, Box, Image, FlatList } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useRadioPlayer } from '@/components/RadioPlayerContext';
import { AdEventType, InterstitialAd, TestIds } from 'react-native-google-mobile-ads';

type Station = {
  favicon: string;
  name: string;
  country: string;
  language: string;
  stationuuid: string;
  url: string;
};

const RecentlyPlayedScreen: React.FC = () => {
  const [recentStations, setRecentStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdLoaded, setIsAdLoaded] = useState<boolean>(false);
  const [navigationCount, setNavigationCount] = useState<number>(0);

  const { playRadio } = useRadioPlayer();
  const navigation = useNavigation();

  const interstitialAd = useRef(InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL)).current;

  useEffect(() => {
    const loadAd = () => interstitialAd.load();

    const adListener = interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      setIsAdLoaded(true);
    });

    const closeListener = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      setIsAdLoaded(false);
      interstitialAd.load(); // Reload ad for next use
    });

    loadAd();

    return () => {
      adListener();
      closeListener();
    };
  }, [interstitialAd]);

  // Load recently played stations from AsyncStorage on screen focus
  useFocusEffect(
    useCallback(() => {
      loadRecentStations();
    }, [])
  );

  const loadRecentStations = async () => {
    try {
      setLoading(true);
      const storedStations = await AsyncStorage.getItem('recentStations');
      if (storedStations) setRecentStations(JSON.parse(storedStations));
    } catch (error) {
      console.error('Error loading recent stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStationSelect = async (station: Station) => {
    playRadio(station);
    setNavigationCount((prevCount) => prevCount + 1);

    // Update recent stations in AsyncStorage
    await updateRecentStations(station);

    if (navigationCount % 2 === 1 && isAdLoaded) {
      interstitialAd.show().catch(() => console.log("Ad wasn't loaded"));
    }

    router.push({
      pathname: '/(player)',
      params: {
        selectedStation: JSON.stringify(station),
        stations: JSON.stringify(recentStations)
      }
    });
  };

  const updateRecentStations = async (station: Station) => {
    try {
      const storedStations = await AsyncStorage.getItem('recentStations');
      let stations = storedStations ? JSON.parse(storedStations) : [];

      // Check if the station already exists, if so, move it to the front
      stations = stations.filter((s: Station) => s.stationuuid !== station.stationuuid);
      stations.unshift(station);

      await AsyncStorage.setItem('recentStations', JSON.stringify(stations));
      setRecentStations(stations); // Update state to reflect changes immediately
    } catch (error) {
      console.error('Error updating recent stations:', error);
    }
  };

  const renderStationItem = ({ item }: { item: Station }) => (
    <Pressable onPress={() => handleStationSelect(item)} p="2" mb="2" bg="white" borderRadius="lg" shadow="2">
      <HStack alignItems="center">
        <Image
          source={item.favicon ? { uri: item.favicon } : require('@/assets/images/rolex_radio.png')}
          alt={item.name}
          size="50px"
          borderRadius="full"
          mr="4"
        />
        <VStack>
          <Text fontSize="lg" fontFamily="roboto-light" fontWeight="bold" color="#E91E63">{item.name}</Text>
          <Text fontSize="md" fontFamily="roboto-light" color="gray.500">{item.country} - {item.language}</Text>
        </VStack>
        <Icon as={Ionicons} name="chevron-forward-outline" size="6" color="#E91E63" ml="auto" />
      </HStack>
    </Pressable>
  );

  return (
    <LinearGradient
      colors={['#145DA0', '#E91E63']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <Box flex={1} p="4">
        <Text fontSize="2xl" fontWeight="bold" fontFamily="roboto-light" color="white" mb="4">Recently Played</Text>
        
        {loading ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text color="white">Loading...</Text>
          </Box>
        ) : recentStations.length > 0 ? (
          <FlatList
            data={recentStations}
            keyExtractor={(item) => item.stationuuid}
            renderItem={renderStationItem}
          />
        ) : (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text fontSize="lg" fontFamily="roboto-light" color="white">
              No recently played stations available. Start listening to your favorite channels!
            </Text>
          </Box>
        )}
      </Box>
    </LinearGradient>
  );
};

export default RecentlyPlayedScreen;
