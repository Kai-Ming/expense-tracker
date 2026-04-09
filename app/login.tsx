import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed'; // Assuming Themed components are available and desired
import { Link, useRouter } from 'expo-router';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import '../firebaseConfig';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (email.trim() === '' || password.trim() === '') {
      Alert.alert('Login Error', 'Please enter email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/submit');
    } catch (error: any) {
      console.error("Login error:", error.code, error.message);
      let errorMessage = 'An error occurred during login.';
      
      if (error.code === 'auth/configuration-not-found') {
        errorMessage = 'Firebase Auth is not configured. Please enable Email/Password provider in the Firebase Console.';
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      }

      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity 
        style={[styles.loginButton, isLoading && { opacity: 0.7 }]} 
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.loginButtonText}>Login</Text>}
      </TouchableOpacity>

      <Link href="/signup" asChild>
        <TouchableOpacity style={styles.link}>
        <Text style={styles.linkText}>Sign up</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30 },
  input: { width: '80%', padding: 15, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 15 },
  loginButton: { backgroundColor: '#2196F3', padding: 15, borderRadius: 8, width: '80%', alignItems: 'center', marginTop: 10 },
  loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  link: { marginTop: 20 },
  linkText: { color: '#2196F3', fontSize: 16 },
});
