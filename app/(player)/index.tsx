import React, { useState, useEffect, useRef } from 'react';
import { VStack, Text, Icon, Pressable, HStack, Box, Image, Alert } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useRadioPlayer } from '@/components/RadioPlayerContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { ActivityIndicator } from 'react-native';

type Station = {
  favicon: string;
  name: string;
  country: string;
  language: string;
  stationuuid: string;
  url: string;
};

type PlayerScreenParams = {
  selectedStation: string;
  stations: string;
};

const PlayerScreen: React.FC = () => {
  const route = useRoute();
  const params = route.params as PlayerScreenParams | undefined;

  const { selectedStation: selectedStationString, stations: passedStationsString } = params || {};

  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [favorites, setFavorites] = useState<Station[]>([]);
  const { isPlaying, togglePlayPause, switchStation, isBuffering } = useRadioPlayer();
  
  const interstitialAd = useRef(InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL)).current; // Use ref for ad instance
  const [isAdLoaded, setIsAdLoaded] = useState<boolean>(false); // Track if the ad is loaded
  const stationSwitchCountRef = useRef<number>(0); // Counter for station switches

  // Load interstitial ad on page load
  useEffect(() => {
    const loadAd = () => {
      interstitialAd.load(); // Load the ad
    };

    const adListener = interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      setIsAdLoaded(true); // Set ad loaded state
    });

    const closeListener = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      setIsAdLoaded(false); // Reset ad loaded state
      interstitialAd.load(); // Preload the next ad
    });

    const errorListener = interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('Error loading interstitial ad', error);
    });

    loadAd(); // Load ad initially

    // Show the ad on page load if available
    return () => {
      adListener(); // Clean up the listener on unmount
      closeListener(); // Clean up the close listener
      errorListener(); // Clean up the error listener
    };
  }, [interstitialAd]);

  useEffect(() => {
    if (selectedStationString && passedStationsString) {
      try {
        const selectedStationParsed = JSON.parse(selectedStationString) as Station;
        const stationsParsed = JSON.parse(passedStationsString) as Station[];
        setSelectedStation(selectedStationParsed);
        setStations(stationsParsed);
      } catch (error) {
        console.error('Error parsing JSON:', error);
      }
    }
    loadFavorites(); // Load favorites from AsyncStorage
  }, [selectedStationString, passedStationsString]);

  const loadFavorites = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('favoriteStations');
      if (jsonValue) {
        setFavorites(JSON.parse(jsonValue));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const saveFavorites = async (stations: Station[]) => {
    try {
      const jsonValue = JSON.stringify(stations);
      await AsyncStorage.setItem('favoriteStations', jsonValue);
      setFavorites(stations);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const toggleFavorite = (station: Station) => {
    const isFavorite = favorites.some(fav => fav.stationuuid === station.stationuuid);
    let updatedFavorites;

    if (isFavorite) {
      updatedFavorites = favorites.filter(fav => fav.stationuuid !== station.stationuuid);
    } else {
      updatedFavorites = [...favorites, station];
    }

    saveFavorites(updatedFavorites);
  };

  const addStationToRecent = async (station: Station) => {
    try {
      const storedStations = await AsyncStorage.getItem('recentStations');
      let recentStations: Station[] = storedStations ? JSON.parse(storedStations) : [];

      recentStations = [station, ...recentStations.filter(s => s.stationuuid !== station.stationuuid)];
      if (recentStations.length > 50) recentStations = recentStations.slice(0, 50);

      await AsyncStorage.setItem('recentStations', JSON.stringify(recentStations));
    } catch (error) {
      console.error('Error saving station to recent:', error);
    }
  };

  const handleSwitchStation = (direction: 'next' | 'prev') => {
    const currentIndex = stations.indexOf(selectedStation);
    const newIndex = currentIndex + (direction === 'next' ? 1 : -1);

    // Check if the newIndex is out of bounds
    if (newIndex < 0 || newIndex >= stations.length) {
      Alert.alert('No more stations available', 'There are no more stations in this direction.');
      return;
    }

    const newStation = stations[newIndex];

    // Show the interstitial ad if it's loaded (for every 3rd switch)
    stationSwitchCountRef.current += 1;
    const shouldShowAd = stationSwitchCountRef.current % 3 === 0;

    if (shouldShowAd && isAdLoaded) {
      interstitialAd.show().catch((error) => {
        console.error("Ad failed to show:", error);
        switchStation(direction, stations);
        setSelectedStation(newStation);
        addStationToRecent(newStation);
      }); // Try showing the ad
      // Listen for ad close event to switch the station
      const closeListener = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        switchStation(direction, stations);
        setSelectedStation(newStation);
        addStationToRecent(newStation);
      });

      return () => {
        closeListener(); // Clean up the listener when done
      };
    } else {
      // If ad isn't loaded or it's not the 3rd switch, proceed to switch the station
      switchStation(direction, stations);
      setSelectedStation(newStation);
      addStationToRecent(newStation);
    }
  };

  if (!selectedStation || !stations.length) {
    return (
      <LinearGradient
        colors={['#145DA0', '#E91E63']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <VStack alignItems="center" mb="6">
          <Text
            fontSize="xl"
            fontWeight="bold"
            color="white"
            textAlign="center"
            fontFamily={"roboto-light"}
          >
            Select a station and enjoy the music!
          </Text>
          <Icon as={Ionicons} name="musical-notes-outline" size="16" color="white" mt="4" />
        </VStack>
      </LinearGradient>
    );
  }


  const isFavorite = favorites.some(fav => fav.stationuuid === selectedStation.stationuuid);

  return (
    <LinearGradient
      colors={['#145DA0', '#E91E63']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <Box flex={1} p="4" justifyContent="center" alignItems="center">
        <Box mb="4" alignItems="center">
          <Image
            source={selectedStation.favicon ? { uri: selectedStation.favicon } : require('@/assets/images/rolex_radio.png')}
            alt={selectedStation.name}
            size="150px"
            borderRadius="full"
            mb="4"
          />
        </Box>

        <VStack alignItems="center" mb="6">
          <Text textTransform="uppercase" fontSize="2xl" fontWeight="bold" fontFamily={"roboto-bold"} color="white">
            {selectedStation.name}
          </Text>
          <Text textTransform="uppercase" fontSize="md" fontFamily={"roboto-light"} color="white">
            {selectedStation.country}
          </Text>
          <Text textTransform="uppercase" fontSize="md" fontFamily={"roboto-light"} color="white">
            {selectedStation.language}
          </Text>
        </VStack>

        {/* Heart Icon for adding/removing from favorites */}
        <Pressable onPress={() => toggleFavorite(selectedStation)} mb="8">
          <Icon as={Ionicons} name={isFavorite ? 'heart' : 'heart-outline'} size="8" color="white" />
        </Pressable>

        <HStack justifyContent="space-between" alignItems="center" width="70%" mb="6">
          {/* Previous Station */}
          <Pressable onPress={() => handleSwitchStation('prev')} p="2">
            <Icon as={Ionicons} name="play-skip-back" size="12" color="white" />
          </Pressable>
          {isBuffering ? (
            <ActivityIndicator size="large" color="white" />
          ) : (
            <Pressable onPress={() => togglePlayPause()} p="2">
              <Icon as={Ionicons} name={isPlaying ? 'pause-circle' : 'play-circle'} size="12" color="white" />
            </Pressable>
          )}

          {/* Next Station */}
          <Pressable onPress={() => handleSwitchStation('next')} p="2">
            <Icon as={Ionicons} name="play-skip-forward" size="12" color="white" />
          </Pressable>
        </HStack>
      </Box>
    </LinearGradient>
  );
};

export default PlayerScreen;
