import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';

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

  const { country, language, genre } = useLocalSearchParams<{ country?: string; language?: string; genre?: string }>();
  const router = useRouter();

  useEffect(() => {
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
  }, [sound, country, language, genre]);

  const fetchStationsByCountry = async (country: string) => {
    try {
      const response = await fetch(`https://de1.api.radio-browser.info/json/stations/bycountry/${country}`);
      const data: Station[] = await response.json();
      setStations(data);
    } catch (error) {
      console.error("Error fetching stations:", error);
    }
  };

  const fetchStationsByLanguage = async (language: string) => {
    try {
      const response = await fetch(`https://de1.api.radio-browser.info/json/stations/bylanguage/${language}`);
      const data: Station[] = await response.json();
      setStations(data);
    } catch (error) {
      console.error("Error fetching stations:", error);
    }
  };

  const fetchStationsByGenre = async (genre: string) => {
    try {
      const response = await fetch(`https://de1.api.radio-browser.info/json/stations/bytag/${genre}`);
      const data: Station[] = await response.json();
      setStations(data);
    } catch (error) {
      console.error("Error fetching stations:", error);
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
    <View style={styles.container}>
      <Text style={styles.title}>
        Stations {country ? `in ${country}` : language ? `in ${language}` : genre ? `with genre ${genre}` : ''}
      </Text>
      <TextInput
        style={styles.searchBar}
        placeholder="Search stations..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#aaa"
      />
      <FlatList
        data={filteredStations}
        keyExtractor={(item) => item.stationuuid}
        renderItem={({ item }) => {
          const isFavorite = favorites.some(fav => fav.stationuuid === item.stationuuid);
          return (
            <TouchableOpacity style={styles.itemContainer} onPress={() => playRadio(item)}>
              <Text style={styles.item}>{item.name}</Text>
              <View style={styles.icons}>
                <TouchableOpacity onPress={() => toggleFavorite(item)}>
                  <Ionicons 
                    name={isFavorite ? "heart" : "heart-outline"} 
                    size={24} 
                    color="#E91E63" 
                  />
                </TouchableOpacity>
                {selectedStation?.stationuuid === item.stationuuid && isPlaying && (
                  <Ionicons name="volume-high" size={24} color="#E91E63" />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
      {selectedStation && (
        <View style={styles.stationInfo}>
          <Text style={styles.stationName}>{selectedStation.name}</Text>
          <Text style={styles.stationUrl}>{selectedStation.url}</Text>
          <View style={styles.controlPanel}>
            <TouchableOpacity onPress={() => switchStation('prev')} style={styles.controlButton}>
              <Ionicons name="play-back" size={32} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => playRadio(selectedStation)} style={styles.controlButton}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => switchStation('next')} style={styles.controlButton}>
              <Ionicons name="play-forward" size={32} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
    color: '#E91E63',
    textAlign: 'center',
  },
  searchBar: {
    width: '100%',
    padding: 12,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  item: {
    fontSize: 18,
    color: '#333',
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationInfo: {
    padding: 20,
    backgroundColor: '#E91E63',
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  stationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  stationUrl: {
    fontSize: 16,
    color: '#ddd',
  },
  controlPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '60%',
    marginTop: 20,
  },
  controlButton: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: '#333',
    alignItems: 'center',
  },
});

export default StationsScreen;
