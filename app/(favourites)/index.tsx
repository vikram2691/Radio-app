import React, { useState, useEffect } from 'react';
import { FlatList } from 'react-native';
import { Box, Text, VStack, HStack, Pressable, Image, Icon } from 'native-base';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient'; 
import { Ionicons } from '@expo/vector-icons';
import { useRadioPlayer } from '@/components/RadioPlayerContext';
import { router } from 'expo-router';

interface Station {
  stationuuid: string;
  name: string;
  url: string;
  country: string;
  language: string;
  favicon?: string;
}

const FavoritesScreen = () => {
  const [favoriteStations, setFavoriteStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { playRadio, selectedStation } = useRadioPlayer();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const jsonValue = await AsyncStorage.getItem('favoriteStations');
      if (jsonValue) {
        setFavoriteStations(JSON.parse(jsonValue));
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStationSelect = (station: Station) => {
    playRadio(station);
    router.push({ 
      pathname: '/(player)',
      params: { 
        selectedStation: JSON.stringify(station), // Pass the selected station as a JSON string
        stations: JSON.stringify(favoriteStations) // Pass the list of favorite stations as a JSON string
      } 
    });
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
          <Text fontSize="lg" fontFamily={"roboto-light"} fontWeight="bold" color="#E91E63">{item.name}</Text>
          <Text fontSize="md" fontFamily={"roboto-light"} color="gray.500">{item.country} - {item.language}</Text>
        </VStack>
        {selectedStation?.stationuuid === item.stationuuid && (
          <Icon as={Ionicons} name="volume-high" size="6" color="#E91E63" ml="auto" />
        )}
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
        <Text fontSize="2xl" fontWeight="bold" fontFamily={"roboto-bold"}color="white" mb="4">Favorite Stations</Text>
        {loading ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text color="white">Loading...</Text>
          </Box>
        ) : favoriteStations.length > 0 ? (
          <FlatList
            data={favoriteStations}
            keyExtractor={(item) => item.stationuuid}
            renderItem={renderStationItem}
          />
        ) : (
          // Fallback UI for when there are no favorite stations
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text fontSize="lg" color="white"  fontFamily={"roboto-light"} textAlign="center">
              No favorite stations added yet. Start exploring and add your favorite stations!
            </Text>
          </Box>
        )}
      </Box>
    </LinearGradient>
  );
};

export default FavoritesScreen;
