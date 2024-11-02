import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VStack, Text, Icon, Pressable, HStack, Box, Image, FlatList, Input } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRadioPlayer } from '@/components/RadioPlayerContext';
import { ActivityIndicator, Alert } from 'react-native';

interface Station {
  stationuuid: string;
  name: string;
  url: string;
  country: string;
  language: string;
  favicon: string;
}

const StationsScreen = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);

  const { country, language, genre } = useLocalSearchParams<{ country?: string; language?: string; genre?: string }>();
  const router = useRouter();
  const { playRadio } = useRadioPlayer();
 

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch stations data
  const fetchStations = useCallback(async (type: string, query: string) => {
    setLoading(true);
    try {
          const response = await fetch(`https://de1.api.radio-browser.info/json/stations/${type}/${query}?limit=1000&order=votes&reverse=true`);
      const data: Station[] = await response.json();
      setStations(data);
     
    } catch (error) {
      console.error(`Error fetching stations by ${type}:`, error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStationsBySearchQuery = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch(`https://de1.api.radio-browser.info/json/stations/search?name=${query}`);
      const data: Station[] = await response.json();
      setStations(data);
    } catch (error) {
      console.error('Error fetching stations by search query:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search logic
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      searchQuery ? fetchStationsBySearchQuery(searchQuery) : country ? fetchStations('bycountry', country) : language ? fetchStations('bylanguage', language) : genre && fetchStations('bytag', genre);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, country, language, genre, fetchStations, fetchStationsBySearchQuery]);

  useEffect(() => {
    country ? fetchStations('bycountry', country) : language ? fetchStations('bylanguage', language) : genre && fetchStations('bytag', genre);
    loadFavorites();
  }, [country, language, genre, fetchStations]);

  // Manage favorites
  const loadFavorites = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('favoriteStations');
      if (jsonValue) setFavorites(JSON.parse(jsonValue));
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
    const updatedFavorites = favorites.some(fav => fav.stationuuid === station.stationuuid)
      ? favorites.filter(fav => fav.stationuuid !== station.stationuuid)
      : [...favorites, station];

    saveFavorites(updatedFavorites);
  };

  // Handle station selection
  const handleStationSelect = async (station: Station) => {
    setIsNavigating(true);
    try {
      await playRadio(station);

      const selectedIndex = stations.findIndex(s => s.stationuuid === station.stationuuid);
      const nearbyStations = stations.slice(Math.max(0, selectedIndex - 10), Math.min(stations.length, selectedIndex + 10 + 1));

      router.push({
        pathname: '/(player)',
        params: { selectedStation: JSON.stringify(station), stations: JSON.stringify(nearbyStations) },
      });
    } catch (error) {
      console.error('Error navigating to player:', error);
      Alert.alert('Error', 'Failed to navigate to player screen.');
    } finally {
      setIsNavigating(false);
    }
  };

  // Render each station item
  const renderStationItem = ({ item }: { item: Station }) => {
    const isFavorite = favorites.some(fav => fav.stationuuid === item.stationuuid);

    return (
        <Pressable onPress={() => handleStationSelect(item)} p="2" mb="2" bg="white" borderRadius="lg" shadow="2">
            <HStack alignItems="center" justifyContent="space-between"> 
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
                </HStack>
                <Pressable onPress={() => toggleFavorite(item)}>
                    <Icon as={Ionicons} name={isFavorite ? 'heart' : 'heart-outline'} size="6" color="#E91E63" />
                </Pressable>
            </HStack>
        </Pressable>
    );
};


  return (
    <LinearGradient colors={['#145DA0', '#E91E63']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <Box flex={1} p="4">
        <Text fontSize="2xl" fontFamily="roboto-bold" fontWeight="bold" color="white" mb="4">Stations</Text>

        <Input
          placeholder="Search stations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="gray.500"
          bg="white"
          borderRadius="full"
          px="4"
          py="3"
          borderWidth={1}
          borderColor="gray.300"
          shadow="2"
          mb="4"
        />

        {loading || isNavigating ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text color="white" fontFamily="roboto-light" fontSize="lg" mb="4">
              {isNavigating ? "Connecting to the station. Please wait..." : "Loading..."}
            </Text>
            <ActivityIndicator size="large" color="#E91E63" />
          </Box>
        ) : stations.length > 0 ? (
          <FlatList
            data={stations}
            keyExtractor={(item) => item.stationuuid}
            renderItem={renderStationItem}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={21}
            removeClippedSubviews
            getItemLayout={(data, index) => ({ length: 80, offset: 80 * index, index })}
          />
        ) : (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text fontSize="lg" fontFamily="roboto-light" color="white">No stations found</Text>
          </Box>
        )}
      </Box>
    </LinearGradient>
  );
};

export default StationsScreen;
