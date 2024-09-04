import React, { useState, useEffect } from 'react';
import { FlatList } from 'react-native';
import { Box, Text, VStack, HStack, Pressable } from 'native-base';
import { Icon } from 'native-base';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient'; 
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
  const { playRadio, selectedStation } = useRadioPlayer();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('favoriteStations');
      if (jsonValue) {
        setFavoriteStations(JSON.parse(jsonValue));
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
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
    <Pressable onPress={() => handleStationSelect(item)}> 
      <HStack
        justifyContent="space-between"
        alignItems="center"
        p="4"
        bg="white"
        borderRadius="lg"
        mb="2"
        shadow="2"
      >
        <Text fontSize="lg" fontWeight="bold" color="#E91E63">
          {item.name}
        </Text>
        {selectedStation?.stationuuid === item.stationuuid && (
          <Icon name="volume-high" size="6" color="#E91E63" />
        )}
      </HStack>
    </Pressable>
  );

  return (
    <Box flex={1}>
      <LinearGradient
        colors={['#145DA0', '#E91E63']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 24 }}
      >
        <VStack space={5} flex={1}>
          <Text fontSize="2xl" fontWeight="600" color="white" textAlign="center">
            Favorite Stations
          </Text>

          <FlatList
            data={favoriteStations}
            keyExtractor={(item) => item.stationuuid}
            renderItem={renderStationItem}
          />
        </VStack>
      </LinearGradient>
    </Box>
  );
};

export default FavoritesScreen;
