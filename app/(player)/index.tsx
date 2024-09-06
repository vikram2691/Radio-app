import React, { useState, useEffect } from 'react';
import { VStack, Text, Icon, Pressable, HStack, Box, Image } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useRadioPlayer } from '@/components/RadioPlayerContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const params = route.params as PlayerScreenParams;
  const { selectedStation: selectedStationString, stations: passedStationsString } = params;

  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const { isPlaying, togglePlayPause, switchStation } = useRadioPlayer();
  useEffect(() => {
    try {
      const selectedStationParsed = JSON.parse(selectedStationString) as Station;
      const stationsParsed = JSON.parse(passedStationsString) as Station[];
      setSelectedStation(selectedStationParsed);
      setStations(stationsParsed);
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  }, [selectedStationString, passedStationsString]);
  

  const addStationToRecent = async (station: Station) => {
    try {
      const storedStations = await AsyncStorage.getItem('recentStations');
      let recentStations: Station[] = storedStations ? JSON.parse(storedStations) : [];

      // Add the current station to the top of the list
      recentStations = [station, ...recentStations.filter(s => s.stationuuid !== station.stationuuid)];

      // Limit to 100 stations
      if (recentStations.length > 100) recentStations = recentStations.slice(0, 100);

      await AsyncStorage.setItem('recentStations', JSON.stringify(recentStations));
    } catch (error) {
      console.error('Error saving station to recent:', error);
    }
  };

  if (!selectedStation) return null;

  const handleSwitchStation = (direction: 'next' | 'prev') => {
    const newIndex = stations.indexOf(selectedStation) + (direction === 'next' ? 1 : -1);
    const newStation = stations[newIndex % stations.length];
    switchStation(direction, stations);
    setSelectedStation(newStation);
    addStationToRecent(newStation);
  };

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

        <HStack justifyContent="space-between" alignItems="center" width="60%" mb="4">
          <Pressable onPress={() => handleSwitchStation('prev')} p="2">
            <Icon as={Ionicons} name="play-back" size="8" color="white" />
          </Pressable>
          <Pressable onPress={() => togglePlayPause()} p="2">
            <Icon as={Ionicons} name={isPlaying ? 'pause' : 'play'} size="8" color="white" />
          </Pressable>
          <Pressable onPress={() => handleSwitchStation('next')} p="2">
            <Icon as={Ionicons} name="play-forward" size="8" color="white" />
          </Pressable>
        </HStack>
      </Box>
    </LinearGradient>
  );
};

export default PlayerScreen;
