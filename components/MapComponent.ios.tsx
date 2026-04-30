import React, { forwardRef } from "react";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

const MapComponent = forwardRef((props: any, ref: any) => {
  // Extract all the props you were using in submit.tsx
  const { points, fromAddress, toAddress, routeCoords, defaultRegion, styles } =
    props;

  return (
    <MapView
      ref={ref}
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      initialRegion={defaultRegion}
      showsUserLocation
      showsMyLocationButton
      scrollEnabled={false}
      zoomEnabled={true}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      {points[0] && (
        <Marker
          coordinate={{ latitude: points[0].lat, longitude: points[0].lng }}
          title="From"
          description={fromAddress}
          pinColor="#2196F3"
        />
      )}
      {points[1] && (
        <Marker
          coordinate={{ latitude: points[1].lat, longitude: points[1].lng }}
          title="To"
          description={toAddress}
          pinColor="#F44336"
        />
      )}
      {routeCoords.length > 0 && (
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
