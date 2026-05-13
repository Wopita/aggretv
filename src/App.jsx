import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  increment,
  setDoc,
  getDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  MapPin, Plus, Search, Users, Video, Image as ImageIcon, User, Navigation,
  ThumbsUp, ThumbsDown, X, MessageCircle, PlayCircle, ShieldCheck, 
  Settings, ChevronLeft, ChevronRight, Zap, Globe, AlertCircle, Target, Loader2, MousePointer2
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
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev - 1 + images.length) % images.length)}} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full hover:bg-red-600"><ChevronLeft size={16} /></button>
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev + 1) % images.length)}} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full hover:bg-red-600"><ChevronRight size={16} /></button>
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
  const [appSettings, setAppSettings] = useState({ logoUrl: '' });
  
  const [isAddingSpot, setIsAddingSpot] = useState(false);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cityFilter, setCityFilter] = useState('All');
  const [loginError, setLoginError] = useState(null);

  /* Form States */
  const [newSpot, setNewSpot] = useState({ title: '', city: 'Neuquén Capital', type: 'Skatepark', description: '', images: ['', '', '', ''], lat: '', lng: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [editProfile, setEditProfile] = useState({ name: '', city: 'Neuquén Capital', instagram: '', whatsapp: '', bio: '', isAdmin: false });
  const [editLogoUrl, setEditLogoUrl] = useState('');

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
          const initialData = { name: u.displayName || 'Rider', city: 'Neuquén Capital', isAdmin: false, uid: u.uid };
          await setDoc(profileRef, initialData);
          setUserProfile(initialData);
          setEditProfile(initialData);
          setIsEditingProfile(true);
        }
      }
    });

    onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        setAppSettings(snap.data());
        setEditLogoUrl(snap.data().logoUrl || '');
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

  const handleSearchLocation = async () => {
    if (!searchQuery) return;
    setSearchStatus('Buscando...');
    try {
      // Intentamos búsqueda específica primero
      let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ' ' + newSpot.city + ' Argentina')}`);
      let data = await response.json();
      
      // Fallback: Si no encuentra, buscamos solo el texto del usuario
      if (!data || data.length === 0) {
        response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
        data = await response.json();
      }

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setNewSpot(prev => ({ ...prev, lat, lng: lon }));
        setSearchStatus('✅ Ubicación fijada');
      } else {
        setSearchStatus('❌ No se encontró el lugar');
      }
    } catch (err) {
      setSearchStatus('❌ Error en la búsqueda');
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setSearchStatus('Obteniendo GPS...');
    navigator.geolocation.getCurrentPosition((pos) => {
      setNewSpot(prev => ({ ...prev, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }));
      setSearchStatus('✅ GPS capturado');
    }, () => setSearchStatus('❌ Error al capturar GPS'));
  };

  const handleAddSpot = async (e) => {
    e.preventDefault();
    if (!newSpot.lat || !newSpot.lng) return setSearchStatus('⚠️ Seleccioná el punto en el mapa');
    setIsLoading(true);
    const validImages = newSpot.images.filter(url => url.trim() !== '');
    await addDoc(collection(db, 'spots'), {
      ...newSpot,
      images: validImages,
      creatorId: user.uid,
      creatorName: userProfile.name,
      votesUp: 0,
      createdAt: new Date().toISOString()
    });
    setIsLoading(false);
    setIsAddingSpot(false);
    setNewSpot({ title: '', city: 'Neuquén Capital', type: 'Skatepark', description: '', images: ['', '', '', ''], lat: '', lng: '' });
    setSearchQuery('');
    setSearchStatus('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'profiles', user.uid), editProfile);
    if (editProfile.isAdmin) {
      await setDoc(doc(db, 'settings', 'global'), { logoUrl: editLogoUrl }, { merge: true });
    }
    setUserProfile(editProfile);
    setIsEditingProfile(false);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600 pb-24">
      
      {loginError && (
        <div className="bg-red-600 p-3 text-center text-xs font-black uppercase flex items-center justify-center gap-2 sticky top-0 z-[100]">
          <AlertCircle size={16} /> {loginError}
          <X size={16} className="cursor-pointer ml-4" onClick={() => setLoginError(null)} />
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-black/95 border-b border-zinc-900 px-6 py-4 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('explore')}>
            {appSettings.logoUrl ? <img src={appSettings.logoUrl} className="h-10 rounded-lg" alt="Logo" /> : <div className="bg-red-600 p-2 rounded-xl"><Navigation size={22} /></div>}
            <h1 className="text-2xl font-black italic uppercase tracking-tighter">AGGRETV</h1>
          </div>
          
          <div className="hidden md:flex gap-8">
            {['explore', 'riders', 'media'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`text-xs font-black uppercase tracking-widest ${activeTab === tab ? 'text-red-600 border-b-2 border-red-600 pb-1' : 'text-zinc-500 hover:text-white'}`}>{tab === 'explore' ? 'Spots' : tab}</button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {!user ? (
              <Button onClick={() => signInWithPopup(auth, provider)}>Login Google</Button>
            ) : (
              <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-3">
                <div className="text-right hidden sm:block"><p className="text-[9px] font-black text-red-600">Rider Online</p><p className="text-xs font-bold">{userProfile?.name}</p></div>
                <div className="w-10 h-10 rounded-full border-2 border-red-600 p-0.5 overflow-hidden">{user.photoURL && <img src={user.photoURL} className="rounded-full" alt="avatar" />}</div>
              </button>
            )}
          </div>
        </div>
      </nav>

      { }
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-16 border-l-4 border-red-600 pl-6">
          <div className="space-y-2">
            <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">{activeTab === 'explore' ? 'Spots' : activeTab === 'riders' ? 'Riders' : 'Media'}</h2>
            <p className="text-zinc-500 text-xs font-black flex items-center gap-2 uppercase tracking-widest"><Globe size={14} className="text-red-600" /> Argentina / {cityFilter}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <select className="bg-zinc-900 p-4 rounded-xl text-xs font-black uppercase outline-none border border-zinc-800" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
              <option value="All">🇦🇷 Filtrar Ciudad</option>
              {CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {user && activeTab === 'explore' && <Button onClick={() => setIsAddingSpot(true)}><Plus size={20}/> SUMAR SPOT</Button>}
          </div>
        </div>

        {/* Explore Spots */}
        {activeTab === 'explore' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {spots.filter(s => cityFilter === 'All' || s.city === cityFilter).map(spot => (
              <div key={spot.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden group hover:border-red-600 transition-all">
                <ImageCarousel images={spot.images} />
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-black uppercase italic group-hover:text-red-600 leading-tight">{spot.title}</h3>
                    {(userProfile?.isAdmin || spot.creatorId === user?.uid) && (
                      <button onClick={async () => { if(confirm("Borrar?")) await updateDoc(doc(db, 'spots', spot.id), { deleted: true }) }} className="text-zinc-700 hover:text-red-600"><X size={18}/></button>
                    )}
                  </div>
                  <p className="text-zinc-500 text-[10px] font-black uppercase flex items-center gap-2"><MapPin size={12} className="text-red-600" /> {spot.city} • {spot.type}</p>
                  <p className="text-zinc-400 text-sm italic border-l-2 border-zinc-800 pl-3">"{spot.description}"</p>
                  <Button variant="secondary" className="w-full text-[10px]" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`, '_blank')}>ABRIR EN MAPS</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Riders Section */}
        {activeTab === 'riders' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {riders.filter(r => cityFilter === 'All' || r.city === cityFilter).map(rider => (
              <div key={rider.uid} className="bg-zinc-950 border border-zinc-900 p-8 rounded-2xl text-center space-y-5 group hover:border-red-600 transition-all">
                <div className="w-24 h-24 mx-auto bg-zinc-900 border-2 border-red-600 rounded-3xl flex items-center justify-center relative">
                  {rider.isAdmin && <div className="absolute -bottom-2 -right-2 bg-red-600 p-1 rounded-lg"><ShieldCheck size={14}/></div>}
                  <User size={40} className="text-red-600" />
                </div>
                <h4 className="font-black italic uppercase text-xl">{rider.name}</h4>
                <p className="text-zinc-500 text-[10px] font-black uppercase">{rider.city}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {}
      {isAddingSpot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/80 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-xl my-auto">
            <div className="flex justify-between items-center mb-6"><h3 className="text-3xl font-black italic uppercase">Cargar <span className="text-red-600">Spot</span></h3><X className="cursor-pointer" onClick={() => setIsAddingSpot(false)} /></div>
            <form onSubmit={handleAddSpot} className="space-y-4">
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none" placeholder="Nombre del Spot" value={newSpot.title} onChange={e => setNewSpot({...newSpot, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-zinc-900 p-4 rounded-xl outline-none" value={newSpot.city} onChange={e => setNewSpot({...newSpot, city: e.target.value})}>{CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select className="bg-zinc-900 p-4 rounded-xl outline-none" value={newSpot.type} onChange={e => setNewSpot({...newSpot, type: e.target.value})}>{SPOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
              </div>
              <textarea className="w-full bg-zinc-900 p-4 rounded-xl outline-none h-20 text-sm" placeholder="Detalles de seguridad, estado del piso..." value={newSpot.description} onChange={e => setNewSpot({...newSpot, description: e.target.value})} />
              
              {/* UBICACION CON MAPA PREVIEW */}
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase text-red-600">Ubicación (Buscá o tocá el mapa)</p>
                  <span className="text-[9px] text-white/50 italic">{searchStatus}</span>
                </div>
                
                <div className="flex gap-2">
                  <input className="flex-1 bg-black p-3 rounded-xl text-xs outline-none" placeholder="Ej: Arrecifes 4307, Neuquén" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleSearchLocation())} />
                  <button type="button" onClick={handleSearchLocation} className="bg-red-600 p-3 rounded-xl hover:bg-red-500 transition-colors"><Search size={16}/></button>
                </div>

                {/* Mapa Preview (Simplificado con un Iframe para no cargar librerías pesadas en esta versión) */}
                <div className="relative w-full h-48 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight="0" 
                    marginWidth="0" 
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(newSpot.lng)-0.005},${parseFloat(newSpot.lat)-0.005},${parseFloat(newSpot.lng)+0.005},${parseFloat(newSpot.lat)+0.005}&layer=mapnik&marker=${newSpot.lat},${newSpot.lng}`}
                  ></iframe>
                  <div className="absolute inset-0 pointer-events-none border-2 border-red-600/20 rounded-xl"></div>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="secondary" className="flex-1 text-[9px] py-2" onClick={handleGetCurrentLocation}><Target size={14}/> GPS ACTUAL</Button>
                  <Button type="button" variant="secondary" className="flex-1 text-[9px] py-2" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${newSpot.lat || -38.95},${newSpot.lng || -68.05}`, '_blank')}><MousePointer2 size={14}/> BUSCAR EN GOOGLE</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {newSpot.images.map((img, i) => <input key={i} className="w-full bg-zinc-900 p-2 rounded-lg text-[10px] outline-none" placeholder={`Link de imagen ${i+1}`} value={img} onChange={e => { const ims = [...newSpot.images]; ims[i] = e.target.value; setNewSpot({...newSpot, images: ims}); }} />)}
              </div>
              <Button type="submit" className="w-full py-5" isLoading={isLoading}>PUBLICAR SPOT</Button>
            </form>
          </div>
        </div>
      )}

      {}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 backdrop-blur-md bg-black/95">
          <div className="bg-zinc-950 border border-zinc-800 p-10 rounded-[2.5rem] w-full max-w-lg">
            <h3 className="text-4xl font-black italic uppercase mb-8">Mi <span className="text-red-600">Perfil</span></h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none" placeholder="Nombre / Alias" value={editProfile.name} onChange={e => setEditProfile({...editProfile, name: e.target.value})} />
              <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 space-y-4">
                <div className="flex items-center gap-3"><input type="checkbox" checked={editProfile.isAdmin} onChange={e => setEditProfile({...editProfile, isAdmin: e.target.checked})} className="w-5 h-5 accent-red-600" /><label className="text-[10px] font-black uppercase">¿Sos el Admin?</label></div>
                {editProfile.isAdmin && <input className="w-full bg-black p-3 rounded-xl text-xs outline-none" placeholder="Link del Logo (.png)" value={editLogoUrl} onChange={e => setEditLogoUrl(e.target.value)} />}
              </div>
              <Button type="submit" className="w-full py-5">GUARDAR PERFIL</Button>
              <button type="button" onClick={() => signOut(auth)} className="w-full text-zinc-500 hover:text-red-600 text-[10px] font-black uppercase py-4">Cerrar Sesión</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}