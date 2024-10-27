import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FlatList, ActivityIndicator, Alert } from 'react-native';
import { Box, Text, VStack, HStack, Icon, Pressable, Input, Image } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { reverseGeocodeAsync } from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useRadioPlayer } from '@/components/RadioPlayerContext';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
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
  const [storedLanguage, setStoredLanguage] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null); // New state
  const [isNavigating, setIsNavigating] = useState<boolean>(false); // New state
  const router = useRouter();
  const { playRadio } = useRadioPlayer();
  const [navigationCount, setNavigationCount] = useState<number>(0);
  const [isAdLoaded, setIsAdLoaded] = useState<boolean>(false);
  const interstitialAd = useRef(InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL)).current; 
  useEffect(() => {   
    loadFavorites();
    loadStoredLanguage();
  }, []);
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
  const loadStoredLanguage = async () => {
    try {
      const language = await AsyncStorage.getItem('preferredLanguage');
      if (language) {
        setStoredLanguage(language);
        fetchStationsByLanguage(language);
      } else {
        getUserLocation();
      }
    } catch (error) {
      console.error('Error loading stored language:', error);
    }
  };

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

  const fetchStationsByLocation = async (country: string | null, state: string | null, isoCountryCode: string | null) => {
    setLoading(true);
    try {
      if (!country) {
        Alert.alert('Error', 'Country information is missing.');
        setLoading(false);
        return;
      }

      const response = await fetch(`https://de1.api.radio-browser.info/json/stations/bycountry/${country}`);
      const data: Station[] = await response.json();

      const stateFilteredStations = data.filter((station) => station.state === state);
      const stationsToSet = stateFilteredStations.length > 0 ? stateFilteredStations : data;

      const stationLanguage = stationsToSet[0]?.language || null;
      if (stationLanguage) {
        await AsyncStorage.setItem('preferredLanguage', stationLanguage);
        setStoredLanguage(stationLanguage);
      }

      let languageStations: Station[] = [];
      if (stationLanguage) {
        const languageResponse = await fetch(`https://de1.api.radio-browser.info/json/stations/bylanguage/${stationLanguage}`);
        languageStations = await languageResponse.json();
      }
      
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

  const fetchStationsByLanguage = async (language: string) => {
    setLoading(true);
    try {
      const response = await fetch(`https://de1.api.radio-browser.info/json/stations/bylanguage/${language}`);
      const data: Station[] = await response.json();
      data.sort((a, b) => b.votes - a.votes); 
      setStations(data);
    } catch (error) {
      console.error('Error fetching stations by language:', error);
      Alert.alert('Error', 'Could not fetch radio stations by language.');
    } finally {
      setLoading(false);
    }
  };

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

  const saveFavorites = async (updatedFavorites: Station[]) => {
    try {
      await AsyncStorage.setItem('favoriteStations', JSON.stringify(updatedFavorites));
      setFavorites(updatedFavorites);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

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

  const isFavorite = (stationuuid: string) => {
    return favorites.some((fav) => fav.stationuuid === stationuuid);
  };

  const fetchStationsBySearchQuery = async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch(`https://de1.api.radio-browser.info/json/stations/search?name=${query}`);
      const data: Station[] = await response.json();
      setStations(data);
    } catch (error) {
      console.error('Error fetching stations by search query:', error);
      Alert.alert('Error', 'Could not fetch radio stations by search query.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {      
      fetchStationsByLanguage(storedLanguage); // Use stored language if search is cleared
    } else {
      fetchStationsBySearchQuery(text);
    }
  };
  const handleNavigateToPlayer = async (station: Station) => {
    setIsNavigating(true);
    setSelectedStation(station);
    
    setNavigationCount((prevCount) => prevCount + 1);

    // Show the ad if the user has navigated to the player screen an even number of times
    if (navigationCount % 2 === 1) {
        if (interstitialAd.loaded) {
            interstitialAd.show();
        } else {
            console.log("Ad wasn't loaded");
        }
    }
    try {
        // Start loading the radio
        await playRadio(station);

        const selectedIndex = stations.findIndex((s) => s.stationuuid === station.stationuuid);
        const start = Math.max(0, selectedIndex - 20);
        const end = Math.min(stations.length, selectedIndex + 20 + 1);
        
        const nearbyStations = stations.slice(start, end);
        
        const selectedStation = JSON.stringify(station);
        const stationList = JSON.stringify(nearbyStations);
        
        await router.push({
            pathname: '/(player)',
            params: {
                selectedStation,
                stations: stationList,
            },
        });
    } catch (error) {
        console.error("Error navigating to player:", error);
        Alert.alert('Error', 'Failed to navigate to player screen.');
    } finally {
       
        setSelectedStation(null);
         // Reset states after navigation
         setIsNavigating(false);
    }
};


  const renderStationItem = useCallback(({ item }: { item: Station }) => (
    <HStack
      alignItems="center"
      justifyContent="space-between"
      p="2"
      mb="2"
      bg={selectedStation?.stationuuid === item.stationuuid ? '#E91E63' : 'white'}
      borderRadius="lg"
      shadow="2"
    >
      <Pressable onPress={() => handleNavigateToPlayer(item)} flex={1} flexDirection="row" alignItems="center">
        <Image
          source={item.favicon ? { uri: item.favicon } : require('@/assets/images/rolex_radio.png')}
          alt={item.name}
          size="50px"
          borderRadius="full"
          mr="4"
        />
        <VStack>
          <Text fontSize="lg" fontFamily={"roboto-light"}fontWeight="bold" color={selectedStation?.stationuuid === item.stationuuid ? 'white' : '#E91E63'}>
            {item.name}
          </Text>
          <Text fontSize="md" fontFamily={"roboto-light"} color={selectedStation?.stationuuid === item.stationuuid ? 'white' : 'gray.500'}>
            {item.state ? `${item.state}, ${item.country}` : item.country} - {item.language}
          </Text>
        </VStack>
      </Pressable>
      <Pressable onPress={() => toggleFavorite(item)}>
        <Icon
          as={Ionicons}
          name={isFavorite(item.stationuuid) ? 'heart' : 'heart-outline'}
          size="6"
          color={selectedStation?.stationuuid === item.stationuuid ? 'white' : '#E91E63'}
          ml="auto"
        />
      </Pressable>
    </HStack>
  ), [favorites, stations, selectedStation]);

  return (
    <LinearGradient
      colors={['#145DA0', '#E91E63']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <Box flex={1} p="4">
        <Text fontSize="2xl" fontWeight="bold" fontFamily="roboto-bold"color="white" mb="4">Nearby Stations</Text>
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

{loading || isNavigating ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text color="white" fontFamily={"roboto-light"} fontSize="lg" mb="4">
              {isNavigating ? "Connecting to the station. Please wait and enjoy the music..." : "Loading..."}
            </Text>
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
