import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Station {
  stationuuid: string;
  name: string;
  url: string;
  country: string;
}

const FavoritesScreen = () => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [favoriteStations, setFavoriteStations] = useState<Station[]>([]);
  const [currentStationIndex, setCurrentStationIndex] = useState<number | null>(null);

  useEffect(() => {
    loadFavorites();

    return () => {
      if (sound) {
        sound.unloadAsync().catch((error) => console.error("Error unloading sound:", error));
      }
    };
  }, [sound]);

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

  const playRadio = async (index: number) => {
    const station = favoriteStations[index];
    if (currentStationIndex === index) {
      if (sound && isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else if (sound && !isPlaying) {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } else {
      setCurrentStationIndex(index);
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

  const handleNextStation = () => {
    if (currentStationIndex !== null && currentStationIndex < favoriteStations.length - 1) {
      playRadio(currentStationIndex + 1);
    }
  };

  const handlePreviousStation = () => {
    if (currentStationIndex !== null && currentStationIndex > 0) {
      playRadio(currentStationIndex - 1);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Favorite Stations</Text>
      <FlatList
        data={favoriteStations}
        keyExtractor={(item) => item.stationuuid}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.itemContainer} onPress={() => playRadio(index)}>
            <Text style={styles.item}>{item.name}</Text>
            {currentStationIndex === index && isPlaying && (
              <Ionicons name="volume-high" size={24} color="#E91E63" />
            )}
          </TouchableOpacity>
        )}
      />
      {currentStationIndex !== null && (
        <View style={styles.stationInfo}>
          <Text style={styles.stationName}>{favoriteStations[currentStationIndex].name}</Text>
          <Text style={styles.stationUrl}>{favoriteStations[currentStationIndex].url}</Text>
          <View style={styles.controlPanel}>
            <TouchableOpacity onPress={handlePreviousStation} style={styles.controlButton}>
              <Ionicons name="play-skip-back" size={32} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => playRadio(currentStationIndex)} style={styles.controlButton}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNextStation} style={styles.controlButton}>
              <Ionicons name="play-skip-forward" size={32} color="white" />
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
    width: '80%',
    marginTop: 20,
  },
  controlButton: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: '#333',
    alignItems: 'center',
  },
});

export default FavoritesScreen;