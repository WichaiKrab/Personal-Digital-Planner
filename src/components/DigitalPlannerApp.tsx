import React, { useState, useEffect } from 'react';
import { 
  Home, CalendarDays, Target, Heart, Lightbulb, Flower2,
  BookOpen, CheckCircle2, Circle, ChevronLeft, ChevronRight,
  Plus, Image as ImageIcon, Loader2, Trash2,
  Type, Move, Palette, ChevronDown
} from 'lucide-react';
import { db, auth, loginWithGoogle, logout } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, setDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, addDoc } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths } from 'date-fns';
import { motion } from 'motion/react';
import Swal from 'sweetalert2';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-rose-400 animate-spin mb-4" />
        <p className="text-rose-900 font-display font-medium animate-pulse uppercase tracking-widest text-sm">Initializing Planner...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl border-4 border-white ring-1 ring-black/5 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <Heart className="w-12 h-12 text-rose-500 fill-rose-200" />
          </div>
          <h1 className="text-4xl font-display font-bold text-gray-800 mb-2 leading-tight uppercase">Digital <span className="text-rose-400">Planner</span></h1>
          <p className="text-xs font-medium text-gray-400 tracking-[0.2em] mb-10 italic uppercase">Your private journey starts here</p>
          
          <button 
            onClick={loginWithGoogle}
            className="w-full py-5 px-6 rounded-2xl bg-white border-2 border-gray-100 hover:border-rose-200 hover:bg-rose-50 text-gray-700 font-bold transition-all flex items-center justify-center gap-4 shadow-sm active:scale-95 group"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
            Sign in with Google
          </button>
          
          <p className="mt-8 text-[10px] text-gray-300 font-medium uppercase tracking-widest leading-relaxed">
            By signing in, your data will be saved securely and privately to your account.
          </p>
        </div>
      </div>
    );
  }

  return <DigitalPlannerApp userId={user.uid} userEmail={user.email || ''} />;
}

