import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, addDoc, onSnapshot, updateDoc, 
  increment, setDoc, getDoc, query, orderBy
} from 'firebase/firestore';
import { 
  MapPin, Plus, Search, Users, Video, Image as ImageIcon, User, Navigation,
  ThumbsUp, X, MessageCircle, PlayCircle, ShieldCheck, 
  Settings, ChevronLeft, ChevronRight, Zap, Globe, AlertCircle, Loader2
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
const SPOT_TYPES = ["Skatepark", "Baranda", "Borde/Murete", "Escaleras", "Rampa/Gap", "Piso Liso"];

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
    <div className="w-full h-64 flex flex-col items-center justify-center opacity-20 bg-zinc-900">
      <ImageIcon size={48} />
      <span className="text-[10px] font-black uppercase mt-2">Sin Imágenes</span>
    </div>
  );

  return (
    <div className="relative w-full h-64 group/carousel overflow-hidden bg-black">
      <img src={images[currentIndex]} className="w-full h-full object-cover" alt="Spot" />
      {images.length > 1 && (
        <>
          <button onClick={() => setCurrentIndex(prev => (prev - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full hover:bg-red-600 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setCurrentIndex(prev => (prev + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full hover:bg-red-600 transition-colors">
            <ChevronRight size={16} />
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
  const [isLoading, setIsLoading] = useState(false);
  const [cityFilter, setCityFilter] = useState('All');
  const [loginError, setLoginError] = useState(null);

  const [newSpot, setNewSpot] = useState({ title: '', city: 'Neuquén Capital', type: 'Skatepark', description: '', images: ['', '', '', ''], lat: '', lng: '' });
  const [newVideo, setNewVideo] = useState({ title: '', youtubeUrl: '' });
  const [editProfile, setEditProfile] = useState({ name: '', city: 'Neuquén Capital', instagram: '', whatsapp: '', bio: '' });
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

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const profileRef = doc(db, 'profiles', u.uid);
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          setUserProfile(snap.data());
          setEditProfile(snap.data());
        } else {
          const initialData = { name: u.displayName || 'Rider', city: 'Neuquén Capital', uid: u.uid };
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
      script.onload = initMap;
      document.head.appendChild(script);
    } else if (isAddingSpot) {
      setTimeout(initMap, 100);
    }
  }, [isAddingSpot]);

  const initMap = () => {
    if (!mapContainerRef.current || !window.L) return;
    if (mapRef.current) return;

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
        setSearchStatus('No se encontró el lugar');
      }
    } catch (e) {
      setSearchStatus('Error en búsqueda');
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return setSearchStatus('GPS no soportado');
    setSearchStatus('Capturando GPS...');
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const coords = [latitude, longitude];
      mapRef.current.setView(coords, 16);
      markerRef.current.setLatLng(coords);
      setNewSpot(prev => ({ ...prev, lat: latitude.toFixed(6), lng: longitude.toFixed(6) }));
      setSearchStatus('Ubicación GPS fijada ✓');
    }, () => {
      setSearchStatus('Error al obtener GPS');
    });
  };

  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);
    try {
      const videoId = extractVideoId(newVideo.youtubeUrl);
      if (!videoId) throw new Error("URL de YouTube inválida");

      await addDoc(collection(db, 'videos'), {
        ...newVideo,
        videoId,
        creatorId: user.uid,
        creatorName: userProfile?.name || 'Rider',
        createdAt: new Date().toISOString()
      });
      
      setNewVideo({ title: '', youtubeUrl: '' });
      setIsAddingVideo(false);
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSpot = async (e) => {
    e.preventDefault();
    if (!newSpot.lat || !newSpot.lng) return setLoginError('⚠️ Buscá una ubicación en el mapa');
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
      mapRef.current = null;
      setNewSpot({ title: '', city: 'Neuquén Capital', type: 'Skatepark', description: '', images: ['', '', '', ''], lat: '', lng: '' });
    } catch (error) {
      setLoginError("Error al subir spot: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'profiles', user.uid), editProfile);
    if (user.email === ROOT_ADMIN) {
      await setDoc(doc(db, 'settings', 'global'), { 
        logoUrl: editLogoUrl,
        adminList: adminEmailsInput
      }, { merge: true });
    }
    setUserProfile(editProfile);
    setIsEditingProfile(false);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-600 pb-20 font-sans">
      
      {loginError && (
        <div className="bg-red-600 p-4 text-center font-black uppercase text-xs sticky top-0 z-[100] flex items-center justify-center gap-4">
          <AlertCircle size={18} /> {loginError}
          <button onClick={() => setLoginError(null)} className="bg-black/20 p-1 rounded-lg"><X size={16}/></button>
        </div>
      )}

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-black/95 border-b border-zinc-900 px-6 py-4 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('explore')}>
            {appSettings.logoUrl ? <img src={appSettings.logoUrl} className="h-10 rounded-lg" alt="Logo" /> : <div className="bg-red-600 p-2 rounded-xl"><Navigation size={22} /></div>}
            <h1 className="text-2xl font-black italic uppercase tracking-tighter">AGGRETV</h1>
          </div>
          
          <div className="hidden md:flex gap-8">
            {['explore', 'riders', 'media'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-red-600 border-b-2 border-red-600 pb-1' : 'text-zinc-500 hover:text-white'}`}>{tab === 'explore' ? 'Spots' : tab === 'media' ? 'Media' : 'Riders'}</button>
            ))}
          </div>

          {!user ? (
            <Button onClick={() => signInWithPopup(auth, provider).catch(e => setLoginError(e.message))}>Login Google</Button>
          ) : (
            <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[9px] font-black text-red-600 uppercase">{isUserAdmin ? 'Administrador' : 'Rider'}</p>
                <p className="text-xs font-bold">{userProfile?.name}</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-red-600 p-0.5 overflow-hidden">
                <img src={user.photoURL} className="rounded-full" alt="avatar" />
              </div>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-16 border-l-4 border-red-600 pl-6">
          <div className="space-y-2">
            <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">{activeTab === 'explore' ? 'Spots' : activeTab === 'riders' ? 'Riders' : 'Media'}</h2>
            <p className="text-zinc-500 text-xs font-black flex items-center gap-2 uppercase tracking-widest"><Globe size={14} className="text-red-600" /> Argentina / {cityFilter}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <select className="bg-zinc-900 p-4 rounded-xl text-xs font-black uppercase outline-none border border-zinc-800" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
              <option value="All">🇦🇷 Ciudad</option>
              {CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {user && activeTab === 'explore' && <Button onClick={() => setIsAddingSpot(true)}><Plus size={20}/> SUMAR SPOT</Button>}
            {user && activeTab === 'media' && <Button onClick={() => setIsAddingVideo(true)}><Video size={20}/> SUBIR VIDEO</Button>}
          </div>
        </div>

        {/* Dynamic List Rendering */}
        {activeTab === 'explore' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {spots.filter(s => cityFilter === 'All' || s.city === cityFilter).map(spot => (
              <div key={spot.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden group hover:border-red-600 transition-all">
                <ImageCarousel images={spot.images} />
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-black uppercase italic group-hover:text-red-600 transition-colors leading-tight">{spot.title}</h3>
                    <button onClick={() => updateDoc(doc(db, 'spots', spot.id), { votesUp: increment(1) })} className="bg-zinc-900 p-2 rounded-lg text-xs font-black flex items-center gap-2 hover:bg-red-600 transition-colors">
                      <ThumbsUp size={14} /> {spot.votesUp || 0}
                    </button>
                  </div>
                  <p className="text-zinc-500 text-[10px] font-black uppercase flex items-center gap-2"><MapPin size={12} className="text-red-600" /> {spot.city}</p>
                  <Button variant="secondary" className="w-full text-[10px]" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`, '_blank')}>VER MAPA REAL</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'riders' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {riders.filter(r => cityFilter === 'All' || r.city === cityFilter).map(rider => (
              <div key={rider.uid} className="bg-zinc-950 border border-zinc-900 p-8 rounded-2xl text-center space-y-4 hover:border-red-600 transition-all group">
                <div className="w-20 h-20 mx-auto bg-zinc-900 border-2 border-red-600 rounded-3xl flex items-center justify-center overflow-hidden">
                   <User size={30} className="text-red-600" />
                </div>
                <div>
                  <h4 className="font-black italic uppercase text-lg">{rider.name}</h4>
                  <p className="text-zinc-500 text-[9px] font-black uppercase mt-1">{rider.city}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'media' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {videos.map(vid => (
               <div key={vid.id} className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden">
                  <div className="aspect-video bg-black">
                    <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${vid.videoId}`} frameBorder="0" allowFullScreen title={vid.title}></iframe>
                  </div>
                  <div className="p-6">
                    <h4 className="font-black uppercase italic text-xl">{vid.title}</h4>
                    <p className="text-zinc-500 text-[9px] font-black uppercase mt-2">Patinador: {vid.creatorName}</p>
                  </div>
               </div>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {isAddingVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/80">
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black italic uppercase">Subir <span className="text-red-600">Video</span></h3>
              <button onClick={() => setIsAddingVideo(false)}><X/></button>
            </div>
            <form onSubmit={handleAddVideo} className="space-y-4">
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none" placeholder="Título del Video" value={newVideo.title} onChange={e => setNewVideo({...newVideo, title: e.target.value})} />
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none" placeholder="Link de YouTube (ej: https://youtu.be/...)" value={newVideo.youtubeUrl} onChange={e => setNewVideo({...newVideo, youtubeUrl: e.target.value})} />
              <div className="flex gap-4">
                <Button type="submit" className="flex-1 py-4" isLoading={isLoading}>PUBLICAR VIDEO</Button>
                <Button type="button" variant="secondary" onClick={() => setIsAddingVideo(false)} className="px-6">CANCELAR</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditingProfile && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 backdrop-blur-md bg-black/95">
          <div className="bg-zinc-950 border border-zinc-800 p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-4xl font-black italic uppercase">Mi <span className="text-red-600">Perfil</span></h3>
               <button onClick={() => setIsEditingProfile(false)}><X/></button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none" placeholder="Nombre / Alias" value={editProfile.name} onChange={e => setEditProfile({...editProfile, name: e.target.value})} />
              <select className="w-full bg-zinc-900 p-4 rounded-xl outline-none" value={editProfile.city} onChange={e => setEditProfile({...editProfile, city: e.target.value})}>{CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full bg-zinc-900 p-4 rounded-xl outline-none text-xs" placeholder="Instagram" value={editProfile.instagram} onChange={e => setEditProfile({...editProfile, instagram: e.target.value})} />
                <input className="w-full bg-zinc-900 p-4 rounded-xl outline-none text-xs" placeholder="WhatsApp" value={editProfile.whatsapp} onChange={e => setEditProfile({...editProfile, whatsapp: e.target.value})} />
              </div>

              {user.email === ROOT_ADMIN && (
                <div className="p-4 bg-red-950/20 border border-red-900 rounded-2xl space-y-4">
                  <p className="text-[10px] font-black uppercase text-red-600">Root Config</p>
                  <input className="w-full bg-black p-3 rounded-lg text-xs" placeholder="Mails Admins (separados por coma)" value={adminEmailsInput} onChange={e => setAdminEmailsInput(e.target.value)} />
                  <input className="w-full bg-black p-3 rounded-lg text-xs" placeholder="Logo Link" value={editLogoUrl} onChange={e => setEditLogoUrl(e.target.value)} />
                </div>
              )}

              <Button type="submit" className="w-full py-5">GUARDAR DATOS</Button>
              <button type="button" onClick={() => signOut(auth)} className="w-full text-zinc-500 hover:text-red-600 text-[10px] font-black uppercase py-4">Cerrar Sesión</button>
            </form>
          </div>
        </div>
      )}

      {isAddingSpot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/80">
          <div className="bg-zinc-950 border border-red-600/30 p-8 rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-3xl font-black italic uppercase text-white">Nuevo <span className="text-red-600">Spot</span></h3>
              <button onClick={() => setIsAddingSpot(false)} className="text-zinc-500 hover:text-white"><X size={24}/></button>
            </div>
            <form onSubmit={handleAddSpot} className="space-y-5">
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none border border-transparent focus:border-red-600 text-white" placeholder="Nombre" value={newSpot.title} onChange={e => setNewSpot({...newSpot, title: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-zinc-900 p-4 rounded-xl outline-none text-white border border-zinc-800" value={newSpot.city} onChange={e => setNewSpot({...newSpot, city: e.target.value})}>
                  {CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="bg-zinc-900 p-4 rounded-xl outline-none text-white border border-zinc-800" value={newSpot.type} onChange={e => setNewSpot({...newSpot, type: e.target.value})}>
                  {SPOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <textarea className="w-full bg-zinc-900 p-4 rounded-xl outline-none h-24 text-sm text-white border border-zinc-800" placeholder="Detalles de seguridad..." value={newSpot.description} onChange={e => setNewSpot({...newSpot, description: e.target.value})} />

              {/* Location Section */}
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 space-y-3">
                <p className="text-[10px] font-black uppercase text-red-600 tracking-widest flex items-center gap-2">
                  <MapPin size={12}/> Ubicación
                </p>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-black border border-zinc-800 p-3 rounded-xl text-xs outline-none focus:border-red-600 text-white" 
                    placeholder="Buscar dirección o lugar..."
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                  />
                  <button type="button" onClick={handleSearchAddress} className="bg-red-600 p-3 rounded-xl hover:bg-red-500 transition-colors">
                    <Search size={16}/>
                  </button>
                </div>
                {searchStatus && <p className="text-[9px] font-bold uppercase text-center text-red-600 animate-pulse">{searchStatus}</p>}
                
                <div ref={mapContainerRef} className="h-[200px] rounded-xl overflow-hidden border border-zinc-800" />
                
                <button type="button" onClick={handleGetCurrentLocation} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all">
                  <Zap size={14} className="text-red-600" /> Usar mi GPS actual
                </button>
              </div>

              {/* Images Section */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Imágenes (Links de Drive/Web)</p>
                <div className="grid grid-cols-2 gap-2">
                  {newSpot.images.map((img, i) => (
                    <input key={i} className="w-full bg-zinc-900 p-3 rounded-lg text-xs outline-none focus:border-red-600 text-white border border-zinc-800" placeholder={`Link Imagen ${i+1}`} value={img} onChange={e => {
                      const ims = [...newSpot.images]; ims[i] = e.target.value; setNewSpot({...newSpot, images: ims});
                    }} />
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full py-5 text-sm" isLoading={isLoading}>PUBLICA SPOT</Button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-4 z-40 bg-zinc-950/80 backdrop-blur-xl p-3 rounded-3xl border border-zinc-800 shadow-2xl">
         <button onClick={() => setActiveTab('explore')} className={`p-4 rounded-2xl transition-all ${activeTab === 'explore' ? 'bg-red-600 text-white scale-110' : 'text-zinc-500'}`}><MapPin size={24}/></button>
         <button onClick={() => setActiveTab('riders')} className={`p-4 rounded-2xl transition-all ${activeTab === 'riders' ? 'bg-red-600 text-white scale-110' : 'text-zinc-500'}`}><Users size={24}/></button>
         <button onClick={() => setActiveTab('media')} className={`p-4 rounded-2xl transition-all ${activeTab === 'media' ? 'bg-red-600 text-white scale-110' : 'text-zinc-500'}`}><PlayCircle size={24}/></button>
      </div>
    </div>
  );
}