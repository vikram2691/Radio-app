import React, { createContext, useState, useContext } from 'react';
import { Audio } from 'expo-av';
import { useToast } from 'native-base';  // Import useToast from NativeBase

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
  isBuffering: boolean;  // New state for buffering
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
  const [isBuffering, setIsBuffering] = useState<boolean>(false);  // State for buffering
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const toast = useToast();

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
      // Unload previous sound if new station is selected
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }

      setSelectedStation(station);
      setIsBuffering(true);  // Show buffering state

      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: station.url },
          { shouldPlay: true }
        );
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && !status.isBuffering) {
            setIsBuffering(false);  // Buffering complete
          }
        });

        setSound(newSound);
        setIsPlaying(true);
      } catch (error) {
        console.error("Error creating sound:", error);
        toast.show({
          title: "Error",
          variant: "error",
          description: "Unable to play this station. Please try another one.",
          placement: "top",
          bg: "#E91E63",
          duration: 3000,
        });
        setIsBuffering(false);  // Stop buffering if error
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

  const switchStation = async (direction: 'next' | 'prev', stations: Station[]) => {
    const currentIndex = stations.findIndex(station => station.stationuuid === selectedStation?.stationuuid);
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex < 0 || newIndex >= stations.length) {
      toast.show({
        title: "No more stations",
        variant: "warning",
        description: "You've reached the end of the station list.",
        placement: "top",
        bg: "orange.500",
        duration: 3000,
      });
      return;
    }

    const newStation = stations[newIndex];
    await playRadio(newStation);  // Switch to the new station
  };

  return (
    <RadioPlayerContext.Provider value={{ sound, isPlaying, isBuffering, selectedStation, stations, playRadio, togglePlayPause, switchStation }}>
      {children}
    </RadioPlayerContext.Provider>
  );
};
