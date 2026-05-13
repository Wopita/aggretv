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
  Settings, ChevronLeft, ChevronRight, Zap, Globe, Trash2
} from 'lucide-react';

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

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: 'bg-red-600 hover:bg-red-500 text-white font-black shadow-lg shadow-red-600/20',
    secondary: 'bg-zinc-900 hover:bg-zinc-800 text-white font-bold border border-zinc-800',
    outline: 'border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white font-black'
  };
  return (
    <button 
      className={`px-4 py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-tight ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  if (!images || images.length === 0) return (
    <div className="w-full h-full flex flex-col items-center justify-center opacity-20 bg-zinc-900 min-h-[200px]">
      <ImageIcon size={48} />
      <span className="text-[10px] font-black uppercase mt-2 tracking-widest">Sin Imágenes</span>
    </div>
  );

  return (
    <div className="relative w-full h-64 group/carousel overflow-hidden bg-black">
      <img src={images[currentIndex]} className="w-full h-full object-cover" alt="Spot" />
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev - 1 + images.length) % images.length)}} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full hover:bg-red-600">
            <ChevronLeft size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => (prev + 1) % images.length)}} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 p-2 rounded-full hover:bg-red-600">
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
  const [appSettings, setAppSettings] = useState({ logoUrl: '' });
  
  const [isAddingSpot, setIsAddingSpot] = useState(false);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [cityFilter, setCityFilter] = useState('All');
  
  const [newSpot, setNewSpot] = useState({ title: '', city: 'Neuquén Capital', type: 'Skatepark', description: '', images: ['', '', '', ''], lat: '', lng: '' });
  const [newVideo, setNewVideo] = useState({ title: '', youtubeUrl: '' });
  const [editProfile, setEditProfile] = useState({ name: '', city: 'Neuquén Capital', instagram: '', whatsapp: '', bio: '', isAdmin: false });
  const [editLogoUrl, setEditLogoUrl] = useState('');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        const profileRef = doc(db, 'profiles', u.uid);
        getDoc(profileRef).then(snap => {
          if (snap.exists()) {
            setUserProfile(snap.data());
            setEditProfile(snap.data());
          } else {
            const initialData = { name: u.displayName || 'Rider', city: 'Neuquén Capital', isAdmin: false, uid: u.uid };
            setDoc(profileRef, initialData);
            setUserProfile(initialData);
            setEditProfile(initialData);
            setIsEditingProfile(true);
          }
        });
      }
    });

    onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        setAppSettings(snap.data());
        setEditLogoUrl(snap.data().logoUrl);
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

  const handleLogin = async () => {
    try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); }
  };

  const handleLogout = () => { signOut(auth); setUser(null); setUserProfile(null); };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'profiles', user.uid), editProfile);
    if (editProfile.isAdmin) {
      await setDoc(doc(db, 'settings', 'global'), { logoUrl: editLogoUrl }, { merge: true });
    }
    setUserProfile(editProfile);
    setIsEditingProfile(false);
  };

  const handleAddSpot = async (e) => {
    e.preventDefault();
    const validImages = newSpot.images.filter(url => url.trim() !== '');
    await addDoc(collection(db, 'spots'), {
      ...newSpot,
      images: validImages,
      creatorId: user.uid,
      votesUp: 0,
      createdAt: new Date().toISOString()
    });
    setIsAddingSpot(false);
    setNewSpot({ title: '', city: 'Neuquén Capital', type: 'Skatepark', description: '', images: ['', '', '', ''], lat: '', lng: '' });
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    const videoId = newVideo.youtubeUrl.split('v=')[1]?.split('&')[0] || newVideo.youtubeUrl.split('/').pop();
    await addDoc(collection(db, 'videos'), {
      ...newVideo,
      videoId,
      creatorId: user.uid,
      createdAt: new Date().toISOString()
    });
    setIsAddingVideo(false);
    setNewVideo({ title: '', youtubeUrl: '' });
  };

  const handleVote = async (spotId, field) => {
    await updateDoc(doc(db, 'spots', spotId), { [field]: increment(1) });
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-24 selection:bg-red-600">
      <nav className="sticky top-0 z-50 bg-black/95 border-b border-zinc-900 px-6 py-4 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('explore')}>
            {appSettings.logoUrl ? (
              <img src={appSettings.logoUrl} alt="AGGRETV" className="h-10 w-auto rounded-lg" />
            ) : (
              <div className="bg-red-600 p-2 rounded-xl"><Navigation size={22} /></div>
            )}
            <h1 className="text-2xl font-black italic uppercase tracking-tighter hidden sm:block text-white">AGGRETV</h1>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => setActiveTab('explore')} className={`text-xs font-black uppercase tracking-widest ${activeTab === 'explore' ? 'text-red-600 border-b-2 border-red-600 pb-1' : 'text-zinc-500 hover:text-white'}`}>Spots</button>
            <button onClick={() => setActiveTab('riders')} className={`text-xs font-black uppercase tracking-widest ${activeTab === 'riders' ? 'text-red-600 border-b-2 border-red-600 pb-1' : 'text-zinc-500 hover:text-white'}`}>Riders</button>
            <button onClick={() => setActiveTab('videos')} className={`text-xs font-black uppercase tracking-widest ${activeTab === 'videos' ? 'text-red-600 border-b-2 border-red-600 pb-1' : 'text-zinc-500 hover:text-white'}`}>Media</button>
          </div>

          <div className="flex items-center gap-4">
            {!user ? (
              <Button onClick={handleLogin} className="py-2 text-xs">Login Google</Button>
            ) : (
              <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-3 group">
                <div className="text-right hidden sm:block">
                  <p className="text-[9px] font-black uppercase text-red-600">Rider Online</p>
                  <p className="text-xs font-bold group-hover:text-red-600 transition-colors">{userProfile?.name || "Cargando..."}</p>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-red-600 p-0.5 overflow-hidden">
                   {user.photoURL ? <img src={user.photoURL} className="w-full h-full rounded-full" alt="avatar" /> : <User size={20} />}
                </div>
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-16 border-l-4 border-red-600 pl-6">
          <div className="space-y-2">
            <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
              {activeTab === 'explore' ? 'Spots' : activeTab === 'riders' ? 'Riders' : 'Media'}
            </h2>
            <p className="text-zinc-500 font-black uppercase text-xs tracking-widest flex items-center gap-2">
              <Globe size={14} className="text-red-600" /> Argentina / {cityFilter}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <select className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-2 ring-red-600 text-white" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
              <option value="All">🇦🇷 Filtrar Ciudad</option>
              {CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {user && activeTab === 'explore' && <Button onClick={() => setIsAddingSpot(true)}><Plus size={20} /> NUEVO SPOT</Button>}
            {user && activeTab === 'videos' && <Button onClick={() => setIsAddingVideo(true)}><Video size={20} /> SUBIR MEDIA</Button>}
          </div>
        </div>

        {}
        {activeTab === 'explore' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {spots.filter(s => cityFilter === 'All' || s.city === cityFilter).map(spot => (
              <div key={spot.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden group hover:border-red-600 transition-all">
                <ImageCarousel images={spot.images} />
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-black uppercase italic group-hover:text-red-600 transition-colors leading-none text-white">{spot.title}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => handleVote(spot.id, 'votesUp')} className="text-zinc-500 hover:text-red-600 flex items-center gap-1 text-xs font-black">
                        <ThumbsUp size={14} /> {spot.votesUp || 0}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                    <MapPin size={12} className="text-red-600" /> {spot.city} • {spot.type}
                  </div>
                  <p className="text-zinc-400 text-sm italic line-clamp-2 border-l-2 border-zinc-800 pl-3">"{spot.description}"</p>
                  <Button variant="secondary" className="w-full text-[10px]" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`, '_blank')}>ABRIR EN GOOGLE MAPS</Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'riders' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {riders.filter(r => cityFilter === 'All' || r.city === cityFilter).map(rider => (
              <div key={rider.uid} className="bg-zinc-950 border border-zinc-900 p-8 rounded-2xl text-center space-y-5 group hover:border-red-600 transition-all">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="w-full h-full bg-zinc-900 border-2 border-red-600 rounded-3xl flex items-center justify-center overflow-hidden">
                    <User size={40} className="text-red-600" />
                  </div>
                  {rider.isAdmin && <div className="absolute -bottom-2 -right-2 bg-red-600 p-1.5 rounded-lg shadow-lg"><ShieldCheck size={16} className="text-white"/></div>}
                </div>
                <div>
                  <h4 className="font-black italic uppercase text-xl leading-none text-white">{rider.name}</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2">{rider.city}</p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  {rider.instagram && <Button variant="secondary" className="p-3" onClick={() => window.open(`https://instagram.com/${rider.instagram}`)}><InstagramIcon size={18} /></Button>}
                  {rider.whatsapp && <Button variant="secondary" className="p-3" onClick={() => window.open(`https://wa.me/${rider.whatsapp}`)}><WhatsAppIcon size={18} /></Button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {videos.map(vid => (
               <div key={vid.id} className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden group hover:border-red-600 transition-all">
                  <div className="aspect-video bg-black">
                    <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${vid.videoId}`} frameBorder="0" allowFullScreen title={vid.title}></iframe>
                  </div>
                  <div className="p-6">
                    <h4 className="font-black uppercase italic text-xl text-white">{vid.title}</h4>
                  </div>
               </div>
            ))}
          </div>
        )}
      </main>

      {}
      {isAddingSpot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/80">
          <div className="bg-zinc-950 border border-red-600/30 p-8 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-3xl font-black italic uppercase text-white">Nuevo <span className="text-red-600">Spot</span></h3>
              <X className="cursor-pointer text-zinc-500" onClick={() => setIsAddingSpot(false)} />
            </div>
            <form onSubmit={handleAddSpot} className="space-y-4">
              <input required className="w-full bg-zinc-900 p-4 rounded-xl outline-none border border-transparent focus:border-red-600 text-white" placeholder="Nombre" value={newSpot.title} onChange={e => setNewSpot({...newSpot, title: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-zinc-900 p-4 rounded-xl outline-none text-white" value={newSpot.city} onChange={e => setNewSpot({...newSpot, city: e.target.value})}>
                  {CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="bg-zinc-900 p-4 rounded-xl outline-none text-white" value={newSpot.type} onChange={e => setNewSpot({...newSpot, type: e.target.value})}>
                  {SPOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <textarea className="w-full bg-zinc-900 p-4 rounded-xl outline-none h-24 text-sm text-white" placeholder="Descripción: seguridad, estado del piso, horarios..." value={newSpot.description} onChange={e => setNewSpot({...newSpot, description: e.target.value})} />
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Imágenes (Links de Drive/Web)</p>
                {newSpot.images.map((img, i) => (
                  <input key={i} className="w-full bg-zinc-900 p-3 rounded-lg text-xs outline-none focus:border-red-600 text-white" placeholder={`Link de Imagen ${i+1}`} value={img} onChange={e => {
                    const ims = [...newSpot.images]; ims[i] = e.target.value; setNewSpot({...newSpot, images: ims});
                  }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full bg-zinc-900 p-3 rounded-lg text-xs outline-none text-white" placeholder="Latitud (-38.95)" value={newSpot.lat} onChange={e => setNewSpot({...newSpot, lat: e.target.value})} />
                <input className="w-full bg-zinc-900 p-3 rounded-lg text-xs outline-none text-white" placeholder="Longitud (-68.05)" value={newSpot.lng} onChange={e => setNewSpot({...newSpot, lng: e.target.value})} />
              </div>
              <Button type="submit" className="w-full py-4 mt-4">PUBLICAR SPOT</Button>
            </form>
          </div>
        </div>
      )}

      {isEditingProfile && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 backdrop-blur-md bg-black/90">
          <div className="bg-zinc-950 border border-red-600/30 p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-4xl font-black italic uppercase mb-8 text-white">Mi <span className="text-red-600">Perfil</span></h3>
            <form onSubmit={handleSaveProfile} className="space-y-6 text-white">
              <input required className="w-full bg-zinc-900 p-4 rounded-2xl outline-none focus:ring-2 ring-red-600 text-white" placeholder="Nombre de Rider" value={editProfile.name} onChange={e => setEditProfile({...editProfile, name: e.target.value})} />
              <select className="w-full bg-zinc-900 p-4 rounded-2xl outline-none text-white" value={editProfile.city} onChange={e => setEditProfile({...editProfile, city: e.target.value})}>
                {CITIES_ARGENTINA.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input className="w-full bg-zinc-900 p-4 rounded-2xl outline-none text-white" placeholder="Instagram (sin @)" value={editProfile.instagram} onChange={e => setEditProfile({...editProfile, instagram: e.target.value})} />
                <input className="w-full bg-zinc-900 p-4 rounded-2xl outline-none text-white" placeholder="WhatsApp" value={editProfile.whatsapp} onChange={e => setEditProfile({...editProfile, whatsapp: e.target.value})} />
              </div>
              
              <div className="p-6 bg-zinc-900/50 rounded-3xl border border-zinc-800 space-y-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="adminCheck" checked={editProfile.isAdmin} onChange={e => setEditProfile({...editProfile, isAdmin: e.target.checked})} className="w-6 h-6 accent-red-600" />
                  <label htmlFor="adminCheck" className="text-xs font-black uppercase flex items-center gap-2 cursor-pointer"><Settings size={14}/> MODO ADMINISTRADOR</label>
                </div>
                {editProfile.isAdmin && (
                   <div className="space-y-2 pt-2 border-t border-zinc-800">
                     <label className="text-[9px] font-black uppercase text-red-600 tracking-widest flex items-center gap-2"><Zap size={10}/> Link Logo Global</label>
                     <input className="w-full bg-black p-3 rounded-xl text-xs outline-none border border-red-600/20 text-white" placeholder="URL de imagen del logo" value={editLogoUrl} onChange={e => setEditLogoUrl(e.target.value)} />
                   </div>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button type="submit" className="w-full py-5 text-sm">GUARDAR PERFIL</Button>
                <button type="button" onClick={handleLogout} className="text-zinc-600 hover:text-red-600 text-[10px] font-black uppercase flex items-center justify-center gap-2 py-4 transition-colors">
                  Cerrar Sesión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}