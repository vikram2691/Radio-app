import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FlatList, ActivityIndicator, Alert } from 'react-native';
import { Box, Text, VStack, HStack, Icon, Pressable, Input, Image, Modal, Button, ScrollView } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
interface Language {
  name: string;
  stationcount: number;
}
const NearbyStationsScreen = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<Station[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [storedLanguage, setStoredLanguage] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null); 
  const [isNavigating, setIsNavigating] = useState<boolean>(false); 
  const router = useRouter();
  const { playRadio } = useRadioPlayer();
  const [navigationCount, setNavigationCount] = useState<number>(0);
  const [isAdLoaded, setIsAdLoaded] = useState<boolean>(false);
  const interstitialAd = useRef(InterstitialAd.createForAdRequest("ca-app-pub-2271509461492480/9903351347")).current; 
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState<boolean>(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState<boolean>(true);
  const [languageSearchQuery, setLanguageSearchQuery] = useState<string>('')
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
  useEffect(() => {
    if (isLanguageModalVisible) {
      fetchLanguages();
    }
  }, [isLanguageModalVisible]);
  
  const loadStoredLanguage = async () => {
    try {
      const language = await AsyncStorage.getItem('preferredLanguage');
      if (language) {
        setStoredLanguage(language);
        fetchStationsByLanguage(language);
      } else {
        setStoredLanguage('English'); // Default to 'English' if no stored language
        fetchStationsByLanguage('English');
       setIsLanguageModalVisible(true);
       fetchLanguages();
      }
    } catch (error) {
      console.error('Error loading stored language:', error);
      setStoredLanguage('English');
      fetchStationsByLanguage('English');
    }
  };
  const fetchLanguages = async () => {
    setLoadingLanguages(true); // Set loading to true when starting to fetch languages
    try {
      const response = await fetch('https://de1.api.radio-browser.info/json/languages');
      const languagesData: Language[] = await response.json();

      const languagesWithCounts = languagesData
        .filter((language) => language.name && language.stationcount)
        .map((language) => ({
          name: language.name,
          stationcount: language.stationcount,
        }));
      languagesWithCounts.sort((a, b) => b.stationcount - a.stationcount);
      setLanguages(languagesWithCounts);
    } catch (error) {
      console.error('Error fetching languages:', error);
      Alert.alert('Error', 'Could not load languages.');
    } finally {
      setLoadingLanguages(false); // Set loading to false after fetching languages
    }
  };


  const fetchStationsByLanguage = async (language: string) => {
    setLoading(true);
    try {
      const response = await fetch(`https://de1.api.radio-browser.info/json/stations/bylanguage/${language}`);
      const data: Station[] = await response.json();
      const shuffledStations = shuffleArray(data);
      setStations(shuffledStations);
     
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
  const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
  };
  
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {      
      fetchStationsByLanguage(storedLanguage || 'English'); 
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
const handleLanguageSelection = async (selectedLanguage: string | null) => {
  // If no language is selected, default to "English"
  const languageToFetch = selectedLanguage || 'English';

  setIsLanguageModalVisible(false);
  await fetchStationsByLanguage(languageToFetch);
  setStoredLanguage(languageToFetch);
  await AsyncStorage.setItem('preferredLanguage', languageToFetch); // Store selected language
};


const filteredLanguages = languages.filter((language) =>
  language.name.toLowerCase().includes(languageSearchQuery.toLowerCase())
);
const renderItem = ({ item }) => (
  <Pressable onPress={() => handleLanguageSelection(item.name)}>
    <HStack justifyContent="space-between" py="2">
      <Text fontSize="md" color="white">{item.name}</Text>
      <Text fontSize="sm" color="gray.500">{item.stationcount} stations</Text>
    </HStack>
  </Pressable>
);
// Render each language item
const renderLanguageItem = ({ item }: { item: string }) => (
  <Pressable onPress={() => handleLanguageSelection(item)} p="3" mb="2" bg="blueGray.700" borderRadius="md">
    <Text color="white" fontSize="md" textAlign="center">
      {item}
    </Text>
  </Pressable>
);

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
      <Pressable onPress={() => toggleFavorite(item)} p="3"> 
        <Icon
          as={Ionicons}
          name={isFavorite(item.stationuuid) ? 'heart' : 'heart-outline'}
          size="6"
          color={selectedStation?.stationuuid === item.stationuuid ? 'white' : '#E91E63'}
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
      <Text fontSize="2xl" fontWeight="bold" fontFamily="roboto-bold" color="white" mb="4">Nearby Stations</Text>
      <Button
          onPress={() => setIsLanguageModalVisible(true)}
          bg="blueGray.700"
          mb="4"
          colorScheme="blue"
          leftIcon={<Icon as={Ionicons} name="language" size="5" color="white" />}
        >
          Choose Language
        </Button>
        <Modal isOpen={isLanguageModalVisible} onClose={() => setIsLanguageModalVisible(false)}>
      <Modal.Content maxWidth="400px" bg="blueGray.800" borderRadius="lg" p="4" shadow="5">
        <Modal.Header textAlign="center" _text={{ color: '#E91E63', fontWeight: 'bold' }}>
          Select Language
        </Modal.Header>
        
      
        <FlatList
          data={loadingLanguages ? [{ loading: true }] : filteredLanguages}
          keyExtractor={(item) => item.name || "loading"}
          renderItem={({ item }) => {
            if (item.loading) {
              return (
                <Box flex={1} justifyContent="center" alignItems="center">
                  <ActivityIndicator size="large" color="#E91E63" />
                  <Text color="white" mt="4">Loading languages...</Text>
                </Box>
              );
            }
            return renderItem({ item });
          }}
          ListHeaderComponent={
            <Input
              placeholder="Search for a language..."
              value={languageSearchQuery}
              onChangeText={setLanguageSearchQuery}
              mb="4"
              bg="blueGray.700"
              borderRadius="md"
              color="white"
            />
          }
          ListEmptyComponent={<Text color="white">No languages found.</Text>}
          showsVerticalScrollIndicator={false}
        />

        <Modal.Footer>
          <Button
            bg="blueGray.700"
            onPress={() => setIsLanguageModalVisible(false)}
            colorScheme="blue"
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>




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
