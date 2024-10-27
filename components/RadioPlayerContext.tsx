import React, { createContext, useRef, useState, useContext } from 'react';
import { Audio } from 'expo-av';
import { useToast } from 'native-base';

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
  isBuffering: boolean;
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
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);  // Prevents duplicate play requests
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const toast = useToast();
  const playRadio = async (station: Station) => {
    if (isSwitching || selectedStation?.stationuuid === station.stationuuid) {
      console.log("Duplicate play request blocked for station:", station.name);
      return;
    }
  
    setIsSwitching(true);
    console.log(`playRadio called for station: ${station.name}`);
  
    try {
      // Set the audio mode to allow background playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true, // Enable background audio playback
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error("Error setting audio mode:", error);
      toast.show({
        title: "Error",
        variant: "error",
        description: "Audio settings failed. Please try again.",
        placement: "top",
        bg: "#E91E63",
        duration: 3000,
      });
      setIsSwitching(false);
      return; // Exit function if setting audio mode fails
    }
  
    // Second try block for sound playback
    try {
      if (soundRef.current) {
        console.log('Unloading current sound...');
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsPlaying(false);
      }
  
      setSelectedStation(station);
      setIsBuffering(true);
  
      const { sound } = await Audio.Sound.createAsync(
        { uri: station.url },
        { shouldPlay: true }
      );
  
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && !status.isBuffering) {
          setIsBuffering(false);
        }
      });
  
      setIsPlaying(true);
      setIsBuffering(false);
      console.log(`Playing new station: ${station.name}`);
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
      setIsBuffering(false);
    } finally {
      setIsSwitching(false);
    }
  };
  

  const togglePlayPause = async () => {
    if (soundRef.current) {
      console.log(isPlaying ? 'Pausing sound' : 'Playing sound');
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    }
  };

  const switchStation = async (direction: 'next' | 'prev', stations: Station[]) => {
    if (isSwitching) {
      console.log("Station switch in progress, blocking duplicate switchStation call.");
      return;
    }

    const currentIndex = stations.findIndex(station => station.stationuuid === selectedStation?.stationuuid);
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex < 0 || newIndex >= stations.length) {
      console.log("Reached the end of the station list");
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
    console.log(`Switching to new station: ${newStation.name}`);
    await playRadio(newStation);
  };

  return (
    <RadioPlayerContext.Provider value={{ 
      sound: soundRef.current, 
      isPlaying, 
      isBuffering, 
      selectedStation, 
      stations, 
      playRadio, 
      togglePlayPause, 
      switchStation 
    }}>
      {children}
    </RadioPlayerContext.Provider>
  );
};
