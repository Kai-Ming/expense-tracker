// tasks/tripTask.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { Platform } from "react-native";
import "../firebaseConfig";

export const LOCATION_TRACKING_TASK = "background-location-task";
const TRIP_STATE_KEY = "@trip_state";

const MIN_APPEND_DELTA_KM = 0.005;
const MIN_DISTANCE_DELTA_KM = 0.002;
const MAX_ROUTE_POINTS = 2000;

// ---- Persistent trip state shape ----
type TripState = {
  userId: string;
  fromAddress: string;
  toAddress: string;
  destination: { lat: number; lng: number } | null;
  origin: { lat: number; lng: number } | null;
  lastCoords: { lat: number; lng: number } | null;
  totalDistance: number;
  routeCoords: { latitude: number; longitude: number }[];
  fromTime: string | null;
  remark: string;
  toHome: boolean;
  officeCoords: { lat: number; lng: number } | null;
  arrivalDistance: number;
  mileageRate: number;
  mileageRateOutstation: number;
  outstationDistance: number;
  submitted: boolean;
};

// tasks/tripTask.ts — top of file
console.log("[tripTask] MODULE LOADED");
console.log(
  "[tripTask] MODULE EVALUATED, pid=",
  typeof process !== "undefined" ? process.pid : "?",
);

if (!getApps().length) {
  initializeApp({
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  });
}

export async function getTripState(): Promise<TripState | null> {
  const raw = await AsyncStorage.getItem(TRIP_STATE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function setTripState(state: TripState | null) {
  if (state === null) await AsyncStorage.removeItem(TRIP_STATE_KEY);
  else await AsyncStorage.setItem(TRIP_STATE_KEY, JSON.stringify(state));
}

export async function patchTripState(patch: Partial<TripState>) {
  const cur = (await getTripState()) ?? ({} as TripState);
  await setTripState({ ...cur, ...patch });
}

// ---- Notification setup ----
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

Notifications.requestPermissionsAsync().catch(() => {});

if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  }).catch(() => {});
}

// ---- Haversine ----
function haversine(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---- Road distance via Google Routes API ----
async function fetchRoadDistance(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
) {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key ?? "",
        "X-Goog-FieldMask": "routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: {
          location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
        },
        destination: {
          location: { latLng: { latitude: dest.lat, longitude: dest.lng } },
        },
        travelMode: "DRIVE",
      }),
    },
  );
  const data = await res.json();
  const meters = data.routes?.[0]?.distanceMeters ?? 0;
  return meters / 1000;
}

// ---- Reverse geocode ----
async function reverseGeocode(lat: number, lng: number) {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`,
    );
    const d = await r.json();
    if (d.status === "OK" && d.results?.length) {
      return d.results[0].formatted_address
        .replace(/\b\d{5}\b,?\s*/g, "")
        .trim();
    }
  } catch {}
  const geo = await Location.reverseGeocodeAsync({
    latitude: lat,
    longitude: lng,
  });
  if (geo.length) {
    const g = geo[0];
    return [g.name, g.street, g.city].filter(Boolean).join(", ");
  }
  return "Address not found";
}

// ---- Static map upload ----
function buildStaticMapUrl(coords: { latitude: number; longitude: number }[]) {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!coords.length || !key) return null;
  const MAX = 50;
  const sampled =
    coords.length <= MAX
      ? coords
      : coords.filter(
          (_, i) =>
            i === 0 ||
            i === coords.length - 1 ||
            i % Math.floor(coords.length / MAX) === 0,
        );
  const path = sampled.map((c) => `${c.latitude},${c.longitude}`).join("|");
  const s = coords[0];
  const e = coords[coords.length - 1];
  return (
    `https://maps.googleapis.com/maps/api/staticmap?size=600x300&scale=2&maptype=roadmap` +
    `&path=color:0x2196F3ff|weight:5|${path}` +
    `&markers=color:green|label:A|${s.latitude},${s.longitude}` +
    `&markers=color:red|label:B|${e.latitude},${e.longitude}` +
    `&key=${key}`
  );
}

async function uploadRouteImage(
  coords: { latitude: number; longitude: number }[],
) {
  const url = buildStaticMapUrl(coords);
  if (!url) return "";
  try {
    const blob = await (await fetch(url)).blob();
    const storage = getStorage(getApp());
    const r = ref(storage, `route-images/${Date.now()}.jpg`);
    const up = await uploadBytes(r, blob);
    return await getDownloadURL(up.ref);
  } catch (e) {
    console.error("route image upload failed", e);
    return "";
  }
}

// ---- Notification helper ----
async function safeNotify(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch (e) {
    console.error("notification failed:", e);
  }
}

