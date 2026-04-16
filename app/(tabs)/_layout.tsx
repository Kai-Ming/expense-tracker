import React, { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs, useRouter } from 'expo-router';
import { Pressable, ActivityIndicator, Alert, Platform } from 'react-native';

import Colors from '@/constants/Colors';
import { View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import { db } from '../../firebaseConfig';
import '../../firebaseConfig';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const headerShown = useClientOnlyValue(false, true);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        
        // Fetch config from Firestore and store as JSON file
        const syncConfig = async () => {
          try {
            const configDoc = await getDoc(doc(db, "config", "settings")); // Adjust doc ID as needed
            if (configDoc.exists()) {
              const configData = JSON.stringify(configDoc.data(), null, 2);
              if (Platform.OS !== 'web') {
                const fileUri = FileSystem.documentDirectory + 'config.json';
                await FileSystem.writeAsStringAsync(fileUri, configData);
              } else {
                localStorage.setItem('app_config', configData);
              }
            }
          } catch (err) {
            console.error("Failed to store config JSON:", err);
          }
        };
        syncConfig();
      } else {
        setIsAuthenticated(false);
        router.replace('/login');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) {
        signOut(getAuth());
      }
    } else {
      Alert.alert(
        'Log Out',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'OK', onPress: () => signOut(getAuth()) },
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Tabs
      initialRouteName="submit"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: headerShown,
        headerRight: () => (
          <Pressable onPress={handleSignOut}>
            {({ pressed }) => (
              <FontAwesome
                name="sign-out"
                size={25}
                color={Colors[colorScheme ?? 'light'].text}
                style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
              />
            )}
          </Pressable>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hides the redirect route from the tab bar
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'Submit Expense',
          tabBarIcon: ({ color }) => <TabBarIcon name="mail-forward" color={color} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'View Expenses',
          tabBarIcon: ({ color }) => <TabBarIcon name="history" color={color} />,
          /* headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ marginRight: 15, opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ), */
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // This hides the tab button from the bottom bar!
        }}
      />
    </Tabs>
  );
}
