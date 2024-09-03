import React, { useState, useEffect } from 'react';
import { FlatList } from 'react-native';
import { Box, Text, VStack, HStack, Button,  Pressable } from 'native-base';
import { Icon } from 'native-base';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient'; 

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

  const renderStationItem = ({ item, index }: { item: Station; index: number }) => (
    <Pressable onPress={() => playRadio(index)}>
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
        {currentStationIndex === index && isPlaying && (
          <Icon  name="volume-high" size="6" color="#E91E63" />
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

          {currentStationIndex !== null && (
            <Box
              p="4"
              bg="#E91E63"
              borderRadius="lg"
              mb="4"
              shadow="3"
              alignItems="center"
            >
              <Text fontSize="lg" fontWeight="bold" color="white">
                {favoriteStations[currentStationIndex].name}
              </Text>
              <Text fontSize="md" color="gray.200">
                {favoriteStations[currentStationIndex].url}
              </Text>
              <HStack space={6} mt="4">
                <Button
                  onPress={handlePreviousStation}
                  bg="white"
                  borderRadius="full"
                  _icon={{  name: "play-skip-back", color: "#E91E63", size: "lg" }}
                  _text={{ color: "#E91E63" }}
                />
                <Button
                  onPress={() => playRadio(currentStationIndex)}
                  bg="white"
                  borderRadius="full"
                  _icon={{
                    
                    name: isPlaying ? "pause" : "play",
                    color: "#E91E63",
                    size: "lg",
                  }}
                  _text={{ color: "#E91E63" }}
                />
                <Button
                  onPress={handleNextStation}
                  bg="white"
                  borderRadius="full"
                  _icon={{  name: "play-skip-forward", color: "#E91E63", size: "lg" }}
                  _text={{ color: "#E91E63" }}
                />
              </HStack>
            </Box>
          )}
        </VStack>
      </LinearGradient>
    </Box>
  );
};

export default FavoritesScreen;
