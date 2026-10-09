import { Text } from "@/components/Themed";
import React, { useCallback } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

interface Trip {
  id: string;
  user_id: string;
  distance: number;
  toll?: number;
  mileage?: number;
  date?: any;
  from_address: string;
  to_address: string;
  from_time?: string;
  to_time?: string;
  remark: string;
  route_image_url?: string;
  from_home?: boolean;
  to_home: boolean;
  platform: number;
  created_at: any;
}

interface TripListProps {
  tripIds: string[];
  getTripById: (id: string) => Trip | undefined;
  onImagePress: (url: string | null) => void;
}

export default function TripList({
  tripIds,
  getTripById,
  onImagePress,
}: TripListProps) {
  const handleImagePress = useCallback(
    (e: any, url?: string) => {
      e.stopPropagation();
      onImagePress(url ?? null);
    },
    [onImagePress],
  );

  if (!tripIds || tripIds.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.descriptionLabel}>Trips:</Text>
      {tripIds.map((tripId) => {
        const trip = getTripById(tripId);
        if (!trip) {
          return (
            <Text key={tripId} style={styles.descriptionText}>
              Trip data not available
            </Text>
          );
        }
        return (
          <View key={tripId} style={styles.tripItem}>
            <Text style={styles.tripDetail}>
              <Text style={styles.boldText}>Platform: </Text>
              {trip.platform === 2 ? "Web" : "Mobile"}
            </Text>
            <Text style={styles.tripDetail}>
              <Text style={styles.boldText}>Remark: </Text>
              {trip.remark}
            </Text>
            <Text style={styles.tripDetail}>
              <Text style={styles.boldText}>Trip: </Text>
              {trip.from_address} →{"\n"}
              {trip.to_address} {"\n"}({trip.distance?.toFixed(2)} km)
            </Text>
            <Text style={styles.tripDetail}>
              <Text style={styles.boldText}>From Home: </Text>
              {trip.from_home ? "Yes" : "No"}
            </Text>
            <Text style={styles.tripDetail}>
              <Text style={styles.boldText}>To Home: </Text>
              {trip.to_home === true ? "Yes" : "No"}
            </Text>

            {trip.route_image_url && (
              <>
                <Text style={styles.tripDetail}>
                  <Text style={styles.boldText}>Route Map:</Text>
                </Text>
                <TouchableOpacity
                  onPress={(e) => handleImagePress(e, trip.route_image_url)}
                >
                  <Image
                    source={{ uri: trip.route_image_url }}
                    style={styles.businessCardImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  descriptionLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "bold",
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginBottom: 4,
  },
  tripItem: {
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderRadius: 4,
  },
  tripDetail: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  boldText: {
    fontWeight: "600",
  },
  businessCardImage: {
    width: "100%",
    height: 200,
    marginTop: 4,
    borderRadius: 4,
    backgroundColor: "#f9f9f9",
  },
});
