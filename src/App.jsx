import React, { useState, useEffect, useMemo } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [editProfile, setEditProfile] = useState({ name: '', city: 'Neuquén Capital', instagram: '', whatsapp: '', bio: '' });
  const [adminEmailsInput, setAdminEmailsInput] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');

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

  const handleSearchLocation = async () => {
    if (!searchQuery) return;
    setSearchStatus('Buscando...');
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Argentina')}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setNewSpot(prev => ({ ...prev, lat, lng: lon }));
        setSearchStatus('✅ Ubicación fijada');
      } else {
        setSearchStatus('❌ No se encontró');
      }
    } catch (err) {
      setSearchStatus('❌ Error de red');
    }
  };

  const handleLogin = async () => {
    try {
      setLoginError(null);
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (error.code === 'auth/unauthorized-domain') {
        setLoginError("URL no autorizada en Firebase. Agregala en Authorized Domains.");
      } else {
        setLoginError("Error de login: " + error.message);
      }
    }
  };

  const handleAddSpot = async (e) => {
    e.preventDefault();
    if (!newSpot.lat || !newSpot.lng) return setSearchStatus('⚠️ Buscá una ubicación');
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
    <div className="min-h-screen bg-black text-white selection:bg-red-600 pb-20">
      
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
              <button key={tab} onClick={() => setActiveTab(tab)} className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-red-600 border-b-2 border-red-600 pb-1' : 'text-zinc-500 hover:text-white'}`}>{tab === 'explore' ? 'Spots' : tab}</button>
            ))}
          </div>

          {!user ? (
            <Button onClick={handleLogin}>Login Google</Button>
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

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
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

        {/* Content Tabs */}
        {activeTab === 'explore' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {spots.filter(s => cityFilter === 'All' || s.city === cityFilter).map(spot => (
              <div key={spot.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden group hover:border-red-600 transition-all">
                <div className="h-64 bg-zinc-900 relative">
                   {spot.images?.[0] ? <img src={spot.images[0]} className="w-full h-full object-cover" alt="spot" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><ImageIcon size={48}/></div>}
                   {spot.creatorId === user?.uid || isUserAdmin ? (
                      <button onClick={async () => { if(confirm("Borrar?")) await updateDoc(doc(db, 'spots', spot.id), { deleted: true }) }} className="absolute top-4 right-4 bg-black/60 p-2 rounded-lg text-white hover:text-red-600"><X size={16}/></button>
                   ) : null}
                </div>
                <div className="p-6 space-y-4">
                  <h3 className="text-2xl font-black uppercase italic group-hover:text-red-600 leading-tight">{spot.title}</h3>
                  <p className="text-zinc-500 text-[10px] font-black uppercase flex items-center gap-2"><MapPin size={12} className="text-red-600" /> {spot.city} • {spot.type}</p>
                  <p className="text-zinc-400 text-sm italic border-l-2 border-zinc-800 pl-3">"{spot.description}"</p>
                  <Button variant="secondary" className="w-full text-[10px]" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`, '_blank')}>ABRIR MAPA</Button>
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
                <h4 className="font-black italic uppercase text-lg">{rider.name}</h4>
                <p className="text-zinc-500 text-[9px] font-black uppercase">{rider.city}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {isAddingSpot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/80">
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-4xl font-black italic uppercase">Nuevo <span className="text-red-600">Spot</span></h3>
              <button onClick={() => setIsAddingSpot(false)} className="bg-zinc-900 p-2 rounded-xl hover:text-red-600"><X/></button>
            </div>
            <form onSubmit={handleAddSpot} className="space-y-4">
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none" placeholder="Nombre del Spot" value={newSpot.title} onChange={e => setNewSpot({...newSpot, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-zinc-900 p-4 rounded-xl outline-none" value={newSpot.city} onChange={e => setNewSpot({...newSpot, city: e.target.value})}>{CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select className="bg-zinc-900 p-4 rounded-xl outline-none" value={newSpot.type} onChange={e => setNewSpot({...newSpot, type: e.target.value})}>{SPOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
              </div>
              <textarea className="w-full bg-zinc-900 p-4 rounded-xl outline-none h-24 text-sm" placeholder="Detalles de seguridad..." value={newSpot.description} onChange={e => setNewSpot({...newSpot, description: e.target.value})} />
              
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 space-y-4">
                <p className="text-[10px] font-black uppercase text-red-600">Ubicación</p>
                <div className="flex gap-2">
                  <input className="flex-1 bg-black p-3 rounded-xl text-xs outline-none" placeholder="Dirección o lugar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleSearchLocation())} />
                  <button type="button" onClick={handleSearchLocation} className="bg-red-600 p-3 rounded-xl"><Search size={16}/></button>
                </div>
                <span className="text-[9px] font-bold text-white/40 block text-center uppercase tracking-widest">{searchStatus || "Buscá o usá el GPS de abajo"}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {newSpot.images.map((img, i) => <input key={i} className="w-full bg-zinc-900 p-3 rounded-xl text-[10px] outline-none" placeholder={`Imagen ${i+1} (Link)`} value={img} onChange={e => { const ims = [...newSpot.images]; ims[i] = e.target.value; setNewSpot({...newSpot, images: ims}); }} />)}
              </div>
              <Button type="submit" className="w-full py-5" isLoading={isLoading}>PUBLICAR SPOT</Button>
            </form>
          </div>
        </div>
      )}

      {isEditingProfile && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 backdrop-blur-md bg-black/95">
          <div className="bg-zinc-950 border border-zinc-800 p-10 rounded-[2.5rem] w-full max-w-lg">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-4xl font-black italic uppercase">Mi <span className="text-red-600">Perfil</span></h3>
               <button onClick={() => setIsEditingProfile(false)} className="bg-zinc-900 p-2 rounded-xl"><X/></button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none" placeholder="Alias" value={editProfile.name} onChange={e => setEditProfile({...editProfile, name: e.target.value})} />
              
              {user.email === ROOT_ADMIN && (
                <div className="p-6 bg-red-950/10 rounded-2xl border border-red-900/30 space-y-6">
                   <p className="text-[10px] font-black uppercase text-red-600 flex items-center gap-2"><ShieldCheck size={16}/> Configuración Root</p>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-zinc-500">Mails Admins (separados por coma)</label>
                      <input className="w-full bg-black p-3 rounded-xl text-xs outline-none border border-zinc-800" placeholder="mail1@gmail.com, mail2@gmail.com" value={adminEmailsInput} onChange={e => setAdminEmailsInput(e.target.value)} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-zinc-500">Link Logo App</label>
                      <input className="w-full bg-black p-3 rounded-xl text-xs outline-none border border-zinc-800" placeholder="https://..." value={editLogoUrl} onChange={e => setEditLogoUrl(e.target.value)} />
                   </div>
                </div>
              )}

              <Button type="submit" className="w-full py-5">GUARDAR DATOS</Button>
              <button type="button" onClick={() => signOut(auth)} className="w-full text-zinc-500 hover:text-red-600 text-[10px] font-black uppercase py-4">Cerrar Sesión</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}