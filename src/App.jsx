import React, { useState, useEffect, useMemo } from 'react';
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
  ThumbsUp, X, MessageCircle, PlayCircle, ShieldCheck, 
  Settings, ChevronLeft, ChevronRight, Zap, Globe, AlertCircle, Trash2, Edit3, Loader2, Target
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

const CITIES_ARGENTINA = ["Neuquén Capital", "General Roca", "Cipolletti", "Plottier", "Buenos Aires", "Córdoba", "Rosario", "Mendoza", "Bariloche"];
const SPOT_TYPES = ["Skatepark", "Baranda", "Borde/Murete", "Escaleras", "Rampa/Gap", "Piso Liso"];

const Button = ({ children, variant = 'primary', className = '', isLoading = false, ...props }) => {
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

const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

const WhatsAppIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-10.6 8.38 8.38 0 0 1 3.8.9L21 3z"></path></svg>
);

const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  if (!images || images.length === 0) return (
    <div className="w-full h-64 flex flex-col items-center justify-center opacity-20 bg-zinc-900"><ImageIcon size={48} /><span className="text-[10px] font-black uppercase mt-2">Sin Imágenes</span></div>
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
  
  const [newSpot, setNewSpot] = useState({ title: '', city: 'Neuquén Capital', type: 'Skatepark', description: '', images: ['', '', '', ''], lat: '', lng: '' });
  const [newVideo, setNewVideo] = useState({ title: '', youtubeUrl: '' });
  const [editProfile, setEditProfile] = useState({ name: '', city: 'Neuquén Capital', instagram: '', whatsapp: '', bio: '', isAdmin: false });

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

    onSnapshot(doc(db, 'settings', 'global'), (snap) => { if (snap.exists()) setAppSettings(snap.data()); });
    onSnapshot(query(collection(db, 'spots'), orderBy('createdAt', 'desc')), (snap) => {
      setSpots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    onSnapshot(collection(db, 'profiles'), (snap) => setRiders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(query(collection(db, 'videos'), orderBy('createdAt', 'desc')), (snap) => setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => unsubAuth();
  }, []);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, provider); } catch (e) { setLoginError(e.code === 'auth/unauthorized-domain' ? "Autorizá el dominio en Firebase." : e.message); }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setNewSpot({ ...newSpot, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
    });
  };

  const handleAddSpot = async (e) => {
    e.preventDefault();
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
  };

  const handleDeleteSpot = async (id) => {
    if (confirm("¿Borrar este spot?")) await deleteDoc(doc(db, 'spots', id));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'profiles', user.uid), editProfile);
    setUserProfile(editProfile);
    setIsEditingProfile(false);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-24">
      {loginError && <div className="bg-red-600 p-3 text-center text-xs font-black flex justify-center items-center gap-2 sticky top-0 z-[200]">{loginError}<X className="cursor-pointer" onClick={() => setLoginError(null)} /></div>}

      <nav className="sticky top-0 z-50 bg-black/95 border-b border-zinc-900 px-6 py-4 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('explore')}>
          {appSettings.logoUrl ? <img src={appSettings.logoUrl} className="h-10 rounded-lg" alt="Logo" /> : <Navigation className="text-red-600" />}
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">AGGRETV</h1>
        </div>
        <div className="hidden md:flex gap-8">
          {['explore', 'riders', 'videos'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`text-xs font-black uppercase tracking-widest ${activeTab === tab ? 'text-red-600 border-b-2 border-red-600' : 'text-zinc-500'}`}>{tab === 'explore' ? 'Spots' : tab}</button>
          ))}
        </div>
        {!user ? <Button onClick={handleLogin}>Login Google</Button> : (
          <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-3">
            <div className="text-right hidden sm:block"><p className="text-[9px] font-black text-red-600">Rider Online</p><p className="text-xs font-bold">{userProfile?.name}</p></div>
            <div className="w-10 h-10 rounded-full border-2 border-red-600 overflow-hidden">{user.photoURL && <img src={user.photoURL} alt="pfp" />}</div>
          </button>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-12 border-l-4 border-red-600 pl-6">
          <div>
            <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">{activeTab === 'explore' ? 'Spots' : activeTab === 'riders' ? 'Riders' : 'Media'}</h2>
            <p className="text-zinc-500 text-xs font-black flex items-center gap-2 mt-2"><Globe size={14} className="text-red-600" /> Argentina / {cityFilter}</p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <select className="bg-zinc-900 p-4 rounded-xl text-xs font-black outline-none border border-zinc-800" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
              <option value="All">🇦🇷 Nacional</option>
              {CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {user && activeTab === 'explore' && <Button onClick={() => setIsAddingSpot(true)}><Plus /> SUMAR SPOT</Button>}
          </div>
        </div>

        {}
        {activeTab === 'explore' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {spots.filter(s => cityFilter === 'All' || s.city === cityFilter).map(spot => (
              <div key={spot.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden group hover:border-red-600 transition-all">
                <ImageCarousel images={spot.images} />
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-black uppercase italic group-hover:text-red-600 leading-none">{spot.title}</h3>
                    {(userProfile?.isAdmin || spot.creatorId === user?.uid) && (
                      <button onClick={() => handleDeleteSpot(spot.id)} className="text-zinc-700 hover:text-red-600"><Trash2 size={18} /></button>
                    )}
                  </div>
                  <p className="text-zinc-500 text-[10px] font-black uppercase"><MapPin size={12} className="inline mr-1 text-red-600" /> {spot.city} • {spot.type}</p>
                  <p className="text-zinc-400 text-sm italic border-l-2 border-zinc-800 pl-3">"{spot.description}"</p>
                  <Button variant="secondary" className="w-full" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`, '_blank')}>ABRIR MAPA</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {}
        {activeTab === 'riders' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {riders.filter(r => cityFilter === 'All' || r.city === cityFilter).map(rider => (
              <div key={rider.uid} className="bg-zinc-950 border border-zinc-900 p-8 rounded-2xl text-center space-y-4 hover:border-red-600 transition-all">
                <div className="w-20 h-20 mx-auto bg-zinc-900 rounded-3xl flex items-center justify-center border-2 border-red-600 relative">
                  <User size={32} className="text-red-600" />
                  {rider.isAdmin && <div className="absolute -bottom-2 -right-2 bg-red-600 p-1 rounded-lg"><ShieldCheck size={14}/></div>}
                </div>
                <h4 className="font-black italic uppercase text-xl">{rider.name}</h4>
                <div className="flex justify-center gap-2">
                  {rider.instagram && <button onClick={() => window.open(`https://ig.me/m/${rider.instagram}`)} className="p-2 bg-zinc-900 rounded-lg hover:bg-red-600"><InstagramIcon /></button>}
                  {rider.whatsapp && <button onClick={() => window.open(`https://wa.me/${rider.whatsapp}`)} className="p-2 bg-zinc-900 rounded-lg hover:bg-green-600"><WhatsAppIcon /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {}
      {isAddingSpot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/80">
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-3xl font-black italic uppercase">Cargar <span className="text-red-600">Spot</span></h3>
              <X className="cursor-pointer text-zinc-500" onClick={() => setIsAddingSpot(false)} />
            </div>
            <form onSubmit={handleAddSpot} className="space-y-4">
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none border border-transparent focus:border-red-600" placeholder="Nombre del Spot" value={newSpot.title} onChange={e => setNewSpot({...newSpot, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-zinc-900 p-4 rounded-xl outline-none" value={newSpot.city} onChange={e => setNewSpot({...newSpot, city: e.target.value})}>{CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select className="bg-zinc-900 p-4 rounded-xl outline-none" value={newSpot.type} onChange={e => setNewSpot({...newSpot, type: e.target.value})}>{SPOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
              </div>
              <textarea className="w-full bg-zinc-900 p-4 rounded-xl outline-none h-24 text-sm" placeholder="Detalles de seguridad, estado del piso..." value={newSpot.description} onChange={e => setNewSpot({...newSpot, description: e.target.value})} />
              
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 space-y-3">
                <p className="text-[10px] font-black uppercase text-red-600 flex justify-between">Ubicación GPS <span className="text-zinc-500 underline cursor-pointer" onClick={() => window.open('https://www.google.com/maps', '_blank')}>Buscar en Maps</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <input required className="bg-black p-3 rounded-lg text-xs outline-none" placeholder="Lat (-38.95)" value={newSpot.lat} onChange={e => setNewSpot({...newSpot, lat: e.target.value})} />
                  <input required className="bg-black p-3 rounded-lg text-xs outline-none" placeholder="Lng (-68.05)" value={newSpot.lng} onChange={e => setNewSpot({...newSpot, lng: e.target.value})} />
                </div>
                <Button type="button" variant="secondary" className="w-full text-[10px] py-2" onClick={handleGetCurrentLocation}><Target size={14}/> USAR MI UBICACIÓN ACTUAL</Button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-zinc-500">Imágenes (Links de Drive/Web)</p>
                {newSpot.images.map((img, i) => <input key={i} className="w-full bg-zinc-900 p-3 rounded-lg text-[10px] outline-none" placeholder={`Link de Imagen ${i+1}`} value={img} onChange={e => { const ims = [...newSpot.images]; ims[i] = e.target.value; setNewSpot({...newSpot, images: ims}); }} />)}
              </div>
              <Button type="submit" className="w-full py-4 mt-4" isLoading={isLoading}>PUBLICAR SPOT</Button>
            </form>
          </div>
        </div>
      )}

      {isEditingProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/90">
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-lg">
            <h3 className="text-4xl font-black italic uppercase mb-8">Mi <span className="text-red-600">Perfil</span></h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none" placeholder="Nombre" value={editProfile.name} onChange={e => setEditProfile({...editProfile, name: e.target.value})} />
              <select className="w-full bg-zinc-900 p-4 rounded-xl outline-none" value={editProfile.city} onChange={e => setEditProfile({...editProfile, city: e.target.value})}>{CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full bg-zinc-900 p-4 rounded-xl outline-none text-xs" placeholder="Instagram (sin @)" value={editProfile.instagram} onChange={e => setEditProfile({...editProfile, instagram: e.target.value})} />
                <input className="w-full bg-zinc-900 p-4 rounded-xl outline-none text-xs" placeholder="WhatsApp (con código)" value={editProfile.whatsapp} onChange={e => setEditProfile({...editProfile, whatsapp: e.target.value})} />
              </div>
              <div className="flex items-center gap-3 p-4 bg-zinc-900 rounded-xl">
                <input type="checkbox" checked={editProfile.isAdmin} onChange={e => setEditProfile({...editProfile, isAdmin: e.target.checked})} className="accent-red-600 w-5 h-5" />
                <label className="text-xs font-black uppercase">¿Soy el Admin del Sitio?</label>
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