import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  Dimensions,
  Keyboard,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { ref, get, onValue } from 'firebase/database';
import { auth, db } from '../config/firebase';
import { reverseGeocode } from '../config/geocode';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

// Icons & colors per report type
const REPORT_TYPE_CONFIG = {
  Traffic: { emoji: '🚦', color: '#F44336', label: 'Traffic' },
  Accident: { emoji: '🚨', color: '#E91E63', label: 'Accident' },
  Potholes: { emoji: '🕳️', color: '#FF9800', label: 'Pothole' },
  'Unmarked Speedbreakers': { emoji: '⚠️', color: '#9C27B0', label: 'Speed Bump' },
};

const ROUTE_COLORS = ['#E8922A', '#2196F3', '#4CAF50', '#9C27B0', '#00BCD4'];

/* ═══════════════════════════════════════════════
   LIVE CHENNAI MTC BUS & TRAIN SIMULATION DATA
   (No public real-time API available for Chennai MTC
    or suburban rail — simulated along actual roads
    and rail lines with real GPS waypoints.)
   ═══════════════════════════════════════════════ */

const MTC_ROUTES = [
  {
    id: 'MTC 21G', route: 'Broadway → T.Nagar', color: '#e74c3c',
    stops: ['Broadway','Central','Wallajah Rd','Govt Estate','LIC','Thousand Lights','Panagal Park','T.Nagar'],
    path: [{lat:13.0878,lng:80.2780},{lat:13.0827,lng:80.2720},{lat:13.0750,lng:80.2680},{lat:13.0680,lng:80.2620},{lat:13.0620,lng:80.2550},{lat:13.0550,lng:80.2480},{lat:13.0450,lng:80.2380},{lat:13.0400,lng:80.2340}],
  },
  {
    id: 'MTC 27C', route: 'Broadway → Adyar', color: '#3498db',
    stops: ['Broadway','Parrys','NSC Bose Rd','Gemini','Cathedral Rd','Gopalapuram','Kotturpuram','Adyar'],
    path: [{lat:13.0878,lng:80.2780},{lat:13.0900,lng:80.2850},{lat:13.0750,lng:80.2750},{lat:13.0580,lng:80.2530},{lat:13.0480,lng:80.2500},{lat:13.0380,lng:80.2520},{lat:13.0200,lng:80.2560},{lat:13.0012,lng:80.2565}],
  },
  {
    id: 'MTC M70', route: 'CMBT → Tambaram', color: '#27ae60',
    stops: ['CMBT','Vadapalani','Ashok Nagar','Guindy','Alandur','Pallavaram','Chromepet','Tambaram'],
    path: [{lat:13.0694,lng:80.1948},{lat:13.0520,lng:80.2120},{lat:13.0380,lng:80.2180},{lat:13.0067,lng:80.2206},{lat:12.9950,lng:80.2060},{lat:12.9680,lng:80.1520},{lat:12.9510,lng:80.1420},{lat:12.9249,lng:80.1278}],
  },
  {
    id: 'MTC 5C', route: 'Parrys → Thiruvanmiyur', color: '#f39c12',
    stops: ['Parrys','High Court','Marina','Foreshore Est','Adyar','Besant Nagar','Thiruvanmiyur'],
    path: [{lat:13.0930,lng:80.2850},{lat:13.0850,lng:80.2870},{lat:13.0400,lng:80.2800},{lat:13.0200,lng:80.2750},{lat:13.0012,lng:80.2665},{lat:12.9980,lng:80.2680},{lat:12.9830,lng:80.2642}],
  },
  {
    id: 'MTC 29C', route: 'Broadway → Velachery', color: '#8e44ad',
    stops: ['Broadway','Egmore','Nungambakkam','Kodambakkam','Mambalam','Guindy','Velachery'],
    path: [{lat:13.0878,lng:80.2780},{lat:13.0732,lng:80.2609},{lat:13.0569,lng:80.2425},{lat:13.0480,lng:80.2320},{lat:13.0350,lng:80.2240},{lat:13.0067,lng:80.2206},{lat:12.9823,lng:80.2203}],
  },
  {
    id: 'MTC 47A', route: 'Central → Sholinganallur', color: '#16a085',
    stops: ['Central','Triplicane','Mylapore','Adyar','Perungudi','Thoraipakkam','Sholinganallur'],
    path: [{lat:13.0827,lng:80.2707},{lat:13.0600,lng:80.2750},{lat:13.0340,lng:80.2700},{lat:13.0012,lng:80.2565},{lat:12.9660,lng:80.2470},{lat:12.9420,lng:80.2350},{lat:12.9010,lng:80.2280}],
  },
  {
    id: 'MTC 1C', route: 'Parrys → Anna Nagar', color: '#c0392b',
    stops: ['Parrys','Central','Egmore','Kilpauk','Aminjikarai','Anna Nagar'],
    path: [{lat:13.0930,lng:80.2850},{lat:13.0827,lng:80.2707},{lat:13.0732,lng:80.2609},{lat:13.0790,lng:80.2420},{lat:13.0830,lng:80.2260},{lat:13.0860,lng:80.2100}],
  },
  {
    id: 'MTC 23C', route: 'Broadway → Porur', color: '#d35400',
    stops: ['Broadway','Central','Chetpet','Vadapalani','Virugambakkam','Porur'],
    path: [{lat:13.0878,lng:80.2780},{lat:13.0827,lng:80.2707},{lat:13.0670,lng:80.2480},{lat:13.0520,lng:80.2120},{lat:13.0560,lng:80.1950},{lat:13.0590,lng:80.1720}],
  },
];

