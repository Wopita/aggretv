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
  Loader2, Trash2, Edit3, Map as MapIcon, AlertTriangle
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

const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  if (!images || images.length === 0) return (
    <div className="w-full h-full flex flex-col items-center justify-center opacity-20 bg-zinc-900 min-h-[200px]">
      <ImageIcon size={48} />
      <span className="text-[10px] font-black uppercase mt-2 tracking-widest text-white">Sin Imágenes</span>
    </div>
  );

  return (
    <div className="relative w-full h-64 group/carousel overflow-hidden bg-black">
      <img src={images[currentIndex]} className="w-full h-full object-cover" alt="Spot View" />
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
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [selectedRider, setSelectedRider] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [provinceFilter, setProvinceFilter] = useState('All');

  const [newSpot, setNewSpot] = useState({ title: '', city: '', province: 'Neuquén', type: 'Skatepark', description: '', images: ['', '', '', ''], lat: '', lng: '' });
  const [newVideo, setNewVideo] = useState({ title: '', youtubeUrl: '' });
  const [editProfile, setEditProfile] = useState({ name: '', city: '', province: 'Neuquén', instagram: '', whatsapp: '', bio: '', photoUrl: '' });
  const [adminEditingRiderData, setAdminEditingRiderData] = useState(null);
  
  const [adminEmailsInput, setAdminEmailsInput] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

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
            {['explore', 'riders', 'videos'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-red-600 border-b-2 border-red-600 pb-1' : 'text-zinc-500 hover:text-white'}`}>{tab === 'explore' ? 'Spots' : tab === 'videos' ? 'Videos' : 'Riders'}</button>
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[150] bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 px-6 py-4 flex justify-around items-center">
        <button onClick={() => setActiveTab('explore')} className={`flex flex-col items-center gap-1 ${activeTab === 'explore' ? 'text-red-600' : 'text-zinc-500'}`}><MapPin size={24}/><span className="text-[10px] font-black uppercase">Spots</span></button>
        <button onClick={() => setActiveTab('riders')} className={`flex flex-col items-center gap-1 ${activeTab === 'riders' ? 'text-red-600' : 'text-zinc-500'}`}><Users size={24}/><span className="text-[10px] font-black uppercase">Riders</span></button>
        <button onClick={() => setActiveTab('videos')} className={`flex flex-col items-center gap-1 ${activeTab === 'videos' ? 'text-red-600' : 'text-zinc-500'}`}><Video size={24}/><span className="text-[10px] font-black uppercase">Videos</span></button>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {}
        <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-16 border-l-4 border-red-600 pl-6">
          <div className="space-y-2">
            <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">{activeTab === 'explore' ? 'Spots' : activeTab === 'riders' ? 'Riders' : 'Videos'}</h2>
            <p className="text-zinc-500 text-xs font-black flex items-center gap-2 uppercase tracking-widest"><Globe size={14} className="text-red-600" /> Argentina / {provinceFilter === 'All' ? 'Nacional' : provinceFilter}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {activeTab !== 'videos' && (
              <select className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-2 ring-red-600 text-white" value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)}>
                <option value="All">🇦🇷 Filtrar Provincia</option>
                {PROVINCIAS_ARGENTINA.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {user && activeTab === 'explore' && <Button onClick={() => setIsAddingSpot(true)}><Plus size={20}/> SUMAR SPOT</Button>}
            {user && activeTab === 'videos' && <Button onClick={() => setIsAddingVideo(true)}><Video size={20}/> SUBIR VIDEO</Button>}
          </div>
        </div>

        {}
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

        {}
        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {videos.map(vid => (
               <div key={vid.id} className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden relative">
                  {isUserAdmin && <button onClick={() => deleteDoc(doc(db, 'videos', vid.id))} className="absolute top-4 right-4 z-10 bg-black/60 p-2 rounded-full text-red-600 hover:bg-red-600 hover:text-white transition-colors"><Trash2 size={16} /></button>}
                  <div className="aspect-video">
                    <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${vid.videoId}`} frameBorder="0" allowFullScreen title={vid.title}></iframe>
                  </div>
                  <div className="p-6 flex justify-between items-center">
                    <h4 className="font-black uppercase italic text-xl text-white">{vid.title}</h4>
                    <p className="text-[9px] font-black text-zinc-500 uppercase">RIDER: {vid.creatorName}</p>
                  </div>
               </div>
            ))}
          </div>
        )}
      </main>

      {}
      {selectedSpot && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/90 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-2xl relative my-8">
            <button onClick={() => setSelectedSpot(null)} className="absolute top-6 right-6 z-20 bg-red-600 p-4 rounded-full border border-white/20"><X size={24} className="text-white" /></button>
            <div className="rounded-2xl overflow-hidden mb-8 shadow-2xl">
               <ImageCarousel images={selectedSpot.images} />
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
                 {isUserAdmin && <Button variant="danger" onClick={() => { deleteDoc(doc(db, 'spots', selectedSpot.id)); setSelectedSpot(null); }} className="w-14 p-0"><Trash2 size={20} /></Button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {selectedRider && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/95 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 p-10 rounded-[3rem] w-full max-w-md relative text-center">
            <button onClick={() => setSelectedRider(null)} className="absolute top-6 right-6 bg-red-600 p-4 rounded-full"><X size={20} className="text-white" /></button>
            <div className="w-40 h-40 mx-auto bg-zinc-900 border-4 border-red-600 rounded-[2.5rem] mb-8 overflow-hidden shadow-2xl">
              {selectedRider.photoUrl ? <img src={selectedRider.photoUrl} className="w-full h-full object-cover" alt="Detail" /> : <User size={80} className="text-zinc-700 w-full h-full p-8" />}
            </div>
            <h3 className="text-3xl font-black italic uppercase text-white leading-none">{selectedRider.name}</h3>
            <p className="text-red-600 text-[10px] font-black uppercase tracking-[0.2em] mt-3">{selectedRider.city} • {selectedRider.province}</p>
            <p className="text-zinc-400 text-sm mt-6 mb-8 italic">"{selectedRider.bio || 'Sin biografía...'}"</p>
            <div className="flex gap-4">
              {selectedRider.instagram && <Button variant="secondary" className="flex-1" onClick={() => window.open(`https://instagram.com/${selectedRider.instagram}`, '_blank')}><InstagramIcon size={18}/> IG</Button>}
              {selectedRider.whatsapp && <Button variant="secondary" className="flex-1" onClick={() => window.open(`https://wa.me/${selectedRider.whatsapp}`, '_blank')}><WhatsAppIcon size={18}/> WSP</Button>}
            </div>
            {isUserAdmin && (
              <div className="pt-8 border-t border-zinc-900 mt-8 space-y-4">
                <p className="text-[10px] font-black uppercase text-red-600 tracking-widest">Controles de Administrador</p>
                <div className="flex gap-3">
                  <Button variant="primary" className="flex-1" onClick={() => { setAdminEditingRiderData(selectedRider); setIsEditingRiderByAdmin(true); }}>EDITAR RIDER</Button>
                  <Button variant="danger" className="w-14" onClick={() => { deleteDoc(doc(db, 'profiles', selectedRider.id)); setSelectedRider(null); }}><Trash2 size={20} /></Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {}
      {isAddingSpot && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/80 overflow-y-auto">
          <div className="bg-zinc-950 border border-red-600/30 p-8 rounded-[2rem] w-full max-w-lg shadow-2xl my-8 relative">
            <button onClick={() => setIsAddingSpot(false)} className="absolute top-6 right-6 z-[210] bg-red-600 p-4 rounded-full border border-white/20"><X size={24} className="text-white" /></button>
            <h3 className="text-3xl font-black italic uppercase text-white mb-6">Nuevo <span className="text-red-600">Spot</span></h3>
            <form onSubmit={handleAddSpot} className="space-y-5">
              <input required className="w-full bg-zinc-900 p-4 rounded-xl text-white border border-transparent focus:border-red-600 outline-none" placeholder="Nombre" value={newSpot.title} onChange={e => setNewSpot({...newSpot, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input required className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none" placeholder="Ciudad" value={newSpot.city} onChange={e => setNewSpot({...newSpot, city: e.target.value})} />
                <select className="bg-zinc-900 p-4 rounded-xl text-white outline-none" value={newSpot.province} onChange={e => setNewSpot({...newSpot, province: e.target.value})}>{PROVINCIAS_ARGENTINA.map(p => <option key={p} value={p}>{p}</option>)}</select>
              </div>
              <textarea className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none h-24 text-sm" placeholder="Detalles de seguridad, piso, etc..." value={newSpot.description} onChange={e => setNewSpot({...newSpot, description: e.target.value})} />
              
              <div className="space-y-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                <div className="flex gap-2">
                  <input className="flex-1 bg-zinc-950 p-3 rounded-lg text-xs outline-none focus:ring-1 ring-red-600" placeholder="Buscar dirección..." onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleSearchAddress(e.target.value))} />
                  <Button type="button" onClick={handleGetCurrentLocation} className="p-3"><Zap size={14} /></Button>
                </div>
                <div ref={mapContainerRef} className="h-[250px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-800" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {newSpot.images.map((img, i) => (
                  <div key={i} className="relative h-20 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
                    {img ? <img src={img} className="w-full h-full object-cover" alt="Upload" /> : <Camera size={20} className="text-zinc-600" />}
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, i, 'spot')} />
                  </div>
                ))}
              </div>
              <Button type="submit" className="w-full py-5 text-sm" isLoading={isLoading}>PUBLICAR SPOT</Button>
            </form>
          </div>
        </div>
      )}

      {}
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

      { }
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

      {}
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
    </div>
  );
}