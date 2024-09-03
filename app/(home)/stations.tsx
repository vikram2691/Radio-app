import React, { useState, useEffect } from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
import { Box, Text, Input, VStack, HStack, Button, Icon, Pressable } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface Station {
  stationuuid: string;
  name: string;
  url: string;
  country: string;
}

const StationsScreen = () => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Added loading state

  const { country, language, genre } = useLocalSearchParams<{ country?: string; language?: string; genre?: string }>();
  const router = useRouter();

  useEffect(() => {
    console.log("useEffect triggered with params:", { country, language, genre });

    if (country) {
      fetchStationsByCountry(country);
    } else if (language) {
      fetchStationsByLanguage(language);
    } else if (genre) {
      fetchStationsByGenre(genre);
    }
    loadFavorites();

    return () => {
      if (sound) {
        sound.unloadAsync().catch((error) => console.error("Error unloading sound:", error));
      }
    };
  }, [country, language, genre]);

  const fetchStationsByCountry = async (country: string) => {
    setLoading(true); // Set loading to true before fetching
    try {
      const response = await fetch(`https://de1.api.radio-browser.info/json/stations/bycountry/${country}`);
      const data: Station[] = await response.json();
      console.log("Stations fetched by country:", data);
      setStations(data);
    } catch (error) {
      console.error("Error fetching stations by country:", error);
    } finally {
      setLoading(false); // Set loading to false after fetching
    }
  };

  const fetchStationsByLanguage = async (language: string) => {
    setLoading(true); // Set loading to true before fetching
    try {
      const response = await fetch(`https://de1.api.radio-browser.info/json/stations/bylanguage/${language}`);
      const data: Station[] = await response.json();
      console.log("Stations fetched by language:", data);
      setStations(data);
    } catch (error) {
      console.error("Error fetching stations by language:", error);
    } finally {
      setLoading(false); // Set loading to false after fetching
    }
  };

  const fetchStationsByGenre = async (genre: string) => {
    setLoading(true); // Set loading to true before fetching
    try {
      const response = await fetch(`https://de1.api.radio-browser.info/json/stations/bytag/${genre}`);
      const data: Station[] = await response.json();
      console.log("Stations fetched by genre:", data);
      setStations(data);
    } catch (error) {
      console.error("Error fetching stations by genre:", error);
    } finally {
      setLoading(false); // Set loading to false after fetching
    }
  };

  const loadFavorites = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('favoriteStations');
      if (jsonValue) {
        setFavorites(JSON.parse(jsonValue));
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  };

  const saveFavorites = async (stations: Station[]) => {
    try {
      const jsonValue = JSON.stringify(stations);
      await AsyncStorage.setItem('favoriteStations', jsonValue);
      setFavorites(stations);
    } catch (error) {
      console.error("Error saving favorites:", error);
    }
  };

  const toggleFavorite = (station: Station) => {
    const isFavorite = favorites.some(fav => fav.stationuuid === station.stationuuid);
    const updatedFavorites = isFavorite 
      ? favorites.filter(fav => fav.stationuuid !== station.stationuuid)
      : [...favorites, station];
    
    saveFavorites(updatedFavorites);
  };

  const playRadio = async (station: Station) => {
    if (selectedStation?.stationuuid === station.stationuuid) {
      if (sound && isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else if (sound && !isPlaying) {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      setSelectedStation(station);
      if (sound) {
        try {
          await sound.unloadAsync();
          setIsPlaying(false);
        } catch (error) {
          console.error("Error unloading sound:", error);
        }
      }
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: station.url },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);
      } catch (error) {
        console.error("Error creating sound:", error);
        alert("Unable to play this station. Please try another one.");
      }
    }
  };

  const switchStation = (direction: 'next' | 'prev') => {
    if (!selectedStation) return;

    const currentIndex = stations.findIndex(station => station.stationuuid === selectedStation.stationuuid);
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % stations.length 
      : (currentIndex - 1 + stations.length) % stations.length;

    const newStation = stations[newIndex];
    playRadio(newStation);
  };

  const filteredStations = stations.filter(station =>
    station.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box flex={1}>
      <LinearGradient
        colors={['#145DA0', '#E91E63']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 24 }}
      >
        <VStack space={5}>
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
          />

          {loading ? (
            <Box flex={1} justifyContent="center" alignItems="center">
              <ActivityIndicator size="large" color="#E91E63" />
            </Box>
          ) : (
            <FlatList
              data={filteredStations}
              keyExtractor={(item) => item.stationuuid}
              renderItem={({ item }) => {
                const isFavorite = favorites.some(fav => fav.stationuuid === item.stationuuid);
                return (
                  <Pressable 
                    onPress={() => playRadio(item)} 
                    bg="white" 
                    p="4" 
                    mb="2" 
                    borderRadius="lg" 
                    shadow="2"
                  >
                    <HStack justifyContent="space-between" alignItems="center">
                      <Text fontSize="lg" fontWeight="bold" color="#E91E63">{item.name}</Text>
                      <HStack space={3} alignItems="center">
                        <Pressable onPress={() => toggleFavorite(item)}>
                          <Icon 
                            as={Ionicons} 
                            name={isFavorite ? "heart" : "heart-outline"} 
                            size="6" 
                            color="#E91E63" 
                          />
                        </Pressable>
                        {selectedStation?.stationuuid === item.stationuuid && isPlaying && (
                          <Icon as={Ionicons} name="volume-high" size="6" color="#E91E63" />
                        )}
                      </HStack>
                    </HStack>
                  </Pressable>
                );
              }}
            />
          )}

          {selectedStation && (
            <VStack space={3} bg="#E91E63" p="4" borderRadius="lg" shadow="2">
              <Text fontSize="lg" fontWeight="bold" color="white">{selectedStation.name}</Text>
              <Text fontSize="sm" color="white">{selectedStation.url}</Text>
              <HStack justifyContent="space-between" mt="4">
                <Pressable onPress={() => switchStation('prev')} p="3" borderRadius="full" bg="white">
                  <Icon as={Ionicons} name="play-back" size="6" color="#E91E63" />
                </Pressable>
                <Pressable 
                  onPress={() => {
                    if (isPlaying) {
                      sound?.pauseAsync();
                      setIsPlaying(false);
                    } else {
                      sound?.playAsync();
                      setIsPlaying(true);
                    }
                  }} 
                  p="3" 
                  borderRadius="full" 
                  bg="white"
                >
                  <Icon 
                    as={Ionicons} 
                    name={isPlaying ? "pause" : "play"} 
                    size="6" 
                    color="#E91E63" 
                  />
                </Pressable>
                <Pressable onPress={() => switchStation('next')} p="3" borderRadius="full" bg="white">
                  <Icon as={Ionicons} name="play-forward" size="6" color="#E91E63" />
                </Pressable>
              </HStack>
            </VStack>
          )}
        </VStack>
      </LinearGradient>
    </Box>
  );
};

export default StationsScreen;
