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
  ThumbsUp, X, MessageCircle, PlayCircle, ShieldCheck, Camera,
  Settings, ChevronLeft, ChevronRight, Zap, Globe, AlertCircle, Loader2, Trash2, Edit3
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
const CITIES_ARGENTINA = [
  "Neuquén Capital", "General Roca", "Buenos Aires", "Córdoba", "Rosario", 
  "Mendoza", "Tucumán", "La Plata", "Mar del Plata", "Bariloche", "Cipolletti", "Plottier"
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
    <div className="w-full h-full min-h-[250px] flex flex-col items-center justify-center opacity-20 bg-zinc-900">
      <ImageIcon size={48} />
      <span className="text-[10px] font-black uppercase mt-2">Sin Imágenes</span>
    </div>
  );

  return (
    <div className="relative w-full h-full min-h-[250px] group/carousel overflow-hidden bg-black rounded-t-2xl">
      <img src={images[currentIndex]} className="w-full h-full object-cover" alt="Spot" />
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev - 1 + images.length) % images.length)}} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 p-3 rounded-full hover:bg-red-600 transition-colors z-10">
            <ChevronLeft size={20} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev + 1) % images.length)}} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 p-3 rounded-full hover:bg-red-600 transition-colors z-10">
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
            {images.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === currentIndex ? 'w-4 bg-red-600' : 'w-1 bg-white/40'}`} />
            ))}
          </div>
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
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [selectedRider, setSelectedRider] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [cityFilter, setCityFilter] = useState('All');

  const [newSpot, setNewSpot] = useState({ title: '', city: 'Neuquén Capital', type: 'Skatepark', description: '', images: ['', '', '', ''], lat: '', lng: '' });
  const [newVideo, setNewVideo] = useState({ title: '', youtubeUrl: '' });
  const [editProfile, setEditProfile] = useState({ name: '', city: 'Neuquén Capital', instagram: '', whatsapp: '', bio: '', photoUrl: '' });
  
  const [adminEmailsInput, setAdminEmailsInput] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');

  const [searchAddress, setSearchAddress] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const isUserAdmin = useMemo(() => {
    if (!user) return false;
    if (user.email === ROOT_ADMIN) return true;
    const extraAdmins = (appSettings.adminList || "").split(",").map(e => e.trim().toLowerCase());
    return extraAdmins.includes(user.email?.toLowerCase());
  }, [user, appSettings.adminList]);

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
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // Compresión 60%
          resolve(dataUrl);
        };
      };
    });
  };

  const handleImageUpload = async (e, index, isSpot = true) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);
    const compressed = await compressImage(file);
    if (isSpot) {
      const newImgs = [...newSpot.images];
      newImgs[index] = compressed;
      setNewSpot({ ...newSpot, images: newImgs });
    } else {
      setEditProfile({ ...editProfile, photoUrl: compressed });
    }
    setIsLoading(false);
  };

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
          const initialData = { name: u.displayName || 'Rider', city: 'Neuquén Capital', uid: u.uid, photoUrl: u.photoURL || '' };
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

  const handleSearchAddress = async () => {
    if (!searchAddress || !window.L) return;
    setSearchStatus('Buscando...');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const pos = [parseFloat(lat), parseFloat(lon)];
        mapRef.current.setView(pos, 16);
        markerRef.current.setLatLng(pos);
        setNewSpot(prev => ({ ...prev, lat: lat, lng: lon }));
        setSearchStatus('Ubicación fijada ✓');
      } else {
        setSearchStatus('No se encontró');
      }
    } catch (e) { setSearchStatus('Error'); }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return setSearchStatus('GPS no soportado');
    setSearchStatus('Capturando...');
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const coords = [latitude, longitude];
      mapRef.current.setView(coords, 16);
      markerRef.current.setLatLng(coords);
      setNewSpot(prev => ({ ...prev, lat: latitude.toFixed(6), lng: longitude.toFixed(6) }));
      setSearchStatus('GPS fijado ✓');
    }, () => setSearchStatus('Error GPS'));
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
      setNewSpot({ title: '', city: 'Neuquén Capital', type: 'Skatepark', description: '', images: ['', '', '', ''], lat: '', lng: '' });
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = newVideo.youtubeUrl.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : null;
      if (!videoId) return;
      await addDoc(collection(db, 'videos'), {
        ...newVideo,
        videoId,
        creatorId: user.uid,
        creatorName: userProfile?.name || 'Rider',
        createdAt: new Date().toISOString()
      });
      setIsAddingVideo(false);
      setNewVideo({ title: '', youtubeUrl: '' });
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
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

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-600 pb-24 font-sans">
      
      {/* Navegación Fija Desktop */}
      <nav className="sticky top-0 z-[100] bg-black/95 border-b border-zinc-900 px-6 py-4 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('explore')}>
            {appSettings.logoUrl ? <img src={appSettings.logoUrl} className="h-10 rounded-lg" alt="Logo" /> : <div className="bg-red-600 p-2 rounded-xl"><Navigation size={22} /></div>}
            <h1 className="text-2xl font-black italic uppercase tracking-tighter">AGGRETV</h1>
          </div>
          
          <div className="hidden md:flex gap-8">
            {['explore', 'riders', 'videos'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-red-600 border-b-2 border-red-600 pb-1' : 'text-zinc-500 hover:text-white'}`}>{tab === 'explore' ? 'Spots' : tab === 'videos' ? 'Videos' : 'Riders'}</button>
            ))}
          </div>

          {!user ? (
            <Button onClick={() => signInWithPopup(auth, provider)} className="text-[10px] py-2">Login</Button>
          ) : (
            <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[9px] font-black text-red-600 uppercase">Rider</p>
                <p className="text-xs font-bold">{userProfile?.name}</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-red-600 p-0.5 overflow-hidden bg-zinc-900">
                <img src={userProfile?.photoUrl || user.photoURL} className="rounded-full w-full h-full object-cover" alt="avatar" />
              </div>
            </button>
          )}
        </div>
      </nav>

      {/* Navegación Mobile Barra Inferior */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[150] bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 px-6 py-4 flex justify-around items-center">
        <button onClick={() => setActiveTab('explore')} className={`flex flex-col items-center gap-1 ${activeTab === 'explore' ? 'text-red-600' : 'text-zinc-500'}`}>
          <MapPin size={24} />
          <span className="text-[10px] font-black uppercase">Spots</span>
        </button>
        <button onClick={() => setActiveTab('riders')} className={`flex flex-col items-center gap-1 ${activeTab === 'riders' ? 'text-red-600' : 'text-zinc-500'}`}>
          <Users size={24} />
          <span className="text-[10px] font-black uppercase">Riders</span>
        </button>
        <button onClick={() => setActiveTab('videos')} className={`flex flex-col items-center gap-1 ${activeTab === 'videos' ? 'text-red-600' : 'text-zinc-500'}`}>
          <Video size={24} />
          <span className="text-[10px] font-black uppercase">Videos</span>
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-16 border-l-4 border-red-600 pl-6">
          <div className="space-y-2">
            <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">{activeTab === 'explore' ? 'Spots' : activeTab === 'riders' ? 'Riders' : 'Videos'}</h2>
            <p className="text-zinc-500 text-xs font-black flex items-center gap-2 uppercase tracking-widest"><Globe size={14} className="text-red-600" /> Argentina / {cityFilter}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <select className="bg-zinc-900 p-4 rounded-xl text-xs font-black uppercase outline-none border border-zinc-800" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
              <option value="All">🇦🇷 Ciudad</option>
              {CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {user && activeTab === 'explore' && <Button onClick={() => setIsAddingSpot(true)}><Plus size={20}/> SUMAR SPOT</Button>}
            {user && activeTab === 'videos' && <Button onClick={() => setIsAddingVideo(true)}><Video size={20}/> SUBIR VIDEO</Button>}
          </div>
        </div>

        {}
        {activeTab === 'explore' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {spots.filter(s => cityFilter === 'All' || s.city === cityFilter).map(spot => (
              <div key={spot.id} onClick={() => setSelectedSpot(spot)} className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden group hover:border-red-600 transition-all cursor-pointer">
                <div className="h-56"><ImageCarousel images={spot.images} /></div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-black uppercase italic group-hover:text-red-600 transition-colors leading-tight">{spot.title}</h3>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); updateDoc(doc(db, 'spots', spot.id), { votesUp: increment(1) }) }} className="bg-zinc-900 p-2 rounded-lg text-xs font-black flex items-center gap-2 hover:bg-red-600 transition-colors">
                        <ThumbsUp size={14} /> {spot.votesUp || 0}
                      </button>
                      {isUserAdmin && <button onClick={(e) => { e.stopPropagation(); if(confirm('¿Borrar?')) deleteDoc(doc(db, 'spots', spot.id)) }} className="bg-red-900/40 p-2 rounded-lg hover:bg-red-600"><Trash2 size={14}/></button>}
                    </div>
                  </div>
                  <p className="text-zinc-500 text-[10px] font-black uppercase flex items-center gap-2"><MapPin size={12} className="text-red-600" /> {spot.city}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'riders' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {riders.filter(r => cityFilter === 'All' || r.city === cityFilter).map(rider => (
              <div key={rider.uid} onClick={() => setSelectedRider(rider)} className="bg-zinc-950 border border-zinc-900 p-8 rounded-2xl text-center space-y-4 hover:border-red-600 transition-all group cursor-pointer">
                <div className="w-24 h-24 mx-auto bg-zinc-900 border-2 border-red-600 rounded-3xl flex items-center justify-center overflow-hidden">
                   {rider.photoUrl ? <img src={rider.photoUrl} className="w-full h-full object-cover" /> : <User size={40} className="text-red-600" />}
                </div>
                <div>
                  <h4 className="font-black italic uppercase text-lg">{rider.name}</h4>
                  <p className="text-zinc-500 text-[9px] font-black uppercase mt-1">{rider.city}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {videos.map(vid => (
               <div key={vid.id} className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden relative group">
                  {isUserAdmin && <button onClick={() => deleteDoc(doc(db, 'videos', vid.id))} className="absolute top-4 right-4 z-10 bg-red-600 p-2 rounded-lg hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>}
                  <div className="aspect-video bg-black">
                    <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${vid.videoId}`} frameBorder="0" allowFullScreen title={vid.title}></iframe>
                  </div>
                  <div className="p-6">
                    <h4 className="font-black uppercase italic text-xl">{vid.title}</h4>
                    <p className="text-zinc-500 text-[9px] font-black uppercase mt-2">Rider: {vid.creatorName}</p>
                  </div>
               </div>
            ))}
          </div>
        )}
      </main>

      {}
      {selectedSpot && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl bg-black/90">
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button onClick={() => setSelectedSpot(null)} className="fixed top-6 right-6 z-[210] bg-red-600 p-4 rounded-full shadow-2xl border border-white/20 active:scale-90 transition-all"><X size={24} className="text-white" /></button>
            <div className="flex flex-col lg:flex-row h-full">
              <div className="lg:w-3/5 h-[350px] lg:h-auto"><ImageCarousel images={selectedSpot.images} /></div>
              <div className="lg:w-2/5 p-8 lg:p-10 space-y-8">
                <div className="space-y-2">
                  <span className="bg-red-600 text-[9px] font-black px-3 py-1 rounded-md uppercase tracking-tighter">{selectedSpot.type}</span>
                  <h3 className="text-3xl lg:text-4xl font-black italic uppercase leading-none">{selectedSpot.title}</h3>
                  <p className="text-zinc-500 text-xs font-black uppercase flex items-center gap-2"><MapPin size={14} className="text-red-600" /> {selectedSpot.city}</p>
                </div>
                <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800"><p className="text-zinc-400 italic text-sm leading-relaxed">"{selectedSpot.description || 'Sin descripción.'}"</p></div>
                <Button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedSpot.lat},${selectedSpot.lng}`, '_blank')} className="w-full py-4 text-xs">ABRIR EN GOOGLE MAPS</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedRider && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl bg-black/90">
          <div className="bg-zinc-950 border border-zinc-800 p-8 lg:p-10 rounded-[2rem] w-full max-w-lg shadow-2xl relative text-center">
            <button onClick={() => setSelectedRider(null)} className="fixed top-6 right-6 z-[210] bg-red-600 p-4 rounded-full shadow-2xl border border-white/20 active:scale-90 transition-all"><X size={24} className="text-white" /></button>
            <div className="w-32 h-32 mx-auto bg-zinc-900 border-2 border-red-600 rounded-[2rem] flex items-center justify-center overflow-hidden mb-6">
               {selectedRider.photoUrl ? <img src={selectedRider.photoUrl} className="w-full h-full object-cover" /> : <User size={48} className="text-red-600" />}
            </div>
            <div className="space-y-2 mb-8">
              <h3 className="text-3xl lg:text-4xl font-black italic uppercase leading-none">{selectedRider.name}</h3>
              <p className="text-red-600 text-xs font-black uppercase tracking-widest">{selectedRider.city}</p>
            </div>
            <p className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 text-zinc-400 italic text-sm mb-8 leading-relaxed">"{selectedRider.bio || 'Este rider todavía no escribió su bio.'}"</p>
            <div className="flex gap-4">
              {selectedRider.instagram && <Button variant="secondary" onClick={() => window.open(`https://instagram.com/${selectedRider.instagram}`)} className="flex-1 py-4"><InstagramIcon size={20} /> Instagram</Button>}
              {selectedRider.whatsapp && <Button variant="secondary" onClick={() => window.open(`https://wa.me/${selectedRider.whatsapp}`)} className="flex-1 py-4"><WhatsAppIcon size={20} /> WhatsApp</Button>}
            </div>
          </div>
        </div>
      )}

      {}
      {isAddingSpot && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/80 overflow-y-auto">
          <div className="bg-zinc-950 border border-red-600/30 p-8 rounded-[2rem] w-full max-w-lg shadow-2xl my-8 relative">
            <button onClick={() => setIsAddingSpot(false)} className="fixed top-6 right-6 z-[210] bg-red-600 p-4 rounded-full border border-white/20"><X size={24} className="text-white" /></button>
            <h3 className="text-3xl font-black italic uppercase text-white mb-6">Nuevo <span className="text-red-600">Spot</span></h3>
            <form onSubmit={handleAddSpot} className="space-y-5">
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none text-white border border-zinc-800" placeholder="Nombre" value={newSpot.title} onChange={e => setNewSpot({...newSpot, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-zinc-900 p-4 rounded-xl text-white border border-zinc-800" value={newSpot.city} onChange={e => setNewSpot({...newSpot, city: e.target.value})}>{CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select className="bg-zinc-900 p-4 rounded-xl text-white border border-zinc-800" value={newSpot.type} onChange={e => setNewSpot({...newSpot, type: e.target.value})}>{["Skatepark", "Baranda", "Borde", "Escaleras", "Piso Liso"].map(t => <option key={t} value={t}>{t}</option>)}</select>
              </div>
              <textarea className="w-full bg-zinc-900 p-4 rounded-xl outline-none border border-zinc-800 h-24 text-xs" placeholder="Detalles..." value={newSpot.description} onChange={e => setNewSpot({...newSpot, description: e.target.value})} />
              
              <div className="bg-zinc-900/50 p-4 rounded-2xl space-y-3 border border-zinc-800">
                <div className="flex gap-2">
                  <input className="flex-1 bg-black border border-zinc-800 p-3 rounded-xl text-xs outline-none" placeholder="Buscar dirección..." value={searchAddress} onChange={e => setSearchAddress(e.target.value)} />
                  <button type="button" onClick={handleSearchAddress} className="bg-red-600 p-3 rounded-xl"><Search size={16}/></button>
                </div>
                <div ref={mapContainerRef} className="h-[200px] rounded-xl overflow-hidden border border-zinc-800" />
                <button type="button" onClick={handleGetCurrentLocation} className="w-full py-3 bg-zinc-800 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><Zap size={14} className="text-red-600" /> Mi GPS</button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Fotos (Captura desde cámara)</p>
                <div className="grid grid-cols-2 gap-2">
                  {newSpot.images.map((img, i) => (
                    <div key={i} className="relative group/img">
                      {img ? (
                        <div className="relative h-20 rounded-lg overflow-hidden">
                          <img src={img} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => { const ims = [...newSpot.images]; ims[i] = ''; setNewSpot({...newSpot, images: ims})}} className="absolute inset-0 bg-red-600/80 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"><X size={16}/></button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-20 bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-lg cursor-pointer hover:border-red-600 transition-all">
                          <Camera size={20} className="text-zinc-600" />
                          <span className="text-[8px] font-black uppercase text-zinc-600 mt-1">Foto {i+1}</span>
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImageUpload(e, i, true)} />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full py-5 text-sm" isLoading={isLoading}>PUBLICAR SPOT</Button>
            </form>
          </div>
        </div>
      )}

      {isEditingProfile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/95 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 p-8 lg:p-10 rounded-[2rem] w-full max-w-lg shadow-2xl my-8 relative">
            <button onClick={() => setIsEditingProfile(false)} className="fixed top-6 right-6 z-[210] bg-red-600 p-4 rounded-full border border-white/20"><X size={24} className="text-white" /></button>
            <h3 className="text-3xl font-black italic uppercase mb-8">Mi <span className="text-red-600">Perfil</span></h3>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex flex-col items-center mb-6">
                <label className="relative cursor-pointer group/avatar">
                  <div className="w-32 h-32 rounded-[2rem] bg-zinc-900 border-2 border-red-600 flex items-center justify-center overflow-hidden">
                    {editProfile.photoUrl ? <img src={editProfile.photoUrl} className="w-full h-full object-cover" /> : <User size={48} className="text-red-600" />}
                  </div>
                  <div className="absolute inset-0 bg-red-600/60 rounded-[2rem] flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                  </div>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImageUpload(e, 0, false)} />
                </label>
                <span className="text-[9px] font-black uppercase text-zinc-500 mt-3 tracking-widest">Toca para cambiar foto</span>
              </div>
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none border border-zinc-800" placeholder="Alias" value={editProfile.name} onChange={e => setEditProfile({...editProfile, name: e.target.value})} />
              <select className="w-full bg-zinc-900 p-4 rounded-xl outline-none border border-zinc-800" value={editProfile.city} onChange={e => setEditProfile({...editProfile, city: e.target.value})}>{CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full bg-zinc-900 p-4 rounded-xl outline-none border border-zinc-800 text-xs" placeholder="@rider" value={editProfile.instagram} onChange={e => setEditProfile({...editProfile, instagram: e.target.value})} />
                <input className="w-full bg-zinc-900 p-4 rounded-xl outline-none border border-zinc-800 text-xs" placeholder="WhatsApp" value={editProfile.whatsapp} onChange={e => setEditProfile({...editProfile, whatsapp: e.target.value})} />
              </div>
              <textarea className="w-full bg-zinc-900 p-4 rounded-xl outline-none border border-zinc-800 h-24 text-xs" placeholder="Bio..." value={editProfile.bio} onChange={e => setEditProfile({...editProfile, bio: e.target.value})} />
              {user.email === ROOT_ADMIN && (
                <div className="p-4 bg-red-950/20 border border-red-900 rounded-2xl space-y-4">
                  <p className="text-[10px] font-black uppercase text-red-600">Admin Panel</p>
                  <input className="w-full bg-black p-3 rounded-lg text-xs" placeholder="Admins (comma sep)" value={adminEmailsInput} onChange={e => setAdminEmailsInput(e.target.value)} />
                  <input className="w-full bg-black p-3 rounded-lg text-xs" placeholder="Logo URL" value={editLogoUrl} onChange={e => setEditLogoUrl(e.target.value)} />
                </div>
              )}
              <Button type="submit" className="w-full py-5" isLoading={isLoading}>GUARDAR</Button>
              <button type="button" onClick={() => signOut(auth)} className="w-full text-zinc-500 hover:text-red-600 text-[10px] font-black uppercase py-4">Cerrar Sesión</button>
            </form>
          </div>
        </div>
      )}

      {isAddingVideo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/80">
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setIsAddingVideo(false)} className="fixed top-6 right-6 z-[210] bg-red-600 p-4 rounded-full border border-white/20"><X size={24} className="text-white" /></button>
            <h3 className="text-2xl font-black italic uppercase text-white mb-6">Subir <span className="text-red-600">Video</span></h3>
            <form onSubmit={handleAddVideo} className="space-y-4">
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none text-white border border-zinc-800" placeholder="Título" value={newVideo.title} onChange={e => setNewVideo({...newVideo, title: e.target.value})} />
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none text-white border border-zinc-800" placeholder="Link YouTube" value={newVideo.youtubeUrl} onChange={e => setNewVideo({...newVideo, youtubeUrl: e.target.value})} />
              <Button type="submit" className="w-full py-4" isLoading={isLoading}>PUBLICAR</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}