import { requestExactAlarmPermission } from "expo-exact-alarms-permission";
import * as Notifications from "expo-notifications";
import React, { useEffect } from "react";
import { Button } from "react-native";

export default function TestNotification({ title = "Start 1-Minute Timer" }) {
  async function setupExactAlarmPermission() {
    // Request the exact alarm permission on Android
    await requestExactAlarmPermission();
  }

  // Call it once when the screen loads or the app starts
  useEffect(() => {
    setupExactAlarmPermission();
  }, []);
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("one minute");
      },
    );
    return () => sub.remove();
  }, []);
  const handlePress = async () => {
    // Request permission if not already granted
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } =
        await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") {
        alert("You need to enable notifications for this feature!");
        return;
      }
    }
    console.log("aaaa");

    // Schedule the notification 60 seconds from now
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Timer Finished",
        body: "One minute has passed!",
        data: { screen: "TimerScreen" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
      },
    });
  };

  return <Button title={title} onPress={handlePress} />;
}
