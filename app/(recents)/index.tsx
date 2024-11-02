import React, { useState, useEffect, useRef } from 'react';
import { VStack, Text, Icon, Pressable, HStack, Box, Image, FlatList } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
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
  // State for recent stations, loading state, ad load status, and navigation count
  const [recentStations, setRecentStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdLoaded, setIsAdLoaded] = useState<boolean>(false);
  const [navigationCount, setNavigationCount] = useState<number>(0);

  // Player and navigation hooks
  const { playRadio } = useRadioPlayer();
  const navigation = useNavigation();
  
  // Interstitial ad setup
  const interstitialAd = useRef(InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL)).current;

  // Load interstitial ad and set up event listeners
  useEffect(() => {
    const loadAd = () => interstitialAd.load();

    const adListener = interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      setIsAdLoaded(true);
    });
    
    const closeListener = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      setIsAdLoaded(false);
      interstitialAd.load(); // Reload ad for next use
    });

    const errorListener = interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('Error loading interstitial ad', error);
    });

    loadAd();

    // Cleanup event listeners on unmount
    return () => {
      adListener();
      closeListener();
      errorListener();
    };
  }, [interstitialAd]);

  // Load recently played stations from AsyncStorage
  useEffect(() => {
    loadRecentStations();
  }, []);

  const loadRecentStations = async () => {
    try {
      setLoading(true); // Start loading animation
      const storedStations = await AsyncStorage.getItem('recentStations');
      if (storedStations) setRecentStations(JSON.parse(storedStations));
    } catch (error) {
      console.error('Error loading recent stations:', error);
    } finally {
      setLoading(false); // Stop loading animation
    }
  };

  // Handle station selection with conditional ad display
  const handleStationSelect = (station: Station) => {
    playRadio(station);
    setNavigationCount(prevCount => prevCount + 1); // Track navigation count

    // Show the ad every second navigation to a station
    if (navigationCount % 2 === 1 && isAdLoaded) {
      interstitialAd.show().catch(() => console.log("Ad wasn't loaded"));
    }

    // Navigate to the player screen with the selected station and recent stations
    router.push({
      pathname: '/(player)',
      params: {
        selectedStation: JSON.stringify(station), // Pass station data as JSON string
        stations: JSON.stringify(recentStations) // Pass the list of recent stations
      }
    });
  };

  // Render a single station item in the FlatList
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
        
        {/* Show loading state or render list of recently played stations */}
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
