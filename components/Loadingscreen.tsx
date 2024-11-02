// LoadingScreen.js
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';

export default function LoadingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current; // Animation value for fade effect

  useEffect(() => {
    // Fade-in animation for the loading screen
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Image 
        source={require('@/assets/images/welcome_note.png')}  // Make sure to add your image here
        style={styles.image}
      />
      <Text style={styles.welcomeText}>Welcome to Your App!</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E91E63',  // Customize background color
  },
  image: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
