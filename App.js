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
  const [aiResult, setAiResult] = useState(null);
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
      console.log('🎤 Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      console.log('✅ Recording started successfully');
    } catch (err) {
      console.error('❌ Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      console.log('⏹️ Stopping recording...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('📁 Recording URI:', uri);
      
      setRecording(null);
      setIsRecording(false);
      console.log('✅ Recording stopped successfully');
      
      // Send to OpenAI for analysis
      console.log('🤖 Starting AI analysis...');
      await analyzeRecording(uri);
      
    } catch (err) {
      console.error('❌ Failed to stop recording:', err);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const analyzeRecording = async (audioUri) => {
    try {
      console.log('🔄 Setting analysis state...');
      setIsAnalyzing(true);
      setAiResult(null);
      
      // Create form data for the API request
      console.log('📦 Creating FormData...');
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      });
      formData.append('model', 'whisper-1');
      console.log('✅ FormData created');
      
      // Send to OpenAI Whisper for transcription using fetch
      console.log('🌐 Sending transcription request to OpenAI...');
      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });
      
      console.log('📨 Transcription response status:', transcriptionResponse.status);
      const transcriptionResult = await transcriptionResponse.json();
      console.log('📝 Transcription result:', transcriptionResult);
      
      if (!transcriptionResponse.ok) {
        console.error('❌ Transcription API error:', transcriptionResult);
        throw new Error(transcriptionResult.error?.message || 'Transcription failed');
      }
      
      // Create the predefined prompt with the transcription
      const prompt = `You will get some lyrics from a popular rock song, but there is a catch, the lyrics were translated from English to Romanian to make it trickier to guess. 

Your task is to:
1. Translate the lyrics back to English
2. Guess the original song
3. Respond ONLY with the band name and song name in this exact format: "Band Name - Song Name"

Do NOT include the translation in your response. Do NOT explain your reasoning. Only respond with the band and song name.

Here are the Romanian lyrics: "${transcriptionResult.text}"`;
      
      // Send to OpenAI GPT for analysis
      console.log('🧠 Sending analysis request to GPT-4...');
      console.log('📄 Prompt sent:', prompt);
      
      const analysis = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });
      
      console.log('🤖 GPT-4 response:', analysis.choices[0].message.content);
      
      setAiResult({
        transcription: transcriptionResult.text,
        analysis: analysis.choices[0].message.content
      });
      
      console.log('🎉 Analysis completed successfully');
      
      // Clean up the temporary file
      console.log('🗑️ Cleaning up temporary file...');
      await FileSystem.deleteAsync(audioUri, { idempotent: true });
      console.log('✅ File cleanup completed');
      
    } catch (error) {
      console.error('❌ Error analyzing recording:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      Alert.alert('Error', `Failed to analyze recording: ${error.message}`);
      
      // Clean up the temporary file even if analysis fails
      try {
        console.log('🗑️ Cleaning up file after error...');
        await FileSystem.deleteAsync(audioUri, { idempotent: true });
        console.log('✅ Error cleanup completed');
      } catch (cleanupError) {
        console.error('❌ Error cleaning up file:', cleanupError);
      }
    } finally {
      console.log('🔄 Setting analysis state to false');
      setIsAnalyzing(false);
    }
  };

  const shareToWhatsApp = (result) => {
    try {
      console.log('📱 Opening WhatsApp...');
      
      const message = `${result.analysis}`;

      const url = `whatsapp://send?phone=${WHATSAPP_NUMBER.replace('+', '')}&text=${encodeURIComponent(message)}`;
      
      Linking.openURL(url).catch((err) => {
        console.error('❌ Error opening WhatsApp:', err);
        Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Make sure it is installed.');
      });

      console.log('✅ WhatsApp opened successfully');
    } catch (error) {
      console.error('❌ Error sharing to WhatsApp:', error);
      Alert.alert('WhatsApp Error', `Failed to share to WhatsApp: ${error.message}`);
    }
  };

  const toggleRecording = () => {
    console.log('🎛️ Toggle recording button pressed. Current state:', isRecording);
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
          <Text style={styles.loadingText}>🤖 Analyzing your recording...</Text>
        </View>
      )}
      
      {aiResult && (
        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>🎵 AI ANALYSIS</Text>
          <ScrollView style={styles.resultScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.transcriptionSection}>
              <Text style={styles.sectionTitle}>📝 Transcription:</Text>
              <Text style={styles.transcriptionText}>{aiResult.transcription}</Text>
            </View>
            
            <View style={styles.analysisSection}>
              <Text style={styles.sectionTitle}>🔍 Analysis:</Text>
              <Text style={styles.analysisText}>{aiResult.analysis}</Text>
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.whatsappButton}
                onPress={() => shareToWhatsApp(aiResult)}
              >
                <Text style={styles.whatsappButtonText}>📱 SEND TO WHATSAPP</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setAiResult(null)}
              >
                <Text style={styles.clearButtonText}>🗑️ CLEAR RESULT</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
      
      {!isAnalyzing && !aiResult && (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>Record something to get AI analysis! 🤘</Text>
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
    marginBottom: 15,
    letterSpacing: 2,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  resultScroll: {
    flex: 1,
  },
  transcriptionSection: {
    marginBottom: 20,
  },
  analysisSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  transcriptionText: {
    color: '#e0e0e0',
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    fontStyle: 'italic',
    borderWidth: 1,
    borderColor: '#404040',
  },
  analysisText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#dc2626',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    gap: 10,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  whatsappButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    borderWidth: 2,
    borderColor: '#991b1b',
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
