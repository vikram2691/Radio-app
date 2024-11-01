import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
import { Box, Text, Input, VStack, HStack, Button, Icon, Pressable } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import debounce from 'lodash.debounce';

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
  const [page, setPage] = useState<number>(1);
  const router = useRouter();

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSearchQuery(''); // Clear search input when switching tabs
  }, [tab]);

  // Consolidated data fetch
  const fetchData = async () => {
    await Promise.all([fetchCountries(), fetchLanguages(), fetchGenres(), fetchRecommended()]);
  };

  // Fetch country list
  const fetchCountries = async () => {
    await fetchDataHandler('https://de1.api.radio-browser.info/json/countries', setCountries);
  };

  // Fetch language list
  const fetchLanguages = async () => {
    await fetchDataHandler('https://de1.api.radio-browser.info/json/languages', (data: Language[]) => {
      setLanguages(data.sort((a, b) => b.stationcount - a.stationcount));
    });
  };

  // Fetch genre list
  const fetchGenres = async () => {
    await fetchDataHandler('https://de1.api.radio-browser.info/json/tags', (data: Genre[]) => {
      setGenres(data.sort((a, b) => b.stationcount - a.stationcount));
    });
  };

  // Fetch recommended stations
  const fetchRecommended = async () => {
    await fetchDataHandler('https://de1.api.radio-browser.info/json/stations/topvote/100', setRecommended);
  };

  // Unified data fetch handler
  const fetchDataHandler = async <T,>(url: string, setData: React.Dispatch<React.SetStateAction<T[]>>) => {
    setLoading(true);
    try {
      const response = await fetch(url);
      const data: T[] = await response.json();
      setData(data);
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce the search input to optimize performance
  const debouncedSearch = useCallback(
    debounce((query) => {
      setSearchQuery(query);
    }, 300),
    []
  );

  // Filtered lists based on search and tab selection
  const filteredItems = () => {
    switch (tab) {
      case 'countries':
        return filterItems(countries);
      case 'languages':
        return filterItems(languages);
      case 'genres':
        return filterItems(genres);
      case 'recommended':
        return filterItems(recommended);
    }
  };

  // Generic filter function
  const filterItems = <T extends { name: string }>(items: T[]) => {
    return searchQuery
      ? items.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : items;
  };
  const renderItem = useCallback(
    ({ item }: { item: Country | Language | Genre | Station }) => {
      if ('iso_3166_1' in item) { // Check for iso_3166_1 instead of code
        return renderListItem(item, 'country');
      } else if ('stationcount' in item) {
        return renderListItem(item, tab === 'languages' ? 'language' : 'genre');
      } else if ('votes' in item) {
        return renderStationItem(item);
      }
      return null;
    },
    [recommended, router, tab]
  );

  // Render list items for Country, Language, or Genre
  const renderListItem = (item: Country | Language | Genre, type: string) => (
    <Pressable onPress={() => router.push({ pathname: '/stations', params: { [type]: item.name } })}>
      <HStack justifyContent="space-between" alignItems="center" p="4" bg="white" borderRadius="lg" mb="2" shadow="2">
        <Text fontSize="lg" fontWeight="bold" color="#E91E63">{item.name}</Text>
        <Icon as={Ionicons} name="chevron-forward-outline" size="6" color="#E91E63" />
      </HStack>
    </Pressable>
  );

  // Render list items for recommended stations
  const renderStationItem = (item: Station) => (
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

  return (
    <Box flex={1} bg="gray.100">
      <LinearGradient colors={['#145DA0', '#E91E63']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 24 }}>
        <VStack space={5}>
          {/* Search Input with debounce for optimizing search */}
          <Input
            placeholder={`Search ${tab}`}
            onChangeText={debouncedSearch}
            placeholderTextColor="gray.500"
            bg="white"
            borderRadius="full"
            px="4"
            py="3"
            borderWidth={1}
            borderColor="gray.300"
            shadow="2"
          />

          {/* Tab Buttons */}
          <HStack space={1} justifyContent="center">
            {['recommended', 'countries', 'languages', 'genres'].map((tabOption) => (
              <Button
                key={tabOption}
                onPress={() => setTab(tabOption as typeof tab)}
                variant={tab === tabOption ? 'solid' : 'outline'}
                bg={tab === tabOption ? "#E91E63" : "white"}
                borderRadius="full"
                _text={{ color: tab === tabOption ? 'white' : "#E91E63" }}
              >
                {tabOption.charAt(0).toUpperCase() + tabOption.slice(1)}
              </Button>
            ))}
          </HStack>

          {/* Display List */}
          <FlatList
            data={filteredItems()}
            keyExtractor={(item, index) => ('code' in item ? item.code : `${item.name}-${index}`)}
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
