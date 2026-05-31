import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, 
  increment, setDoc, getDoc, query, orderBy, deleteDoc
} from 'firebase/firestore';
import { 
  MapPin, Plus, Search, Users, Video, Image as ImageIcon, User, Navigation,
  ThumbsUp, X, ShieldCheck, Camera, ChevronLeft, ChevronRight, Zap, Globe, 
  Loader2, Trash2, Edit3, Map as MapIcon, AlertTriangle, Gamepad2
} from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyAM-OHPPI8yfrD_yu0RHSyZrLtXNwgn8Y8",
  authDomain: "aggretv.firebaseapp.com",
  projectId: "aggretv",
  storageBucket: "aggretv.firebasestorage.app",
  messagingSenderId: "553077694069",
  appId: "1:553077694069:web:962e3691ad7975174a223c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const ROOT_ADMIN = "alfre2d@gmail.com";

const PROVINCIAS_ARGENTINA = [
  "CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", 
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", 
  "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", 
  "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán"
];

const SPOT_TYPES = ["Skatepark", "Baranda", "Borde/Murete", "Escaleras", "Rampa/Gap", "Piso Liso"];

const InstagramIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const WhatsAppIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-10.6 8.38 8.38 0 0 1 3.8.9L21 3z"></path>
  </svg>
);

