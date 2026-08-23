import { Text, View } from "@/components/Themed";
import YearLineChart from "@/components/YearBarChart";
import { db } from "@/firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { BarChart } from "react-native-chart-kit";

interface User {
  id: string;
  username: string;
  email: string;
  ess_no: string;
  department: string;
  grade: string;
  cost_center: string;
  role: number;
  office: number;
  active: boolean;
  home_coordinates: {
    latitude: number;
    longitude: number;
  };
  subordinates: string[];
}

interface Expense {
  id: string;
  distance: number;
  date?: string;
  trip_ids: string[];
  purpose: string;
  from_time?: string;
  to_time?: string;
  duration?: string;
  company: string;
  name: string;
  trip_report?: string;
  contact_number: string;
  email: string;
  customers: any[];
  parking: number;
  toll: number;
  mileage: number;
  expense: number;
  expense_purpose: string;
  vendor: string;
  cost: number;
  user_id: string;
  user_name?: string;
  business_card_url?: string;
  route_image_url?: string;
  receipt_urls?: string[];
  approval_status: number;
  type: number;
  created_at: any;
}

interface GeneralExpense {
  id: string;
  distance: number;
  date?: string;
  expense_type: string;
  amount: number;
  company?: string;
  name?: string;
  customers: any[];
  vendor: string;
  contact_number?: string;
  user_id: string;
  user_name?: string;
  email?: string;
  expense_report?: string;
  type: number;
  approval_status: number;
  created_at: any;
}

interface OutstationExpense {
  id: string;
  user_id: string;
  username: string;
  user_name: string;
  request_id: string;
  start_date: string;
  end_date: string;
  travel_purposes: string[];
  trip_title: string;
  date: string;
  country: string;
  location: string;
  airfare: number;
  airfare_remark: string;
  mileage: number;
  trip_ids: string[];
  toll: number;
  toll_remark: string;
  parking: number;
  parking_remark: string;
  transport: number;
  transport_remark: string;
  hotel: number;
  hotel_remark: string;
  own_acc: number;
  own_acc_sharing: string;
  own_acc_remark: string;
  entertainment: number;
  entertainment_remark: string;
  laundry: number;
  laundry_remark: string;
  others: number;
  others_remark: string;
  total: number;
  departure_time: string;
  arrival_time: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  meal: number;
  trip_report: string;
  customers: any[];
  business_card_urls: string;
  type: number;
  approval_status: number;
  created_at: any;
}

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
  vehicle?: string;
  remark: string;
  route_image_url?: string;
  from_home: boolean;
  to_home: boolean;
  platform: number;
  created_at: any;
}

type WithDate = { date: string };

