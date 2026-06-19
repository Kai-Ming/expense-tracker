import { useEffect, useState } from "react";

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export function useGoogleMapsDistance() {
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    if (window.google && window.google.maps) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setSdkLoaded(true);
    document.head.appendChild(script);
  }, []);

  const calculateDistance = (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<number> => {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps) {
        reject(new Error("Google Maps SDK not loaded yet."));
        return;
      }

      const service = new window.google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [new window.google.maps.LatLng(origin.lat, origin.lng)],
          destinations: [
            new window.google.maps.LatLng(destination.lat, destination.lng),
          ],
          travelMode: window.google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(), // current time
            trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
          },
        },
        (response, status) => {
          if (status === "OK") {
            const element = response.rows[0].elements[0];
            if (element.status === "OK") {
              const meters = element.distance.value;

              // Convert to KM and fix to 2 decimal places
              const km = parseFloat((meters / 1000).toFixed(2));

              resolve(km);
            } else {
              reject(new Error(element.status));
            }
          } else {
            reject(new Error(status));
          }
        },
      );
    });
  };

  const getRouteImageUrl = (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps) {
        reject(new Error("Google Maps SDK not loaded yet."));
        return;
      }

      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      const directionsService = new window.google.maps.DirectionsService();

      directionsService.route(
        {
          origin: new window.google.maps.LatLng(origin.lat, origin.lng),
          destination: new window.google.maps.LatLng(
            destination.lat,
            destination.lng,
          ),
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK" && result.routes[0]) {
            const routePolyline = result.routes[0].overview_polyline;
            const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x300&maptype=roadmap&path=weight:5|color:0x0000ff|enc:${routePolyline}&markers=color:green|label:S|${origin.lat},${origin.lng}&markers=color:red|label:E|${destination.lat},${destination.lng}&key=${apiKey}`;

            resolve(staticMapUrl);
          } else {
            reject(new Error(`Route image generation failed: ${status}`));
          }
        },
      );
    });
  };

  return { sdkLoaded, calculateDistance, getRouteImageUrl };
}
