import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, FlatList, ScrollView, ActivityIndicator, Linking, Image } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useState, useEffect } from 'react';
import OpenAI from 'openai';
import { OPENAI_API_KEY, WHATSAPP_NUMBER } from '@env';

export default function App() {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [songResult, setSongResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  useEffect(() => {
    const setupAudio = async () => {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    };
    setupAudio();
  }, []);


  const startRecording = async () => {
    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      setRecording(null);
      setIsRecording(false);
      
      await identifySong(uri);
    } catch (err) {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const identifySong = async (audioUri) => {
    try {
      setIsAnalyzing(true);
      setSongResult(null);
      
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      });
      formData.append('model', 'whisper-1');
      
      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      });
      
      const transcriptionResult = await transcriptionResponse.json();
      
      if (!transcriptionResponse.ok) {
        throw new Error(transcriptionResult.error?.message || 'Transcription failed');
      }
      
      const prompt = `You are a rock music expert. Translate this to English if needed, then identify the ROCK song:\n\n"${transcriptionResult.text}"\n\nFocus on rock genres: classic rock, hard rock, metal, punk, alternative rock, indie rock, progressive rock, etc.\n\nReturn: "Artist - Song" or "Not Found"`;
      
      const result = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a specialized rock music identification AI with comprehensive knowledge of rock songs from all eras and subgenres. You excel at identifying classic rock, hard rock, metal, punk, alternative rock, indie rock, progressive rock, and all rock subgenres from the 1960s to present day. You focus exclusively on rock music identification.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.1,
      });
      
      setSongResult(result.choices[0].message.content);
      
      
      await FileSystem.deleteAsync(audioUri, { idempotent: true });
      
    } catch (error) {
      Alert.alert('Error', `Failed to analyze recording: ${error.message}`);
      try {
        await FileSystem.deleteAsync(audioUri, { idempotent: true });
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const shareToWhatsApp = (message) => {
    try {
      const url = `whatsapp://send?phone=${WHATSAPP_NUMBER.replace('+', '')}&text=${encodeURIComponent(message)}`;
      
      Linking.openURL(url).catch((err) => {
        Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Make sure it is installed.');
      });
    } catch (error) {
      Alert.alert('WhatsApp Error', `Failed to share to WhatsApp: ${error.message}`);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('./assets/rockstadt-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Sparla EuropaFM</Text>
      </View>
      
      <View style={styles.recordingSection}>
        <TouchableOpacity 
          style={[styles.button, isRecording && styles.recordingButton]} 
          onPress={toggleRecording}
          disabled={isAnalyzing}
        >
          <Text style={styles.buttonText}>
            {isRecording ? '⏹️ STOP RECORDING' : '🎤 START RECORDING'}
          </Text>
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {isAnalyzing && (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color="#ff4444" />
          <Text style={styles.loadingText}>🎸 Identifying rock song...</Text>
        </View>
      )}
      
      {songResult && (
        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>🎸 ROCK SONG IDENTIFICATION</Text>
          <Text style={styles.subtitleText}>Rock music specialist - Tap result to share</Text>
          
          <View style={styles.resultsContainer}>
            {/* AI Analysis Result */}
            <TouchableOpacity 
              style={styles.resultCard}
              onPress={() => shareToWhatsApp(songResult)}
            >
              <View style={styles.resultHeader}>
                <Text style={styles.resultLabel}>🎸 Rock Music AI</Text>
              </View>
              <Text style={styles.resultText}>{songResult}</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSongResult(null)}
          >
            <Text style={styles.clearButtonText}>🗑️ CLEAR RESULTS</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {!isAnalyzing && !songResult && (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>Record a rock song to identify it! 🎸🤘</Text>
        </View>
      )}
      
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 25,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#dc2626',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 12,
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: 10,
  },
  tagline: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  recordingSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#dc2626',
    elevation: 15,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    position: 'relative',
    minWidth: 200,
  },
  recordingButton: {
    backgroundColor: '#dc2626',
    borderColor: '#ffffff',
    shadowColor: '#ffffff',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  recordingIndicator: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  emptyText: {
    color: '#666666',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  loadingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 15,
    textAlign: 'center',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  resultSection: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    borderWidth: 3,
    borderColor: '#dc2626',
    marginBottom: 20,
    padding: 15,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  resultTitle: {
    color: '#dc2626',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 2,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitleText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  resultsContainer: {
    gap: 15,
    marginBottom: 20,
  },
  resultCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#404040',
    padding: 15,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  resultHeader: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  resultLabel: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  resultText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  clearButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#991b1b',
    alignSelf: 'center',
    marginTop: 10,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
