import React, { useState, useEffect } from 'react';
import { VStack, Text, Icon, Pressable, HStack, Box, Image } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useRadioPlayer } from '@/components/RadioPlayerContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native'; // For pop-up alerts

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
  const { isPlaying, togglePlayPause, switchStation } = useRadioPlayer();

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
    switchStation(direction, stations);
    setSelectedStation(newStation);
    addStationToRecent(newStation);
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
          <Text textTransform="uppercase" fontSize="2xl" fontWeight="bold" fontFamily="Satoshi-Bold" color="white">
            {selectedStation.name}
          </Text>
          <Text textTransform="uppercase" fontSize="md" fontFamily="Satoshi-Bold" color="white">
            {selectedStation.country}
          </Text>
          <Text textTransform="uppercase" fontSize="md" fontFamily="Satoshi-Bold" color="white">
            {selectedStation.language}
          </Text>
        </VStack>

        {/* Heart Icon for adding/removing from favorites */}
        <Pressable onPress={() => toggleFavorite(selectedStation)} mb="6">
          <Icon as={Ionicons} name={isFavorite ? 'heart' : 'heart-outline'} size="8" color="white" />
        </Pressable>

        <HStack justifyContent="space-between" alignItems="center" width="60%" mb="4">
          {/* Previous Station */}
          <Pressable onPress={() => handleSwitchStation('prev')} p="2">
            <Icon as={Ionicons} name="play-skip-back" size="8" color="white" />
          </Pressable>

          {/* Play / Pause */}
          <Pressable onPress={() => togglePlayPause()} p="2">
            <Icon as={Ionicons} name={isPlaying ? 'pause-circle' : 'play-circle'} size="8" color="white" />
          </Pressable>

          {/* Next Station */}
          <Pressable onPress={() => handleSwitchStation('next')} p="2">
            <Icon as={Ionicons} name="play-skip-forward" size="8" color="white" />
          </Pressable>
        </HStack>
      </Box>
    </LinearGradient>
  );
};

export default PlayerScreen;
