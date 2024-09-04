import React, { createContext, useState, useContext } from 'react';
import { Audio } from 'expo-av';

interface Station {
  favicon: string;
  language: string;
  stationuuid: string;
  name: string;
  url: string;
  country: string;
}

interface RadioPlayerContextType {
  sound: Audio.Sound | null;
  isPlaying: boolean;
  selectedStation: Station | null;
  stations: Station[];
  playRadio: (station: Station) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  switchStation: (direction: 'next' | 'prev', stations: Station[]) => void;
}

const RadioPlayerContext = createContext<RadioPlayerContextType | undefined>(undefined);

export const useRadioPlayer = () => {
  const context = useContext(RadioPlayerContext);
  if (!context) {
    throw new Error('useRadioPlayer must be used within a RadioPlayerProvider');
  }
  return context;
};

export const RadioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stations, setStations] = useState<Station[]>([]);

  const playRadio = async (station: Station) => {
    if (selectedStation?.stationuuid === station.stationuuid) {
      // If the same station is selected, toggle play/pause
      if (isPlaying) {
        await sound?.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound?.playAsync();
        setIsPlaying(true);
      }
    } else {
      // If a new station is selected, stop the current sound and play the new one
      if (sound) {
        await sound.unloadAsync();  // Unload the previous sound
        setSound(null);
        setIsPlaying(false);
      }

      setSelectedStation(station);

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

  const togglePlayPause = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    }
  };

  const switchStation = (direction: 'next' | 'prev', stations: Station[]) => {
    if (!selectedStation) return;

    const currentIndex = stations.findIndex(station => station.stationuuid === selectedStation.stationuuid);
    const newIndex = direction === 'next'
      ? (currentIndex + 1) % stations.length
      : (currentIndex - 1 + stations.length) % stations.length;

    const newStation = stations[newIndex];
    playRadio(newStation);  // Switch to the new station
  };

  return (
    <RadioPlayerContext.Provider value={{ sound, isPlaying, selectedStation, stations, playRadio, togglePlayPause, switchStation }}>
      {children}
    </RadioPlayerContext.Provider>
  );
};
