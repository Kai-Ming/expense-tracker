import React, { forwardRef } from "react";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

const MapComponent = forwardRef((props: any, ref: any) => {
  const { points, fromAddress, toAddress, routeCoords, defaultRegion, styles } =
    props;

  // Helper to validate individual coordinate objects { lat, lng }
  const isValidCoordinate = (point: any) => {
    return (
      point &&
      typeof point.lat === "number" &&
      typeof point.lng === "number" &&
      !isNaN(point.lat) &&
      !isNaN(point.lng)
    );
  };

  return (
    <MapView
      ref={ref}
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={defaultRegion}
      showsUserLocation
      showsMyLocationButton
      scrollEnabled={true}
      zoomEnabled={true}
      pitchEnabled={true}
      rotateEnabled={false}
    >
      {/* 1. START MARKER: Uses the first item in the points array */}
      {isValidCoordinate(points[0]) && (
        <Marker
          coordinate={{
            latitude: points[0].lat,
            longitude: points[0].lng,
          }}
          title="From"
          description={fromAddress}
          pinColor="#2196F3" // Blue
        />
      )}

      {/* 2. DESTINATION MARKER: Specifically targets index [1] */}
      {isValidCoordinate(points[1]) && (
        <Marker
          coordinate={{
            latitude: points[1].lat,
            longitude: points[1].lng,
          }}
          title="To"
          description={toAddress}
          pinColor="#F44336" // Red dot/pin for the destination
        />
      )}

      {/* 3. ROUTE TRAIL */}
      {Array.isArray(routeCoords) && routeCoords.length > 0 && (
        <Polyline
          coordinates={routeCoords}
          strokeColor="#2196F3"
          strokeWidth={4}
        />
      )}
    </MapView>
  );
});

export default MapComponent;
