import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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

const HomeScreen = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tab, setTab] = useState<'countries' | 'languages' | 'genres'>('countries');
  const router = useRouter();

  useEffect(() => {
    fetchCountries();
    fetchLanguages();
    fetchGenres();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await fetch('https://de1.api.radio-browser.info/json/countries');
      const data: Country[] = await response.json();
      setCountries(data);
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  const fetchLanguages = async () => {
    try {
      const response = await fetch('https://de1.api.radio-browser.info/json/languages');
      const data: Language[] = await response.json();
      const sortedData = data.sort((a, b) => b.stationcount - a.stationcount);
      setLanguages(sortedData);
    } catch (error) {
      console.error("Error fetching languages:", error);
    }
  };

  const fetchGenres = async () => {
    try {
      const response = await fetch('https://de1.api.radio-browser.info/json/tags');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const jsonData: Genre[] = await response.json();
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        const sortedData = jsonData.sort((a, b) => b.stationcount - a.stationcount);
        setGenres(sortedData);
      } else {
        setGenres([]);
      }
    } catch (error) {
      console.error("Error fetching genres:", error);
    }
  };

  const filterCountries = () => {
    if (searchQuery) {
      return countries.filter(country => country.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return countries;
  };

  const filterLanguages = () => {
    if (searchQuery) {
      return languages.filter(language => language.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return languages;
  };

  const filterGenres = () => {
    if (searchQuery) {
      return genres.filter(genre => genre.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return genres;
  };

  const renderItem = (item: Country | Language | Genre) => {
    if ('iso_3166_1' in item) {
    
      return (
        <TouchableOpacity 
          style={styles.itemContainer} 
          onPress={() => {
            router.push({ pathname: '/stations', params: { country: item.name } });
          }}>
            
          <Text style={styles.item}>{item.name}</Text>
          <Ionicons name="chevron-forward-outline" size={20} color="#888" />
        </TouchableOpacity>
      );
    } else if ('stationcount' in item) {
      if ('iso_639' in item) {
    
        return (
          <TouchableOpacity 
            style={styles.itemContainer} 
            onPress={() => {
              router.push({ pathname: '/stations', params: { language: item.name } });
            }}>
            <Text style={styles.item}>{item.name}</Text>
            <Ionicons name="chevron-forward-outline" size={20} color="#888" />
          </TouchableOpacity>
        );
      } else {
       
        return (
          <TouchableOpacity 
            style={styles.itemContainer} 
            onPress={() => {
              router.push({ pathname: '/stations', params: { genre: item.name } });
            }}>
            <Text style={styles.item}>{item.name}</Text>
            <Ionicons name="chevron-forward-outline" size={20} color="#888" />
          </TouchableOpacity>
        );
      }
    }
    return null;
  };

  return (
    <View style={styles.container}>   
    <View style={styles.searchview}>
        <TextInput
        style={styles.searchBar}
        placeholder={`Search ${tab === 'countries' ? 'country' : tab === 'languages' ? 'language' : 'genre'}...`}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#aaa"
      />
      </View>
      <View style={styles.tabContainer}>
        <TouchableOpacity onPress={() => setTab('countries')} style={[styles.tab, tab === 'countries' && styles.activeTab]}>
          <Text style={[styles.tabText, tab === 'countries' && styles.activeTabText]}>Countries</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('languages')} style={[styles.tab, tab === 'languages' && styles.activeTab]}>
          <Text style={[styles.tabText, tab === 'languages' && styles.activeTabText]}>Languages</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('genres')} style={[styles.tab, tab === 'genres' && styles.activeTab]}>
          <Text style={[styles.tabText, tab === 'genres' && styles.activeTabText]}>Genres</Text>
        </TouchableOpacity>
      </View>
    
      <FlatList
  data={tab === 'countries' ? filterCountries() : tab === 'languages' ? filterLanguages() : filterGenres()}
  keyExtractor={(item, index) => 
    tab === 'countries' ? `${item.code}_${index}` : `${item.name}_${index}`
  }
  renderItem={({ item }) => renderItem(item)}
/>

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
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#E91E63',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchBar: {
    width: '100%',
    padding: 12,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  searchview:{
paddingTop:30,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#ccc',
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: '#E91E63',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  activeTabText: {
    color: '#fff',
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
});

export default HomeScreen;