function DigitalPlannerApp({ userId, userEmail }: { userId: string, userEmail: string }) {
  const [activeTab, setActiveTab] = useState('index');
  const [currentTheme, setCurrentTheme] = useState('pink');
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [habits, setHabits] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [dailyNotes, setDailyNotes] = useState<any[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());

  const themes: Record<string, any> = {
    pink: { bg: 'bg-rose-50', surface: 'bg-white', primary: 'bg-rose-200', primaryHover: 'hover:bg-rose-300', text: 'text-rose-900', textMuted: 'text-rose-500', border: 'border-rose-100', accent: 'bg-rose-100', accentText: 'text-rose-700' },
    blue: { bg: 'bg-blue-50', surface: 'bg-white', primary: 'bg-blue-200', primaryHover: 'hover:bg-blue-300', text: 'text-blue-900', textMuted: 'text-blue-500', border: 'border-blue-100', accent: 'bg-blue-100', accentText: 'text-blue-700' },
    black: { bg: 'bg-gray-100', surface: 'bg-white', primary: 'bg-gray-300', primaryHover: 'hover:bg-gray-400', text: 'text-gray-900', textMuted: 'text-gray-500', border: 'border-gray-200', accent: 'bg-gray-200', accentText: 'text-gray-700' },
    green: { bg: 'bg-teal-50', surface: 'bg-white', primary: 'bg-teal-200', primaryHover: 'hover:bg-teal-300', text: 'text-teal-900', textMuted: 'text-teal-500', border: 'border-teal-100', accent: 'bg-teal-100', accentText: 'text-teal-700' },
    purple: { bg: 'bg-purple-50', surface: 'bg-white', primary: 'bg-purple-200', primaryHover: 'hover:bg-purple-300', text: 'text-purple-900', textMuted: 'text-purple-500', border: 'border-purple-100', accent: 'bg-purple-100', accentText: 'text-purple-700' }
  };
  const theme = themes[currentTheme];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    useEffect(() => {
      if (!userId) return;
      const unsubUser = onSnapshot(doc(db, `users/${userId}`), (snapshot) => {
          if (snapshot.exists() && snapshot.data().theme) {
              setCurrentTheme(snapshot.data().theme);
          } else {
              setDoc(doc(db, `users/${userId}`), { theme: 'pink', createdAt: serverTimestamp() });
          }
      }, (error) => console.error("Snapshot error (user):", error));
      
      const yearPath = `users/${userId}/years/${selectedYear}`;
      
      const unsubHabits = onSnapshot(query(collection(db, `${yearPath}/habits`), orderBy('createdAt', 'asc')), (snapshot) => setHabits(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))), (error) => console.error("Snapshot error (habits):", error));
      const unsubMissions = onSnapshot(collection(db, `${yearPath}/missions`), (snapshot) => setMissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))), (error) => console.error("Snapshot error (missions):", error));
      const unsubMemories = onSnapshot(query(collection(db, `${yearPath}/memories`), orderBy('createdAt', 'desc')), (snapshot) => setMemories(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))), (error) => console.error("Snapshot error (memories):", error));
      const unsubJournals = onSnapshot(collection(db, `${yearPath}/journals`), (snapshot) => setJournals(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))), (error) => console.error("Snapshot error (journals):", error));
      const unsubSubs = onSnapshot(query(collection(db, `${yearPath}/subscriptions`), orderBy('order', 'asc')), (snapshot) => setSubscriptions(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))), (error) => console.error("Snapshot error (subs):", error));
      const unsubMems = onSnapshot(query(collection(db, `${yearPath}/memberships`), orderBy('order', 'asc')), (snapshot) => setMemberships(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))), (error) => console.error("Snapshot error (mems):", error));
      const unsubDailyNotes = onSnapshot(collection(db, `${yearPath}/dailynotes`), (snapshot) => setDailyNotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))), (error) => console.error("Snapshot error (dailynotes):", error));
      
      return () => { 
        unsubUser(); unsubHabits(); unsubMissions(); unsubMemories(); unsubJournals(); unsubSubs(); unsubMems(); unsubDailyNotes(); 
      };
    }, [userId, selectedYear]);

  const changeTheme = async (newTheme: string) => {
    setCurrentTheme(newTheme);
    await updateDoc(doc(db, `users/${userId}`), { theme: newTheme });
  };

  const NavigationTabs = () => {
    const tabs = [
      { id: 'index', icon: Home, label: 'Index' }, { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
      { id: 'mission', icon: Target, label: 'Mission' }, { id: 'memories', icon: Heart, label: 'Memories' },
      { id: 'keydate', icon: Lightbulb, label: 'Key Date' }, { id: 'journal', icon: Flower2, label: 'Mini Journal' },
      { id: 'subscription', icon: BookOpen, label: 'Subscription' },
    ];
    return (
      <div className={`flex items-center gap-1 p-1.5 md:p-2 ${theme.surface} rounded-3xl shadow-xl border-4 border-white/80 ring-1 ring-black/5 w-full md:w-auto`}>
        <div className="flex flex-1 md:flex-none gap-1 overflow-x-auto hide-scrollbar scroll-smooth">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center p-2 md:p-3 rounded-xl transition-all duration-200 shrink-0 min-w-[40px] md:min-w-[45px] ${activeTab === tab.id ? theme.primary + ' shadow-inner scale-95' : 'hover:bg-gray-50'}`} title={tab.label}>
              <tab.icon className={`w-5 h-5 md:w-6 md:h-6 ${activeTab === tab.id ? theme.text : 'text-gray-400'}`} />
            </button>
          ))}
        </div>
        <div className="w-px h-8 bg-gray-100 mx-1 shrink-0" />
        <div className="flex items-center gap-1 shrink-0">
           <div className="relative">
              <button 
                onClick={() => setIsThemeOpen(!isThemeOpen)}
                className={`flex items-center gap-1 p-2 md:p-3 rounded-xl transition-all ${isThemeOpen ? theme.primary + ' shadow-inner' : 'hover:bg-gray-50 text-gray-400'}`}
                title="Select Theme"
              >
                <Palette className={`w-5 h-5 md:w-6 md:h-6 ${isThemeOpen ? theme.text : ''}`} />
                <ChevronDown size={14} className={isThemeOpen ? 'rotate-180' : ''} />
              </button>
              
              {isThemeOpen && (
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setIsThemeOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute top-full right-0 mt-3 p-3 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] grid grid-cols-5 gap-3 min-w-[180px]"
                  >
                    {Object.keys(themes).map((color) => (
                       <button 
                         key={color} 
                         onClick={() => { changeTheme(color); setIsThemeOpen(false); }}
                         className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 shadow-sm
                           ${currentTheme === color ? 'border-gray-800' : 'border-transparent'}
                           ${color === 'pink' ? 'bg-rose-300' : ''} 
                           ${color === 'blue' ? 'bg-blue-400' : ''}
                           ${color === 'black' ? 'bg-gray-700' : ''} 
                           ${color === 'green' ? 'bg-teal-400' : ''}
                           ${color === 'purple' ? 'bg-purple-400' : ''}
                         `} 
                       />
                    ))}
                    <div className="col-span-5 border-t border-gray-50 pt-2 mt-1">
                      <button 
                        onClick={() => {
                          Swal.fire({
                            title: 'Sign out?',
                            text: `Logged in as: ${userEmail}`,
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonColor: '#f43f5e',
                            confirmButtonText: 'Log Out'
                          }).then((result) => {
                            if (result.isConfirmed) {
                              logout();
                            }
                          });
                        }}
                        className="w-full text-center text-[10px] font-bold text-gray-400 hover:text-rose-500 transition-colors uppercase tracking-[0.2em] py-1"
                      >
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
           </div>

        </div>
      </div>
    );
  };


  const IndexView = () => (
    <div className={`h-full p-6 md:p-10 rounded-3xl ${theme.surface} border ${theme.border} shadow-sm animate-in fade-in zoom-in-95 duration-300 flex flex-col`}>
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-center gap-6 mb-10">
            <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={24}/></button>
            <h2 className={`text-3xl font-display font-bold ${theme.text} text-center tracking-widest uppercase`}>{selectedYear} Index</h2>
            <button onClick={() => setSelectedYear(selectedYear + 1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={24}/></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 flex-grow overflow-y-auto pr-2 pb-10">
          <div className="space-y-8">
            <div>
              <h3 className="font-bold text-gray-400 text-xs tracking-widest uppercase mb-3 border-b pb-2">Yearly Pages</h3>
              <ul className="space-y-3 text-gray-700 text-sm font-medium">
                {[
                  {label: 'Calendar', tab:'calendar'}, 
                  {label: 'Mission of the Year', tab:'mission'}, 
                  {label: 'Room of Memories', tab:'memories'},
                  {label: 'Key Date', tab:'keydate'}
                ].map(item => (
                  <li key={item.label} onClick={() => {
                      if (item.tab === 'calendar') setCurrentDate(new Date());
                      setActiveTab(item.tab);
                  }} className={`cursor-pointer hover:${theme.accentText} transition-colors flex items-center gap-2 group`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${theme.primary} group-hover:scale-125 transition-transform`}></div> {item.label}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-400 text-xs tracking-widest uppercase mb-3 border-b pb-2">Monthly Plan</h3>
              <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
                {months.map((m, idx) => (
                    <div 
                        key={m} 
                        onClick={() => {
                            setCurrentDate(new Date(selectedYear, idx, 1));
                            setActiveTab('calendar');
                        }} 
                        className={`cursor-pointer hover:${theme.primary} hover:bg-opacity-50 py-1.5 rounded text-center transition-colors font-medium`}
                    >
                        {m}
                    </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-8">
            <div>
              <h3 className="font-bold text-gray-400 text-xs tracking-widest uppercase mb-3 border-b pb-2">More</h3>
               <ul className="space-y-3 text-gray-700 text-sm font-medium">
                 {[ 
                   {label: 'Mini Journal', tab:'journal'}, 
                   {label: 'Subscription & Membership', tab:'subscription'}
                 ].map(item => (
                  <li key={item.label} onClick={() => setActiveTab(item.tab)} className={`cursor-pointer hover:${theme.accentText} transition-colors flex items-center gap-2 group`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${theme.primary} group-hover:scale-125 transition-transform`}></div> {item.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const CalendarView = () => {
    const handleAddHabit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newGoal.trim()) {
        await addDoc(collection(db, `users/${userId}/years/${selectedYear}/habits`), {
          text: newGoal.trim(), completed: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
        setNewGoal('');
        setIsAddingGoal(false);
      }
    };
    
    const saveDailyNote = async (dateId: string, content: string) => {
        await setDoc(doc(db, `users/${userId}/years/${selectedYear}/dailynotes/${dateId}`), {
            dateId, content, updatedAt: serverTimestamp()
        });
    };

    const toggleHabit = async (habit: any) => {
      await updateDoc(doc(db, `users/${userId}/years/${selectedYear}/habits/${habit.id}`), {
        completed: !habit.completed, updatedAt: serverTimestamp()
      });
    };
    const deleteHabit = async (habitId: string) => {
        const result = await Swal.fire({
            title: 'Delete this goal?',
            text: "This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Delete!',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-3xl',
                title: 'font-display',
                confirmButton: 'rounded-xl font-bold px-6 py-2 mx-1',
                cancelButton: 'rounded-xl font-bold px-6 py-2 mx-1'
            }
        });
        if(result.isConfirmed) { await deleteDoc(doc(db, `users/${userId}/years/${selectedYear}/habits/${habitId}`)); }
    };

    const updateHabitText = async (habitId: string, newText: string) => {
        if (!newText.trim()) return;
        await updateDoc(doc(db, `users/${userId}/years/${selectedYear}/habits/${habitId}`), {
            text: newText.trim(), updatedAt: serverTimestamp()
        });
    };
    const openNoteEditor = async (day: Date, currentContent: string) => {
        const dateId = format(day, 'yyyy-MM-dd');
        const formattedDate = format(day, 'EEEE, d MMMM yyyy');
        
        const { value: text } = await Swal.fire({
            title: formattedDate,
            input: 'textarea',
            inputLabel: 'What\'s happening today?',
            inputValue: currentContent,
            inputPlaceholder: 'Type your note here...',
            inputAttributes: {
                'aria-label': 'Type your note here'
            },
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Save Note',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-3xl',
                title: 'font-display text-lg font-bold',
                input: 'rounded-xl text-sm'
            }
        });

        if (text !== undefined) {
            await saveDailyNote(dateId, text);
        }
    };

    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    const firstDayIndex = getDay(start);
    const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);
    return (
      <div className="flex flex-col lg:flex-row gap-6 h-full animate-in fade-in duration-300">
        <div className={`w-full lg:w-1/3 p-6 rounded-3xl ${theme.surface} border ${theme.border} shadow-sm flex flex-col z-10`}>
          <div className={`text-center py-2 px-6 rounded-full font-display ${theme.primary} font-bold text-gray-800 mb-6 mx-auto`}>" Main goals "</div>
          <div className="space-y-4 flex-grow overflow-y-auto pr-2">
            {habits.map(habit => (
              <div key={habit.id} className="flex items-start gap-3 group bg-white/40 p-2 rounded-xl border border-transparent hover:border-gray-100 transition-all">
                <div className={`mt-0.5 cursor-pointer transition-colors ${habit.completed ? theme.text : 'text-gray-300 group-hover:text-gray-400'}`} onClick={() => toggleHabit(habit)}>
                  {habit.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </div>
                <textarea 
                  key={`${habit.id}-${habit.text}`}
                  defaultValue={habit.text}
                  onBlur={(e) => updateHabitText(habit.id, e.target.value)}
                  rows={2}
                  className={`text-sm md:text-base flex-1 leading-snug bg-transparent border-none outline-none focus:ring-1 focus:ring-rose-100 rounded px-1 resize-none ${habit.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                />
                <button onClick={() => deleteHabit(habit.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
              </div>
            ))}
            {isAddingGoal && (
               <form onSubmit={handleAddHabit} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200 animate-in slide-in-from-top-2">
                  <textarea 
                    autoFocus
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="Type your goal..."
                    rows={3}
                    className="w-full bg-white border border-gray-100 rounded-lg p-3 text-sm outline-none focus:ring-2 ring-rose-200 resize-none"
                  />
                  <div className="flex gap-2">
                    <button type="submit" className={`flex-1 ${theme.primary} py-2 rounded-lg text-xs font-bold`}>Save</button>
                    <button type="button" onClick={() => setIsAddingGoal(false)} className="flex-1 bg-gray-200 py-2 rounded-lg text-xs font-bold">Cancel</button>
                  </div>
               </form>
            )}
          </div>
          {!isAddingGoal && (
            <button onClick={() => setIsAddingGoal(true)} className={`mt-6 shrink-0 w-full py-4 rounded-xl border-2 border-dashed ${theme.border} text-gray-600 font-bold hover:${theme.primaryHover} hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 active:scale-95`}>
              <Plus size={20} /> Add new goal
            </button>
          )}
        </div>
        <div className={`w-full lg:w-2/3 flex flex-col rounded-3xl ${theme.surface} border ${theme.border} shadow-sm overflow-hidden min-h-[500px]`}>
          <div className="p-4 md:p-6 flex justify-between items-center border-b border-gray-100">
            <div>
              <h1 className={`text-3xl md:text-5xl font-display font-bold ${theme.text} tracking-tight uppercase`}>{format(currentDate, 'MMM')}</h1>
            </div>
            <div className="flex gap-2 items-center">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"><ChevronLeft size={24} /></button>
              <button 
                onClick={() => {
                  const today = new Date();
                  setCurrentDate(new Date(selectedYear, today.getMonth(), today.getDate()));
                }} 
                className={`px-6 py-2 rounded-full border ${theme.border} text-lg md:text-xl font-display font-bold ${theme.text} hover:${theme.primary} transition-all shadow-sm bg-white active:scale-95`}
              >
                {format(currentDate, 'yyyy')}
              </button>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"><ChevronRight size={24} /></button>
            </div>
          </div>
          <div className="flex-grow p-2 md:p-4 bg-gray-50/50 flex flex-col overflow-y-auto">
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className={`text-center text-[10px] md:text-xs font-bold uppercase tracking-wider ${day === 'Sun' || day === 'Sat' ? theme.textMuted : 'text-gray-500'}`}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 md:gap-2 auto-rows-fr">
              {blanks.map(b => <div key={`blank-${b}`} className="min-h-[70px] md:min-h-[100px]" />)}
              {days.map(day => {
                  const dateId = format(day, 'yyyy-MM-dd');
                  const note = dailyNotes.find(n => n.dateId === dateId);
                  const dayOfWeek = getDay(day);
                  const isSunSat = dayOfWeek === 0 || dayOfWeek === 6;
                  
                  const dayColors = [
                    'bg-red-50 border-red-100',    // Sun
                    'bg-yellow-50 border-yellow-100', // Mon
                    'bg-pink-50 border-pink-100',    // Tue
                    'bg-emerald-50 border-emerald-100', // Wed
                    'bg-orange-50 border-orange-100', // Thu
                    'bg-sky-50 border-sky-100',   // Fri
                    'bg-purple-50 border-purple-100', // Sat
                  ];

                  return (
                    <div 
                      key={dateId} 
                      onClick={() => openNoteEditor(day, note?.content || '')}
                      className={`relative flex flex-col p-1 md:p-2 rounded-lg md:rounded-xl border transition-all min-h-[75px] md:min-h-[100px] cursor-pointer group active:scale-95
                        ${isToday(day) 
                          ? `bg-white border-2 ${theme.border} ring-2 ring-white shadow-md z-10 scale-105` 
                          : note?.content 
                            ? `${dayColors[dayOfWeek]} shadow-inner` 
                            : 'border-gray-100 bg-white/60 hover:bg-white hover:border-gray-200 shadow-sm'}`}
                    >
                      <span className={`text-[10px] md:text-xs font-bold mb-1 ${isSunSat ? theme.textMuted : 'text-gray-500'}`}>{format(day, 'd')}</span>
                      <div className="flex-grow text-[9px] md:text-xs text-gray-600 overflow-hidden leading-tight line-clamp-3 md:line-clamp-none break-words whitespace-pre-wrap">
                        {note?.content || ''}
                      </div>
                      {!note?.content && <div className="hidden group-hover:block absolute bottom-1 right-1 opacity-25"><Plus size={10}/></div>}
                    </div>
                  );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MissionView = () => {
    const handleMissionChange = async (month: string, text: string) => {
        await setDoc(doc(db, `users/${userId}/years/${selectedYear}/missions/${month}`), { month, missionText: text, updatedAt: serverTimestamp() }, { merge: true });
    };

    const openMissionEditor = async (month: string, currentText: string) => {
        const { value: text } = await Swal.fire({
            title: `${month} Mission`,
            input: 'textarea',
            inputValue: currentText,
            inputPlaceholder: 'What is your mission for this month?',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Save Mission',
            customClass: {
                popup: 'rounded-3xl',
                title: 'font-display font-bold',
                input: 'rounded-xl text-sm'
            }
        });

        if (text !== undefined) {
            await handleMissionChange(month, text);
        }
    };

    return (
      <div className={`h-full p-4 md:p-8 rounded-3xl ${theme.surface} border ${theme.border} shadow-sm animate-in fade-in duration-300 flex flex-col`}>
        <div className="flex justify-between items-center mb-6 px-2">
          <h2 className={`text-xl md:text-3xl font-display font-bold ${theme.text} uppercase tracking-widest`}>Mission {selectedYear}</h2>
          <span className="text-gray-400 font-medium tracking-widest text-sm md:text-base">{selectedYear}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 flex-grow overflow-y-auto pr-1">
          {fullMonths.map((m) => {
            const missionDoc = missions.find(x => x.month === m);
            return (
              <div 
                key={m} 
                onClick={() => openMissionEditor(m, missionDoc?.missionText || '')}
                className={`group flex flex-col border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/50 min-h-[140px] md:min-h-[160px] cursor-pointer transition-all hover:border-rose-200 hover:shadow-md active:scale-95`}
              >
                <div className={`h-1.5 md:h-2 shrink-0 ${theme.primary} transition-colors group-hover:bg-rose-300`}></div>
                <div className="p-2 md:p-3 flex-grow flex flex-col">
                  <h3 className="text-center font-bold text-gray-500 text-[10px] md:text-xs uppercase tracking-wider mb-2">{m}</h3>
                  <div className="flex-grow text-[11px] md:text-sm text-gray-700 leading-tight italic whitespace-pre-wrap break-words">
                    {missionDoc?.missionText ? `${missionDoc.missionText}` : <span className="text-gray-300 font-normal">Tap to add mission...</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  const MemoriesView = () => {
    const containerRef = React.useRef<HTMLDivElement>(null);

    const addMemory = async (type: 'photo' | 'note') => {
        if (type === 'photo') {
            const { value: file } = await Swal.fire({
                title: 'Select Photo',
                input: 'file',
                inputAttributes: {
                    'accept': 'image/*',
                    'aria-label': 'Upload your photo memory'
                },
                showCancelButton: true,
                confirmButtonColor: '#f43f5e',
                cancelButtonColor: '#94a3b8',
                confirmButtonText: 'Select Image',
                customClass: {
                    popup: 'rounded-3xl',
                    title: 'font-display font-bold',
                    input: 'rounded-xl'
                }
            });

            if (file) {
                if (file.size > 800000) { // Approx 800KB limit for base64 in Firestore (1MB doc limit)
                    Swal.fire({
                        icon: 'error',
                        title: 'File too large',
                        text: 'Please select an image smaller than 800KB.',
                        confirmButtonColor: '#f43f5e',
                        customClass: { popup: 'rounded-3xl' }
                    });
                    return;
                }

                const reader = new FileReader();
                Swal.fire({
                    title: 'Processing...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    },
                    customClass: { popup: 'rounded-3xl' }
                });

                reader.onload = async (e) => {
                    const base64 = e.target?.result as string;
                    Swal.close();
                    
                    const { value: title } = await Swal.fire({
                        title: 'Give it a title',
                        input: 'text',
                        inputPlaceholder: 'My awesome memory...',
                        showCancelButton: true,
                        confirmButtonColor: '#f43f5e',
                        cancelButtonColor: '#94a3b8',
                        confirmButtonText: 'Add to Room',
                        customClass: {
                            popup: 'rounded-3xl',
                            title: 'font-display font-bold',
                            input: 'rounded-xl'
                        }
                    });

                    if (title !== undefined) {
                        try {
                            await addDoc(collection(db, `users/${userId}/years/${selectedYear}/memories`), {
                                type: 'photo',
                                title: title || 'Memory',
                                imageUrl: base64,
                                x: Math.random() * (window.innerWidth < 768 ? 100 : 600),
                                y: Math.random() * (window.innerWidth < 768 ? 200 : 300),
                                rotate: (Math.random() - 0.5) * 20,
                                color: '#ffffff',
                                createdAt: serverTimestamp()
                            });
                            Swal.fire({
                                icon: 'success',
                                toast: true,
                                position: 'top-end',
                                timer: 2000,
                                showConfirmButton: false,
                                title: 'Added photo!'
                            });
                        } catch (err: any) {
                            console.error(err);
                            const msg = err?.message || 'Something went wrong while saving.';
                            Swal.fire({ icon: 'error', title: 'Oops...', text: msg });
                        }
                    }
                };
                reader.readAsDataURL(file);
            }
        } else {
            const stickerColors = [
                { name: 'Sand', value: '#fef3c7' },
                { name: 'Mint', value: '#dcfce7' },
                { name: 'Sky', value: '#dbeafe' },
                { name: 'Rose', value: '#fce7f3' },
                { name: 'Lavender', value: '#ede9fe' },
                { name: 'Cloud', value: '#f3f4f6' }
            ];

            const { value: formValues } = await Swal.fire({
                title: 'Add New Note',
                html: `
                    <textarea id="swal-note-text" class="swal2-textarea" placeholder="Write your message here..." style="margin-bottom: 20px;"></textarea>
                    <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 10px;">
                        ${stickerColors.map(c => `
                            <div class="color-option" data-color="${c.value}" title="${c.name}" style="
                                width: 32px; height: 32px; border-radius: 50%; background-color: ${c.value}; 
                                cursor: pointer; border: 2px solid transparent; transition: all 0.2s;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            " onclick="
                                document.querySelectorAll('.color-option').forEach(el => el.style.borderColor = 'transparent');
                                this.style.borderColor = '#f43f5e';
                                window._swalSelectedColor = '${c.value}';
                            "></div>
                        `).join('')}
                    </div>
                `,
                didOpen: () => {
                    // Pre-select first color
                    const firstOption = document.querySelector('.color-option') as HTMLElement;
                    if (firstOption) firstOption.click();
                },
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonColor: '#f43f5e',
                cancelButtonColor: '#94a3b8',
                confirmButtonText: 'Add to Room',
                customClass: {
                    popup: 'rounded-3xl',
                    title: 'font-display font-bold',
                },
                preConfirm: () => {
                    const text = (document.getElementById('swal-note-text') as HTMLTextAreaElement).value;
                    const color = (window as any)._swalSelectedColor;
                    if (!text) {
                        Swal.showValidationMessage('Please write a message');
                        return false;
                    }
                    return { text, color };
                }
            });

            if (formValues) {
                try {
                    await addDoc(collection(db, `users/${userId}/years/${selectedYear}/memories`), {
                        type: 'note',
                        content: formValues.text.trim(),
                        x: Math.random() * (window.innerWidth < 768 ? 100 : 600),
                        y: Math.random() * (window.innerWidth < 768 ? 200 : 300),
                        rotate: (Math.random() - 0.5) * 20,
                        color: formValues.color,
                        createdAt: serverTimestamp()
                    });
                    Swal.fire({
                        icon: 'success',
                        toast: true,
                        position: 'top-end',
                        timer: 2000,
                        showConfirmButton: false,
                        title: 'Added note!'
                    });
                } catch (err: any) {
                    console.error(err);
                    const msg = err?.message || 'Something went wrong.';
                    Swal.fire({ icon: 'error', title: 'Oops...', text: msg });
                }
            }
        }
    };
    const updateMemoryPos = async (id: string, x: number, y: number) => {
        await updateDoc(doc(db, `users/${userId}/years/${selectedYear}/memories/${id}`), { x, y });
    };
    const deleteMemory = async (id: string) => {
        const result = await Swal.fire({
            title: 'Delete this memory?',
            text: "This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Delete!',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-3xl',
                title: 'font-display',
                confirmButton: 'rounded-xl font-bold px-6 py-2 mx-1',
                cancelButton: 'rounded-xl font-bold px-6 py-2 mx-1'
            }
        });
        if(result.isConfirmed) await deleteDoc(doc(db, `users/${userId}/years/${selectedYear}/memories/${id}`));
    };
    return (
      <div className={`min-h-[500px] h-[calc(100vh-200px)] md:h-[600px] p-6 rounded-3xl ${theme.surface} border ${theme.border} flex flex-col relative overflow-hidden`}
           style={{ backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}>
        <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-white/90 backdrop-blur-sm px-3 py-2 md:px-6 md:py-3 rounded-2xl md:rounded-full shadow-md z-30 flex items-center gap-2 md:gap-4 max-w-[calc(100%-2rem)]">
          <h2 className={`text-[10px] sm:text-xs md:text-lg font-display font-bold ${theme.text} uppercase tracking-widest truncate min-w-0`}>Room of Memories {selectedYear}</h2>
          <div className="flex gap-1 md:gap-2 shrink-0">
             <button onClick={() => addMemory('photo')} className={`p-1.5 md:p-2 rounded-full ${theme.primary} hover:scale-110 active:scale-95 transition-all text-gray-800 shadow-sm`} title="Add Photo"><ImageIcon size={14}/><span className="hidden md:inline md:ml-1 md:hidden">Photo</span></button>
             <button onClick={() => addMemory('note')} className={`p-1.5 md:p-2 rounded-full ${theme.primary} hover:scale-110 active:scale-95 transition-all text-gray-800 shadow-sm`} title="Add Note"><Type size={14}/><span className="hidden md:inline md:ml-1 md:hidden">Note</span></button>
          </div>
        </div>
        <div ref={containerRef} className="relative w-full h-full pt-16 p-8 overflow-hidden z-20">
            {memories.map((mem) => {
                const isPhoto = mem.type === 'photo';
                return (
                    <motion.div 
                        key={mem.id} 
                        drag 
                        dragMomentum={false}
                        dragConstraints={containerRef}
                        whileDrag={{ scale: 1.05, zIndex: 100, rotate: 0 }}
                        whileTap={{ zIndex: 90 }}
                        onDragEnd={(_, info) => {
                            updateMemoryPos(mem.id, mem.x + info.offset.x, mem.y + info.offset.y);
                        }}
                        initial={{ x: mem.x || 0, y: mem.y || 0, rotate: mem.rotate || 0 }}
                        animate={{ x: mem.x || 0, y: mem.y || 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.5 }}
                        className={`absolute cursor-move select-none rounded shadow-xl border border-gray-100 group transition-shadow hover:shadow-2xl z-20 ${isPhoto ? 'p-2 pb-8' : 'p-4'}`}
                        style={{ 
                            backgroundColor: mem.color || '#ffffff', 
                            width: '180px',
                            height: 'auto',
                            left: 0,
                            top: 0
                        }}
                    >
                        {isPhoto ? (
                            <div className="w-full aspect-[4/3] bg-gray-50 flex items-center justify-center text-gray-300 rounded-sm border border-gray-100 overflow-hidden relative">
                                {mem.imageUrl ? (
                                    <img src={mem.imageUrl} alt={mem.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                    <ImageIcon size={32} />
                                )}
                            </div>
                        ) : (
                            <div className="text-gray-700 italic font-medium leading-tight break-words overflow-hidden whitespace-pre-wrap">
                                "{mem.content}"
                            </div>
                        )}
                        {isPhoto && <div className="absolute bottom-1.5 w-full text-center left-0 text-[10px] text-gray-500 font-bold truncate px-2 leading-none">{mem.title}</div>}
                        <button onClick={() => deleteMemory(mem.id)} className="absolute -top-3 -right-3 bg-red-500 text-white w-7 h-7 rounded-full hidden group-hover:flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors border-2 border-white"><Trash2 size={12} /></button>
                        <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity"><Move size={12} className="text-gray-400" /></div>
                    </motion.div>
                )
            })}
            {memories.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-medium bg-white/40 pointer-events-none">Click the icons above to start decorating your room!</div>}
        </div>
      </div>
    );
  };

  const KeyDateView = () => {
    const handleSave = async (month: string, line: number, type: 'date' | 'event', val: string) => {
        const id = `${month}_${line}`;
        await setDoc(doc(db, `users/${userId}/years/${selectedYear}/keydates/${id}`), {
            month, line, [type]: val, updatedAt: serverTimestamp()
        }, { merge: true });
    };

    const [kDates, setKDates] = useState<any[]>([]);
    useEffect(() => {
        if (!userId) return;
        const unsub = onSnapshot(collection(db, `users/${userId}/years/${selectedYear}/keydates`), (snap) => {
            setKDates(snap.docs.map(d => d.data()));
        }, (error) => {
            console.error("Firestore error in keydates:", error);
        });
        return unsub;
    }, [userId, selectedYear]);

    const openKeyDateEditor = async (month: string, line: number, data: any) => {
        const { value: formValues } = await Swal.fire({
            title: `${month} - Entry ${line}`,
            html: `
                <div class="space-y-4">
                    <div class="text-left">
                        <label class="text-xs font-bold text-gray-400 uppercase mb-1 block">Date</label>
                        <input id="swal-date" class="swal2-input !m-0 !w-full" placeholder="e.g. 15 or 15-18" value="${data?.date || ''}">
                    </div>
                    <div class="text-left">
                        <label class="text-xs font-bold text-gray-400 uppercase mb-1 block">Event Description</label>
                        <textarea id="swal-event" class="swal2-textarea !m-0 !w-full" placeholder="What is happening?">${data?.event || ''}</textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Save Update',
            customClass: {
                popup: 'rounded-3xl',
                title: 'font-display font-bold',
            },
            preConfirm: () => {
                return {
                    date: (document.getElementById('swal-date') as HTMLInputElement).value,
                    event: (document.getElementById('swal-event') as HTMLTextAreaElement).value
                }
            }
        });

        if (formValues) {
            await handleSave(month, line, 'date', formValues.date);
            await handleSave(month, line, 'event', formValues.event);
        }
    };

    return (
      <div className={`h-full p-6 md:p-8 rounded-3xl ${theme.surface} border ${theme.border} shadow-sm animate-in fade-in flex flex-col`}>
        <h2 className={`text-xl md:text-2xl font-display font-bold mb-6 ${theme.text} uppercase tracking-widest text-center`}>Key Date {selectedYear}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 flex-grow overflow-auto pb-4 pr-1">
          {fullMonths.map((month) => (
            <div key={month} className="flex flex-col border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-lg transition-all">
              <div className={`py-2 md:py-3 text-center font-bold text-xs md:text-sm uppercase tracking-widest bg-gray-50 border-b border-gray-200 text-gray-800`}>{month}</div>
              <div className="flex bg-gray-50 border-b border-gray-100 p-2 font-black text-[9px] md:text-[10px] text-gray-400 tracking-[0.2em] uppercase">
                <div className="w-10 md:w-12 text-center border-r border-gray-200">Date</div><div className="flex-1 text-center">Event</div>
              </div>
              <div className="flex-grow p-0 bg-white">
                {[1,2,3,4,5,6].map(line => {
                  const data = kDates.find(kd => kd.month === month && kd.line === line);
                  return (
                    <div 
                        key={line} 
                        onClick={() => openKeyDateEditor(month, line, data)}
                        className="flex min-h-[36px] md:min-h-[40px] h-auto border-b border-gray-100 last:border-0 hover:bg-rose-50/30 cursor-pointer transition-colors items-center py-2 md:py-3" 
                    >
                      <div className="w-10 md:w-12 border-r border-gray-100 h-full flex items-center justify-center text-[10px] md:text-xs font-bold text-gray-800 shrink-0 px-1 break-all text-center">
                         {data?.date || <span className="text-gray-200">-</span>}
                      </div>
                      <div className="flex-1 px-2 md:px-3 text-[11px] md:text-sm text-gray-700 break-all whitespace-pre-wrap min-w-0">
                         {data?.event || <span className="text-gray-200">...</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const MiniJournalView = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const currentJournal = journals.find(j => j.month === selectedMonth);

    const handleSave = async (content: string) => {
        await setDoc(doc(db, `users/${userId}/years/${selectedYear}/journals/${selectedMonth}`), { month: selectedMonth, content, updatedAt: serverTimestamp() });
    };

    return (
      <div className={`h-[500px] md:h-[600px] p-4 md:p-8 rounded-3xl ${theme.surface} border ${theme.border} flex flex-col`}>
        <div className="flex justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
          <h2 className={`text-2xl font-display font-bold ${theme.text} uppercase tracking-widest`}>Mini Journal {selectedYear}</h2>
          <div className="flex flex-wrap gap-1">
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <button key={m} onClick={() => setSelectedMonth(m)}
                className={`w-8 h-8 rounded-full text-xs font-semibold ${m === selectedMonth ? theme.primary + ' text-gray-800' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-100'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-grow rounded-xl border border-gray-200 relative overflow-hidden bg-white" 
             style={{ 
               backgroundImage: `linear-gradient(#f3f4f6 1px, transparent 1px)`, 
               backgroundSize: '100% 2.5rem',
               backgroundPosition: '0 2.45rem'
             }}>
          <textarea 
            key={`${selectedMonth}-${currentJournal?.content}`}
            defaultValue={currentJournal?.content || ''}
            onBlur={(e) => handleSave(e.target.value)}
            className="absolute inset-0 w-full h-full bg-transparent p-4 md:p-8 outline-none resize-none text-gray-700 leading-[2.5rem] text-sm md:text-base lg:text-lg align-top pt-[0.4rem]"
            placeholder={`Write your story for month ${selectedMonth}... (Auto-saves on blur)`}
          />
        </div>
      </div>
    );
  };

  const SubscriptionView = () => {
    const subSlots = Array.from({length: 10}).map((_, i) => subscriptions.find(s => s.order === i) || { order: i, id: `sub_${i}`, platform: '', channel: '' });
    const memSlots = Array.from({length: 10}).map((_, i) => memberships.find(s => s.order === i) || { order: i, id: `mem_${i}`, channel: '', expired: '' });

    const saveSub = async (order: number, field: string, value: string) => {
        const idStr = `sub_${order}`;
        await setDoc(doc(db, `users/${userId}/years/${selectedYear}/subscriptions/${idStr}`), {
            order, [field]: value, updatedAt: serverTimestamp()
        }, { merge: true });
    };

    const saveMem = async (order: number, field: string, value: string) => {
        const idStr = `mem_${order}`;
        await setDoc(doc(db, `users/${userId}/years/${selectedYear}/memberships/${idStr}`), {
            order, [field]: value, updatedAt: serverTimestamp()
        }, { merge: true });
    };

    const openSubEditor = async (item: any) => {
        const { value: formValues } = await Swal.fire({
            title: `Subscription #${item.order + 1}`,
            html: `
                <div class="space-y-4">
                    <div class="text-left">
                        <label class="text-xs font-bold text-gray-400 uppercase mb-1 block">Platform</label>
                        <input id="swal-platform" class="swal2-input !m-0 !w-full" placeholder="e.g. Netflix" value="${item.platform || ''}">
                    </div>
                    <div class="text-left">
                        <label class="text-xs font-bold text-gray-400 uppercase mb-1 block">Channel/Details</label>
                        <textarea id="swal-channel" class="swal2-textarea !m-0 !w-full" placeholder="Account name or plan details...">${item.channel || ''}</textarea>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#2563eb', // Blue
            confirmButtonText: 'Save Update',
            customClass: { popup: 'rounded-3xl', title: 'font-display font-bold' },
            preConfirm: () => {
                return {
                    platform: (document.getElementById('swal-platform') as HTMLInputElement).value,
                    channel: (document.getElementById('swal-channel') as HTMLTextAreaElement).value
                }
            }
        });

        if (formValues) {
            await saveSub(item.order, 'platform', formValues.platform);
            await saveSub(item.order, 'channel', formValues.channel);
        }
    };

    const openMemEditor = async (item: any) => {
        const { value: formValues } = await Swal.fire({
            title: `Membership #${item.order + 1}`,
            html: `
                <div class="space-y-4">
                    <div class="text-left">
                        <label class="text-xs font-bold text-gray-400 uppercase mb-1 block">Club / Channel</label>
                        <input id="swal-channel" class="swal2-input !m-0 !w-full" placeholder="e.g. Fitness Club" value="${item.channel || ''}">
                    </div>
                    <div class="text-left">
                        <label class="text-xs font-bold text-gray-400 uppercase mb-1 block">Expired Date</label>
                        <input id="swal-expired" class="swal2-input !m-0 !w-full" placeholder="MM/YY" value="${item.expired || ''}">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#0d9488', // Teal
            confirmButtonText: 'Save Update',
            customClass: { popup: 'rounded-3xl', title: 'font-display font-bold' },
            preConfirm: () => {
                return {
                    channel: (document.getElementById('swal-channel') as HTMLInputElement).value,
                    expired: (document.getElementById('swal-expired') as HTMLInputElement).value
                }
            }
        });

        if (formValues) {
            await saveMem(item.order, 'channel', formValues.channel);
            await saveMem(item.order, 'expired', formValues.expired);
        }
    };

    return (
      <div className={`h-full p-4 md:p-8 rounded-3xl ${theme.surface} border ${theme.border} animate-in fade-in flex flex-col`}>
        <h2 className={`text-xl md:text-2xl font-display font-bold mb-6 ${theme.text} text-center uppercase tracking-widest`}>Subscription & Membership {selectedYear}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow overflow-auto pr-1 pb-8">
          
          <div className="border border-gray-200 rounded-2xl overflow-hidden flex flex-col bg-white h-fit shadow-lg">
            <div className={`py-3 text-center font-bold text-xs tracking-widest text-white bg-blue-700`}>SUBSCRIPTION</div>
            <div className="flex bg-gray-50 border-b border-gray-200 text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] text-center h-10 items-center">
              <div className="w-10 shrink-0">No.</div>
              <div className="w-1/3 border-l border-gray-100 h-full flex items-center justify-center">Platform</div>
              <div className="flex-1 border-l border-gray-100 h-full flex items-center justify-center">Channel</div>
            </div>
            <div>
               {subSlots.map((item, i) => (
                  <div 
                    key={item.id} 
                    onClick={() => openSubEditor(item)}
                    className="flex border-b border-gray-100 min-h-[40px] h-auto hover:bg-blue-50 transition-colors cursor-pointer group py-2"
                  >
                    <div className="w-10 shrink-0 flex items-center justify-center text-[10px] md:text-xs font-bold text-gray-300 bg-gray-50/30 group-hover:text-blue-500">{i + 1}</div>
                    <div className="w-1/3 border-r border-l border-gray-100 flex items-center px-2 md:px-3 text-[11px] md:text-sm font-medium text-gray-700 break-all">
                      {item.platform || <span className="text-gray-200">-</span>}
                    </div>
                    <div className="flex-1 flex items-center px-2 md:px-3 text-[11px] md:text-sm text-gray-600 break-all">
                      {item.channel || <span className="text-gray-200 italic font-normal">...</span>}
                    </div>
                  </div>
               ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded-2xl overflow-hidden flex flex-col bg-white h-fit shadow-lg">
            <div className={`py-3 text-center font-bold text-xs tracking-widest text-white bg-teal-600`}>MEMBERSHIP</div>
            <div className="flex bg-gray-50 border-b border-gray-200 text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] text-center h-10 items-center">
              <div className="w-10 shrink-0">No.</div>
              <div className="flex-1 border-l border-gray-100 h-full flex items-center justify-center">Channel</div>
              <div className="w-20 md:w-24 border-l border-gray-100 h-full flex items-center justify-center px-1">Expired</div>
            </div>
            <div>
               {memSlots.map((item, i) => (
                  <div 
                    key={item.id} 
                    onClick={() => openMemEditor(item)}
                    className="flex border-b border-gray-100 min-h-[40px] h-auto hover:bg-teal-50 transition-colors cursor-pointer group py-2"
                  >
                    <div className="w-10 shrink-0 flex items-center justify-center text-[10px] md:text-xs font-bold text-gray-300 bg-gray-50/30 group-hover:text-teal-600">{i + 1}</div>
                    <div className="flex-1 border-r border-l border-gray-100 flex items-center px-2 md:px-3 text-[11px] md:text-sm font-medium text-gray-700 break-all">
                      {item.channel || <span className="text-gray-200">-</span>}
                    </div>
                    <div className="w-20 md:w-24 flex items-center justify-center text-[10px] md:text-xs font-bold text-teal-600 uppercase">
                      {item.expired || <span className="text-gray-200 italic font-normal text-[10px]">...</span>}
                    </div>
                  </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${theme.bg} font-sans p-2 sm:p-4 md:p-6 lg:p-10 flex justify-center items-center transition-colors duration-500`}>
      <div className="w-full max-w-[1700px] flex gap-4 md:gap-8 flex-col relative px-2 sm:px-4 md:px-0">
        <div className="flex-1 bg-white/70 backdrop-blur-2xl md:rounded-[3rem] rounded-3xl p-4 md:p-8 shadow-2xl border-4 border-white/80 relative overflow-hidden min-h-[90vh] flex flex-col ring-1 ring-black/5">
          <div className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-6">
            <div className="text-center lg:text-left px-2">
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-display font-bold text-gray-800 tracking-tight leading-tight">
                Personal Digital <span className={theme.textMuted}>Planner</span>
              </h1>
              <p className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-500 tracking-[0.2em] mt-1 italic uppercase">Organize your journey every day</p>
            </div>
            <NavigationTabs />
          </div>
          <div className="flex-grow relative min-h-0 h-full">
            {activeTab === 'index' && <IndexView />}
            {activeTab === 'calendar' && <CalendarView />}
            {activeTab === 'mission' && <MissionView />}
            {activeTab === 'memories' && <MemoriesView />}
            {activeTab === 'keydate' && <KeyDateView />}
            {activeTab === 'journal' && <MiniJournalView />}
            {activeTab === 'subscription' && <SubscriptionView />}
          </div>
        </div>
      </div>
    </div>
  );
}