const TRAIN_LINES = [
  {
    id: 'SUB-101', name: 'Beach–Tambaram', line: 'Main Line', color: '#2ecc71',
    stations: ['Beach','Fort','Park Town','Egmore','Chetpet','Nungambakkam','Kodambakkam','Mambalam','Saidapet','Guindy','St.Thomas Mt','Tambaram'],
    path: [{lat:13.0988,lng:80.2935},{lat:13.0920,lng:80.2870},{lat:13.0837,lng:80.2755},{lat:13.0732,lng:80.2609},{lat:13.0670,lng:80.2480},{lat:13.0570,lng:80.2380},{lat:13.0480,lng:80.2290},{lat:13.0350,lng:80.2220},{lat:13.0210,lng:80.2240},{lat:13.0067,lng:80.2206},{lat:12.9940,lng:80.1990},{lat:12.9249,lng:80.1278}],
  },
  {
    id: 'MRTS-201', name: 'Beach–Velachery MRTS', line: 'MRTS', color: '#2980b9',
    stations: ['Beach','Tiruvallikeni','Light House','Thirumayilai','Mandaveli','Greenways Rd','Kotturpuram','Kasturba Nagar','Indira Nagar','Thiruvanmiyur','Taramani','Velachery'],
    path: [{lat:13.0988,lng:80.2935},{lat:13.0700,lng:80.2820},{lat:13.0400,lng:80.2800},{lat:13.0340,lng:80.2700},{lat:13.0180,lng:80.2680},{lat:13.0080,lng:80.2600},{lat:13.0030,lng:80.2500},{lat:12.9980,lng:80.2420},{lat:12.9900,lng:80.2380},{lat:12.9830,lng:80.2560},{lat:12.9780,lng:80.2400},{lat:12.9823,lng:80.2203}],
  },
  {
    id: 'SUB-301', name: 'Central–Tiruvallur', line: 'Suburban North', color: '#e67e22',
    stations: ['Central','Basin Bridge','Vyasarpadi','Perambur','Villivakkam','Ambattur','Avadi','Tiruvallur'],
    path: [{lat:13.0827,lng:80.2707},{lat:13.0920,lng:80.2630},{lat:13.1080,lng:80.2530},{lat:13.1150,lng:80.2380},{lat:13.1180,lng:80.2120},{lat:13.1147,lng:80.1567},{lat:13.1147,lng:80.1010},{lat:13.1430,lng:79.9130}],
  },
  {
    id: 'SUB-401', name: 'Beach–Gummidipoondi', line: 'North Main', color: '#1abc9c',
    stations: ['Beach','Washermanpet','Tondiarpet','Korukkupet','Ennore','Gummidipoondi'],
    path: [{lat:13.0988,lng:80.2935},{lat:13.1100,lng:80.2850},{lat:13.1200,lng:80.2870},{lat:13.1350,lng:80.2840},{lat:13.1750,lng:80.2820},{lat:13.3370,lng:80.2730}],
  },
];

/* ── Position interpolation along a path ── */
function segLengths(path) {
  const lens = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const d = Math.hypot(path[i].lat - path[i - 1].lat, path[i].lng - path[i - 1].lng);
    lens.push(d);
    total += d;
  }
  return { lens, total };
}

function posOnPath(path, progress) {
  const { lens, total } = segLengths(path);
  let target = Math.max(0, Math.min(1, progress)) * total;
  let acc = 0;
  for (let i = 0; i < lens.length; i++) {
    if (acc + lens[i] >= target) {
      const t = (target - acc) / lens[i];
      return {
        latitude: path[i].lat + (path[i + 1].lat - path[i].lat) * t,
        longitude: path[i].lng + (path[i + 1].lng - path[i].lng) * t,
        seg: i,
      };
    }
    acc += lens[i];
  }
  return { latitude: path[path.length - 1].lat, longitude: path[path.length - 1].lng, seg: path.length - 2 };
}

function nearestStop(stops, seg, dir) {
  if (dir === 1) return { cur: stops[Math.min(seg, stops.length - 1)], nxt: stops[Math.min(seg + 1, stops.length - 1)] };
  return { cur: stops[Math.min(seg + 1, stops.length - 1)], nxt: stops[Math.min(seg, stops.length - 1)] };
}

/* ── Build initial vehicle state arrays (once, outside component) ── */
function buildInitialVehicles() {
  const buses = MTC_ROUTES.map((r) => ({
    id: r.id, route: r.route, color: r.color, path: r.path, stops: r.stops,
    progress: Math.random() * 0.7 + 0.15,
    speed: 0.012 + Math.random() * 0.008,
    dir: 1, pax: Math.floor(Math.random() * 35) + 10,
  }));
  const trains = TRAIN_LINES.map((t) => ({
    id: t.id, name: t.name, line: t.line, color: t.color, path: t.path, stops: t.stations,
    progress: Math.random() * 0.5 + 0.25,
    speed: 0.018 + Math.random() * 0.012,
    dir: 1, pax: Math.floor(Math.random() * 200) + 80,
    delayed: Math.random() < 0.2,
  }));
  return { buses, trains };
}

const INITIAL_VEHICLES = buildInitialVehicles();

