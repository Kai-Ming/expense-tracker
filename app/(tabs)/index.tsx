import { Redirect } from 'expo-router';

export default function Index() {
  // Automatically redirects the root path "/" to "/submit"
  return <Redirect href="/submit" />;
}