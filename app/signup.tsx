import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Link, useRouter } from 'expo-router';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  const handleSignup = async () => {
    if (username.trim() === '' || email.trim() === '' || password.trim() === '' || confirmPassword.trim() === '') {
      Alert.alert('Signup Error', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Signup Error', 'Passwords do not match.');
      return;
    }

    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // Set the display name in Firebase Auth
      await updateProfile(userCredential.user, { displayName: username.trim() });

      // Store additional user data in Firestore
      await addDoc(collection(db, "users"), {
        uid: userCredential.user.uid,
        username: username.trim(),
        email: email.trim(),
        createdAt: serverTimestamp(),
        role: 1,
      });

      Alert.alert('Signup Success', `Account created for ${username}!`);
      router.replace('/submit');
    } catch (error) {
      const err = error as any;
      console.error("Signup error:", err.code, err.message);
      let errorMessage = 'An error occurred during signup.';

      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak.';
      } else if (err.code === 'auth/configuration-not-found') {
        errorMessage = 'Firebase Auth is not configured. Please enable Email/Password provider in the Firebase Console.';
      }

      Alert.alert('Signup Failed', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#888"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

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

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#888"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
        <Text style={styles.signupButtonText}>Create Account</Text>
      </TouchableOpacity>

      <Link href="/login" asChild>
        <TouchableOpacity style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Login</Text>
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
  signupButton: { backgroundColor: '#2196F3', padding: 15, borderRadius: 8, width: '80%', alignItems: 'center', marginTop: 10 },
  signupButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  link: { marginTop: 20 },
  linkText: { color: '#2196F3', fontSize: 16 },
});