export default function HomeScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [locLoading, setLocLoading] = useState(true);
  const [placeName, setPlaceName] = useState('');
  const [userName, setUserName] = useState('');
  const [score, setScore] = useState(0);

  // Fullscreen map state
  const [mapExpanded, setMapExpanded] = useState(false);
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [allRoutes, setAllRoutes] = useState([]); // array of { coords, distance, duration, hasHazards, hazardCount }
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [fromMarker, setFromMarker] = useState(null);
  const [toMarker, setToMarker] = useState(null);
  const mapRef = useRef(null);

  // Autocomplete suggestion state
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null); // 'from' | 'to' | null
  const fromDebounceRef = useRef(null);
  const toDebounceRef = useRef(null);
  const fromInputRef = useRef(null);
  const toInputRef = useRef(null);
  // Cache coords from suggestion selection to skip re-geocoding
  const fromCoordCacheRef = useRef(null);
  const toCoordCacheRef = useRef(null);

  // Firebase report markers (real-time)
  const [reportMarkers, setReportMarkers] = useState([]);
  // Keep refs for re-routing logic
  const fromCoordRef = useRef(null);
  const toCoordRef = useRef(null);
  const routeActiveRef = useRef(false);

  // ── Live bus & train simulation state ──
  const [liveBuses, setLiveBuses] = useState(() =>
    INITIAL_VEHICLES.buses.map((b) => ({ ...b, pos: posOnPath(b.path, b.progress) }))
  );
  const [liveTrains, setLiveTrains] = useState(() =>
    INITIAL_VEHICLES.trains.map((t) => ({ ...t, pos: posOnPath(t.path, t.progress) }))
  );
  const [showBuses, setShowBuses] = useState(true);
  const [showTrains, setShowTrains] = useState(true);
  const [showBusRoutes, setShowBusRoutes] = useState(false);
  const [showTrainRoutes, setShowTrainRoutes] = useState(false);
  const busStateRef = useRef(INITIAL_VEHICLES.buses.map((b) => ({ ...b })));
  const trainStateRef = useRef(INITIAL_VEHICLES.trains.map((t) => ({ ...t })));

  const uid = auth.currentUser?.uid;

  // ── Live vehicle simulation tick (every 2 s) ──
  useEffect(() => {
    const interval = setInterval(() => {
      // Advance buses
      const nextBuses = busStateRef.current.map((b) => {
        let p = b.progress + b.speed * b.dir;
        let d = b.dir;
        if (p >= 1) { p = 1; d = -1; }
        if (p <= 0) { p = 0; d = 1; }
        const spd = Math.max(0.005, b.speed + (Math.random() - 0.5) * 0.002);
        const pax = Math.max(5, b.pax + Math.floor(Math.random() * 9) - 4);
        return { ...b, progress: p, speed: spd, dir: d, pax, pos: posOnPath(b.path, p) };
      });
      busStateRef.current = nextBuses;
      setLiveBuses(nextBuses);

      // Advance trains
      const nextTrains = trainStateRef.current.map((t) => {
        let p = t.progress + t.speed * t.dir;
        let d = t.dir;
        if (p >= 1) { p = 1; d = -1; }
        if (p <= 0) { p = 0; d = 1; }
        const spd = Math.max(0.008, t.speed + (Math.random() - 0.5) * 0.003);
        const pax = Math.max(20, t.pax + Math.floor(Math.random() * 15) - 7);
        const delayed = Math.random() < 0.02 ? !t.delayed : t.delayed;
        return { ...t, progress: p, speed: spd, dir: d, pax, delayed, pos: posOnPath(t.path, p) };
      });
      trainStateRef.current = nextTrains;
      setLiveTrains(nextTrains);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchLocation();
    fetchUserData();

    // Real-time listener for report markers from Firebase
    const reportsRef = ref(db, 'reports');
    const unsubscribe = onValue(reportsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setReportMarkers([]);
        return;
      }
      const all = snapshot.val();
      const markers = Object.values(all)
        .filter(
          (r) =>
            r.latitude &&
            r.longitude &&
            r.reportType &&
            REPORT_TYPE_CONFIG[r.reportType]
        )
        .map((r) => ({
          id: r.reportId,
          latitude: r.latitude,
          longitude: r.longitude,
          reportType: r.reportType,
          placeName: r.placeName || '',
          timestamp: r.timestamp,
          ...REPORT_TYPE_CONFIG[r.reportType],
        }));
      setReportMarkers(markers);

      // If a route is active, check if new reports affect it and re-route
      if (routeActiveRef.current && fromCoordRef.current && toCoordRef.current) {
        checkAndReroute(markers, fromCoordRef.current, toCoordRef.current);
      }
    });

    return () => unsubscribe();
  }, []);

  // Check if any new reports are near the selected route and re-route
  const checkAndReroute = async (markers, fromCoord, toCoord) => {
    try {
      const routes = await fetchAllRoutes(fromCoord, toCoord);
      if (routes && routes.length > 0) {
        const scored = scoreRoutes(routes, markers);
        setAllRoutes(scored);
        // Auto-select the best (least hazards, then shortest)
        const bestIdx = scored.reduce(
          (best, r, i) =>
            r.hazardCount < scored[best].hazardCount ||
            (r.hazardCount === scored[best].hazardCount && r.duration < scored[best].duration)
              ? i
              : best,
          0
        );
        setSelectedRouteIdx(bestIdx);
      }
    } catch (err) {
      console.log('Re-route check error:', err);
    }
  };

  const fetchLocation = async () => {
    setLocLoading(true);
    setLocationDenied(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        setLocLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(loc.coords);

      // Reverse geocode to get place name
      const place = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
      if (place) setPlaceName(place);
    } catch (err) {
      console.log('Location error:', err);
      setLocationDenied(true);
    }
    setLocLoading(false);
  };

  const fetchUserData = async () => {
    if (!uid) return;
    try {
      // Fetch user profile
      const profileSnap = await get(ref(db, 'users/' + uid));
      if (profileSnap.exists()) {
        const p = profileSnap.val();
        setUserName(p.name || 'User');
      }

      // Calculate score from reports count
      const reportsSnap = await get(ref(db, 'reports'));
      if (reportsSnap.exists()) {
        const all = reportsSnap.val();
        const userReports = Object.values(all).filter(
          (r) => r.anonymousUserId === uid
        );
        setScore(userReports.length * 10); // 10 points per report
      }
    } catch (err) {
      console.log('Fetch user data error:', err);
    }
  };

  const defaultRegion = {
    latitude: location?.latitude || 12.9716,
    longitude: location?.longitude || 77.5946,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  };

  // --- Fullscreen map helpers ---

  const expandMap = () => {
    setMapExpanded(true);
    if (placeName) setFromText(placeName);
  };

  const collapseMap = () => {
    Keyboard.dismiss();
    setMapExpanded(false);
    setAllRoutes([]);
    setSelectedRouteIdx(0);
    setFromText('');
    setToText('');
    setFromMarker(null);
    setToMarker(null);
    setRouteError('');
    setFromSuggestions([]);
    setToSuggestions([]);
    setActiveInput(null);
    routeActiveRef.current = false;
    fromCoordRef.current = null;
    toCoordRef.current = null;
    fromCoordCacheRef.current = null;
    toCoordCacheRef.current = null;
  };

  // Fetch location-biased autocomplete using Photon API (by Komoot)
  // Photon is purpose-built for geocoding autocomplete with proximity bias
  const fetchSuggestions = async (query, setSuggestions) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      // 80 km radius bounding box
      // 1° lat ≈ 111 km → delta_lat = 80/111 ≈ 0.72°
      // 1° lon ≈ 111*cos(lat) km
      let biasParams = '';
      let bboxParam = '';
      if (location) {
        const { latitude: lat, longitude: lng } = location;
        const dLat = 0.72;
        const dLng = 0.72 / Math.max(Math.cos((lat * Math.PI) / 180), 0.1);
        // Photon bias: lat/lon sorts results by proximity
        biasParams = `&lat=${lat}&lon=${lng}`;
        // Photon bbox restricts results: left,bottom,right,top
        bboxParam = `&bbox=${(lng - dLng).toFixed(5)},${(lat - dLat).toFixed(5)},${(lng + dLng).toFixed(5)},${(lat + dLat).toFixed(5)}`;
      }

      const url =
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&limit=7&lang=en` +
        biasParams +
        bboxParam;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'UTSPReporterApp/1.0' },
      });
      const data = await res.json();

      if (data && Array.isArray(data.features)) {
        const seen = new Set();
        const suggestions = data.features
          .filter((f) => {
            if (!f.geometry?.coordinates) return false;
            // Deduplicate by name+city
            const key = `${f.properties?.name}-${f.properties?.city}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map((f) => {
            const p = f.properties;
            // Build a clean, readable label from Photon's structured properties
            const parts = [];
            if (p.name) parts.push(p.name);
            if (p.street && p.street !== p.name) parts.push(p.street);
            if (p.district && p.district !== p.city) parts.push(p.district);
            if (p.city) parts.push(p.city);
            if (p.county && p.county !== p.city) parts.push(p.county);
            if (p.state) parts.push(p.state);

            const label = parts.join(', ') || p.display_name || 'Unknown place';
            // Short label = first 3 meaningful parts
            const shortLabel = parts.slice(0, 3).join(', ') || label;

            return {
              id: `${f.geometry.coordinates[0]}_${f.geometry.coordinates[1]}`,
              label: shortLabel,
              fullLabel: label,
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
              type: p.type || p.osm_value || '',
            };
          });
        setSuggestions(suggestions);
      }
    } catch (err) {
      console.log('Suggestion fetch error:', err);
    }
  };

  const onFromTextChange = (text) => {
    setFromText(text);
    setFromSuggestions([]);
    fromCoordCacheRef.current = null; // clear cached coord on manual edit
    if (fromDebounceRef.current) clearTimeout(fromDebounceRef.current);
    fromDebounceRef.current = setTimeout(() => {
      fetchSuggestions(text, setFromSuggestions);
    }, 400);
  };

  const onToTextChange = (text) => {
    setToText(text);
    setToSuggestions([]);
    toCoordCacheRef.current = null; // clear cached coord on manual edit
    if (toDebounceRef.current) clearTimeout(toDebounceRef.current);
    toDebounceRef.current = setTimeout(() => {
      fetchSuggestions(text, setToSuggestions);
    }, 400);
  };

  const selectFromSuggestion = (item) => {
    setFromText(item.label);
    fromCoordCacheRef.current = { latitude: item.lat, longitude: item.lng };
    setFromSuggestions([]);
    setActiveInput(null);
    Keyboard.dismiss();
  };

  const selectToSuggestion = (item) => {
    setToText(item.label);
    toCoordCacheRef.current = { latitude: item.lat, longitude: item.lng };
    setToSuggestions([]);
    setActiveInput(null);
    Keyboard.dismiss();
  };

  const geocodeAddress = async (address) => {
    try {
      const results = await Location.geocodeAsync(address);
      if (results && results.length > 0) {
        return { latitude: results[0].latitude, longitude: results[0].longitude };
      }
    } catch (e) {
      console.log('Geocode error:', e);
    }
    return null;
  };

  // Fetch multiple routes from OSRM
  const fetchAllRoutes = async (fromCoord, toCoord) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromCoord.longitude},${fromCoord.latitude};${toCoord.longitude},${toCoord.latitude}?overview=full&geometries=geojson&alternatives=true`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      return data.routes.map((route) => {
        const coords = route.geometry.coordinates.map(([lng, lat]) => ({
          latitude: lat,
          longitude: lng,
        }));
        return {
          coords,
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.ceil(route.duration / 60),
          hazardCount: 0,
          hasHazards: false,
          hazards: [],
        };
      });
    }
    return null;
  };

  // Check which reports are near a route and score it
  const isPointNearRoute = (point, routeCoords, thresholdKm = 0.3) => {
    // ~300m proximity check using simplified distance
    for (const rc of routeCoords) {
      const dLat = (point.latitude - rc.latitude) * 111;
      const dLng = (point.longitude - rc.longitude) * 111 * Math.cos((rc.latitude * Math.PI) / 180);
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist < thresholdKm) return true;
    }
    return false;
  };

  const scoreRoutes = (routes, markers) => {
    return routes.map((route) => {
      const hazards = markers.filter((m) => isPointNearRoute(m, route.coords));
      return {
        ...route,
        hazardCount: hazards.length,
        hasHazards: hazards.length > 0,
        hazards,
      };
    });
  };

  const generateRoute = async () => {
    Keyboard.dismiss();
    if (!fromText.trim() || !toText.trim()) {
      setRouteError('Please enter both From and To locations');
      return;
    }
    setRouteLoading(true);
    setRouteError('');
    setAllRoutes([]);
    setSelectedRouteIdx(0);

    try {
      let fromCoord = null;
      let toCoord = null;

      // Use cached coords from autocomplete selection first
      if (fromCoordCacheRef.current) {
        fromCoord = fromCoordCacheRef.current;
      } else if (
        fromText.trim().toLowerCase() === 'my location' ||
        fromText.trim().toLowerCase() === 'current location'
      ) {
        if (location) fromCoord = { latitude: location.latitude, longitude: location.longitude };
      } else {
        fromCoord = await geocodeAddress(fromText.trim());
      }

      if (!fromCoord && location && placeName && fromText.trim() === placeName) {
        fromCoord = { latitude: location.latitude, longitude: location.longitude };
      }

      if (toCoordCacheRef.current) {
        toCoord = toCoordCacheRef.current;
      } else {
        toCoord = await geocodeAddress(toText.trim());
      }

      if (!fromCoord) {
        setRouteError('Could not find "From" location. Try a more specific address.');
        setRouteLoading(false);
        return;
      }
      if (!toCoord) {
        setRouteError('Could not find "To" location. Try a more specific address.');
        setRouteLoading(false);
        return;
      }

      setFromMarker(fromCoord);
      setToMarker(toCoord);
      fromCoordRef.current = fromCoord;
      toCoordRef.current = toCoord;

      const routes = await fetchAllRoutes(fromCoord, toCoord);
      if (routes && routes.length > 0) {
        // Score routes with hazard data
        const scored = scoreRoutes(routes, reportMarkers);

        // Sort: fewest hazards first, then shortest duration
        scored.sort((a, b) => a.hazardCount - b.hazardCount || a.duration - b.duration);

        setAllRoutes(scored);
        setSelectedRouteIdx(0);
        routeActiveRef.current = true;

        // Fit map to all route points
        const allCoords = scored.flatMap((r) => r.coords);
        if (mapRef.current && allCoords.length > 1) {
          mapRef.current.fitToCoordinates(allCoords, {
            edgePadding: { top: 160, right: 60, bottom: 160, left: 60 },
            animated: true,
          });
        }
      } else {
        setRouteError('No route found between these locations.');
      }
    } catch (err) {
      console.log('Route error:', err);
      setRouteError('Failed to generate route. Check your connection.');
    }
    setRouteLoading(false);
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Map */}
      <TouchableOpacity
        activeOpacity={1}
        style={mapExpanded ? s.mapContainerFull : s.mapContainer}
        onPress={!mapExpanded ? expandMap : undefined}
      >
        {locLoading && !location ? (
          <View style={s.mapLoading}>
            <ActivityIndicator size="large" color="#E8922A" />
            <Text style={s.mapLoadingText}>Loading map...</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={s.map}
            region={
              !mapExpanded
                ? defaultRegion
                : undefined
            }
            initialRegion={defaultRegion}
            showsUserLocation={!!location}
            showsMyLocationButton={false}
          >
            {/* User marker on normal map */}
            {location && !mapExpanded && (
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="You are here"
              />
            )}

            {/* Report markers from Firebase with custom icons */}
            {reportMarkers.map((m) => (
              <Marker
                key={m.id}
                coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                title={`${m.emoji} ${m.label}`}
                description={m.placeName || `${m.latitude.toFixed(4)}, ${m.longitude.toFixed(4)}`}
                tracksViewChanges={false}
              >
                <View style={[s.reportMarker, { backgroundColor: m.color }]}>
                  <Text style={s.reportMarkerEmoji}>{m.emoji}</Text>
                </View>
                <View style={[s.reportMarkerArrow, { borderTopColor: m.color }]} />
              </Marker>
            ))}

            {/* ── Live MTC Bus route polylines ── */}
            {showBusRoutes && MTC_ROUTES.map((r) => (
              <Polyline
                key={`busroute-${r.id}`}
                coordinates={r.path.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
                strokeColor={r.color}
                strokeWidth={2}
                lineDashPattern={[6, 4]}
                strokeOpacity={0.35}
              />
            ))}

            {/* ── Live Train route polylines ── */}
            {showTrainRoutes && TRAIN_LINES.map((t) => (
              <Polyline
                key={`trainroute-${t.id}`}
                coordinates={t.path.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
                strokeColor={t.color}
                strokeWidth={3}
                lineDashPattern={[10, 6]}
                strokeOpacity={0.5}
              />
            ))}

            {/* ── Live Bus Markers ── */}
            {showBuses && liveBuses.map((b) => {
              const stop = nearestStop(b.stops, b.pos.seg, b.dir);
              return (
                <Marker
                  key={`bus-${b.id}`}
                  coordinate={{ latitude: b.pos.latitude, longitude: b.pos.longitude }}
                  title={`🚌 ${b.id}`}
                  description={`${b.route}\nNear: ${stop.cur} → ${stop.nxt}\nPassengers: ~${b.pax}`}
                  tracksViewChanges={false}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={[s.liveBusMarker, { backgroundColor: b.color }]}>
                    <Text style={s.liveBusEmoji}>🚌</Text>
                  </View>
                  <View style={[s.liveBusArrow, { borderTopColor: b.color }]} />
                </Marker>
              );
            })}

            {/* ── Live Train Markers ── */}
            {showTrains && liveTrains.map((t) => {
              const stop = nearestStop(t.stops, t.pos.seg, t.dir);
              const status = t.delayed ? '⏱ Delayed' : '✅ On Time';
              return (
                <Marker
                  key={`train-${t.id}`}
                  coordinate={{ latitude: t.pos.latitude, longitude: t.pos.longitude }}
                  title={`🚆 ${t.name}`}
                  description={`${t.line}\nNear: ${stop.cur} → ${stop.nxt}\nPassengers: ~${t.pax}\n${status}`}
                  tracksViewChanges={false}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={[s.liveTrainMarker, { backgroundColor: t.color }]}>
                    <Text style={s.liveTrainEmoji}>🚆</Text>
                  </View>
                  <View style={[s.liveTrainArrow, { borderTopColor: t.color }]} />
                </Marker>
              );
            })}

            {/* From / To markers in fullscreen */}
            {mapExpanded && fromMarker && (
              <Marker coordinate={fromMarker} pinColor="green" title="From" />
            )}
            {mapExpanded && toMarker && (
              <Marker coordinate={toMarker} pinColor="red" title="To" />
            )}

            {/* Multiple route polylines */}
            {mapExpanded &&
              allRoutes.map((route, idx) => (
                <Polyline
                  key={`route-${idx}`}
                  coordinates={route.coords}
                  strokeWidth={idx === selectedRouteIdx ? 5 : 3}
                  strokeColor={
                    idx === selectedRouteIdx
                      ? ROUTE_COLORS[idx % ROUTE_COLORS.length]
                      : 'rgba(150,150,150,0.4)'
                  }
                  lineDashPattern={idx === selectedRouteIdx ? undefined : [8, 6]}
                  tappable
                  onPress={() => setSelectedRouteIdx(idx)}
                  zIndex={idx === selectedRouteIdx ? 10 : 1}
                />
              ))}
          </MapView>
        )}

        {/* ── Live vehicle layer toggles (bottom-left of map) ── */}
        <View style={s.layerToggleWrap}>
          <TouchableOpacity
            style={[s.layerToggleBtn, showBuses && s.layerToggleActive]}
            onPress={() => setShowBuses((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={s.layerToggleText}>🚌</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.layerToggleBtn, showTrains && s.layerToggleActive]}
            onPress={() => setShowTrains((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={s.layerToggleText}>🚆</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.layerToggleBtn, showBusRoutes && s.layerToggleActive]}
            onPress={() => setShowBusRoutes((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={s.layerToggleText}>🛣️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.layerToggleBtn, showTrainRoutes && s.layerToggleActive]}
            onPress={() => setShowTrainRoutes((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={s.layerToggleText}>🛤️</Text>
          </TouchableOpacity>
        </View>

        {/* Fullscreen overlay controls */}
        {mapExpanded && (
          <View style={s.mapOverlay}>
            {/* Close button */}
            <TouchableOpacity style={s.closeBtn} onPress={collapseMap} activeOpacity={0.8}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>

            {/* Search bar */}
            <View style={s.searchContainer}>
              <View style={s.searchRow}>
                <View style={s.dotGreen} />
                <TextInput
                  ref={fromInputRef}
                  style={s.searchInput}
                  placeholder="From (e.g. My Location)"
                  placeholderTextColor="#a09080"
                  value={fromText}
                  onChangeText={onFromTextChange}
                  onFocus={() => setActiveInput('from')}
                  returnKeyType="next"
                  onSubmitEditing={() => toInputRef.current?.focus()}
                />
                {fromText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => { onFromTextChange(''); fromInputRef.current?.focus(); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={s.clearBtn}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={s.searchDivider} />
              <View style={s.searchRow}>
                <View style={s.dotRed} />
                <TextInput
                  ref={toInputRef}
                  style={s.searchInput}
                  placeholder="To (e.g. Chennai Central)"
                  placeholderTextColor="#a09080"
                  value={toText}
                  onChangeText={onToTextChange}
                  onFocus={() => setActiveInput('to')}
                  returnKeyType="go"
                  onSubmitEditing={generateRoute}
                />
                {toText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => { onToTextChange(''); toInputRef.current?.focus(); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={s.clearBtn}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[s.goBtn, routeLoading && { opacity: 0.5 }]}
                onPress={generateRoute}
                disabled={routeLoading}
                activeOpacity={0.8}
              >
                {routeLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.goBtnText}>Go</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* From suggestions dropdown */}
            {activeInput === 'from' && fromSuggestions.length > 0 && (
              <View style={s.suggestionList}>
                {fromSuggestions.map((item, idx) => (
                  <TouchableOpacity
                    key={item.id + idx}
                    style={[s.suggestionItem, idx === fromSuggestions.length - 1 && s.suggestionItemLast]}
                    onPress={() => selectFromSuggestion(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.suggestionIcon}>📍</Text>
                    <View style={s.suggestionTextWrap}>
                      <Text style={s.suggestionLabel} numberOfLines={1}>{item.label}</Text>
                      {item.fullLabel !== item.label && (
                        <Text style={s.suggestionSub} numberOfLines={1}>{item.fullLabel}</Text>
                      )}
                    </View>
                    {!!item.type && (
                      <View style={s.suggestionTypePill}>
                        <Text style={s.suggestionTypeText}>{item.type}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* To suggestions dropdown */}
            {activeInput === 'to' && toSuggestions.length > 0 && (
              <View style={s.suggestionList}>
                {toSuggestions.map((item, idx) => (
                  <TouchableOpacity
                    key={item.id + idx}
                    style={[s.suggestionItem, idx === toSuggestions.length - 1 && s.suggestionItemLast]}
                    onPress={() => selectToSuggestion(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.suggestionIcon}>📍</Text>
                    <View style={s.suggestionTextWrap}>
                      <Text style={s.suggestionLabel} numberOfLines={1}>{item.label}</Text>
                      {item.fullLabel !== item.label && (
                        <Text style={s.suggestionSub} numberOfLines={1}>{item.fullLabel}</Text>
                      )}
                    </View>
                    {!!item.type && (
                      <View style={s.suggestionTypePill}>
                        <Text style={s.suggestionTypeText}>{item.type}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Route error */}
            {!!routeError && (
              <View style={s.routeErrorWrap}>
                <Text style={s.routeErrorText}>{routeError}</Text>
              </View>
            )}

            {/* Route info - multiple routes */}
            {allRoutes.length > 0 && (
              <View style={s.routeInfoWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.routeCardsScroll}
                >
                  {allRoutes.map((route, idx) => (
                    <TouchableOpacity
                      key={`info-${idx}`}
                      style={[
                        s.routeInfoCard,
                        idx === selectedRouteIdx && s.routeInfoCardActive,
                        { borderLeftColor: ROUTE_COLORS[idx % ROUTE_COLORS.length] },
                      ]}
                      onPress={() => {
                        setSelectedRouteIdx(idx);
                        if (mapRef.current && route.coords.length > 1) {
                          mapRef.current.fitToCoordinates(route.coords, {
                            edgePadding: { top: 160, right: 60, bottom: 160, left: 60 },
                            animated: true,
                          });
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={s.routeInfoTop}>
                        <Text style={s.routeInfoLabel}>Route {idx + 1}</Text>
                        {idx === 0 && (
                          <View style={s.recommendedBadge}>
                            <Text style={s.recommendedText}>Best</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.routeInfoMain}>
                        {route.distance} km  ·  {route.duration} min
                      </Text>
                      {route.hazardCount > 0 ? (
                        <View style={s.hazardRow}>
                          <Text style={s.hazardWarning}>
                            ⚠️ {route.hazardCount} alert{route.hazardCount > 1 ? 's' : ''} on route
                          </Text>
                          <Text style={s.hazardTypes}>
                            {[...new Set(route.hazards.map((h) => h.emoji))].join(' ')}
                          </Text>
                        </View>
                      ) : (
                        <Text style={s.routeClear}>✅ Clear route</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Bottom sheet - hidden when map is expanded */}
      {!mapExpanded && (
        <View style={s.bottomSheet}>
          <LinearGradient
            colors={['#f0eae6', '#f5e6da', '#fce4cc']}
            style={s.sheetGradient}
          >
            {/* Drag handle */}
            <View style={s.handleWrap}>
              <View style={s.handle} />
            </View>

            {/* Location info */}
            <View style={s.locationCard}>
              {locLoading ? (
                <ActivityIndicator size="small" color="#E8922A" />
              ) : locationDenied || !location ? (
                <View style={s.locDeniedWrap}>
                  <Text style={s.locDeniedText}>📍  Location is turned off</Text>
                  <TouchableOpacity
                    style={s.locBtn}
                    activeOpacity={0.8}
                    onPress={fetchLocation}
                  >
                    <Text style={s.locBtnText}>Turn on Location</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.locInfoWrap}>
                  <Text style={s.locLabel}>📍  Your Current Location</Text>
                  <Text style={s.locCoords}>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </Text>
                </View>
              )}
            </View>

            {/* Place name card */}
            {location && !locLoading && (
              <View style={s.placeCard}>
                <Text style={s.placeLabel}>📌  Place</Text>
                {placeName ? (
                  <Text style={s.placeValue}>{placeName}</Text>
                ) : (
                  <Text style={s.placeFetching}>Fetching place name...</Text>
                )}
              </View>
            )}

            {/* User info card */}
            <View style={s.userCard}>
              <View style={s.avatarCircle}>
                <Text style={s.avatarText}>
                  {(userName || 'U')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </Text>
              </View>
              <View style={s.userInfo}>
                <Text style={s.userName}>{userName || 'User'}</Text>
                <Text style={s.userSub}>Reporter</Text>
              </View>
              <View style={s.scoreWrap}>
                <Text style={s.scoreValue}>{score}</Text>
                <Text style={s.scoreLabel}>Points</Text>
              </View>
            </View>

            {/* Quick action row */}
            <View style={s.quickRow}>
              <TouchableOpacity
                style={s.quickBtn}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Report')}
              >
                <Text style={s.quickBtnIcon}>📝</Text>
                <Text style={s.quickBtnLabel}>Report</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.quickBtn}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Reports')}
              >
                <Text style={s.quickBtnIcon}>📋</Text>
                <Text style={s.quickBtnLabel}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.quickBtn}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Leaderboard')}
              >
                <Text style={s.quickBtnIcon}>🏆</Text>
                <Text style={s.quickBtnLabel}>Ranks</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Bottom Tab Bar - hidden when map is expanded */}
      {!mapExpanded && (
        <View style={s.bottomBar}>
          <TouchableOpacity style={[s.bTab, s.bTabActive]}>
            <Text style={[s.bTabIcon, s.bTabIconActive]}>🏠</Text>
            <Text style={[s.bTabLabel, s.bTabLabelActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Leaderboard')}>
            <Text style={s.bTabIcon}>📊</Text>
            <Text style={s.bTabLabel}>Leaderboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Report')}>
            <Text style={s.bTabIcon}>📝</Text>
            <Text style={s.bTabLabel}>Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bTab} onPress={() => navigation.navigate('Profile')}>
            <Text style={s.bTabIcon}>👤</Text>
            <Text style={s.bTabLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const BOTTOM_BAR_H = Platform.OS === 'ios' ? 80 : 68;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e8e0d8' },

  /* Map */
  mapContainer: {
    height: SCREEN_H * 0.48,
  },
  mapContainerFull: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8e8e8',
  },
  mapLoadingText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },

  /* Fullscreen map overlay */
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    left: 66,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dotGreen: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    marginRight: 10,
  },
  dotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F44336',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  searchDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginLeft: 20,
  },
  clearBtn: {
    fontSize: 14,
    color: '#b0a090',
    paddingHorizontal: 4,
  },
  goBtn: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: '#E8922A',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  /* Suggestion dropdown */
  suggestionList: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 162 : 148,
    left: 66,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.6,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  suggestionSub: {
    fontSize: 11,
    color: '#a09080',
    marginTop: 1,
  },
  suggestionTypePill: {
    backgroundColor: 'rgba(232,146,42,0.12)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6,
    alignSelf: 'center',
  },
  suggestionTypeText: {
    fontSize: 10,
    color: '#E8922A',
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  /* Custom report marker icons */
  reportMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 7,
  },
  reportMarkerEmoji: {
    fontSize: 24,
  },
  reportMarkerArrow: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  /* Live bus markers */
  liveBusMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
  },
  liveBusEmoji: { fontSize: 20 },
  liveBusArrow: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  /* Live train markers */
  liveTrainMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 7,
  },
  liveTrainEmoji: { fontSize: 22 },
  liveTrainArrow: {
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  /* Layer toggle buttons */
  layerToggleWrap: {
    position: 'absolute',
    left: 10,
    bottom: 16,
    flexDirection: 'column',
    gap: 6,
    zIndex: 50,
  },
  layerToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  layerToggleActive: {
    backgroundColor: '#E8922A',
    borderColor: '#E8922A',
  },
  layerToggleText: {
    fontSize: 18,
  },

  /* Route error */
  routeErrorWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 170 : 156,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(244,67,54,0.9)',
    borderRadius: 12,
    padding: 12,
  },
  routeErrorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Route info */
  routeInfoWrap: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
  },
  routeCardsScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  routeInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 14,
    width: SCREEN_W * 0.6,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
    borderLeftWidth: 4,
  },
  routeInfoCardActive: {
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  routeInfoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeInfoLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#a09080',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recommendedBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  routeInfoMain: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  hazardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hazardWarning: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F44336',
  },
  hazardTypes: {
    fontSize: 14,
  },
  routeClear: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
  },

  /* Bottom sheet */
  bottomSheet: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  sheetGradient: {
    flex: 1,
    paddingHorizontal: 20,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },

  /* Location card */
  locationCard: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  locDeniedWrap: {
    alignItems: 'center',
  },
  locDeniedText: {
    fontSize: 14,
    color: '#a09080',
    fontWeight: '600',
    marginBottom: 12,
  },
  locBtn: {
    backgroundColor: '#E8922A',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  locBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  locInfoWrap: {},
  locLabel: {
    fontSize: 13,
    color: '#a09080',
    fontWeight: '600',
    marginBottom: 4,
  },
  locCoords: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },

  /* Place card */
  placeCard: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  placeLabel: {
    fontSize: 13,
    color: '#a09080',
    fontWeight: '600',
    marginBottom: 4,
  },
  placeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  placeFetching: {
    fontSize: 14,
    color: '#b0a090',
    fontStyle: 'italic',
  },

  /* User card */
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8922A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  userSub: {
    fontSize: 12,
    color: '#a09080',
    marginTop: 2,
  },
  scoreWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(232,146,42,0.10)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#E8922A',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#a09080',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Quick actions */
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: 18,
    paddingVertical: 16,
    marginHorizontal: 5,
  },
  quickBtnIcon: { fontSize: 24, marginBottom: 4 },
  quickBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a2e',
  },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    paddingHorizontal: 10,
  },
  bTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  bTabActive: {
    backgroundColor: 'rgba(232,146,42,0.10)',
    borderRadius: 16,
    marginHorizontal: 2,
    paddingVertical: 6,
  },
  bTabIcon: { fontSize: 20, opacity: 0.35 },
  bTabIconActive: { opacity: 1 },
  bTabLabel: { fontSize: 10, color: '#bbb', fontWeight: '600', marginTop: 2 },
  bTabLabelActive: { color: '#E8922A' },
});
