import React, { useState, useEffect } from 'react';
import { VStack, Text, Icon, Pressable, HStack, Box, Image, FlatList } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useRadioPlayer } from '@/components/RadioPlayerContext';

type Station = {
  favicon: string;
  name: string;
  country: string;
  language: string;
  stationuuid: string;
  url: string;
};

const RecentlyPlayedScreen: React.FC = () => {
  const [recentStations, setRecentStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigation = useNavigation();
  const { playRadio } = useRadioPlayer();

  useEffect(() => {
    loadRecentStations();
  }, []);

  const loadRecentStations = async () => {
    try {
      setLoading(true);
      const storedStations = await AsyncStorage.getItem('recentStations');
      if (storedStations) {
        setRecentStations(JSON.parse(storedStations));
      }
    } catch (error) {
      console.error('Error loading recent stations:', error);
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
        stations: JSON.stringify(recentStations) // Pass the list of favorite stations as a JSON string
      } 
    });
  };

  const renderStationItem = ({ item }: { item: Station }) => (
    <Pressable onPress={() => handleStationSelect(item)} p="2" mb="2" bg="white" borderRadius="lg" shadow="2">
      <HStack alignItems="center">
        <Image
          source={{ uri: item.favicon || '@/assets/images/rolex_radio.png' }}
          alt={item.name}
          size="50px"
          borderRadius="full"
          mr="4"
        />
        <VStack>
          <Text fontSize="lg" fontWeight="bold" color="#E91E63">{item.name}</Text>
          <Text fontSize="md" color="gray.500">{item.country} - {item.language}</Text>
        </VStack>
        <Icon as={Ionicons} name="chevron-forward-outline" size="6" color="#E91E63" ml="auto" />
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
        <Text fontSize="2xl" fontWeight="bold" color="white" mb="4">Recently Played</Text>
        {loading ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text color="white">Loading...</Text>
          </Box>
        ) : recentStations.length > 0 ? (
          <FlatList
            data={recentStations}
            keyExtractor={(item) => item.stationuuid}
            renderItem={renderStationItem}
          />
        ) : (
          
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text fontSize="lg" color="white">No recently played stations available. Start listening to your favorite channels!</Text>
          </Box>
        )}
      </Box>
    </LinearGradient>
  );
};

export default RecentlyPlayedScreen;