// ---- The submission ----
async function submitTrip(
  state: TripState,
  finalCoords: { lat: number; lng: number },
) {
  const db = getFirestore(getApp());

  let finalDistance = state.totalDistance;
  let finalToAddress = state.toAddress;
  let finalToll = 0;

  /* if (state.origin && state.destination) {
    try {
      finalDistance = await fetchRoadDistance(state.origin, state.destination);
    } catch {}
  } */

  if (state.toHome && state.origin && state.officeCoords) {
    try {
      const [toCurrent, toOffice] = await Promise.all([
        fetchRoadDistance(state.origin, finalCoords),
        fetchRoadDistance(state.origin, state.officeCoords),
      ]);
      if (toCurrent > 0 && toOffice > 0) {
        if (toOffice < toCurrent) {
          finalDistance = toOffice;
          finalToAddress = await reverseGeocode(
            state.officeCoords.lat,
            state.officeCoords.lng,
          );
        } else {
          finalDistance = toCurrent;
        }
      }
    } catch {}
  }

  const rate =
    finalDistance > state.outstationDistance
      ? state.mileageRateOutstation
      : state.mileageRate;

  const mileage = finalDistance * rate;
  const total = mileage + finalToll;

  const routeImageUrl = await uploadRouteImage(state.routeCoords);

  await addDoc(collection(db, "trips"), {
    user_id: state.userId,
    from_address: state.fromAddress,
    to_address: finalToAddress,
    distance: parseFloat(finalDistance.toFixed(2)),
    toll: parseFloat(finalToll.toFixed(2)),
    mileage: parseFloat(mileage.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    remark: state.remark,
    from_time: state.fromTime ? new Date(state.fromTime) : null,
    to_time: new Date(),
    to_home: state.toHome,
    route_image_url: routeImageUrl,
    date: new Date().toISOString().split("T")[0],
    platform: 1,
    created_at: serverTimestamp(),
  });

  await safeNotify(
    "Trip Saved ✅",
    `${finalDistance.toFixed(2)} km • RM ${total.toFixed(2)} total`,
  );
}

// ════════════════════════════════════════════════════════════════════
// OPTION A: in-process mutex
//
// `isSubmitting` is a module-scope boolean. Because RN's JS runtime is
// single-threaded, a synchronous `if (isSubmitting) return;
// isSubmitting = true;` sequence is atomic — no other invocation of the
// task callback can interleave between the check and the set. This
// closes the concurrent-invocation race that the old
// "re-read state.submitted" approach could not.
//
// Scope of the guarantee: only protects against overlapping task
// invocations within the SAME JS runtime. If the OS kills the runtime
// mid-submit and restarts it, `isSubmitting` resets to false. In that
// rare case a duplicate `addDoc` is still possible. Option B (stable
// doc ID + setDoc) is the only way to eliminate that case entirely.
// ════════════════════════════════════════════════════════════════════
let isSubmitting = false;

// ---- THE TASK ----
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }: any) => {
  console.log("[tripTask] FIRED", {
    hasData: !!data,
    error: error?.message,
    locations: data?.locations?.length ?? 0,
  });
  if (error) {
    console.error("Background task error:", error);
    return;
  }
  const locations = data?.locations ?? [];
  if (!locations.length) return;

  const state = await getTripState();
  if (!state || state.submitted) return;

  for (const loc of locations) {
    const curr = { lat: loc.coords.latitude, lng: loc.coords.longitude };

    // Accumulate distance
    if (state.lastCoords) {
      const delta = haversine(state.lastCoords, curr);
      if (delta >= MIN_DISTANCE_DELTA_KM) {
        state.totalDistance += delta;
        state.lastCoords = curr;
      }
    }
    state.lastCoords = curr;

    const last = state.routeCoords[state.routeCoords.length - 1];
    const movedEnough =
      !last ||
      haversine({ lat: last.latitude, lng: last.longitude }, curr) >=
        MIN_APPEND_DELTA_KM;

    if (movedEnough) {
      if (state.routeCoords.length < MAX_ROUTE_POINTS) {
        state.routeCoords.push({ latitude: curr.lat, longitude: curr.lng });
      } else {
        // Decimate: drop every other point to make room, then append.
        state.routeCoords = state.routeCoords.filter((_, i) => i % 2 === 0);
        state.routeCoords.push({ latitude: curr.lat, longitude: curr.lng });
      }
    }

    // Cap routeCoords growth
    if (state.routeCoords.length < MAX_ROUTE_POINTS) {
      state.routeCoords.push({ latitude: curr.lat, longitude: curr.lng });
    }

    // Arrival check
    if (state.destination) {
      const d = haversine(curr, state.destination);
      if (d <= state.arrivalDistance) {
        // ⬇️⬇️ THE MUTEX ⬇️⬇️
        // No `await` between these two statements. JS is single-threaded,
        // so no other invocation can run in between. First caller wins;
        // every other concurrent caller bails immediately.
        if (isSubmitting) return;
        isSubmitting = true;

        try {
          // Persist the submitted flag BEFORE the network call so that if
          // the process is killed mid-submit, the task won't re-enter on
          // restart with submitted=false and duplicate the write.
          state.submitted = true;
          await setTripState(state);

          await submitTrip(state, curr);

          // Success → clear state and stop tracking
          await setTripState(null);
          await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
          return;
        } catch (e) {
          console.error("background submit failed", e);

          // Reset the submitted flag so a later location update retries.
          state.submitted = false;
          await setTripState(state);

          await safeNotify(
            "Trip Auto-Submit Failed",
            "Will retry when you move again, or open the app to submit manually.",
          );

          // Don't stop tracking — let it retry on the next update.
          return;
        } finally {
          // Release the mutex so the next invocation can try again.
          isSubmitting = false;
        }
      }
    }
  }

  // Persist progress for the next invocation
  await setTripState(state);
});
