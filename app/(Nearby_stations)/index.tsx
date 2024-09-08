import React, { useState, useEffect } from 'react';
import { FlatList, ActivityIndicator, Alert } from 'react-native';
import { Box, Text, VStack, HStack, Icon, Pressable, Input, Image } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { reverseGeocodeAsync } from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useRadioPlayer } from '@/components/RadioPlayerContext';

interface Station {
  name: string;
  votes: number;
  country: string;
  state: string;
  language: string;
  url: string;
  stationuuid: string;
  favicon?: string;
}

const NearbyStationsScreen = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<Station[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const router = useRouter();
  const { playRadio, selectedStation } = useRadioPlayer();

  useEffect(() => {
    getUserLocation();
    loadFavorites();
  }, []);

  // Function to get the user's location
  const getUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is needed to fetch nearby radio stations');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      let reverseGeocodedLocation = await reverseGeocodeAsync({ latitude, longitude });

      if (reverseGeocodedLocation.length > 0) {
        const locationDetails = reverseGeocodedLocation[0];
        fetchStationsByLocation(locationDetails.country, locationDetails.region, locationDetails.isoCountryCode);
      } else {
        Alert.alert('Location Error', 'Unable to fetch location details.');
        setLoading(false);
      }
    } catch (error) {
      console.error("Error getting user location:", error);
      Alert.alert('Error', 'Could not fetch location or language.');
      setLoading(false);
    }
  };

  // Fetch stations by country, state, and language
  const fetchStationsByLocation = async (country: string | null, state: string | null, isoCountryCode: string | null) => {
    setLoading(true);
    try {
      if (!country) {
        Alert.alert('Error', 'Country information is missing.');
        setLoading(false);
        return;
      }

      // Fetch stations by country
      const response = await fetch(`https://de1.api.radio-browser.info/json/stations/bycountry/${country}`);
      const data: Station[] = await response.json();

      // Filter stations by state
      const stateFilteredStations = data.filter((station) => station.state === state);
      const stationsToSet = stateFilteredStations.length > 0 ? stateFilteredStations : data;

      // Get the language from the first station (assuming all stations in this location have the same language)
      const stationLanguage = stationsToSet[0]?.language || null;

      // Fetch additional stations by language
      let languageStations: Station[] = [];
      if (stationLanguage) {
        const languageResponse = await fetch(`https://de1.api.radio-browser.info/json/stations/bylanguage/${stationLanguage}`);
        languageStations = await languageResponse.json();
      }

      // Combine the stations and sort by votes
      const combinedStations = [...stationsToSet, ...languageStations];
      const uniqueStations = Array.from(new Map(combinedStations.map(station => [station.stationuuid, station])).values());

      uniqueStations.sort((a, b) => b.votes - a.votes);
      setStations(uniqueStations);
    } catch (error) {
      console.error("Error fetching stations by location and language:", error);
      Alert.alert('Error', 'Could not fetch radio stations.');
    } finally {
      setLoading(false);
    }
  };

  // Load favorite stations from AsyncStorage
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

  // Save favorites to AsyncStorage
  const saveFavorites = async (updatedFavorites: Station[]) => {
    try {
      await AsyncStorage.setItem('favoriteStations', JSON.stringify(updatedFavorites));
      setFavorites(updatedFavorites);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  // Toggle station as a favorite
  const toggleFavorite = (station: Station) => {
    const isFavorite = favorites.some((fav) => fav.stationuuid === station.stationuuid);
    let updatedFavorites;

    if (isFavorite) {
      updatedFavorites = favorites.filter((fav) => fav.stationuuid !== station.stationuuid);
    } else {
      updatedFavorites = [...favorites, station];
    }

    saveFavorites(updatedFavorites);
  };

  // Check if the station is a favorite
  const isFavorite = (stationuuid: string) => {
    return favorites.some((fav) => fav.stationuuid === stationuuid);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    const filteredStations = stations.filter((station) => station.name.toLowerCase().includes(text.toLowerCase()));
    setStations(filteredStations);
  };

  // Handle station selection and navigation to the player screen
  const handleNavigateToPlayer = async (station: Station) => {
    try {
      await playRadio(station);  // Play the selected radio station

      // Safely stringify the selected station and stations
      const selectedStation = JSON.stringify(station);
      const stationList = JSON.stringify(stations);

      // Navigate to the player screen with serialized params
      router.push({
        pathname: '/(player)',
        params: {
          selectedStation,
          stations: stationList,
        },
      });
    } catch (error) {
      console.error("Error navigating to player:", error);
      Alert.alert('Error', 'Failed to navigate to player screen.');
    }
  };

  const renderStationItem = ({ item }: { item: Station }) => (
    <HStack alignItems="center" justifyContent="space-between" p="2" mb="2" bg="white" borderRadius="lg" shadow="2">
      <Pressable onPress={() => handleNavigateToPlayer(item)} flex={1} flexDirection="row" alignItems="center">
        <Image
          source={{ uri: item.favicon || '@/assets/images/rolex_radio.png' }}
          alt={item.name}
          size="50px"
          borderRadius="full"
          mr="4"
        />
        <VStack>
          <Text fontSize="lg" fontWeight="bold" color="#E91E63">{item.name}</Text>
          <Text fontSize="md" color="gray.500">{item.state ? `${item.state}, ${item.country}` : item.country} - {item.language}</Text>
        </VStack>
      </Pressable>
      <Pressable onPress={() => toggleFavorite(item)}>
        <Icon
          as={Ionicons}
          name={isFavorite(item.stationuuid) ? 'heart' : 'heart-outline'}
          size="6"
          color="#E91E63"
          ml="auto"
        />
      </Pressable>
    </HStack>
  );

  return (
    <LinearGradient
      colors={['#145DA0', '#E91E63']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <Box flex={1} p="4">
        <Text fontSize="2xl" fontWeight="bold" color="white" mb="4">Nearby Stations</Text>
        <VStack space={5}>
          <Input
            placeholder="Search stations..."
            value={searchQuery}
            onChangeText={handleSearch}
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

          {loading ? (
            <Box flex={1} justifyContent="center" alignItems="center">
              <ActivityIndicator size="large" color="#E91E63" />
            </Box>
          ) : stations.length > 0 ? (
            <FlatList
              data={stations}
              keyExtractor={(item, index) => `${item.stationuuid}-${index}`}
              renderItem={renderStationItem}
            />
          ) : (
            <Box flex={1} justifyContent="center" alignItems="center">
              <Text fontSize="lg" color="white" textAlign="center">
                No recommended stations found for your location.
              </Text>
            </Box>
          )}
        </VStack>
      </Box>
    </LinearGradient>
  );
};

export default NearbyStationsScreen;