export default function dashboard() {
  const [userId, setUserId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [role, setRole] = useState<number | null>(null);
  const [subordinates, setSubordinates] = useState<string[]>([]);
  const [grade, setGrade] = useState<string>("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [allMileage, setAllMileage] = useState<Expense[]>([]);
  const [allGeneral, setAllGeneral] = useState<GeneralExpense[]>([]);
  const [allOutstation, setAllOutstation] = useState<OutstationExpense[]>([]);

  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");

  const [showUserModal, setShowUserModal] = useState(false);
  const [tabIndex, setTabIndex] = useState<number>(1);

  const MONTHS = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Determine the financial year start based on current date
  // If current month is April (4) or later, financial year is currentYear
  // Otherwise, financial year is currentYear - 1
  const financialStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;

  const startYear = 2024;
  const endYear = financialStartYear + 2; // Show current + next 2 years
  const YEARS = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i,
  );

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = Math.min(screenWidth - 40, 600); // MAX 400px
  const chartHeight = 180; // FIXED HEIGHT

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.role);
            setSubordinates(userData.subordinates || []);
            const displayName =
              userData.name || userData.username || user.displayName || "User";
            setUsername(displayName);
            setGrade(userData.grade || "N/A");
          } else {
            console.warn("User document does NOT exist for uid:", user.uid);
            setRole(null);
          }
        } catch (error) {
          console.error("Error fetching user doc:", error);
          setRole(null);
        }
      } else {
        setUserId("");
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    setSelectedMonth(6);
    setSelectedYear(currentYear);
  }, []);

  /* useEffect(() => {
    if (!userId) return;
    if (role == 1) {
      return;
    }

    if (role == 0) {
      const q = query(collection(db, "users"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userData: User[] = [];
        snapshot.forEach((doc) => {
          userData.push({ id: doc.id, ...doc.data() } as User);
        });
        userData.sort((a, b) => a.username.localeCompare(b.username));
        setAllUsers(userData);
      });
      return () => unsubscribe();
    }

    if (subordinates.length === 0) {
      return;
    }
    const userIdsToFetch = [...subordinates, userId];

    const q = query(
      collection(db, "users"),
      where("__name__", "in", userIdsToFetch),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData: User[] = [];
      snapshot.forEach((doc) => {
        userData.push({ id: doc.id, ...doc.data() } as User);
      });
      userData.sort((a, b) => a.username.localeCompare(b.username));
      setAllUsers(userData);
    });
    return () => unsubscribe();
  }, [role, subordinates, userId]); */

  useEffect(() => {
    if (!userId) return;
    if (role == 1) {
      const q = query(collection(db, "users"), where("__name__", "==", userId));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userData: User[] = [];
        snapshot.forEach((doc) => {
          userData.push({ id: doc.id, ...doc.data() } as User);
        });
        userData.sort((a, b) => a.username.localeCompare(b.username));
        setAllUsers(userData);
      });
      return () => unsubscribe();
    }

    if (role == 0) {
      const q = query(collection(db, "users"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userData: User[] = [];
        snapshot.forEach((doc) => {
          userData.push({ id: doc.id, ...doc.data() } as User);
        });
        userData.sort((a, b) => a.username.localeCompare(b.username));
        setAllUsers(userData);
      });
      return () => unsubscribe();
    }

    if (subordinates.length === 0) {
      return;
    }
    const userIdsToFetch = [...subordinates, userId];

    const q = query(
      collection(db, "users"),
      where("__name__", "in", userIdsToFetch),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData: User[] = [];
      snapshot.forEach((doc) => {
        userData.push({ id: doc.id, ...doc.data() } as User);
      });
      userData.sort((a, b) => a.username.localeCompare(b.username));
      setAllUsers(userData);
    });
    return () => unsubscribe();
  }, [role, subordinates, userId]);

  useEffect(() => {
    if (!userId) return;
    let q;

    if (role === 1) {
      q = query(
        collection(db, "trips"),
        where("user_id", "==", userId),
        orderBy("created_at", "desc"),
      );
    } else if (role === 0) {
      q = query(collection(db, "trips"), orderBy("created_at", "desc"));
    } else {
      if (subordinates.length === 0) {
        return;
      }
      const userIdsToFetch = [...subordinates, userId];

      q = query(
        collection(db, "trips"),
        where("user_id", "in", userIdsToFetch),
        orderBy("created_at", "desc"),
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trips: Trip[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllTrips(trips);
    });

    return () => unsubscribe();
  }, [userId, role, subordinates]);

  useEffect(() => {
    if (!userId) return;
    // Wait until role is determined (not null)
    if (role === null) return;

    let q;
    if (role === 0) {
      // Admin: fetch all expenses (no user_id filter)
      q = query(collection(db, "expenses"), orderBy("created_at", "desc"));
    } else if (role === 1) {
      // Regular user: fetch only their own expenses
      q = query(
        collection(db, "expenses"),
        where("user_id", "==", userId),
        orderBy("created_at", "desc"),
      );
    } else {
      // Manager/Supervisor: fetch expenses from subordinates + self
      if (subordinates.length === 0) {
        return;
      }
      const userIdsToFetch = [...subordinates, userId];

      q = query(
        collection(db, "expenses"),
        where("user_id", "in", userIdsToFetch),
        orderBy("created_at", "desc"),
      );
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData: Expense[] = [];
      const generalExpenseData: GeneralExpense[] = [];
      const outstationExpenseData: OutstationExpense[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 1) {
          expensesData.push({ id: doc.id, ...data } as Expense);
        } else if (data.type === 2) {
          generalExpenseData.push({ id: doc.id, ...data } as GeneralExpense);
        } else if (data.type === 3) {
          outstationExpenseData.push({
            id: doc.id,
            ...data,
          } as OutstationExpense);
        }
      });
      setAllMileage(expensesData);
      /* const allTripIds = expensesData.flatMap((item) => item.trip_ids);
        setAllTripIds([...new Set(allTripIds)]); */

      setAllGeneral(generalExpenseData);
      setAllOutstation(outstationExpenseData);
    });

    return () => unsubscribe();
  }, [userId, role, subordinates]);

  const changeDashboard = (index: number) => {
    console.log(allTrips);
    console.log(allMileage);
    console.log(filteredUserMileage);
    console.log(filteredMileage);
    //setTabIndex(index);
  };

  const filterByMonth = <T extends { date?: string }>(
    items: T[],
    year: number,
    month: number,
  ): T[] => {
    const monthStr = String(month).padStart(2, "0");
    const searchPrefix = `${year}-${monthStr}`;

    return items.filter((item) => item.date?.startsWith(searchPrefix) ?? false);
  };

  const userMap = useMemo(() => {
    const map = new Map();
    allUsers.forEach((user) => {
      map.set(user.username, user);
    });
    return map;
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    if (!selectedDepartment) return allUsers;
    return allUsers.filter((user) => user.department === selectedDepartment);
  }, [allUsers, selectedDepartment]);

  const filteredUserMileage = allMileage.filter((e) => {
    const user = userMap.get(e.user_name);
    if (!user) return false;

    if (selectedDepartment && user.department !== selectedDepartment) {
      return false;
    }

    if (selectedUser && e.user_name !== selectedUser) {
      return false;
    }

    return true;
  });

  const filteredMileage = filteredUserMileage.filter((e) => {
    if (!e.date) return false;

    const date = new Date(e.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed

    // Financial year: April [selectedYear] to March [selectedYear + 1]
    if (year === selectedYear && month >= 4) return true;
    if (year === selectedYear + 1 && month <= 3) return true;

    return false;
  });

  const groupMileageByMonth = (expenses: Expense[]) => {
    return expenses.reduce<Record<string, { total: number; items: Expense[] }>>(
      (acc, item) => {
        if (!item.date) return acc;
        const date = new Date(item.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        if (!acc[key]) {
          acc[key] = { total: 0, items: [] };
        }
        acc[key].total += item.cost || 0; // Using 'cost' from Expense
        acc[key].items.push(item);
        return acc;
      },
      {},
    );
  };

  const groupedByMonth = filteredMileage.reduce<Record<string, Expense[]>>(
    (acc, item) => {
      // Check if date exists
      if (!item.date) return acc;

      const date = new Date(item.date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      // Create a key for grouping (e.g., "2026-04" for April 2026)
      const key = `${year}-${String(month).padStart(2, "0")}`;

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(item);
      return acc;
    },
    {},
  );

  const filteredUserGeneral = allGeneral.filter((e) => {
    const user = userMap.get(e.user_name);
    if (!user) return false;

    if (selectedDepartment && user.department !== selectedDepartment) {
      return false;
    }

    if (selectedUser && e.user_name !== selectedUser) {
      return false;
    }

    return true;
  });

  const filteredGeneral = filteredUserGeneral.filter((e) => {
    if (!e.date) return false;

    const date = new Date(e.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed

    // Financial year: April [selectedYear] to March [selectedYear + 1]
    if (year === selectedYear && month >= 4) return true;
    if (year === selectedYear + 1 && month <= 3) return true;

    return false;
  });

  const groupGeneralByMonth = (expenses: GeneralExpense[]) => {
    return expenses.reduce<
      Record<string, { total: number; items: GeneralExpense[] }>
    >((acc, item) => {
      if (!item.date) return acc;
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!acc[key]) {
        acc[key] = { total: 0, items: [] };
      }
      acc[key].total += item.amount || 0; // Using 'amount' from GeneralExpense
      acc[key].items.push(item);
      return acc;
    }, {});
  };

  const filteredUserOutstation = allOutstation.filter((e) => {
    const user = userMap.get(e.user_name);
    if (!user) return false;

    if (selectedDepartment && user.department !== selectedDepartment) {
      return false;
    }

    if (selectedUser && e.user_name !== selectedUser) {
      return false;
    }

    return true;
  });

  const filteredOutstation = filteredUserOutstation.filter((e) => {
    if (!e.date) return false;

    const date = new Date(e.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed

    // Financial year: April [selectedYear] to March [selectedYear + 1]
    if (year === selectedYear && month >= 4) return true;
    if (year === selectedYear + 1 && month <= 3) return true;

    return false;
  });

  const groupOutstationByMonth = (expenses: OutstationExpense[]) => {
    return expenses.reduce<
      Record<string, { total: number; items: OutstationExpense[] }>
    >((acc, item) => {
      if (!item.date) return acc;
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!acc[key]) {
        acc[key] = { total: 0, items: [] };
      }
      acc[key].total += item.total || 0; // Using 'total' from OutstationExpense
      acc[key].items.push(item);
      return acc;
    }, {});
  };

  const getMonthlyData = (dataArray) => {
    const monthlyCounts = {};

    dataArray.forEach((e) => {
      if (!e.date) return;
      const date = new Date(e.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
    });

    // Sort by date
    const sortedKeys = Object.keys(monthlyCounts).sort();
    const data = sortedKeys.map((key) => monthlyCounts[key]);
    const labels = sortedKeys.map((key) => {
      const [year, month] = key.split("-");
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return monthNames[parseInt(month) - 1];
    });

    return { data, labels };
  };

  // Generic function that works with both types
  const getTotalTripDistance = (
    expenses: (Expense | OutstationExpense)[],
    tripMap: Map<string, Trip>,
  ) => {
    return expenses.reduce((sum, expense) => {
      if (!expense.trip_ids || expense.trip_ids.length === 0) return sum;

      const distance = expense.trip_ids.reduce((acc, tripId) => {
        const trip = tripMap.get(tripId);
        return acc + (trip?.distance || 0);
      }, 0);

      return sum + distance;
    }, 0);
  };

  const toNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const filteredMileage1 = filteredUserMileage.filter((e) => {
    if (!e.date) return false;
    const monthStr = String(selectedMonth).padStart(2, "0");
    const searchPrefix = `${selectedYear}-${monthStr}`;
    return e.date.startsWith(searchPrefix);
  });
  const filteredGeneral1 = filteredUserGeneral.filter((e) => {
    if (!e.date) return false;
    const monthStr = String(selectedMonth).padStart(2, "0");
    const searchPrefix = `${selectedYear}-${monthStr}`;
    return e.date.startsWith(searchPrefix);
  });
  const filteredOutstation1 = filteredUserOutstation.filter((e) => {
    if (!e.date) return false;
    const monthStr = String(selectedMonth).padStart(2, "0");
    const searchPrefix = `${selectedYear}-${monthStr}`;
    return e.date.startsWith(searchPrefix);
  });

  const calculateDuration = (fromTime: any, toTime: any): number => {
    if (!fromTime || !toTime) return 0;

    // Convert Firebase Timestamp to Date
    const fromDate = fromTime.toDate ? fromTime.toDate() : new Date(fromTime);
    const toDate = toTime.toDate ? toTime.toDate() : new Date(toTime);

    // Calculate difference in milliseconds
    const diffMs = toDate.getTime() - fromDate.getTime();

    // Convert to minutes
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    return diffMinutes;
  };

  // Get total duration for an expense's trips
  const getTotalTripDuration = (
    expenses: (Expense | OutstationExpense)[],
    tripMap: Map<string, Trip>,
  ) => {
    return expenses.reduce((sum, expense) => {
      if (!expense.trip_ids || expense.trip_ids.length === 0) return sum;

      const duration = expense.trip_ids.reduce((acc, tripId) => {
        const trip = tripMap.get(tripId);
        if (!trip || !trip.from_time || !trip.to_time) return acc;

        return acc + calculateDuration(trip.from_time, trip.to_time);
      }, 0);

      return sum + duration;
    }, 0);
  };

  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return "0m";
    if (minutes < 0) return "0m";

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Usage
  const tripMap = new Map(allTrips.map((trip) => [trip.id, trip]));

  const mileageDistance = getTotalTripDistance(filteredMileage, tripMap);
  const outstationDistance = getTotalTripDistance(filteredOutstation, tripMap);
  const totalDistance = mileageDistance + outstationDistance;

  const mileageDuration = getTotalTripDuration(filteredMileage, tripMap);
  const oustationDuration = getTotalTripDuration(filteredOutstation, tripMap);
  const totalDuration = mileageDuration + oustationDuration;

  // Usage with different data sources
  const mileageData = getMonthlyData(allMileage);
  const generalData = getMonthlyData(allGeneral);
  const outstationData = getMonthlyData(allOutstation);

  const mileageGrouped = groupMileageByMonth(filteredMileage);
  const generalGrouped = groupGeneralByMonth(filteredGeneral);
  const outstationGrouped = groupOutstationByMonth(filteredOutstation);

  const groupAllExpensesByMonth = (
    mileageExpenses: Expense[],
    generalExpenses: GeneralExpense[],
    outstationExpenses: OutstationExpense[],
    trips: Trip[] = [],
  ) => {
    const grouped: Record<
      string,
      {
        total: number;
        mileageTotal: number;
        generalTotal: number;
        outstationTotal: number;
        count: number;
        totalDistance: number;
        mileageDistance: number;
        outstationDistance: number;
        tripCount: number;
        mileageTripCount: number;
        outstationTripCount: number;
        totalDuration: number; // Total duration in minutes
        mileageDuration: number; // Duration from mileage trips
        outstationDuration: number; // Duration from outstation trips
      }
    > = {};

    const toNumber = (value: any): number => {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    };

    // Calculate duration between from_time and to_time
    const calculateDuration = (fromTime: any, toTime: any): number => {
      if (!fromTime || !toTime) return 0;

      try {
        // Convert Firebase Timestamp to Date
        const fromDate = fromTime.toDate
          ? fromTime.toDate()
          : new Date(fromTime);
        const toDate = toTime.toDate ? toTime.toDate() : new Date(toTime);

        // Calculate difference in milliseconds
        const diffMs = toDate.getTime() - fromDate.getTime();

        // Convert to minutes
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        return diffMinutes;
      } catch (error) {
        console.error("Error calculating duration:", error);
        return 0;
      }
    };

    // Create maps for quick lookup
    const tripDistanceMap: Record<string, number> = {};
    const tripDurationMap: Record<string, number> = {};

    trips.forEach((trip) => {
      if (trip.id) {
        if (trip.distance !== undefined && trip.distance !== null) {
          tripDistanceMap[String(trip.id)] = toNumber(trip.distance);
        }
        if (trip.from_time && trip.to_time) {
          tripDurationMap[String(trip.id)] = calculateDuration(
            trip.from_time,
            trip.to_time,
          );
        }
      }
    });

    // Helper to get total distance from an array of trip IDs
    const getTotalDistanceFromTrips = (
      tripIds: string[] | undefined,
    ): number => {
      if (!tripIds || !Array.isArray(tripIds) || tripIds.length === 0) {
        return 0;
      }

      let totalDistance = 0;
      tripIds.forEach((tripId) => {
        const distance = tripDistanceMap[String(tripId)] || 0;
        totalDistance += distance;
      });

      return totalDistance;
    };

    // Helper to get total duration from an array of trip IDs
    const getTotalDurationFromTrips = (
      tripIds: string[] | undefined,
    ): number => {
      if (!tripIds || !Array.isArray(tripIds) || tripIds.length === 0) {
        return 0;
      }

      let totalDuration = 0;
      tripIds.forEach((tripId) => {
        const duration = tripDurationMap[String(tripId)] || 0;
        totalDuration += duration;
      });

      return totalDuration;
    };

    // Helper to get number of trips
    const getTripCount = (tripIds: string[] | undefined): number => {
      if (!tripIds || !Array.isArray(tripIds)) {
        return 0;
      }
      return tripIds.length;
    };

    // Process Mileage Expenses
    mileageExpenses.forEach((item) => {
      if (!item.date) return;
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const cost = toNumber(item.cost);
      const distance = getTotalDistanceFromTrips(item.trip_ids);
      const tripCount = getTripCount(item.trip_ids);
      const duration = getTotalDurationFromTrips(item.trip_ids);

      if (!grouped[key]) {
        grouped[key] = {
          total: 0,
          mileageTotal: 0,
          generalTotal: 0,
          outstationTotal: 0,
          count: 0,
          totalDistance: 0,
          mileageDistance: 0,
          outstationDistance: 0,
          tripCount: 0,
          mileageTripCount: 0,
          outstationTripCount: 0,
          totalDuration: 0,
          mileageDuration: 0,
          outstationDuration: 0,
        };
      }
      grouped[key].mileageTotal += cost;
      grouped[key].total += cost;
      grouped[key].mileageDistance += distance;
      grouped[key].totalDistance += distance;
      grouped[key].mileageTripCount += tripCount;
      grouped[key].tripCount += tripCount;
      grouped[key].mileageDuration += duration;
      grouped[key].totalDuration += duration;
      grouped[key].count += 1;
    });

    // Process General Expenses
    generalExpenses.forEach((item) => {
      if (!item.date) return;
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const amount = toNumber(item.amount);

      if (!grouped[key]) {
        grouped[key] = {
          total: 0,
          mileageTotal: 0,
          generalTotal: 0,
          outstationTotal: 0,
          count: 0,
          totalDistance: 0,
          mileageDistance: 0,
          outstationDistance: 0,
          tripCount: 0,
          mileageTripCount: 0,
          outstationTripCount: 0,
          totalDuration: 0,
          mileageDuration: 0,
          outstationDuration: 0,
        };
      }
      grouped[key].generalTotal += amount;
      grouped[key].total += amount;
      grouped[key].count += 1;
    });

    // Process Outstation Expenses
    outstationExpenses.forEach((item) => {
      if (!item.date) return;
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const total = toNumber(item.total);
      const distance = getTotalDistanceFromTrips(item.trip_ids);
      const tripCount = getTripCount(item.trip_ids);
      const duration = getTotalDurationFromTrips(item.trip_ids);

      if (!grouped[key]) {
        grouped[key] = {
          total: 0,
          mileageTotal: 0,
          generalTotal: 0,
          outstationTotal: 0,
          count: 0,
          totalDistance: 0,
          mileageDistance: 0,
          outstationDistance: 0,
          tripCount: 0,
          mileageTripCount: 0,
          outstationTripCount: 0,
          totalDuration: 0,
          mileageDuration: 0,
          outstationDuration: 0,
        };
      }
      grouped[key].outstationTotal += total;
      grouped[key].total += total;
      grouped[key].outstationDistance += distance;
      grouped[key].totalDistance += distance;
      grouped[key].outstationTripCount += tripCount;
      grouped[key].tripCount += tripCount;
      grouped[key].outstationDuration += duration;
      grouped[key].totalDuration += duration;
      grouped[key].count += 1;
    });

    return grouped;
  };

  const prepareFinancialYearChartData = (
    groupedData: Record<
      string,
      {
        total: number;
        mileageTotal: number;
        generalTotal: number;
        outstationTotal: number;
        count: number;
        totalDistance: number;
        mileageDistance: number;
        outstationDistance: number;
        tripCount: number;
        mileageTripCount: number;
        outstationTripCount: number;
        totalDuration: number;
        mileageDuration: number;
        outstationDuration: number;
      }
    >,
    year: number,
  ) => {
    const months = [
      { month: 4, label: "Apr" },
      { month: 5, label: "May" },
      { month: 6, label: "Jun" },
      { month: 7, label: "Jul" },
      { month: 8, label: "Aug" },
      { month: 9, label: "Sep" },
      { month: 10, label: "Oct" },
      { month: 11, label: "Nov" },
      { month: 12, label: "Dec" },
      { month: 1, label: "Jan" },
      { month: 2, label: "Feb" },
      { month: 3, label: "Mar" },
    ];

    const labels: string[] = [];
    const data: number[] = [];
    const mileageData: number[] = [];
    const generalData: number[] = [];
    const outstationData: number[] = [];
    const totalDistanceData: number[] = [];
    const mileageDistanceData: number[] = [];
    const outstationDistanceData: number[] = [];
    const tripCountData: number[] = [];
    const mileageTripCountData: number[] = [];
    const outstationTripCountData: number[] = [];
    const totalDurationData: number[] = [];
    const mileageDurationData: number[] = [];
    const outstationDurationData: number[] = [];

    months.forEach(({ month, label }) => {
      const actualYear = month >= 4 ? year : year + 1;
      const key = `${actualYear}-${String(month).padStart(2, "0")}`;

      labels.push(label);

      if (groupedData[key]) {
        data.push(groupedData[key].total);
        mileageData.push(groupedData[key].mileageTotal);
        generalData.push(groupedData[key].generalTotal);
        outstationData.push(groupedData[key].outstationTotal);
        totalDistanceData.push(groupedData[key].totalDistance);
        mileageDistanceData.push(groupedData[key].mileageDistance);
        outstationDistanceData.push(groupedData[key].outstationDistance);
        tripCountData.push(groupedData[key].tripCount);
        mileageTripCountData.push(groupedData[key].mileageTripCount);
        outstationTripCountData.push(groupedData[key].outstationTripCount);
        totalDurationData.push(groupedData[key].totalDuration);
        mileageDurationData.push(groupedData[key].mileageDuration);
        outstationDurationData.push(groupedData[key].outstationDuration);
      } else {
        data.push(0);
        mileageData.push(0);
        generalData.push(0);
        outstationData.push(0);
        totalDistanceData.push(0);
        mileageDistanceData.push(0);
        outstationDistanceData.push(0);
        tripCountData.push(0);
        mileageTripCountData.push(0);
        outstationTripCountData.push(0);
        totalDurationData.push(0);
        mileageDurationData.push(0);
        outstationDurationData.push(0);
      }
    });

    return {
      labels,
      data,
      mileageData,
      generalData,
      outstationData,
      totalDistanceData,
      mileageDistanceData,
      outstationDistanceData,
      tripCountData,
      mileageTripCountData,
      outstationTripCountData,
      totalDurationData,
      mileageDurationData,
      outstationDurationData,
      breakdown: months.map(({ month, label }, index) => ({
        month,
        label,
        total: data[index],
        mileage: mileageData[index],
        general: generalData[index],
        outstation: outstationData[index],
        totalDistance: totalDistanceData[index],
        mileageDistance: mileageDistanceData[index],
        outstationDistance: outstationDistanceData[index],
        tripCount: tripCountData[index],
        mileageTripCount: mileageTripCountData[index],
        outstationTripCount: outstationTripCountData[index],
        totalDuration: totalDurationData[index],
        mileageDuration: mileageDurationData[index],
        outstationDuration: outstationDurationData[index],
      })),
    };
  };

  // In your component
  const groupedExpenses = groupAllExpensesByMonth(
    filteredMileage,
    filteredGeneral,
    filteredOutstation,
    allTrips,
  );

  const chartData = prepareFinancialYearChartData(
    groupedExpenses,
    selectedYear,
  );

  // Helper function to extract state from Malaysian address
  const extractMalaysianState = (address: string): string => {
    if (!address) return "Unknown";

    // Common Malaysian states and their abbreviations
    const states: { [key: string]: string[] } = {
      Central: [
        "selangor",
        "petaling jaya",
        "subang",
        "klang",
        "shah alam",
        "negeri sembilan",
        "seremban",
        "putrajaya",
        "kuala lumpur",
        "kl",
        "wilayah persekutuan kuala lumpur",
      ],
      Nothern: [
        "perak",
        "ipoh",
        "penang",
        "pulau pinang",
        "georgetown",
        "perlis",
        "kangar",
        "kedah",
        "alor setar",
        "pahang",
        "kuantan",
      ],
      Southern: ["johor", "jb", "johor bahru", "melaka", "malacca", "melacca"],
      "East Coast": [
        "kelantan",
        "kota bharu",
        "terengganu",
        "kuala terengganu",
      ],
      "East Malaysia": [
        "sabah",
        "kota kinabalu",
        "sarawak",
        "kuching",
        "labuan",
      ],
    };

    const lowerAddress = address.toLowerCase();

    // Check for state names in address
    for (const [state, keywords] of Object.entries(states)) {
      for (const keyword of keywords) {
        if (lowerAddress.includes(keyword)) {
          return state;
        }
      }
    }

    // If no state found, try to extract from postal code or last word
    const parts = address.split(",").map((p) => p.trim());
    const lastPart = parts[parts.length - 1]?.toLowerCase() || "";

    // Check if last part is a state abbreviation or name
    for (const [state, keywords] of Object.entries(states)) {
      for (const keyword of keywords) {
        if (lastPart.includes(keyword) || lastPart === keyword) {
          return state;
        }
      }
    }
  };

  // Main grouping function
  const groupTripsByState = (
    mileage: Expense[],
    outstation: OutstationExpense[],
    trips: Trip[],
  ): Record<string, Trip[]> => {
    // Extract all trip IDs from mileage and outstation expenses
    const tripIds = new Set<string>();

    mileage.forEach((expense) => {
      expense.trip_ids?.forEach((id) => tripIds.add(id));
    });

    outstation.forEach((expense) => {
      expense.trip_ids?.forEach((id) => tripIds.add(id));
    });

    // Filter trips that are in the trip IDs set
    const relevantTrips = trips.filter((trip) => tripIds.has(trip.id));

    // Group by state
    const groupedByState: Record<string, Trip[]> = {};

    relevantTrips.forEach((trip) => {
      const state = extractMalaysianState(trip.to_address);
      if (!groupedByState[state]) {
        groupedByState[state] = [];
      }
      groupedByState[state].push(trip);
    });

    return groupedByState;
  };

  // Usage in your component
  const groupedTrips = groupTripsByState(
    filteredMileage,
    filteredOutstation,
    allTrips,
  );

  // If you want sorted states
  const sortedGroupedTrips = Object.fromEntries(
    Object.entries(groupedTrips).sort(([a], [b]) => a.localeCompare(b)),
  );

  // To get statistics
  const getTripStats = (grouped: Record<string, Trip[]>) => {
    const stats: Record<string, { count: number; totalDistance: number }> = {};

    Object.entries(grouped).forEach(([state, trips]) => {
      stats[state] = {
        count: trips.length,
        totalDistance: trips.reduce(
          (sum, trip) => sum + (trip.distance || 0),
          0,
        ),
      };
    });

    return stats;
  };

  const tripStats = getTripStats(groupedTrips);

  const stateChartData = {
    labels: Object.keys(groupedTrips), // e.g., ["Central", "Northern", "Southern"]
    datasets: [
      {
        data: Object.values(groupedTrips).map((trips) => trips.length), // e.g., [12, 8, 5]
      },
    ],
  };

  const getMaxValue = (data: any): number => {
    if (!data || !data.datasets || data.datasets.length === 0) return 0;
    const values = data.datasets[0].data || [];
    if (values.length === 0) return 0;
    return Math.max(...values);
  };

  const getMaxYAxisValue = (maxValue: number): number => {
    const interval = getChartInterval(maxValue);
    return Math.ceil(maxValue / interval) * interval;
  };

  const renderTripBarChart = () => {
    // FIX: Correct the typo in the function
    const extractMalaysianState = (address: string): string => {
      if (!address) return "Unknown";

      const states: { [key: string]: string[] } = {
        Central: [
          "selangor",
          "petaling jaya",
          "subang",
          "klang",
          "shah alam",
          "negeri sembilan",
          "seremban",
          "putrajaya",
          "kuala lumpur",
          "kl",
          "wilayah persekutuan kuala lumpur",
        ],
        Northern: [
          // Fixed: Changed from "Nothern" to "Northern"
          "perak",
          "ipoh",
          "penang",
          "pulau pinang",
          "georgetown",
          "perlis",
          "kangar",
          "kedah",
          "alor setar",
          "pahang",
          "kuantan",
        ],
        Southern: [
          "johor",
          "jb",
          "johor bahru",
          "melaka",
          "malacca",
          "melacca",
        ],
        "East Coast": [
          "kelantan",
          "kota bharu",
          "terengganu",
          "kuala terengganu",
        ],
        "East Malaysia": [
          "sabah",
          "kota kinabalu",
          "sarawak",
          "kuching",
          "labuan",
        ],
      };

      const lowerAddress = address.toLowerCase();

      for (const [state, keywords] of Object.entries(states)) {
        for (const keyword of keywords) {
          if (lowerAddress.includes(keyword)) {
            return state;
          }
        }
      }

      const parts = address.split(",").map((p) => p.trim());
      const lastPart = parts[parts.length - 1]?.toLowerCase() || "";

      for (const [state, keywords] of Object.entries(states)) {
        for (const keyword of keywords) {
          if (lastPart.includes(keyword) || lastPart === keyword) {
            return state;
          }
        }
      }
    };

    // Main grouping function
    const groupTripsByState = (
      mileage: Expense[],
      outstation: OutstationExpense[],
      trips: Trip[],
    ): Record<string, Trip[]> => {
      const tripIds = new Set<string>();

      mileage.forEach((expense) => {
        expense.trip_ids?.forEach((id) => tripIds.add(id));
      });

      outstation.forEach((expense) => {
        expense.trip_ids?.forEach((id) => tripIds.add(id));
      });

      const relevantTrips = trips.filter((trip) => tripIds.has(trip.id));
      const groupedByState: Record<string, Trip[]> = {};

      relevantTrips.forEach((trip) => {
        const state = extractMalaysianState(trip.to_address);
        if (!groupedByState[state]) {
          groupedByState[state] = [];
        }
        groupedByState[state].push(trip);
      });

      return groupedByState;
    };

    // Get the grouped trips
    const groupedTrips = groupTripsByState(
      filteredMileage,
      filteredOutstation,
      allTrips,
    );

    // Debug: Log the grouped trips to see what's actually in there
    console.log("Grouped Trips:", groupedTrips);
    console.log("Keys:", Object.keys(groupedTrips));

    // Define all possible regions (matching the exact keys from extractMalaysianState)
    const allRegions = [
      "Central",
      "Northern", // Fixed spelling
      "Southern",
      "East Coast",
      "East Malaysia",
    ];

    // Prepare data with all regions
    const stateChartData = {
      labels: allRegions,
      datasets: [
        {
          data: allRegions.map((region) => {
            const count = groupedTrips[region]
              ? groupedTrips[region].length
              : 0;
            console.log(`Region: ${region}, Count: ${count}`); // Debug log
            return count;
          }),
        },
      ],
    };

    console.log("Chart Data:", stateChartData); // Debug log

    const maxValue = getMaxValue(stateChartData);
    const chartInterval = getChartInterval(maxValue);
    const maxYAxisValue = Math.ceil(maxValue / chartInterval) * chartInterval;
    const segments = maxYAxisValue / chartInterval;

    const realData = {
      labels: stateChartData.labels,
      datasets: [
        {
          data: stateChartData.datasets[0].data,
          barColors: stateChartData.datasets[0].data.map(
            () => "rgba(0, 9, 0, 0.1)",
          ),
        },
      ],
    };
    const barColors = [
      ...stateChartData.datasets[0].data.map(() => "rgb(9, 67, 161)"),
      "rgba(0, 0, 0, 0)", // Transparent for dummy
    ];

    return (
      <View>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Trips by Region</Text>
        </View>
        <BarChart
          data={realData}
          width={screenWidth - 30}
          height={220}
          chartConfig={{
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            color: (opacity = 1) => `rgba(0, 9, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            fillShadowGradientOpacity: 0.4,
            fillShadowGradientFromOpacity: 0.4,
            fillShadowGradientToOpacity: 0.4,
            style: {
              borderRadius: 16,
            },
            propsForLabels: {
              fontSize: 14,
            },
            barPercentage: 3,
          }}
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
          fromZero={true}
          showValuesOnTopOfBars={true}
          segments={segments}
          withHorizontalLabels={false}
        />
      </View>
    );
  };

  const renderSelectUserModal = () => {
    return (
      <Modal
        visible={showUserModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUserModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUserModal(false)}
        >
          <View style={styles.userModalContent}>
            <View style={[styles.modalHeader, { marginBottom: 15 }]}>
              <View
                style={{
                  flexDirection: "row",
                  gap: 15,
                  alignItems: "center",
                }}
              >
                <Text style={[styles.modalTitle, { marginBottom: 0 }]}>
                  Select a User
                </Text>
                {selectedUser && (
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                      console.log("clear");
                      setSelectedUser("");
                      setShowUserModal(false);
                    }}
                  >
                    <Text style={styles.buttonText}>Clear User</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tableContainer}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <View style={{ flex: 3, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Username</Text>
                </View>
                <View style={{ flex: 2, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Email</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Department</Text>
                </View>
                <View style={{ flex: 0.5, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Grade</Text>
                </View>
                <View style={{ flex: 0.5, backgroundColor: "transparent" }}>
                  <Text style={styles.headerCell}>Cost Center</Text>
                </View>
              </View>

              {/* Table Body */}
              <ScrollView style={styles.modalList}>
                {filteredUsers.map((user) => {
                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[styles.tableRow]}
                      onPress={() => {
                        setSelectedUser(user.username);
                        setShowUserModal(false);
                      }}
                    >
                      {/* Username */}
                      <View style={{ flex: 3 }}>
                        <Text style={[styles.tableCell]} numberOfLines={1}>
                          {user.username}
                        </Text>
                      </View>

                      {/* Email */}
                      <View style={{ flex: 2 }}>
                        <Text style={[styles.tableCell]} numberOfLines={1}>
                          {user.email}
                        </Text>
                      </View>

                      {/* Department */}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.tableCell]} numberOfLines={1}>
                          {user.department}
                        </Text>
                      </View>

                      {/* Grade */}
                      <View style={{ flex: 0.5 }}>
                        <Text style={[styles.tableCell]} numberOfLines={1}>
                          {user.grade}
                        </Text>
                      </View>

                      {/* Cost Center */}
                      <View style={{ flex: 0.5 }}>
                        <Text style={[styles.tableCell]} numberOfLines={1}>
                          {user.cost_center}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderTripDashboard = () => {
    return (
      <View style={styles.container}>
        <ScrollView>
          <View>{renderTripBarChart()}</View>

          {/* <View style={styles.dashboardGrid}>
          <View style={[styles.dashboardCard, styles.cardMileage]}>
            <View style={styles.cardIconContainer}>
              <Icon name="directions-car" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.cardLabel}>Mileage</Text>
            <Text style={styles.cardValue}>{filteredMileage.length}</Text>
          </View>

          <View style={[styles.dashboardCard, styles.cardGeneral]}>
            <View style={styles.cardIconContainer}>
              <Icon name="attach-money" size={24} color="#2196F3" />
            </View>
            <Text style={styles.cardLabel}>General</Text>
            <Text style={styles.cardValue}>{filteredGeneral.length}</Text>
          </View>

          <View style={[styles.dashboardCard, styles.cardOutstation]}>
            <View style={styles.cardIconContainer}>
              <Icon name="flight-takeoff" size={24} color="#FF9800" />
            </View>
            <Text style={styles.cardLabel}>Outstation</Text>
            <Text style={styles.cardValue}>{filteredOutstation.length}</Text>
          </View>
        </View>

        <View style={styles.dashboardGrid}>
          <View style={[styles.dashboardCard, styles.cardTrips]}>
            <View style={styles.cardIconContainer}>
              <Icon name="compare-arrows" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.cardLabel}>Total Trips</Text>
            <Text style={styles.cardValue}>
              {filteredMileage.reduce(
                (sum, e) => sum + (e.trip_ids?.length || 0),
                0,
              ) +
                filteredOutstation.reduce(
                  (sum, e) => sum + (e.trip_ids?.length || 0),
                  0,
                )}
            </Text>
          </View>
          <View style={[styles.dashboardCard, styles.cardTrips]}>
            <View style={styles.cardIconContainer}>
              <Icon name="compare-arrows" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.cardLabel}>Total Expense</Text>
            <Text style={styles.cardValue}>
              {totalMileageCost() + totalGeneralCost() + totalOutstationCost()}
            </Text>
          </View>
          <View style={[styles.dashboardCard, styles.cardMileage]}>
            <View style={styles.cardIconContainer}>
              <Icon name="route" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.cardLabel}>Total Distance</Text>
            <Text style={styles.cardValue}>
              {mileageDistance.toFixed(2)} km
            </Text>
          </View>
          <View style={[styles.dashboardCard, styles.cardMileage]}>
            <View style={styles.cardIconContainer}>
              <Icon name="access-time" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.cardLabel}>Total Duration</Text>
            <Text style={styles.cardValue}>
              {formatDuration(totalDuration)}
            </Text>
          </View>
        </View> */}

          <View style={styles.chartContainer}>
            {chartData.data.some((value) => value > 0) ? (
              <>
                <View style={styles.titleContainer}>
                  <Text style={styles.titleText}>
                    Total Expenses (RM{" "}
                    {chartData.data
                      .reduce((total: number, num: number) => total + num, 0)
                      .toFixed(2)}
                    ) - {selectedYear}/{selectedYear + 1}
                  </Text>
                </View>

                <YearLineChart
                  data={chartData.data}
                  labels={chartData.labels}
                  labelFormatter={(value) => {
                    const num = Number(value);
                    return `$${Number(value).toFixed(0)}`;
                  }}
                  formatTooltip={(value) => `RM${value.toFixed(2)}`}
                  color="rgba(134, 65, 244, 1)"
                  strokeColor="#6200ee"
                  segments={5}
                />
              </>
            ) : (
              <Text style={styles.noDataText}>
                No data available for {selectedYear}/{selectedYear + 1}
              </Text>
            )}
          </View>

          {/* Total Distance Chart */}
          <View style={styles.chartContainer}>
            {chartData.totalDistanceData.some((value) => value > 0) ? (
              <>
                <View style={styles.titleContainer}>
                  <Text style={styles.titleText}>
                    Total Distance Travelled (
                    {chartData.totalDistanceData
                      .reduce((total: number, num: number) => total + num, 0)
                      .toFixed(2)}{" "}
                    km) for {selectedYear}/{selectedYear + 1}
                  </Text>
                </View>

                <YearLineChart
                  data={chartData.totalDistanceData}
                  labels={chartData.labels}
                  labelFormatter={(value) => {
                    const num = Number(value);
                    // Just format the number nicely without changing its value
                    if (num >= 1000) return `${(num / 1000).toFixed(0)}k km`;
                    return `${num.toString()} km`;
                  }}
                  formatTooltip={(value) => `${value.toFixed(1)} km`}
                  color="rgba(54, 162, 235, 1)"
                  strokeColor="#36A2EB"
                  segments={5}
                />
              </>
            ) : (
              <Text style={styles.noDataText}>
                No data available for {selectedYear}/{selectedYear + 1}
              </Text>
            )}
          </View>

          {/* Number of Trips Chart */}
          <View style={styles.chartContainer}>
            {chartData.tripCountData.some((value) => value > 0) ? (
              <>
                <View style={styles.titleContainer}>
                  <Text style={styles.titleText}>
                    No. of Trips (
                    {chartData.tripCountData.reduce(
                      (total: number, num: number) => total + num,
                      0,
                    )}{" "}
                    trips) for {selectedYear}/{selectedYear + 1}
                  </Text>
                </View>

                <YearLineChart
                  data={chartData.tripCountData}
                  labels={chartData.labels}
                  labelFormatter={(value) => {
                    const num = Number(value);
                    const maxValue = Math.max(...chartData.tripCountData, 0);
                    let interval;
                    if (maxValue <= 5) interval = 1;
                    else if (maxValue <= 20) interval = 2;
                    else if (maxValue <= 50) interval = 5;
                    else if (maxValue <= 100) interval = 10;
                    else if (maxValue <= 500) interval = 25;
                    else interval = 50;
                    const rounded = Math.round(num / interval) * interval;
                    return rounded.toString();
                  }}
                  formatTooltip={(value) =>
                    `${value} trip${value !== 1 ? "s" : ""}`
                  }
                  color="rgba(255, 159, 67, 1)"
                  strokeColor="#FF9F43"
                />
              </>
            ) : (
              <Text style={styles.noDataText}>
                No data available for {selectedYear}/{selectedYear + 1}
              </Text>
            )}
          </View>

          {/* Total Travel Duration Chart */}
          <View style={styles.chartContainer}>
            {chartData.totalDurationData.some((value) => value > 0) ? (
              <>
                <View style={styles.titleContainer}>
                  <Text style={styles.titleText}>
                    Total Travel Duration (
                    {chartData.totalDistanceData
                      .reduce((total: number, num: number) => total + num, 0)
                      .toFixed(2)}{" "}
                    km) for - {selectedYear}/{selectedYear + 1}
                  </Text>
                </View>

                <YearLineChart
                  data={chartData.totalDurationData}
                  labels={chartData.labels}
                  labelFormatter={(value) => {
                    const num = Number(value);
                    const maxValue = Math.max(
                      ...chartData.totalDurationData,
                      0,
                    );
                    let interval;
                    if (maxValue <= 30) interval = 5;
                    else if (maxValue <= 60) interval = 10;
                    else if (maxValue <= 120) interval = 15;
                    else if (maxValue <= 300) interval = 30;
                    else if (maxValue <= 600) interval = 60;
                    else if (maxValue <= 1200) interval = 120;
                    else interval = 240;
                    const rounded = Math.round(num / interval) * interval;
                    if (rounded === 0) return "0m";
                    if (rounded >= 60) {
                      const hours = Math.floor(rounded / 60);
                      const minutes = rounded % 60;
                      if (minutes === 0) return `${hours}h`;
                      return `${hours}h ${minutes}m`;
                    }
                    return `${rounded}m`;
                  }}
                  formatTooltip={(value) => {
                    if (value >= 60) {
                      const hours = Math.floor(value / 60);
                      const minutes = Math.round(value % 60);
                      if (minutes === 0) return `${hours}h`;
                      return `${hours}h ${minutes}m`;
                    }
                    return `${Math.round(value)}m`;
                  }}
                  color="rgba(255, 99, 132, 1)"
                  strokeColor="#FF6384"
                />
              </>
            ) : (
              <Text style={styles.noDataText}>
                No data available for {selectedYear}/{selectedYear + 1}
              </Text>
            )}
          </View>

          {/* <View style={{ flexDirection: "row" }}>
          {mileageData.data.length > 0 ? (
            <LineChart
              data={{
                labels: mileageData.labels,
                datasets: [
                  {
                    data: mileageData.data,
                    color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={400}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#6200ee",
                },
                propsForBackgroundLines: {
                  strokeDasharray: "5, 5",
                },
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              formatYLabel={(value) => Math.round(value).toString()}
              fromZero
            />
          ) : (
            <Text style={styles.noDataText}>No data available for chart</Text>
          )}

          {generalData.data.length > 0 ? (
            <LineChart
              data={{
                labels: generalData.labels,
                datasets: [
                  {
                    data: generalData.data,
                    color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={400}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#6200ee",
                },
                propsForBackgroundLines: {
                  strokeDasharray: "5, 5",
                },
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              formatYLabel={(value) => Math.round(value).toString()}
              fromZero
            />
          ) : (
            <Text style={styles.noDataText}>No data available for chart</Text>
          )}

          {outstationData.data.length > 0 ? (
            <LineChart
              data={{
                labels: outstationData.labels,
                datasets: [
                  {
                    data: outstationData.data,
                    color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={400}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#6200ee",
                },
                propsForBackgroundLines: {
                  strokeDasharray: "5, 5",
                },
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              formatYLabel={(value) => Math.round(value).toString()}
              fromZero
            />
          ) : (
            <Text style={styles.noDataText}>No data available for chart</Text>
          )}
        </View> */}
        </ScrollView>
      </View>
    );
  };

  const renderExpenseDashboard = () => {
    return (
      <View style={styles.container}>
        <ScrollView>
          <View style={styles.chartContainer}>
            {chartData.mileageData.some((value) => value > 0) ? (
              <>
                <View style={styles.titleContainer}>
                  <Text style={styles.titleText}>
                    Total Mileage Expense (RM
                    {chartData.mileageData
                      .reduce((total: number, num: number) => total + num, 0)
                      .toFixed(2)}
                    ) for {selectedYear}/{selectedYear + 1}
                  </Text>
                </View>

                <YearLineChart
                  data={chartData.mileageData}
                  labels={chartData.labels}
                  labelFormatter={(value) => {
                    const num = Number(value);
                    return `$${Number(value).toFixed(0)}`;
                  }}
                  formatTooltip={(value) => `RM${value.toFixed(2)}`}
                  color="rgba(134, 65, 244, 1)"
                  strokeColor="#6200ee"
                  segments={5}
                />
              </>
            ) : (
              <Text style={styles.noDataText}>
                No data available for {selectedYear}/{selectedYear + 1}
              </Text>
            )}
          </View>

          {/* Total Distance Chart */}
          <View style={styles.chartContainer}>
            {chartData.generalData.some((value) => value > 0) ? (
              <>
                <View style={styles.titleContainer}>
                  <Text style={styles.titleText}>
                    Total General Expense (RM
                    {chartData.generalData
                      .reduce((total: number, num: number) => total + num, 0)
                      .toFixed(2)}
                    ) for {selectedYear}/{selectedYear + 1}
                  </Text>
                </View>

                <YearLineChart
                  data={chartData.generalData}
                  labels={chartData.labels}
                  labelFormatter={(value) => {
                    const num = Number(value);
                    return `$${Number(value).toFixed(0)}`;
                  }}
                  formatTooltip={(value) => `RM${value.toFixed(2)}`}
                  color="rgba(54, 162, 235, 1)"
                  strokeColor="#36A2EB"
                  segments={5}
                />
              </>
            ) : (
              <Text style={styles.noDataText}>
                No data available for {selectedYear}/{selectedYear + 1}
              </Text>
            )}
          </View>

          {/* Number of Trips Chart */}
          <View style={styles.chartContainer}>
            {chartData.outstationData.some((value) => value > 0) ? (
              <>
                <View style={styles.titleContainer}>
                  <Text style={styles.titleText}>
                    Total Outstation Expense (RM
                    {chartData.outstationData
                      .reduce((total: number, num: number) => total + num, 0)
                      .toFixed(2)}
                    ) for {selectedYear}/{selectedYear + 1}
                  </Text>
                </View>

                <YearLineChart
                  data={chartData.outstationData}
                  labels={chartData.labels}
                  labelFormatter={(value) => {
                    const num = Number(value);
                    return `$${Number(value).toFixed(0)}`;
                  }}
                  formatTooltip={(value) => `RM${value.toFixed(2)}`}
                  color="rgba(255, 159, 67, 1)"
                  strokeColor="#FF9F43"
                />
              </>
            ) : (
              <Text style={styles.noDataText}>
                No data available for {selectedYear}/{selectedYear + 1}
              </Text>
            )}
          </View>

          {/* <View style={{ flexDirection: "row" }}>
          {mileageData.data.length > 0 ? (
            <LineChart
              data={{
                labels: mileageData.labels,
                datasets: [
                  {
                    data: mileageData.data,
                    color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={400}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#6200ee",
                },
                propsForBackgroundLines: {
                  strokeDasharray: "5, 5",
                },
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              formatYLabel={(value) => Math.round(value).toString()}
              fromZero
            />
          ) : (
            <Text style={styles.noDataText}>No data available for chart</Text>
          )}

          {generalData.data.length > 0 ? (
            <LineChart
              data={{
                labels: generalData.labels,
                datasets: [
                  {
                    data: generalData.data,
                    color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={400}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#6200ee",
                },
                propsForBackgroundLines: {
                  strokeDasharray: "5, 5",
                },
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              formatYLabel={(value) => Math.round(value).toString()}
              fromZero
            />
          ) : (
            <Text style={styles.noDataText}>No data available for chart</Text>
          )}

          {outstationData.data.length > 0 ? (
            <LineChart
              data={{
                labels: outstationData.labels,
                datasets: [
                  {
                    data: outstationData.data,
                    color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={400}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#6200ee",
                },
                propsForBackgroundLines: {
                  strokeDasharray: "5, 5",
                },
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              formatYLabel={(value) => Math.round(value).toString()}
              fromZero
            />
          ) : (
            <Text style={styles.noDataText}>No data available for chart</Text>
          )}
        </View> */}
        </ScrollView>
      </View>
    );
  };

  const getChartInterval = (maxValue: number): number => {
    if (maxValue <= 10) return 2;
    if (maxValue <= 20) return 5;
    if (maxValue <= 50) return 10;
    if (maxValue <= 100) return 20;
    if (maxValue <= 200) return 50;
    if (maxValue <= 500) return 100;
    if (maxValue <= 1000) return 200;
    if (maxValue <= 2000) return 500;
    if (maxValue <= 5000) return 1000;
    if (maxValue <= 10000) return 2000;
    if (maxValue <= 50000) return 10000;
    return 50000;
  };

  const calculateYAxisTicks = (data: number[]) => {
    const maxValue = Math.max(...data);
    // Determine appropriate step size
    let step = 50;
    if (maxValue > 1000) step = 500;
    if (maxValue > 5000) step = 1000;
    if (maxValue > 10000) step = 5000;

    const roundedMax = Math.ceil(maxValue / step) * step;
    const ticks = [];
    for (let i = 0; i <= roundedMax; i += step) {
      ticks.push(i);
    }
    return { ticks, step, roundedMax };
  };

  const { ticks, step, roundedMax } = calculateYAxisTicks(chartData.data);
  const maxValue = Math.max(...chartData.data, 0);
  const interval = getChartInterval(maxValue);
  const shownLabels = new Set();

  return (
    <View style={[styles.container, styles.scrollContent]}>
      <Text style={styles.label}>Dashboard</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        <View>
          <Text>Year:</Text>
          <select
            value={selectedYear.toString()}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={htmlSelectStyle}
          >
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {`${year} - ${year + 1}`}
              </option>
            ))}
          </select>
        </View>
        {role !== 1 && (
          <View style={{ marginLeft: 10 }}>
            <Text>User:</Text>
            <TouchableOpacity
              style={[styles.input, { minWidth: 100 }]}
              onPress={() => {
                setShowUserModal(true);
              }}
            >
              <Text
                style={{
                  color: !selectedUser ? "#999999" : "#000000",
                  fontSize: 16,
                  fontFamily: "System",
                  fontWeight: "400",
                  opacity: 0.7,
                }}
              >
                {!selectedUser ? "Select User" : selectedUser}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {role !== 1 && (
          <View style={{ marginLeft: 10 }}>
            <Text>Department:</Text>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              style={dropdownInput}
            >
              <option value="">Select a department...</option>
              <option value="CSD">CSD</option>
              <option value="FINANCE">FINANCE</option>
              <option value="MARKETING">MARKETING</option>
              <option value="MD OFFICE">MD OFFICE</option>
              <option value="OPERATIONS">OPERATIONS</option>
              <option value="OPERATIONS PNG">OPERATIONS PNG</option>
              <option value="PRODUCT MGMT.">PRODUCT MGMT.</option>
              <option value="PROJECT">PROJECT</option>
              <option value="SALES PL1">SALES PL1</option>
              <option value="SALES PL2">SALES PL2</option>
              <option value="SALES PL3">SALES PL3</option>
              <option value="SALES PL4">SALES PL4</option>
              <option value="SC">SC</option>
            </select>
          </View>
        )}

        {renderSelectUserModal()}
      </View>
      <View style={styles.tabRow}>
        <TouchableOpacity
          onPress={() => changeDashboard(1)}
          style={[
            styles.tabButton,
            { marginRight: 10 },
            tabIndex === 1 ? styles.activeTabButton : styles.inactiveTabButton,
          ]}
        >
          <Text
            style={
              tabIndex === 1
                ? styles.activeButtonText
                : styles.inactiveButtonText
            }
          >
            Trip Breakdown
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => changeDashboard(2)}
          style={[
            styles.tabButton,
            { marginRight: 10 },
            tabIndex === 2 ? styles.activeTabButton : styles.inactiveTabButton,
          ]}
        >
          <Text
            style={
              tabIndex === 2
                ? styles.activeButtonText
                : styles.inactiveButtonText
            }
          >
            Expense Breakdown
          </Text>
        </TouchableOpacity>
      </View>

      {tabIndex === 1 && renderTripDashboard()}
      {tabIndex === 2 && renderExpenseDashboard()}
    </View>
  );
}

const htmlInputStyle = {
  padding: "10px",
  border: "1px solid #ccc",
  width: "100%",
  maxWidth: "120px",
  minHeight: "36px",
  boxSizing: "border-box" as const,
  backgroundColor: "#fff",
  marginRight: "10px",
};
const htmlSelectStyle = { ...htmlInputStyle, height: "auto" };
const htmlMultiSelectStyle = {
  ...htmlInputStyle,
  height: "auto",
  maxHeight: "150px", // Allow scrolling if many items
  overflowY: "auto" as const,
  minHeight: "36px", // Same as single select
};

const dropdownInput = {
  width: "100%",
  backgroundColor: "#f9f9f9",
  borderWidth: 0,
  borderColor: "#eee",
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
  color: "#333",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  tabRow: {
    marginTop: 10,
    marginBottom: 10,
    flexDirection: "row",
  },
  label: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  scrollContent: { padding: 20 },
  dashboardContent: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#D3D3D3",
    minWidth: 200,
  },

  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 200,
    minHeight: 36,
    marginRight: 10,
    overflow: "hidden",
    justifyContent: "center",
    elevation: 0,
  },
  picker: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    height: 36,
    width: "100%",
  },
  webPicker: {
    outline: "none",
    boxShadow: "none",
    WebkitBoxShadow: "none",
    MozBoxShadow: "none",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
  } as any,
  selectedText: {
    marginTop: 20,
    fontSize: 16,
  },
  noDataText: {
    fontSize: 14,
    color: "#999",
    padding: 20,
  },
  chartWrapper: {
    width: "100%",
    maxWidth: 380, // Maximum width cap
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  modalCloseButton: { fontSize: 20, fontWeight: "bold", color: "#999" },
  tableContainer: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#ccc",
    backgroundColor: "#f5f5f5",
    paddingRight: 12,
  },
  tableRow: {
    flexDirection: "row",
    width: "100%",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  headerCell: {
    fontWeight: "bold",
    fontSize: 13,
    color: "#333",
  },
  tableCell: {
    fontSize: 13,
    color: "#666",
  },
  modalList: { maxHeight: 400 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  userModalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 8,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    maxWidth: 200,
    minHeight: 36,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  input: {
    width: "100%",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: "#333",
  },
  dashboardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginVertical: 10,
    gap: 10,
  },
  dashboardCard: {
    flex: 1,
    minWidth: 200,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientCard: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  cardLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  cardLabelWhite: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardValueWhite: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  // Card specific styles
  cardMileage: {
    backgroundColor: "#E8F5E9",
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  cardGeneral: {
    backgroundColor: "#E3F2FD",
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  cardOutstation: {
    backgroundColor: "#FFF3E0",
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  cardTrips: {
    backgroundColor: "#F3E5F5",
    borderLeftWidth: 4,
    borderLeftColor: "#9C27B0",
  },
  tooltip: {
    position: "absolute",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 80,
    alignItems: "center",
  },
  tooltipLabel: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  tooltipClose: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#eee",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tooltipCloseText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "bold",
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  chartContainer: {
    padding: 10,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 10,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    borderRadius: 5,
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
    minHeight: 36,
    maxWidth: 200,
    alignItems: "center",
  },
  inactiveTabButton: {
    backgroundColor: "#2196F3",
  },
  activeTabButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  inactiveButtonText: { color: "white", fontWeight: "bold" },
  activeButtonText: { color: "#2196F3", fontWeight: "bold" },
});