const Button = ({ children, variant = 'primary', isLoading = false, className = '', ...props }) => {
  const variants = {
    primary: 'bg-red-600 hover:bg-red-500 text-white font-black shadow-lg shadow-red-600/20',
    secondary: 'bg-zinc-900 hover:bg-zinc-800 text-white font-bold border border-zinc-800',
    danger: 'bg-red-900/50 hover:bg-red-600 text-white border border-red-800'
  };
  return (
    <button 
      disabled={isLoading}
      className={`px-4 py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-tight disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 className="animate-spin" size={18} /> : children}
    </button>
  );
};

const ImageCarousel = ({ images, onImageClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  if (!images || images.length === 0) return (
    <div className="w-full h-full flex flex-col items-center justify-center opacity-20 bg-zinc-900 min-h-[200px]">
      <ImageIcon size={48} />
      <span className="text-[10px] font-black uppercase mt-2 tracking-widest text-white">Sin Imágenes</span>
    </div>
  );

  return (
    <div className="relative w-full h-64 group/carousel overflow-hidden bg-black cursor-zoom-in">
      <img 
        src={images[currentIndex]} 
        className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]" 
        alt="Spot View" 
        onClick={() => onImageClick && onImageClick(images[currentIndex])}
      />
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev - 1 + images.length) % images.length)}} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full hover:bg-red-600 z-10">
            <ChevronLeft size={16} className="text-white" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev + 1) % images.length)}} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full hover:bg-red-600 z-10">
            <ChevronRight size={16} className="text-white" />
          </button>
        </>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('explore'); 
  const [spots, setSpots] = useState([]);
  const [riders, setRiders] = useState([]);
  const [videos, setVideos] = useState([]);
  const [appSettings, setAppSettings] = useState({ logoUrl: '', adminList: '' });
  
  const [isAddingSpot, setIsAddingSpot] = useState(false);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingRiderByAdmin, setIsEditingRiderByAdmin] = useState(false);
  const [isEditingSpotByAdmin, setIsEditingSpotByAdmin] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [selectedRider, setSelectedRider] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [provinceFilter, setProvinceFilter] = useState('All');

  const [newSpot, setNewSpot] = useState({ title: '', city: '', province: 'Neuquén', type: 'Skatepark', description: '', images: ['', '', '', ''], lat: '', lng: '' });
  const [newVideo, setNewVideo] = useState({ title: '', youtubeUrl: '' });
  const [editProfile, setEditProfile] = useState({ name: '', city: '', province: 'Neuquén', instagram: '', whatsapp: '', bio: '', photoUrl: '' });
  const [adminEditingRiderData, setAdminEditingRiderData] = useState(null);
  const [adminEditingSpotData, setAdminEditingSpotData] = useState(null);
  
  const [adminEmailsInput, setAdminEmailsInput] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const adminMapContainerRef = useRef(null);
  const adminMapRef = useRef(null);
  const adminMarkerRef = useRef(null);

  const isUserAdmin = useMemo(() => {
    if (!user) return false;
    if (user.email === ROOT_ADMIN) return true;
    const extraAdmins = (appSettings.adminList || "").split(",").map(e => e.trim().toLowerCase());
    return extraAdmins.includes(user.email?.toLowerCase());
  }, [user, appSettings.adminList]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const profileRef = doc(db, 'profiles', u.uid);
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const data = snap.data();
          setUserProfile(data);
          setEditProfile(data);
        } else {
          const initialData = { name: u.displayName || 'Rider', city: '', province: 'Neuquén', uid: u.uid, photoUrl: u.photoURL || '' };
          await setDoc(profileRef, initialData);
          setUserProfile(initialData);
          setEditProfile(initialData);
          setIsEditingProfile(true);
        }
      }
    });

    onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAppSettings(data);
        setEditLogoUrl(data.logoUrl || '');
        setAdminEmailsInput(data.adminList || '');
      }
    });

    onSnapshot(query(collection(db, 'spots'), orderBy('createdAt', 'desc')), (snap) => {
      setSpots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(collection(db, 'profiles'), (snap) => {
      setRiders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(query(collection(db, 'videos'), orderBy('createdAt', 'desc')), (snap) => {
      setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubAuth();
  }, []);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600; 
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  const handleImageUpload = async (e, index, mode = 'spot') => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);
    const compressed = await compressImage(file);
    if (mode === 'spot') {
      const newImgs = [...newSpot.images];
      newImgs[index] = compressed;
      setNewSpot({ ...newSpot, images: newImgs });
    } else if (mode === 'profile') {
      setEditProfile({ ...editProfile, photoUrl: compressed });
    } else if (mode === 'admin_rider') {
      setAdminEditingRiderData({ ...adminEditingRiderData, photoUrl: compressed });
    } else if (mode === 'admin_spot') {
      const newImgs = [...adminEditingSpotData.images];
      newImgs[index] = compressed;
      setAdminEditingSpotData({ ...adminEditingSpotData, images: newImgs });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAddingSpot && !window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setTimeout(initMap, 200);
      document.head.appendChild(script);
    } else if (isAddingSpot) {
      setTimeout(initMap, 200);
    }
  }, [isAddingSpot]);

  const initMap = () => {
    if (!mapContainerRef.current || !window.L) return;
    if (mapRef.current) mapRef.current.remove();
    const L = window.L;
    const initialLat = -38.95;
    const initialLng = -68.05;
    mapRef.current = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
    markerRef.current = L.marker([initialLat, initialLng], { draggable: true }).addTo(mapRef.current);
    markerRef.current.on('dragend', () => {
      const pos = markerRef.current.getLatLng();
      setNewSpot(prev => ({ ...prev, lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) }));
    });
  };

  useEffect(() => {
    if (isEditingSpotByAdmin && !window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setTimeout(initAdminMap, 200);
      document.head.appendChild(script);
    } else if (isEditingSpotByAdmin) {
      setTimeout(initAdminMap, 200);
    }
  }, [isEditingSpotByAdmin, adminEditingSpotData?.id]);

  const initAdminMap = () => {
    if (!adminMapContainerRef.current || !window.L || !adminEditingSpotData) return;
    if (adminMapRef.current) adminMapRef.current.remove();
    const L = window.L;
    const initialLat = parseFloat(adminEditingSpotData.lat) || -38.95;
    const initialLng = parseFloat(adminEditingSpotData.lng) || -68.05;
    adminMapRef.current = L.map(adminMapContainerRef.current).setView([initialLat, initialLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(adminMapRef.current);
    adminMarkerRef.current = L.marker([initialLat, initialLng], { draggable: true }).addTo(adminMapRef.current);
    adminMarkerRef.current.on('dragend', () => {
      const pos = adminMarkerRef.current.getLatLng();
      setAdminEditingSpotData(prev => ({ ...prev, lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) }));
    });
  };

  const handleSearchAddress = async (val) => {
    if (val.length < 3) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=ar`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const pos = [parseFloat(lat), parseFloat(lon)];
        mapRef.current.setView(pos, 16);
        markerRef.current.setLatLng(pos);
        setNewSpot(prev => ({ ...prev, lat: lat, lng: lon }));
      }
    } catch (e) {}
  };

  const handleAdminSearchAddress = async (val) => {
    if (val.length < 3) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=ar`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const pos = [parseFloat(lat), parseFloat(lon)];
        if (adminMapRef.current) {
          adminMapRef.current.setView(pos, 16);
        }
        if (adminMarkerRef.current) {
          adminMarkerRef.current.setLatLng(pos);
        }
        setAdminEditingSpotData(prev => ({ ...prev, lat: lat, lng: lon }));
      }
    } catch (e) {}
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const coords = [latitude, longitude];
      if (mapRef.current) {
        mapRef.current.setView(coords, 16);
        markerRef.current.setLatLng(coords);
      }
      setNewSpot(prev => ({ ...prev, lat: latitude.toFixed(6), lng: longitude.toFixed(6) }));
    });
  };

  const handleAdminGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const coords = [latitude, longitude];
      if (adminMapRef.current) {
        adminMapRef.current.setView(coords, 16);
      }
      if (adminMarkerRef.current) {
        adminMarkerRef.current.setLatLng(coords);
      }
      setAdminEditingSpotData(prev => ({ ...prev, lat: latitude.toFixed(6), lng: longitude.toFixed(6) }));
    });
  };

  const handleAddSpot = async (e) => {
    e.preventDefault();
    if (!newSpot.lat || !newSpot.lng) return;
    setIsLoading(true);
    try {
      const validImages = newSpot.images.filter(url => url.trim() !== '');
      await addDoc(collection(db, 'spots'), {
        ...newSpot,
        images: validImages,
        creatorId: user.uid,
        creatorName: userProfile?.name || 'Rider',
        votesUp: 0,
        createdAt: new Date().toISOString()
      });
      setIsAddingSpot(false);
      setNewSpot({ title: '', city: '', province: 'Neuquén', type: 'Skatepark', description: '', images: ['', '', '', ''], lat: '', lng: '' });
    } finally { setIsLoading(false); }
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const videoId = newVideo.youtubeUrl.split('v=')[1]?.split('&')[0] || newVideo.youtubeUrl.split('/').pop();
      await addDoc(collection(db, 'videos'), {
        title: newVideo.title,
        youtubeUrl: newVideo.youtubeUrl,
        videoId,
        creatorId: user.uid,
        creatorName: userProfile?.name || 'Rider',
        createdAt: new Date().toISOString()
      });
      setIsAddingVideo(false);
      setNewVideo({ title: '', youtubeUrl: '' });
    } finally { setIsLoading(false); }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'profiles', user.uid), editProfile);
      if (user.email === ROOT_ADMIN) {
        await setDoc(doc(db, 'settings', 'global'), { logoUrl: editLogoUrl, adminList: adminEmailsInput }, { merge: true });
      }
      setUserProfile(editProfile);
      setIsEditingProfile(false);
    } finally { setIsLoading(false); }
  };

  const handleAdminSaveRider = async (e) => {
    e.preventDefault();
    if (!adminEditingRiderData) return;
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'profiles', adminEditingRiderData.uid), adminEditingRiderData);
      setIsEditingRiderByAdmin(false);
      setSelectedRider(null);
    } finally { setIsLoading(false); }
  };

  const handleEditSpotClick = (spot) => {
    const formattedImages = [...(spot.images || [])];
    while (formattedImages.length < 4) {
      formattedImages.push('');
    }
    setAdminEditingSpotData({ ...spot, images: formattedImages });
    setIsEditingSpotByAdmin(true);
  };

  const handleAdminSaveSpot = async (e) => {
    e.preventDefault();
    if (!adminEditingSpotData) return;
    setIsLoading(true);
    try {
      const validImages = adminEditingSpotData.images.filter(url => url && url.trim() !== '');
      const spotId = adminEditingSpotData.id;
      
      const updatedData = {
        title: adminEditingSpotData.title,
        city: adminEditingSpotData.city,
        province: adminEditingSpotData.province,
        type: adminEditingSpotData.type,
        description: adminEditingSpotData.description,
        lat: adminEditingSpotData.lat,
        lng: adminEditingSpotData.lng,
        images: validImages
      };

      await updateDoc(doc(db, 'spots', spotId), updatedData);
      setIsEditingSpotByAdmin(false);
      setSelectedSpot(null);
    } finally { setIsLoading(false); }
  };

  const gameSrcDoc = useMemo(() => {
    const profileNameSanitized = userProfile?.name
      ? userProfile.name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_ñÑ]/g, '').slice(0, 12).toUpperCase()
      : '';

    return `<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <title>AGGRETV-GAME - Endless Retro Roller</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Press Start 2P', monospace;
                background-color: #05020c;
                overflow: hidden;
                touch-action: none;
                -webkit-user-select: none;
                user-select: none;
            }
            canvas {
                image-rendering: pixelated;
                box-shadow: 0 0 35px rgba(255, 0, 110, 0.5);
                max-width: 100%;
                height: auto;
            }
            @keyframes neon-flicker {
                0%, 100% { text-shadow: 0 0 8px #ff007f, 0 0 15px #ff007f; }
                50% { text-shadow: 0 0 3px #00f0ff, 0 0 8px #00f0ff; }
            }
            .neon-glow {
                animation: neon-flicker 2.5s infinite;
            }
            .glass-panel {
                background: rgba(15, 7, 28, 0.85);
                border: 2px solid #ff007f;
                box-shadow: 0 0 15px rgba(255, 0, 127, 0.3);
            }
            ::-webkit-scrollbar {
                width: 6px;
            }
            ::-webkit-scrollbar-track {
                background: #110924;
            }
            ::-webkit-scrollbar-thumb {
                background: #00f0ff;
                border-radius: 3px;
            }
        </style>
    </head>
    <body class="flex flex-col items-center justify-between min-h-screen text-white select-none p-1 sm:p-2">
    
    <script>
      window.__app_id = "aggretv";
      window.__firebase_config = '${JSON.stringify(firebaseConfig)}';
      window.__initial_auth_token = null;
      window.__initial_rider_name = "${profileNameSanitized}";
    </script>
    
    <div class="relative w-full max-w-4xl p-1 sm:p-2 flex flex-col items-center">
        <div class="w-full flex justify-between items-center px-4 py-2 bg-purple-950/40 rounded-t-xl border-t-2 border-x-2 border-pink-500/50">
            <div class="flex items-center gap-2">
                <span class="inline-block w-3 h-3 bg-green-500 rounded-full animate-ping"></span>
                <span id="statusBarText" class="text-[8px] text-cyan-400 tracking-wider">MODO ONLINE ACTIVO</span>
            </div>
            <button id="btnMuteGlobal" class="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 active:scale-95 border border-white rounded text-[8px] font-bold tracking-widest transition">
                🎵 MÚSICA: ON
            </button>
        </div>
    
        <div class="relative bg-black border-4 border-cyan-400 rounded-b-xl overflow-hidden w-full aspect-[16/9]">
            <canvas id="gameCanvas" class="w-full h-full block"></canvas>
    
            <div id="startScreen" class="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-4 md:p-6 text-center z-10 overflow-y-auto">
                <h1 class="text-3xl md:text-5xl font-extrabold text-pink-500 mb-1 neon-glow tracking-wider">AGGRETV-GAME</h1>
                <h2 class="text-[10px] md:text-xs font-bold text-cyan-400 mb-4 tracking-widest">ENDLESS ROLLER COMPETITION</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 w-full max-w-4xl items-stretch">
                    <div class="md:col-span-7 flex flex-col items-center justify-center glass-panel p-4 rounded-xl">
                        <p class="text-[8px] text-yellow-400 font-bold mb-3 tracking-wide">¡ENTRENA TU RIDER Y REGISTRA TU RECORD!</p>
                        
                        <div class="w-full max-w-xs mb-4">
                            <label for="riderNameInput" class="block text-[8px] text-gray-400 mb-2 uppercase tracking-widest">Apodo del Raider:</label>
                            <input type="text" id="riderNameInput" class="w-full bg-black border-2 border-cyan-400 text-white rounded px-3 py-2 text-center text-[10px] tracking-widest font-bold uppercase focus:outline-none focus:border-pink-500 transition placeholder-purple-900" placeholder="SIN_NOMBRE" maxlength="12">
                        </div>
    
                        <button id="startButton" class="w-full max-w-xs px-6 py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white rounded-lg border-2 border-white shadow-lg shadow-pink-500/50 transform active:scale-95 transition text-[10px] font-bold cursor-pointer uppercase tracking-widest mb-4">
                            ¡INICIAR DESAFÍO!
                        </button>
    
                        <div class="hidden md:block text-[7px] text-gray-400 text-left border-t border-gray-800 pt-3 w-full max-w-xs">
                            <span class="text-cyan-400 font-bold">SALTAR:</span> Flecha Arriba ↑<br>
                            <span class="text-yellow-400 font-bold">GRINDEAR:</span> MANTENER ESPACIO (Rieles)<br>
                            <span class="text-pink-500 font-bold">TRUCOS DE AIRE:</span> Z, X, C | Rotas con ← / →
                        </div>
                    </div>
    
                    <div class="md:col-span-5 flex flex-col glass-panel p-4 rounded-xl min-h-[160px] md:min-h-0 justify-between">
                        <h3 class="text-[9px] text-cyan-400 border-b border-purple-800 pb-2 uppercase tracking-widest font-bold">TOP 5 RANKING MUNDIAL</h3>
                        <div id="leaderboardList" class="flex-grow flex flex-col justify-center text-left text-[8px] py-2 space-y-1.5 font-bold">
                            <p class="text-center text-gray-500 animate-pulse">SINTONIZANDO SEÑAL...</p>
                        </div>
                        <div class="text-[6px] text-gray-500 tracking-wider pt-2 border-t border-purple-950">ACTUALIZADO EN TIEMRE REAL</div>
                    </div>
                </div>
            </div>
    
            <div id="gameOverScreen" class="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 text-center z-10 transition-opacity duration-700 opacity-0 pointer-events-none overflow-y-auto">
                <h2 class="text-2xl md:text-3xl font-bold text-red-500 mb-1 neon-glow tracking-wider">💥 ¡CRASH EXTREMO! 💥</h2>
                <p id="gameOverReason" class="text-[8px] md:text-xs text-yellow-400 mb-4">Mala caída del rider virtual</p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-4 items-stretch">
                    <div class="glass-panel p-4 rounded-lg text-left text-[8px] md:text-[10px] flex flex-col justify-center space-y-2">
                        <p class="text-gray-400 uppercase">RIDER: <span id="finalRiderName" class="text-yellow-400 font-bold">???</span></p>
                        <p class="text-gray-400">PUNTAJE FINAL: <span id="finalScore" class="text-white font-bold">0</span></p>
                        <p class="text-gray-400">DISTANCIA TOTAL: <span id="finalDistance" class="text-cyan-400 font-bold">0m</span></p>
                        <p class="text-gray-400">MEJOR PERSONAL: <span id="bestRecord" class="text-pink-500 font-bold">0</span></p>
                    </div>
    
                    <div class="glass-panel p-3 rounded-lg text-left flex flex-col justify-between">
                        <h3 class="text-[7px] md:text-[8px] text-cyan-400 border-b border-purple-800 pb-1.5 font-bold tracking-wider uppercase text-center">Clasificación Al Instante</h3>
                        <div id="gameOverLeaderboardList" class="flex-grow flex flex-col justify-center text-[7px] md:text-[8px] space-y-1 py-2 font-bold">
                            <p class="text-center text-gray-500 animate-pulse">CARGANDO...</p>
                        </div>
                    </div>
                </div>
    
                <button id="restartButton" class="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg border-2 border-white shadow-lg transform active:scale-95 transition text-[9px] font-bold cursor-pointer uppercase tracking-wider">
                    INTENTAR DE NUEVO [ESPACIO]
                </button>
            </div>
        </div>
    
        <div id="mobileControls" class="w-full grid grid-cols-2 gap-3 mt-3 px-1 md:hidden select-none touch-none">
            <div class="grid grid-cols-2 gap-2">
                <button id="btnJump" class="bg-red-600 border border-white/20 rounded-2xl py-3.5 flex flex-col items-center justify-center font-black text-xs tracking-tight shadow-lg shadow-red-600/15 active:bg-red-500 active:scale-95 transition-all">
                    <span class="text-[16px] mb-0.5">↑</span>
                    <span class="text-[8px] tracking-widest">SALTÁ</span>
                </button>
                <button id="btnGrind" class="bg-cyan-500 border border-white/20 rounded-2xl py-3.5 flex flex-col items-center justify-center font-black text-xs tracking-tight text-black shadow-lg shadow-cyan-500/15 active:bg-cyan-400 active:scale-95 transition-all">
                    <span class="text-[16px] mb-0.5">⚡</span>
                    <span class="text-[8px] tracking-widest">GRIND</span>
                </button>
            </div>
            <div class="grid grid-cols-3 gap-1.5">
                <button id="btnTrickZ" class="bg-zinc-900 border border-purple-500/30 rounded-2xl py-3.5 flex flex-col items-center justify-center font-black text-[10px] text-purple-400 active:bg-purple-900 active:text-white shadow-md active:scale-95 transition-all">
                    <span>Z</span>
                    <span class="text-[6px] tracking-wide opacity-80 mt-0.5">FLIP</span>
                </button>
                <button id="btnTrickX" class="bg-zinc-900 border border-purple-500/30 rounded-2xl py-3.5 flex flex-col items-center justify-center font-black text-[10px] text-purple-400 active:bg-purple-900 active:text-white shadow-md active:scale-95 transition-all">
                    <span>X</span>
                    <span class="text-[6px] tracking-wide opacity-80 mt-0.5">SPIN</span>
                </button>
                <button id="btnTrickC" class="bg-zinc-900 border border-purple-500/30 rounded-2xl py-3.5 flex flex-col items-center justify-center font-black text-[10px] text-purple-400 active:bg-purple-900 active:text-white shadow-md active:scale-95 transition-all">
                    <span>C</span>
                    <span class="text-[6px] tracking-wide opacity-80 mt-0.5">GRAB</span>
                </button>
            </div>
        </div>
    </div>
    
    <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
    import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
    
    const appId = window.__app_id || 'aggretv';
    const firebaseConfigRaw = window.__firebase_config || null;
    const initialAuthToken = window.__initial_auth_token || null;
    
    let db = null;
    let auth = null;
    let isFirebaseActive = false;
    
    async function initDatabase() {
        const statusText = document.getElementById("statusBarText");
        if (firebaseConfigRaw) {
            try {
                const firebaseConfig = JSON.parse(firebaseConfigRaw);
                const app = initializeApp(firebaseConfig);
                db = getFirestore(app);
                auth = getAuth(app);
    
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
    
                isFirebaseActive = true;
                if (statusText) statusText.innerText = "MODO ONLINE ACTIVO";
            } catch (e) {
                console.error("Firebase connection error, moving to Offline Mode:", e);
                if (statusText) statusText.innerText = "SISTEMA LOCAL (LOCALSTORAGE)";
            }
        } else {
            if (statusText) statusText.innerText = "SISTEMA LOCAL (LOCALSTORAGE)";
        }
    }
    
    function getLocalScores() {
        try {
            return JSON.parse(localStorage.getItem("aggretv_scores")) || [];
        } catch (e) {
            return [];
        }
    }
    
    function saveLocalScore(rider, score, distance) {
        const scores = getLocalScores();
        scores.push({
            riderName: rider,
            score: score,
            distance: Math.floor(distance),
            timestamp: Date.now()
        });
        scores.sort((a, b) => b.score - a.score);
        localStorage.setItem("aggretv_scores", JSON.stringify(scores.slice(0, 50)));
    }
    
    async function recordHighScore(riderName, score, distance) {
        saveLocalScore(riderName, score, distance);
        if (!isFirebaseActive || !auth || !auth.currentUser) return;
        
        try {
            const scoresCollection = collection(db, 'artifacts', appId, 'public', 'data', 'scores');
            await addDoc(scoresCollection, {
                riderName: riderName,
                score: score,
                distance: Math.floor(distance),
                timestamp: Date.now()
            });
        } catch (e) {
            console.error("Failed to sync score online:", e);
        }
    }
    
    async function fetchHighScores() {
        let rawList = [];
        if (isFirebaseActive && auth && auth.currentUser) {
            try {
                const scoresCollection = collection(db, 'artifacts', appId, 'public', 'data', 'scores');
                const snap = await getDocs(scoresCollection);
                snap.forEach(doc => {
                    const data = doc.data();
                    if (data.riderName && typeof data.score === 'number') {
                        rawList.push(data);
                    }
                });
            } catch (e) {
                console.error("Error reading from Firestore:", e);
                rawList = getLocalScores();
            }
        } else {
            rawList = getLocalScores();
        }
    
        rawList.sort((a, b) => b.score - a.score || b.distance - a.distance);
    
        const uniqueRiders = [];
        const keysSeen = new Set();
        for (const item of rawList) {
            const uKey = \`\${item.riderName.toUpperCase()}\`;
            if (!keysSeen.has(uKey)) {
                keysSeen.add(uKey);
                uniqueRiders.push(item);
            }
        }
    
        return uniqueRiders.slice(0, 10);
    }
    
    const AudioEngine = {
        ctx: null,
        isPlaying: false,
        synthInterval: null,
        musicVolume: 0.12,
        isMusicMuted: false,
    
        init() {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioContext();
                this.isPlaying = true;
            } catch (e) {
                console.error("AudioContext not supported", e);
            }
        },
    
        playTone(freq, type, duration, slideTo = 0) {
            if (!this.ctx || this.ctx.state === 'suspended' || this.isMusicMuted) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
    
            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            if (slideTo > 0) {
                osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
            }
    
            gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        },
    
        playNoise(duration, lowFreq = false) {
            if (!this.ctx || this.isMusicMuted) return;
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                if (lowFreq) {
                    data[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = data[i];
                    data[i] *= 3.5; 
                } else {
                    data[i] = white * 0.3;
                }
            }
    
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            noise.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start();
        },
    
        sfxJump() { this.playTone(200, 'square', 0.12, 500); },
        sfxGrind() { this.playNoise(0.05, false); },
        sfxTrick() { this.playTone(400, 'triangle', 0.15, 900); },
        sfxCrash() { this.playNoise(0.5, true); this.playTone(150, 'sawtooth', 0.4, 30); },
        sfxScore() { this.playTone(523.25, 'sine', 0.08, 1046.50); },
    
        toggleMusic() {
            if (!this.ctx) this.init();
            if (this.synthInterval) {
                clearInterval(this.synthInterval);
                this.synthInterval = null;
                return;
            }
    
            const bassline = [110.00, 110.00, 130.81, 130.81, 146.83, 146.83, 164.81, 164.81];
            let step = 0;
            this.synthInterval = setInterval(() => {
                if (this.ctx && this.ctx.state !== 'suspended' && !this.isMusicMuted) {
                    const note = bassline[step % bassline.length];
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(note, this.ctx.currentTime);
                    gain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
                    osc.start();
                    osc.stop(this.ctx.currentTime + 0.18);
                    step++;
                }
            }, 180);
        }
    };
    
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    
    const GAME_WIDTH = 800;
    const GAME_HEIGHT = 450;
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    let gameState = "START";
    let cameraX = 0;
    let personalHighScore = localStorage.getItem("endless_skate_highscore") || 0;
    let crashTimer = 0;
    let flashAlpha = 0;
    let activeRiderName = window.__initial_rider_name || localStorage.getItem("aggretv_saved_rider") || "RIDER_1";
    
    const player = {
        x: 100,
        y: 200,
        width: 24,
        height: 44,
        vx: 0,
        vy: 0,
        angle: 0, 
        gravity: 0.42,
        jumpForce: -10,
        isGrounded: false,
        isGrinding: false,
        grindPointsTimer: 0,
        score: 0,
        distance: 0,
        combo: 0,
        multiplier: 1,
        currentTrick: "",
        trickDisplayTimer: 0,
        animFrame: 0,
        baseSpeedX: 4.0, 
        speedX: 4.0,      
        crashed: false
    };
    
    let rails = [];
    let particles = [];
    
    function addSpark(x, y) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 4,
            color: "hsl(" + (Math.random() * 50 + 320) + ", 100%, 60%)", 
            size: Math.random() * 3 + 2,
            life: 1.0
        });
    }
    
    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.12; 
            p.life -= 0.05;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }
    
    function generateInitialRails() {
        rails = [];
        rails.push({
            x: 0,
            y: 280,
            width: 350,
            height: 12,
            type: "platform",
            label: "Pista Inicial"
        });
    
        let currentX = 350;
        for (let i = 0; i < 5; i++) {
            currentX = createProceduralObstacle(currentX);
        }
    }
    
    function createProceduralObstacle(startX) {
        const gap = Math.floor(Math.random() * 100) + 70; 
        const width = Math.floor(Math.random() * 150) + 120; 
        const heightChange = (Math.random() - 0.5) * 80; 
        
        let targetY = 280 + heightChange;
        if (targetY < 180) targetY = 180;
        if (targetY > 340) targetY = 340;
    
        const types = ["rail", "platform", "kink-rail"];
        const chosenType = types[Math.floor(Math.random() * types.length)];
    
        rails.push({
            x: startX + gap,
            y: targetY,
            width: width,
            height: chosenType === "platform" ? 14 : 8,
            type: chosenType,
            label: chosenType === "rail" ? "Neon Rail" : chosenType === "kink-rail" ? "Kink Ledge" : "Futur Platform"
        });
    
        return startX + gap + width;
    }
    
    function updateProceduralGeneration() {
        const lastRail = rails[rails.length - 1];
        if (lastRail.x < player.x + GAME_WIDTH) {
            createProceduralObstacle(lastRail.x);
        }
    
        if (rails.length > 15) {
            if (rails[0].x + rails[0].width < cameraX - 100) {
                rails.shift();
            }
        }
    }
    
    const keys = {};
    window.addEventListener("keydown", e => {
        keys[e.code] = true;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
            e.preventDefault();
        }
        if (e.code === "Space") {
            if (gameState === "GAMEOVER") {
                restartGame();
            }
        }
    });
    window.addEventListener("keyup", e => {
        keys[e.code] = false;
    });
    
    function bindTouchControl(elementId, keyToTrigger) {
        const btn = document.getElementById(elementId);
        if (!btn) return;
    
        const press = (e) => {
            e.preventDefault();
            keys[keyToTrigger] = true;
            if (navigator.vibrate) {
                try { navigator.vibrate(10); } catch(err) {}
            }
        };
    
        const release = (e) => {
            e.preventDefault();
            keys[keyToTrigger] = false;
        };
    
        btn.addEventListener("touchstart", press, { passive: false });
        btn.addEventListener("touchend", release, { passive: false });
        btn.addEventListener("touchcancel", release, { passive: false });
    
        btn.addEventListener("mousedown", press);
        btn.addEventListener("mouseup", release);
        btn.addEventListener("mouseleave", release);
    }
    
    bindTouchControl("btnJump", "ArrowUp");
    bindTouchControl("btnGrind", "Space");
    bindTouchControl("btnTrickZ", "KeyZ");
    bindTouchControl("btnTrickX", "KeyX");
    bindTouchControl("btnTrickC", "KeyC");
    
    function triggerAirTrick(name, points) {
        player.currentTrick = name + "! +" + points;
        player.trickDisplayTimer = 45;
        player.combo += points;
        player.multiplier += 1;
        AudioEngine.sfxTrick();
    }
    
    function triggerCrashAnimation(reason) {
        gameState = "CRASHING";
        player.crashed = true;
        player.vy = -8; 
        player.vx = -player.speedX * 0.4; 
        crashTimer = 90; 
        flashAlpha = 0.8; 
        AudioEngine.sfxCrash();
        
        if (navigator.vibrate) {
            try { navigator.vibrate([80, 50, 120]); } catch(err) {}
        }
        
        if (player.score > personalHighScore) {
            personalHighScore = player.score;
            localStorage.setItem("endless_skate_highscore", personalHighScore);
        }
    
        recordHighScore(activeRiderName, player.score, player.distance).then(() => {
            refreshLeaderboards();
        });
    
        document.getElementById("gameOverReason").innerText = reason;
        document.getElementById("finalScore").innerText = player.score;
        document.getElementById("finalDistance").innerText = Math.floor(player.distance) + "m";
        document.getElementById("bestRecord").innerText = personalHighScore;
        document.getElementById("finalRiderName").innerText = activeRiderName;
    }
    
    async function refreshLeaderboards() {
        const highScores = await fetchHighScores();
        const activeStartList = document.getElementById("leaderboardList");
        const activeOverList = document.getElementById("gameOverLeaderboardList");
    
        const buildHTML = (list) => {
            if (list.length === 0) {
                return '<div class="text-center text-gray-500 py-4">SIN REGISTROS AÚN</div>';
            }
            return list.slice(0, 5).map((u, i) => {
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i+1) + ".";
                const labelColor = i === 0 ? "text-yellow-400" : i === 1 ? "text-cyan-300" : i === 2 ? "text-pink-400" : "text-gray-300";
                return '<div class="flex justify-between items-center ' + labelColor + ' text-[8px] tracking-wide"><span>' + medal + ' ' + u.riderName.toUpperCase() + '</span><span>' + u.score + ' pts</span></div>';
            }).join("");
        };
    
        const renderedHTML = buildHTML(highScores);
        if (activeStartList) activeStartList.innerHTML = renderedHTML;
        if (activeOverList) activeOverList.innerHTML = renderedHTML;
    }
    
    function update() {
        if (gameState === "CRASHING") {
            player.vy += player.gravity * 0.8; 
            player.x += player.vx;
            player.y += player.vy;
            player.angle += 12; 
    
            cameraX += (player.x - 200 - cameraX) * 0.05;
    
            if (flashAlpha > 0) flashAlpha -= 0.03;
    
            updateParticles();
            crashTimer--;
    
            if (crashTimer <= 0 || player.y > GAME_HEIGHT + 100) {
                gameState = "GAMEOVER";
                const goScreen = document.getElementById("gameOverScreen");
                goScreen.classList.remove("pointer-events-none");
                goScreen.classList.add("opacity-100");
            }
            return;
        }
    
        if (gameState !== "PLAYING") return;
    
        player.speedX = player.baseSpeedX + (player.distance * 0.0015); 
        player.distance += player.speedX * 0.02;
    
        player.x += player.speedX;
        player.animFrame += 0.22;
    
        if (keys["ArrowUp"] && (player.isGrounded || player.isGrinding)) {
            player.vy = player.jumpForce;
            player.isGrounded = false;
            player.isGrinding = false;
            AudioEngine.sfxJump();
        }
    
        player.vy += player.gravity;
        player.y += player.vy;
    
        if (player.y > GAME_HEIGHT) {
            triggerCrashAnimation("💥 ¡CAÍSTE AL ABISMO VIRTUAL! 💥");
            return;
        }
    
        if (!player.isGrounded && !player.isGrinding) {
            if (keys["ArrowRight"]) {
                player.angle += 8;
                if (Math.floor(player.angle) % 360 === 0) {
                    triggerAirTrick("360 Spin", 150);
                }
            } else if (keys["ArrowLeft"]) {
                player.angle -= 8;
                if (Math.floor(player.angle) % 360 === 0) {
                    triggerAirTrick("Backside 360", 150);
                }
            }
    
            if (keys["KeyZ"] && player.trickDisplayTimer <= 0) {
                triggerAirTrick("Backflip", 250);
                player.angle += 180; 
            } else if (keys["KeyX"] && player.trickDisplayTimer <= 0) {
                triggerAirTrick("Rocket Grab", 200);
            } else if (keys["KeyC"] && player.trickDisplayTimer <= 0) {
                triggerAirTrick("Method Air", 180);
            }
        }
    
        let isOnAnything = false;
        const playerFeetX = player.x + player.width / 2;
        const playerFeetY = player.y + player.height;
    
        for (let rail of rails) {
            if (playerFeetX >= rail.x && playerFeetX <= rail.x + rail.width) {
                if (playerFeetY >= rail.y - 12 && playerFeetY <= rail.y + 14) {
                    isOnAnything = true;
    
                    if (rail.type === "platform") {
                        if (player.vy >= 0) {
                            if (!player.isGrounded) {
                                checkLandingAngle();
                            }
                            if (gameState === "PLAYING") {
                                player.y = rail.y - player.height;
                                player.vy = 0;
                                player.isGrounded = true;
                                player.isGrinding = false;
                            }
                        }
                    } 
                    else if (rail.type === "rail" || rail.type === "kink-rail") {
                        if (player.vy >= 0) {
                            if (keys["Space"]) {
                                if (!player.isGrinding) {
                                    checkLandingAngle();
                                    if (gameState === "PLAYING") {
                                        player.isGrinding = true;
                                        player.isGrounded = false;
                                        triggerAirTrick(rail.type === "kink-rail" ? "Kink Grind" : "Fastslide", 100);
                                    }
                                }
                                if (gameState === "PLAYING") {
                                    player.y = rail.y - player.height;
                                    player.vy = 0;
                                    player.angle = 0; 
    
                                    player.grindPointsTimer++;
                                    if (player.grindPointsTimer % 3 === 0) {
                                        player.score += 2 * player.multiplier;
                                        addSpark(playerFeetX, playerFeetY);
                                    }
                                    if (Math.random() < 0.15) {
                                        AudioEngine.sfxGrind();
                                    }
                                }
                            } else {
                                triggerCrashAnimation("💥 ¡CHOCASTE CONTRA EL RIEL SIN MANTENER ESPACIO! 💥");
                                return;
                            }
                        }
                    }
                }
            }
        }
    
        if (player.isGrinding && !keys["Space"]) {
            player.isGrinding = false;
            player.vy = 1;
        }
    
        if (!isOnAnything) {
            player.isGrounded = false;
            player.isGrinding = false;
        }
    
        if (player.trickDisplayTimer > 0) {
            player.trickDisplayTimer--;
        } else {
            player.currentTrick = "";
        }
    
        const targetCameraX = player.x - 150;
        cameraX += (targetCameraX - cameraX) * 0.15;
    
        updateProceduralGeneration();
        updateParticles();
    }
    
    function checkLandingAngle() {
        const angleNormalized = Math.abs(player.angle % 360);
        if (angleNormalized > 45 && angleNormalized < 315) {
            triggerCrashAnimation("💥 ¡MALA CAÍDA! NO ATERRIZASTE DERECHO 💥");
        } else {
            if (player.combo > 0) {
                player.score += player.combo * player.multiplier;
                player.combo = 0;
                player.multiplier = 1;
                AudioEngine.sfxScore();
            }
            player.angle = 0;
        }
    }
    
    function draw() {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
        ctx.save();
        ctx.translate(-cameraX, 0);
    
        const skyGrad = ctx.createLinearGradient(cameraX, 0, cameraX, GAME_HEIGHT);
        skyGrad.addColorStop(0, "#080112");
        skyGrad.addColorStop(0.5, "#210535");
        skyGrad.addColorStop(1, "#430d4b");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(cameraX, 0, GAME_WIDTH, GAME_HEIGHT);
    
        const sunX = cameraX + GAME_WIDTH / 2 + 150;
        const sunY = 150;
        ctx.fillStyle = "#ff0066";
        ctx.beginPath();
        ctx.arc(sunX, sunY, 65, 0, Math.PI * 2);
        ctx.fill();
    
        ctx.fillStyle = "#210535";
        for (let i = 0; i < 7; i++) {
            const height = 3 + i * 2;
            ctx.fillRect(sunX - 75, sunY + 5 + i * 11, 150, height);
        }
    
        ctx.fillStyle = "#150221";
        ctx.beginPath();
        for (let i = 0; i < 20; i++) {
            const mX = (i * 180) - (cameraX * 0.2) % 300;
            ctx.lineTo(mX, GAME_HEIGHT - 100);
            ctx.lineTo(mX + 90, GAME_HEIGHT - 220 - (i % 2 * 30));
            ctx.lineTo(mX + 180, GAME_HEIGHT - 100);
        }
        ctx.lineTo(cameraX + GAME_WIDTH + 200, GAME_HEIGHT);
        ctx.lineTo(cameraX - 100, GAME_HEIGHT);
        ctx.closePath();
        ctx.fill();
    
        ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
        ctx.lineWidth = 1;
        const gridY = 390;
        ctx.beginPath();
        ctx.moveTo(cameraX, gridY);
        ctx.lineTo(cameraX + GAME_WIDTH, gridY);
        ctx.stroke();
    
        for (let x = cameraX - (cameraX % 40); x < cameraX + GAME_WIDTH + 40; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, gridY);
            ctx.lineTo(x - 50, GAME_HEIGHT);
            ctx.stroke();
        }
    
        rails.forEach(rail => {
            if (rail.type === "platform") {
                ctx.fillStyle = "#101525";
                ctx.fillRect(rail.x, rail.y, rail.width, rail.height);
                ctx.fillStyle = "#00f0ff";
                ctx.fillRect(rail.x, rail.y, rail.width, 3);
            } else {
                ctx.fillStyle = "#3a0066";
                ctx.fillRect(rail.x + 15, rail.y + rail.height, 5, gridY - rail.y);
                ctx.fillRect(rail.x + rail.width - 20, rail.y + rail.height, 5, gridY - rail.y);
    
                ctx.fillStyle = "#ff007f";
                ctx.shadowColor = "#ff007f";
                ctx.shadowBlur = 8;
                ctx.fillRect(rail.x, rail.y, rail.width, rail.height);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(rail.x, rail.y, rail.width, 2);
                ctx.shadowBlur = 0; 
            }
    
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.font = "6px 'Press Start 2P'";
            ctx.fillText(rail.label, rail.x + 5, rail.y - 10);
        });
    
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        ctx.globalAlpha = 1.0;
    
        ctx.save();
        const pCenterX = player.x + player.width / 2;
        const pCenterY = player.y + player.height / 2;
        ctx.translate(pCenterX, pCenterY);
        ctx.rotate((player.angle * Math.PI) / 180);
    
        if (player.crashed) {
            ctx.fillStyle = "#ff0055";
            ctx.fillRect(-12, -10, 24, 15);
            ctx.fillStyle = "#ffd59a";
            ctx.fillRect(-6, -20, 12, 10);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-10, 5, 6, 8);
            ctx.fillRect(4, 5, 6, 8);
            ctx.fillStyle = "yellow";
            ctx.font = "12px monospace";
            ctx.fillText("*", -15, -25);
            ctx.fillText("*", 15, -20);
        } else {
            ctx.fillStyle = "#ff007f";
            ctx.fillRect(-8, -22, 16, 7);
            ctx.fillStyle = "#000000"; 
            ctx.fillRect(4, -20, 4, 3); 
    
            ctx.fillStyle = "#ffd59a";
            ctx.fillRect(-6, -15, 12, 7);
    
            ctx.fillStyle = player.isGrinding ? "#00ffff" : "#7b2cbf";
            ctx.fillRect(-9, -8, 18, 16);
    
            ctx.fillStyle = "#ffd59a";
            if (player.isGrinding) {
                ctx.fillRect(-15, -4, 6, 4); 
                ctx.fillRect(9, -4, 6, 4);
            } else if (!player.isGrounded) {
                ctx.fillRect(-13, -12, 4, 8); 
                ctx.fillRect(9, -12, 4, 8);
            } else {
                const swing = Math.sin(player.animFrame) * 3;
                ctx.fillRect(-13, -4 + swing, 4, 8); 
                ctx.fillRect(9, -4 - swing, 4, 8);
            }
    
            ctx.fillStyle = "#10002b";
            ctx.fillRect(-8, 8, 16, 8);
    
            ctx.fillStyle = "#ffd59a";
            ctx.fillRect(-6, 16, 4, 6);
            ctx.fillRect(2, 16, 4, 6);
    
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-8, 22, 6, 4);
            ctx.fillRect(2, 22, 6, 4);
    
            ctx.fillStyle = "#ff0055";
            ctx.fillRect(-8, 26, 2, 2);
            ctx.fillRect(-4, 26, 2, 2);
            ctx.fillRect(2, 26, 2, 2);
            ctx.fillRect(6, 26, 2, 2);
        }
        ctx.restore();
    
        if (player.currentTrick) {
            ctx.fillStyle = "#00f0ff";
            ctx.font = "8px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText(player.currentTrick, player.x + player.width / 2, player.y - 18);
        }
    
        ctx.restore(); 
    
        if (flashAlpha > 0) {
            ctx.fillStyle = "rgba(255, 0, 0, " + flashAlpha + ")";
            ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        }
    
        ctx.fillStyle = "rgba(10, 5, 20, 0.75)";
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 2;
        ctx.fillRect(15, 15, 320, 80);
        ctx.strokeRect(15, 15, 320, 80);
    
        ctx.fillStyle = "#ffffff";
        ctx.font = "7px 'Press Start 2P'";
        ctx.textAlign = "left";
        ctx.fillText("RAIDER: " + activeRiderName.toUpperCase(), 25, 31);
        ctx.fillText("PUNTAJE: " + player.score, 25, 45);
        ctx.fillText("DISTANCIA: " + Math.floor(player.distance) + "m", 25, 59);
        ctx.fillText("MULTI: x" + player.multiplier, 25, 73);
        ctx.fillText("VEL: " + (player.speedX * 5).toFixed(0) + " KM/H", 25, 85);
    
        if (player.isGrinding) {
            ctx.fillStyle = "#ff007f";
            ctx.fillText("⚡ GRIND ACTIVO ⚡", 350, 31);
        }
    }
    
    function startGame() {
        const rawInput = document.getElementById("riderNameInput").value.trim().replace(/\\s+/g, '_');
        if (rawInput) {
            activeRiderName = rawInput.toUpperCase();
            localStorage.setItem("aggretv_saved_rider", activeRiderName);
        } else {
            activeRiderName = "RIDER_1";
        }
    
        document.getElementById("startScreen").classList.add("hidden");
        const goScreen = document.getElementById("gameOverScreen");
        goScreen.classList.add("pointer-events-none");
        goScreen.classList.remove("opacity-100");
        
        gameState = "PLAYING";
        window.focus();
        
        if (!AudioEngine.isPlaying) {
            AudioEngine.init();
        }
        if (!AudioEngine.synthInterval && !AudioEngine.isMusicMuted) {
            AudioEngine.toggleMusic();
        }
    }
    
    function restartGame() {
        const goScreen = document.getElementById("gameOverScreen");
        goScreen.classList.add("pointer-events-none");
        goScreen.classList.remove("opacity-100");
        
        player.x = 100;
        player.y = 150;
        player.vy = 0;
        player.vx = 0;
        player.angle = 0;
        player.score = 0;
        player.distance = 0;
        player.combo = 0;
        player.multiplier = 1;
        player.crashed = false;
        player.isGrounded = false;
        player.isGrinding = false;
        player.speedX = player.baseSpeedX;
        
        generateInitialRails();
        cameraX = 0;
        gameState = "PLAYING";
        window.focus();
    }
    
    document.getElementById("startButton").addEventListener("click", () => {
        startGame();
    });
    
    document.getElementById("restartButton").addEventListener("click", () => {
        restartGame();
    });
    
    const globalMuteBtn = document.getElementById("btnMuteGlobal");
    if (globalMuteBtn) {
        globalMuteBtn.addEventListener("click", () => {
            AudioEngine.isMusicMuted = !AudioEngine.isMusicMuted;
            if (AudioEngine.isMusicMuted) {
                globalMuteBtn.innerText = "🎵 MÚSICA: OFF";
                globalMuteBtn.classList.remove("bg-pink-600");
                globalMuteBtn.classList.add("bg-gray-700");
            } else {
                globalMuteBtn.innerText = "🎵 MÚSICA: ON";
                globalMuteBtn.classList.add("bg-pink-600");
                globalMuteBtn.classList.remove("bg-gray-700");
                if (gameState === "PLAYING" && !AudioEngine.synthInterval) {
                    AudioEngine.toggleMusic();
                }
            }
            window.focus();
        });
    }
    
    window.addEventListener("DOMContentLoaded", () => {
        initDatabase().then(() => {
            refreshLeaderboards();
        });
    
        const nameInput = document.getElementById("riderNameInput");
        if (nameInput) {
            nameInput.value = activeRiderName;
        }
    });
    
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    generateInitialRails();
    gameLoop();
    </script>
    
    </body>
    </html>`;
  }, [userProfile]); 

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-600 pb-24 font-sans">
      
      {/* Navbar Superior */}
      <nav className="sticky top-0 z-[100] bg-black/95 border-b border-zinc-900 px-6 py-4 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('explore')}>
            {appSettings.logoUrl ? <img src={appSettings.logoUrl} className="h-10 rounded-lg" alt="Logo" /> : <div className="bg-red-600 p-2 rounded-xl"><Navigation size={22} className="text-white" /></div>}
            <h1 className="text-2xl font-black italic uppercase tracking-tighter">AGGRETV</h1>
          </div>
          
          <div className="hidden md:flex gap-8">
            {['explore', 'riders', 'videos', 'game'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-red-600 border-b-2 border-red-600 pb-1' : 'text-zinc-500 hover:text-white'}`}>
                {tab === 'explore' ? 'Spots' : tab === 'videos' ? 'Videos' : tab === 'riders' ? 'Riders' : 'Arcade 🕹️'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {!user ? (
              <Button onClick={() => signInWithPopup(auth, provider)} className="text-[10px] py-2">Login Google</Button>
            ) : (
              <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[9px] font-black text-red-600 uppercase">Rider</p>
                  <p className="text-xs font-bold">{userProfile?.name}</p>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-red-600 p-0.5 overflow-hidden bg-zinc-900">
                  {userProfile?.photoUrl ? (
                    <img src={userProfile.photoUrl} className="rounded-full w-full h-full object-cover" alt="avatar" />
                  ) : (
                    <User size={20} className="w-full h-full p-2 text-zinc-500" />
                  )}
                </div>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Navegación Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[150] bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 px-4 py-4 flex justify-around items-center">
        <button onClick={() => setActiveTab('explore')} className={`flex flex-col items-center gap-1 ${activeTab === 'explore' ? 'text-red-600' : 'text-zinc-500'}`}><MapPin size={22}/><span className="text-[9px] font-black uppercase">Spots</span></button>
        <button onClick={() => setActiveTab('riders')} className={`flex flex-col items-center gap-1 ${activeTab === 'riders' ? 'text-red-600' : 'text-zinc-500'}`}><Users size={22}/><span className="text-[9px] font-black uppercase">Riders</span></button>
        <button onClick={() => setActiveTab('videos')} className={`flex flex-col items-center gap-1 ${activeTab === 'videos' ? 'text-red-600' : 'text-zinc-500'}`}><Video size={22}/><span className="text-[9px] font-black uppercase">Videos</span></button>
        <button onClick={() => setActiveTab('game')} className={`flex flex-col items-center gap-1 ${activeTab === 'game' ? 'text-red-600' : 'text-zinc-500'}`}><Gamepad2 size={22}/><span className="text-[9px] font-black uppercase">Arcade</span></button>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Hero */}
        <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-16 border-l-4 border-red-600 pl-6">
          <div className="space-y-2">
            <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">{activeTab === 'explore' ? 'Spots' : activeTab === 'riders' ? 'Riders' : activeTab === 'videos' ? 'Videos' : 'Arcade'}</h2>
            <p className="text-zinc-500 text-xs font-black flex items-center gap-2 uppercase tracking-widest"><Globe size={14} className="text-red-600" /> Argentina / {provinceFilter === 'All' ? 'Nacional' : provinceFilter}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {activeTab !== 'videos' && activeTab !== 'game' && (
              <select className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-2 ring-red-600 text-white" value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)}>
                <option value="All">🇦🇷 Filtrar Provincia</option>
                {PROVINCIAS_ARGENTINA.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {user && activeTab === 'explore' && <Button onClick={() => setIsAddingSpot(true)}><Plus size={20}/> SUMAR SPOT</Button>}
            {user && activeTab === 'videos' && <Button onClick={() => setIsAddingVideo(true)}><Video size={20}/> SUBIR VIDEO</Button>}
          </div>
        </div>

        {/* Explore Spots Grid */}
        {activeTab === 'explore' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {spots.filter(s => provinceFilter === 'All' || s.province === provinceFilter).map(spot => (
              <div key={spot.id} onClick={() => setSelectedSpot(spot)} className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden group hover:border-red-600 transition-all cursor-pointer">
                <div className="h-56 bg-zinc-900 overflow-hidden">
                   {spot.images?.[0] ? <img src={spot.images[0]} className="w-full h-full object-cover" alt="Thumb" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><ImageIcon size={40} className="text-white" /></div>}
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-black uppercase italic group-hover:text-red-600 transition-colors leading-none">{spot.title}</h3>
                    <div className="flex items-center gap-2">
                       <button onClick={(e) => { e.stopPropagation(); updateDoc(doc(db, 'spots', spot.id), { votesUp: increment(1) }) }} className="bg-zinc-900 p-2 rounded-lg text-xs font-black flex items-center gap-2 hover:bg-red-600 text-white"><ThumbsUp size={14} /> {spot.votesUp || 0}</button>
                       {isUserAdmin && <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'spots', spot.id)) }} className="bg-zinc-900 p-2 rounded-lg text-red-600 hover:bg-red-600 hover:text-white"><Trash2 size={14} /></button>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest"><MapPin size={12} className="text-red-600" /> {spot.city} • {spot.province}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Riders Grid */}
        {}
        {activeTab === 'riders' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {riders.filter(r => provinceFilter === 'All' || r.province === provinceFilter).map(rider => (
              <div key={rider.uid} onClick={() => setSelectedRider(rider)} className="bg-zinc-950 border border-zinc-900 p-8 rounded-2xl text-center space-y-4 hover:border-red-600 transition-all group cursor-pointer relative">
                {isUserAdmin && (
                  <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'profiles', rider.id)) }} className="absolute top-4 right-4 bg-zinc-900 p-2 rounded-lg text-red-600 hover:bg-red-600 hover:text-white z-10 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
                <div className="w-24 h-24 mx-auto bg-zinc-900 border-2 border-red-600 rounded-3xl flex items-center justify-center overflow-hidden">
                   {rider.photoUrl ? <img src={rider.photoUrl} className="w-full h-full object-cover" alt="Profile" /> : <User size={40} className="text-red-600" />}
                </div>
                <h4 className="font-black italic uppercase text-lg text-white">{rider.name}</h4>
                <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">{rider.city} • {rider.province}</p>
              </div>
            ))}
          </div>
        )}

        {/* Videos Grid */}
        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {videos.map(vid => (
               <div key={vid.id} className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden relative">
                  {isUserAdmin && <button onClick={() => deleteDoc(doc(db, 'videos', vid.id))} className="absolute top-4 right-4 z-10 bg-black/60 p-2 rounded-full text-red-600 hover:bg-red-600 hover:text-white transition-colors"><Trash2 size={16} /></button>}
                  <div className="aspect-video">
                    <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${vid.videoId}`} frameBorder="0" allowFullScreen title={vid.title}></iframe>
                  </div>
                  <div className="p-6">
                    <h4 className="font-black uppercase italic text-xl text-white">{vid.title}</h4>
                  </div>
               </div>
            ))}
          </div>
        )}

        {/* Arcade Game Section con soporte adaptativo e iframe responsivo */}
        {activeTab === 'game' && (
          <div className="w-full flex flex-col items-center justify-center">
            <div className="w-full max-w-4xl bg-zinc-950 border border-purple-500/30 rounded-[2.5rem] p-2 md:p-6 shadow-2xl shadow-purple-950/40 relative">
              <iframe
                title="AGGRETV Endless Retro Roller"
                srcDoc={gameSrcDoc}
                className="w-full h-[580px] sm:h-[620px] md:h-[650px] max-h-[85vh] rounded-3xl border-0 overflow-hidden"
                allow="autoplay; gamepad"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-6 text-center font-bold">
              🕹️ ¡Meté tu record y competí en el Ranking mundial de AGGRETV!
            </p>
          </div>
        )}
      </main>

      {/* Firma de Autoría y Derechos Reservados */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-900 text-center space-y-2 mb-10">
        <p className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.25em]">
          Plataforma Diseñada y Desarrollada por 
          <span className="text-red-600 hover:text-white transition-colors cursor-pointer ml-1.5">ALFREDO CIFUENTES</span>
        </p>
        <p className="text-zinc-600 text-[9px] font-black uppercase tracking-wider">
          © {new Date().getFullYear()} AGGRETV. TODOS LOS DERECHOS RESERVADOS.
        </p>
        <p className="text-zinc-700 text-[8px] font-bold uppercase tracking-wide max-w-md mx-auto leading-relaxed">
          Queda totalmente prohibida la copia, reproducción, imitación o distribución de esta idea, código, interfaz y mecánicas sin consentimiento expreso del autor.
        </p>
      </footer>

      {/* Detalle Spot */}
      {selectedSpot && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/90 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-2xl relative my-8">
            <button onClick={() => setSelectedSpot(null)} className="absolute top-6 right-6 z-20 bg-red-600 p-4 rounded-full border border-white/20"><X size={24} className="text-white" /></button>
            <div className="rounded-2xl overflow-hidden mb-8 shadow-2xl">
               <ImageCarousel images={selectedSpot.images} onImageClick={(imgUrl) => setFullscreenImage(imgUrl)} />
            </div>
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <h3 className="text-4xl font-black italic uppercase text-white">{selectedSpot.title}</h3>
                <div className="flex items-center gap-2 bg-zinc-900 p-3 rounded-xl border border-zinc-800 text-xs font-black uppercase">
                   <ThumbsUp size={16} className="text-red-600" /> {selectedSpot.votesUp || 0}
                </div>
              </div>
              <div className="flex items-center gap-3 text-zinc-400 text-xs font-black uppercase tracking-widest">
                <MapPin size={16} className="text-red-600" /> {selectedSpot.city} • {selectedSpot.province}
              </div>
              <p className="text-zinc-300 text-sm italic border-l-4 border-red-600 pl-6 leading-relaxed">"{selectedSpot.description}"</p>
              <div className="pt-4 flex gap-4">
                 <Button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedSpot.lat},${selectedSpot.lng}`, '_blank')} className="flex-1">ABRIR MAPA</Button>
                 
                 {isUserAdmin && (
                   <div className="flex gap-2">
                     <Button variant="secondary" onClick={() => handleEditSpotClick(selectedSpot)} className="w-14 p-0"><Edit3 size={20} /></Button>
                     <Button variant="danger" onClick={() => { deleteDoc(doc(db, 'spots', selectedSpot.id)); setSelectedSpot(null); }} className="w-14 p-0"><Trash2 size={20} /></Button>
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {/* Detalle de Rider Público (Nuevo Modal Corregido) */}
      {selectedRider && !isEditingRiderByAdmin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/90 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-lg shadow-2xl relative my-8 text-center space-y-6">
            <button 
              onClick={() => setSelectedRider(null)} 
              className="absolute top-6 right-6 z-20 bg-red-600 p-3 rounded-full border border-white/20 text-white hover:bg-red-500 transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <div className="w-32 h-32 mx-auto bg-zinc-900 border-2 border-red-600 rounded-[2rem] flex items-center justify-center overflow-hidden shadow-2xl">
              {selectedRider.photoUrl ? (
                <img src={selectedRider.photoUrl} className="w-full h-full object-cover" alt={selectedRider.name} />
              ) : (
                <User size={64} className="text-red-600 animate-pulse" />
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="text-3xl font-black italic uppercase text-white">{selectedRider.name}</h3>
              <p className="text-zinc-500 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5">
                <MapPin size={14} className="text-red-600" /> {selectedRider.city || 'Sin especificar'} • {selectedRider.province}
              </p>
            </div>
            
            {selectedRider.bio ? (
              <p className="text-zinc-300 text-sm italic border-l-4 border-red-600 pl-6 text-left leading-relaxed max-w-md mx-auto">
                "{selectedRider.bio}"
              </p>
            ) : (
              <p className="text-zinc-600 text-xs italic">"Este Rider todavía no cargó su biografía de patín..."</p>
            )}

            <div className="flex gap-4 pt-4">
              {selectedRider.instagram ? (
                <a 
                  href={`https://instagram.com/${selectedRider.instagram.replace('@', '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-wider border border-zinc-800 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <InstagramIcon size={16} /> Instagram
                </a>
              ) : (
                <div className="flex-grow text-[9px] font-black uppercase text-zinc-700 py-3 border border-zinc-900 rounded-xl">Sin Instagram</div>
              )}
              {selectedRider.whatsapp ? (
                <a 
                  href={`https://wa.me/${selectedRider.whatsapp.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-3.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-red-600/25 cursor-pointer"
                >
                  <WhatsAppIcon size={16} /> WhatsApp
                </a>
              ) : (
                <div className="flex-grow text-[9px] font-black uppercase text-zinc-700 py-3 border border-zinc-900 rounded-xl">Sin WhatsApp</div>
              )}
            </div>

            {isUserAdmin && (
              <div className="pt-4 border-t border-zinc-900/60">
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setAdminEditingRiderData(selectedRider);
                    setIsEditingRiderByAdmin(true);
                  }} 
                  className="w-full py-4 text-xs"
                >
                  <Edit3 size={16} /> EDITAR RIDER (ADMIN)
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edición de Spot por Administrador - Full Imagenes y Direcciones */}
      {}
      {isEditingSpotByAdmin && adminEditingSpotData && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 backdrop-blur-md bg-black/95 overflow-y-auto">
          <div className="bg-zinc-950 border border-red-600 p-8 rounded-[2rem] w-full max-w-lg shadow-2xl my-8 relative">
            <button onClick={() => setIsEditingSpotByAdmin(false)} className="absolute top-6 right-6 z-[260] bg-red-600 p-4 rounded-full"><X size={24} className="text-white" /></button>
            <h3 className="text-3xl font-black italic uppercase mb-8 text-white">Editar <span className="text-red-600">Spot</span></h3>
            
            <form onSubmit={handleAdminSaveSpot} className="space-y-6">
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider">Nombre del Spot</label>
                <input required className="w-full bg-zinc-900 p-4 rounded-xl text-white border border-transparent focus:border-red-600 outline-none" placeholder="Nombre" value={adminEditingSpotData.title} onChange={e => setAdminEditingSpotData({...adminEditingSpotData, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider">Ciudad</label>
                  <input className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none" placeholder="Ciudad" value={adminEditingSpotData.city} onChange={e => setAdminEditingSpotData({...adminEditingSpotData, city: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider">Provincia</label>
                  <select className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none" value={adminEditingSpotData.province} onChange={e => setAdminEditingSpotData({...adminEditingSpotData, province: e.target.value})}>{PROVINCIAS_ARGENTINA.map(p => <option key={p} value={p}>{p}</option>)}</select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider">Obstáculo Principal</label>
                <select className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none" value={adminEditingSpotData.type} onChange={e => setAdminEditingSpotData({...adminEditingSpotData, type: e.target.value})}>{SPOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider">Descripción</label>
                <textarea className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none h-24 text-xs" placeholder="Descripción..." value={adminEditingSpotData.description} onChange={e => setAdminEditingSpotData({...adminEditingSpotData, description: e.target.value})} />
              </div>

              {/* Modificación de Imágenes del Spot (Cambiar y Borrar) */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider">Modificar Imágenes (Max 4)</label>
                <div className="grid grid-cols-4 gap-2">
                  {adminEditingSpotData.images.map((img, i) => (
                    <div key={i} className="relative h-20 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center overflow-hidden group/img">
                      {img ? (
                        <>
                          <img src={img} className="w-full h-full object-cover" alt={`Edit Slot ${i}`} />
                          <button 
                            type="button" 
                            onClick={() => {
                              const clearedImgs = [...adminEditingSpotData.images];
                              clearedImgs[i] = '';
                              setAdminEditingSpotData({ ...adminEditingSpotData, images: clearedImgs });
                            }} 
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 p-1 rounded-full text-white shadow-md active:scale-90 transition-all opacity-0 group-hover/img:opacity-100"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <div className="relative w-full h-full flex flex-col items-center justify-center cursor-pointer">
                          <Camera size={18} className="text-zinc-600 mb-1" />
                          <span className="text-[8px] font-black uppercase text-zinc-500">Subir</span>
                          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, i, 'admin_spot')} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Modificación interactiva de Dirección y Coordenadas */}
              <div className="space-y-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider">Ubicación y Coordenadas</label>
                <div className="flex gap-2">
                  <input className="flex-1 bg-zinc-950 p-3 rounded-lg text-xs outline-none focus:ring-1 ring-red-600 text-white" placeholder="Buscar nueva dirección..." onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAdminSearchAddress(e.target.value))} />
                  <Button type="button" onClick={handleAdminGetCurrentLocation} className="p-3"><Zap size={14} /></Button>
                </div>
                <div ref={adminMapContainerRef} className="h-[200px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-800 z-10" />
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[8px] font-black uppercase text-zinc-500 mb-1">Latitud</label>
                    <input 
                      type="number" 
                      step="any"
                      className="w-full bg-zinc-950 p-3 rounded-lg text-white outline-none border border-zinc-800 focus:border-red-600" 
                      value={adminEditingSpotData.lat || ''} 
                      onChange={e => setAdminEditingSpotData({...adminEditingSpotData, lat: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black uppercase text-zinc-500 mb-1">Longitud</label>
                    <input 
                      type="number" 
                      step="any"
                      className="w-full bg-zinc-950 p-3 rounded-lg text-white outline-none border border-zinc-800 focus:border-red-600" 
                      value={adminEditingSpotData.lng || ''} 
                      onChange={e => setAdminEditingSpotData({...adminEditingSpotData, lng: e.target.value})} 
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full py-5" isLoading={isLoading}>ACTUALIZAR SPOT</Button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edición Rider por Admin */}
      {isEditingRiderByAdmin && adminEditingRiderData && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 backdrop-blur-md bg-black/95 overflow-y-auto">
          <div className="bg-zinc-950 border border-red-600 p-8 rounded-[2rem] w-full max-w-lg shadow-2xl my-8 relative">
            <button onClick={() => setIsEditingRiderByAdmin(false)} className="absolute top-6 right-6 z-[260] bg-red-600 p-4 rounded-full"><X size={24} className="text-white" /></button>
            <h3 className="text-3xl font-black italic uppercase mb-8 text-white">Editar <span className="text-red-600">Rider</span></h3>
            <form onSubmit={handleAdminSaveRider} className="space-y-6">
              <div className="flex flex-col items-center">
                <label className="relative cursor-pointer group">
                  <div className="w-32 h-32 rounded-[2rem] bg-zinc-900 border-2 border-red-600 flex items-center justify-center overflow-hidden">
                    {adminEditingRiderData.photoUrl ? <img src={adminEditingRiderData.photoUrl} className="w-full h-full object-cover" alt="User" /> : <User size={48} className="text-red-600" />}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 0, 'admin_rider')} />
                  <div className="absolute -bottom-2 -right-2 bg-red-600 p-3 rounded-full"><Camera size={14} className="text-white"/></div>
                </label>
              </div>
              <input required className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none focus:ring-1 ring-red-600" placeholder="Alias" value={adminEditingRiderData.name} onChange={e => setAdminEditingRiderData({...adminEditingRiderData, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none" placeholder="Ciudad" value={adminEditingRiderData.city} onChange={e => setAdminEditingRiderData({...adminEditingRiderData, city: e.target.value})} />
                <select className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none" value={adminEditingRiderData.province} onChange={e => setAdminEditingRiderData({...adminEditingRiderData, province: e.target.value})}>{PROVINCIAS_ARGENTINA.map(p => <option key={p} value={p}>{p}</option>)}</select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full bg-zinc-900 p-4 rounded-xl text-white text-xs outline-none" placeholder="Instagram" value={adminEditingRiderData.instagram || ''} onChange={e => setAdminEditingRiderData({...adminEditingRiderData, instagram: e.target.value})} />
                <input className="w-full bg-zinc-900 p-4 rounded-xl text-white text-xs outline-none" placeholder="WhatsApp" value={adminEditingRiderData.whatsapp || ''} onChange={e => setAdminEditingRiderData({...adminEditingRiderData, whatsapp: e.target.value})} />
              </div>
              <textarea className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none h-24 text-xs" placeholder="Biografía..." value={adminEditingRiderData.bio || ''} onChange={e => setAdminEditingRiderData({...adminEditingRiderData, bio: e.target.value})} />
              <Button type="submit" className="w-full py-5" isLoading={isLoading}>ACTUALIZAR PERFIL RIDER</Button>
            </form>
          </div>
        </div>
      )}

      {/* Perfil del Rider */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/95 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-lg shadow-2xl my-8 relative">
            <button onClick={() => setIsEditingProfile(false)} className="absolute top-6 right-6 z-[210] bg-red-600 p-4 rounded-full"><X size={24} className="text-white" /></button>
            <h3 className="text-3xl font-black italic uppercase mb-8 text-white">Mi <span className="text-red-600">Perfil</span></h3>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex flex-col items-center">
                <label className="relative cursor-pointer group">
                  <div className="w-32 h-32 rounded-[2rem] bg-zinc-900 border-2 border-red-600 flex items-center justify-center overflow-hidden shadow-lg transition-transform group-active:scale-95">
                    {editProfile.photoUrl ? <img src={editProfile.photoUrl} className="w-full h-full object-cover" alt="Me" /> : <User size={48} className="text-red-600" />}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 0, 'profile')} />
                  <div className="absolute -bottom-2 -right-2 bg-red-600 p-3 rounded-full shadow-xl"><Camera size={14} className="text-white"/></div>
                </label>
              </div>
              <input required className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none focus:ring-1 ring-red-600" placeholder="Alias / Nombre" value={editProfile.name} onChange={e => setEditProfile({...editProfile, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none" placeholder="Ciudad" value={editProfile.city} onChange={e => setEditProfile({...editProfile, city: e.target.value})} />
                <select className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none" value={editProfile.province} onChange={e => setEditProfile({...editProfile, province: e.target.value})}>{PROVINCIAS_ARGENTINA.map(p => <option key={p} value={p}>{p}</option>)}</select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full bg-zinc-900 p-4 rounded-xl text-white text-xs outline-none" placeholder="Instagram (sin @)" value={editProfile.instagram} onChange={e => setEditProfile({...editProfile, instagram: e.target.value})} />
                <input className="w-full bg-zinc-900 p-4 rounded-xl text-white text-xs outline-none" placeholder="WhatsApp (formato internacional)" value={editProfile.whatsapp} onChange={e => setEditProfile({...editProfile, whatsapp: e.target.value})} />
              </div>
              <textarea className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none h-24 text-xs" placeholder="Breve biografía..." value={editProfile.bio} onChange={e => setEditProfile({...editProfile, bio: e.target.value})} />
              
              {user.email === ROOT_ADMIN && (
                <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-2xl space-y-4">
                  <p className="text-[9px] font-black uppercase text-red-600 tracking-widest">Root Control</p>
                  <input className="w-full bg-black p-3 rounded-lg text-xs text-white" placeholder="Mails Admins (coma)" value={adminEmailsInput} onChange={e => setAdminEmailsInput(e.target.value)} />
                  <input className="w-full bg-black p-3 rounded-lg text-xs text-white" placeholder="URL Logo Principal" value={editLogoUrl} onChange={e => setEditLogoUrl(e.target.value)} />
                </div>
              )}
              
              <div className="flex flex-col gap-3 pt-4">
                <Button type="submit" className="w-full py-5" isLoading={isLoading}>GUARDAR CAMBIOS</Button>
                <button type="button" onClick={() => signOut(auth)} className="w-full text-zinc-500 hover:text-red-600 text-[10px] font-black uppercase py-4 transition-colors">Cerrar Sesión</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Video */}
      {isAddingVideo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/80">
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative text-white">
            <button onClick={() => setIsAddingVideo(false)} className="absolute top-6 right-6 z-[210] bg-red-600 p-4 rounded-full"><X size={24}/></button>
            <h3 className="text-2xl font-black italic uppercase mb-6">Subir <span className="text-red-600">Video</span></h3>
            <form onSubmit={handleAddVideo} className="space-y-4">
              <input required className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none" placeholder="Título del Video" value={newVideo.title} onChange={e => setNewVideo({...newVideo, title: e.target.value})} />
              <input required className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none" placeholder="Link de YouTube" value={newVideo.youtubeUrl} onChange={e => setNewVideo({...newVideo, youtubeUrl: e.target.value})} />
              <Button type="submit" className="w-full py-4" isLoading={isLoading}>PUBLICAR MEDIA</Button>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Imagen en Pantalla Completa */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 cursor-zoom-out animate-fadeIn"
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            onClick={() => setFullscreenImage(null)} 
            className="absolute top-6 right-6 z-[310] bg-red-600 p-4 rounded-full border border-white/20 active:scale-95 transition-all cursor-pointer"
          >
            <X size={24} className="text-white" />
          </button>
          <img 
            src={fullscreenImage} 
            className="max-w-full max-h-[90vh] md:max-h-[85vh] object-contain rounded-xl shadow-2xl border border-zinc-800/80" 
            alt="Spot Full View" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

    </div>
  );
}