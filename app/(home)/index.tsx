import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
import { Box, Text, Input, VStack, HStack, Button, Icon, Pressable } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import debounce from 'lodash.debounce'; // Use lodash debounce for optimizing search

interface Country {
  name: string;
  code: string;
}

interface Language {
  name: string;
  stationcount: number;
}

interface Genre {
  name: string;
  stationcount: number;
}

interface Station {
  name: string;
  votes: number;
  country: string;
  language: string;
}

const HomeScreen = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [recommended, setRecommended] = useState<Station[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tab, setTab] = useState<'countries' | 'languages' | 'genres' | 'recommended'>('countries');
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState(1); // Pagination page state
  const router = useRouter();

  useEffect(() => {
    fetchCountries();
    fetchLanguages();
    fetchGenres();
    fetchRecommended();
  }, []);

  useEffect(() => {
    setSearchQuery(''); // Clear search query when tab changes
  }, [tab]);

  const fetchCountries = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://de1.api.radio-browser.info/json/countries');
      const data: Country[] = await response.json();
      setCountries(data);
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLanguages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://de1.api.radio-browser.info/json/languages`);
      const data: Language[] = await response.json();
      setLanguages(data.sort((a, b) => b.stationcount - a.stationcount));
    } catch (error) {
      console.error("Error fetching languages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGenres = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://de1.api.radio-browser.info/json/tags');
      const data: Genre[] = await response.json();
      setGenres(data.sort((a, b) => b.stationcount - a.stationcount));
    } catch (error) {
      console.error("Error fetching genres:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommended = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://de1.api.radio-browser.info/json/stations/topvote/100');
      const data: Station[] = await response.json();
      setRecommended(data);
    } catch (error) {
      console.error("Error fetching recommended stations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search input to optimize search performance
  const debouncedSearch = useCallback(
    debounce((query) => {
      setSearchQuery(query);
    }, 300),
    []
  );

  const filterCountries = () => {
    return searchQuery
      ? countries.filter((country) => country.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : countries;
  };

  const filterLanguages = () => {
    return searchQuery
      ? languages.filter((language) => language.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : languages;
  };

  const filterGenres = () => {
    return searchQuery
      ? genres.filter((genre) => genre.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : genres;
  };

  const filterRecommended = () => {
    return searchQuery
      ? recommended.filter((station) => station.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : recommended;
  };

  // Optimize rendering by memoizing list items
  const renderItem = useCallback(
    ({ item }: { item: Country | Language | Genre | Station }) => {
      if ('iso_3166_1' in item) {
        return (
          <Pressable onPress={() => router.push({ pathname: '/stations', params: { country: item.name } })}>
            <HStack justifyContent="space-between" alignItems="center" p="4" bg="white" borderRadius="lg" mb="2" shadow="2">
              <Text fontSize="lg" fontWeight="bold" color="#E91E63">{item.name}</Text>
              <Icon as={Ionicons} name="chevron-forward-outline" size="6" color="#E91E63" />
            </HStack>
          </Pressable>
        );
      } else if ('stationcount' in item) {
        return (
          <Pressable onPress={() => router.push({ pathname: '/stations', params: { [`${tab === 'languages' ? 'language' : 'genre'}`]: item.name } })}>
            <HStack justifyContent="space-between" alignItems="center" p="4" bg="white" borderRadius="lg" mb="2" shadow="2">
              <Text fontSize="lg" fontWeight="bold" color="#E91E63">{item.name}</Text>
              <Icon as={Ionicons} name="chevron-forward-outline" size="6" color="#E91E63" />
            </HStack>
          </Pressable>
        );
      } else if ('votes' in item) {
        return (
          <Pressable onPress={() => router.push({ pathname: '/(player)', params: { selectedStation: JSON.stringify(item), stations: JSON.stringify(recommended) } })}>
            <HStack justifyContent="space-between" alignItems="center" p="4" bg="white" borderRadius="lg" mb="2" shadow="2">
              <VStack>
                <Text fontSize="lg" fontWeight="bold" color="#E91E63">{item.name}</Text>
                <Text fontSize="md" color="gray.500">{item.country} - {item.language}</Text>
              </VStack>
              <Icon as={Ionicons} name="chevron-forward-outline" size="6" color="#E91E63" />
            </HStack>
          </Pressable>
        );
      }
      return null;
    },
    [recommended, router, tab]
  );

  return (
    <Box flex={1} bg="gray.100">
      <LinearGradient colors={['#145DA0', '#E91E63']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 24 }}>
        <VStack space={5}>
          <Input
            placeholder={`Search ${tab === 'countries' ? 'country' : tab === 'languages' ? 'language' : tab === 'genres' ? 'genre' : 'station'}...`}
            onChangeText={debouncedSearch} // Use debounced search
            placeholderTextColor="gray.500"
            bg="white"
            borderRadius="full"
            px="4"
            py="3"
            borderWidth={1}
            borderColor="gray.300"
            shadow="2"
          />

          <HStack space={1} justifyContent="center">
            <Button onPress={() => setTab('recommended')} variant={tab === 'recommended' ? 'solid' : 'outline'} bg={tab === 'recommended' ? "#E91E63" : "white"} borderRadius="full" _text={{ color: tab === 'recommended' ? 'white' : "#E91E63" }}>
              Recommended
            </Button>
            <Button onPress={() => setTab('countries')} variant={tab === 'countries' ? 'solid' : 'outline'} bg={tab === 'countries' ? "#E91E63" : "white"} borderRadius="full" _text={{ color: tab === 'countries' ? 'white' : "#E91E63" }}>
              Countries
            </Button>
            <Button onPress={() => setTab('languages')} variant={tab === 'languages' ? 'solid' : 'outline'} bg={tab === 'languages' ? "#E91E63" : "white"} borderRadius="full" _text={{ color: tab === 'languages' ? 'white' : "#E91E63" }}>
              Languages
            </Button>
            <Button onPress={() => setTab('genres')} variant={tab === 'genres' ? 'solid' : 'outline'} bg={tab === 'genres' ? "#E91E63" : "white"} borderRadius="full" _text={{ color: tab === 'genres' ? 'white' : "#E91E63" }}>
              Genres
            </Button>
          </HStack>

          {/* Conditional rendering based on the tab */}
          <FlatList
  data={
    tab === 'countries'
      ? filterCountries()
      : tab === 'languages'
      ? filterLanguages()
      : tab === 'genres'
      ? filterGenres()
      : filterRecommended()
  }
  keyExtractor={(item, index) => {
    // Ensure uniqueness by combining name with index if necessary
    return 'code' in item ? item.code : `${item.name}-${index}`;
  }}
  renderItem={renderItem}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  onEndReachedThreshold={0.5}
  onEndReached={() => setPage(page + 1)}
  ListFooterComponent={loading && <ActivityIndicator size="large" color="#E91E63" />}
/>

        </VStack>
      </LinearGradient>
    </Box>
  );
};

export default HomeScreen;
