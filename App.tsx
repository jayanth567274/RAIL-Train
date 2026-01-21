
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  MapPin, 
  Navigation, 
  Ticket, 
  Clock, 
  ChevronRight,
  Train as TrainIcon,
  MessageCircle,
  X,
  ArrowRightLeft,
  Loader2,
  Sun,
  Moon,
  LocateFixed,
  AlertCircle,
  Bell,
  ArrowLeft,
  LayoutGrid,
  Map as MapIcon,
  CircleDot,
  Zap,
  Sparkles,
  Compass,
  Radio,
  GripVertical
} from 'lucide-react';
import { Train, AppView, LiveStatus, PnrInfo, ScheduleStop, Alert, Coach } from './types';
import { 
  searchTrainsAI, 
  getLiveStatusAI, 
  getRailAssistantResponseStream, 
  getStationSuggestionsAI,
  getTrainScheduleAI,
  getRecentAlertsAI,
  getCoachPositionAI
} from './services/gemini';

const getCoachColor = (type: Coach['type']) => {
  switch (type) {
    case 'engine': return 'bg-voyager-midnight text-white';
    case 'ac1': return 'bg-indigo-900 text-white';
    case 'ac2': return 'bg-indigo-700 text-white';
    case 'ac3': return 'bg-indigo-500 text-white';
    case 'sleeper': return 'bg-teal-600 text-white';
    case 'pantry': return 'bg-amber-400 text-black';
    case 'luggage': return 'bg-slate-500 text-white';
    case 'general':
    default: return 'bg-orange-400 text-black';
  }
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState<string[]>([]);
  const [toSuggestions, setToSuggestions] = useState<string[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [trainResults, setTrainResults] = useState<Train[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
  const [liveSearchInput, setLiveSearchInput] = useState('');
  const [scheduleInput, setScheduleInput] = useState('');
  const [scheduleData, setScheduleData] = useState<{ trainName: string; stops: ScheduleStop[] } | null>(null);
  const [coachInput, setCoachInput] = useState('');
  const [coachData, setCoachData] = useState<{ trainName: string; coaches: Coach[] } | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('voyager_alerts_cache');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  const [pnrInput, setPnrInput] = useState('');
  const [pnrData, setPnrData] = useState<PnrInfo | null>(null);
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    return 'light';
  });
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Welcome to your premium travel suite. I am your Rail Concierge. How may I assist your voyage today?' }
  ]);
  const [botInput, setBotInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fromInputRef = useRef<HTMLDivElement>(null);
  const toInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fromInputRef.current && !fromInputRef.current.contains(event.target as Node)) setShowFromSuggestions(false);
      if (toInputRef.current && !toInputRef.current.contains(event.target as Node)) setShowToSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchFrom.length >= 2 && showFromSuggestions) {
        const suggestions = await getStationSuggestionsAI(searchFrom);
        setFromSuggestions(suggestions);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchFrom, showFromSuggestions]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTo.length >= 2 && showToSuggestions) {
        const suggestions = await getStationSuggestionsAI(searchTo);
        setToSuggestions(suggestions);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTo, showToSuggestions]);

  useEffect(() => {
    if (view === 'alerts') {
      setIsLoading(true);
      getRecentAlertsAI().then(data => {
        if (data && data.length > 0) {
          setAlerts(data);
          localStorage.setItem('voyager_alerts_cache', JSON.stringify(data));
        }
        setIsLoading(false);
      }).catch(err => {
        console.error("Failed to fetch live alerts:", err);
        setIsLoading(false);
      });
    }
  }, [view]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchFrom || !searchTo) return;
    setIsLoading(true);
    setView('search');
    const results = await searchTrainsAI(searchFrom, searchTo);
    setTrainResults(results);
    setIsLoading(false);
  };

  const handleLiveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveSearchInput) return;
    setIsLoading(true);
    setLiveStatus(null);
    setSelectedTrain({ 
      number: liveSearchInput, 
      name: `Voyager ${liveSearchInput}`, 
      source: '---', 
      destination: '---', 
      departureTime: '--:--', 
      arrivalTime: '--:--', 
      runningDays: [], 
      classes: [] 
    });
    setView('live');
    const status = await getLiveStatusAI(liveSearchInput);
    setLiveStatus(status);
    setIsLoading(false);
  };

  const handleTrainClick = async (train: Train) => {
    setSelectedTrain(train);
    setLiveStatus(null);
    setView('live');
    setIsLoading(true);
    const status = await getLiveStatusAI(train.number);
    setLiveStatus(status);
    setIsLoading(false);
  };

  const handleScheduleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleInput) return;
    setIsLoading(true);
    const data = await getTrainScheduleAI(scheduleInput);
    setScheduleData(data);
    setIsLoading(false);
  };

  const handleCoachSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachInput) return;
    setIsLoading(true);
    const data = await getCoachPositionAI(coachInput);
    setCoachData(data);
    setIsLoading(false);
  };

  const handlePnrCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (pnrInput.length < 10) return;
    setIsLoading(true);
    setPnrData(null);
    setTimeout(() => {
      setPnrData({
        pnr: pnrInput,
        trainName: "Vande Bharat Express",
        trainNumber: "22436",
        date: "12 Dec 2023",
        from: "NDLS",
        to: "BSB",
        passengers: [{ seat: "C1, 12", status: "CNF" }],
        chartStatus: "Chart Prepared"
      });
      setIsLoading(false);
    }, 600);
  };

  const handleSendMessage = async () => {
    if (!botInput.trim() || isBotTyping) return;
    const userMsg = botInput;
    setBotInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsBotTyping(true);
    setChatMessages(prev => [...prev, { role: 'bot', text: '' }]);
    await getRailAssistantResponseStream(userMsg, (streamedText) => {
      setChatMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'bot') return [...prev.slice(0, -1), { role: 'bot', text: streamedText }];
        return prev;
      });
    });
    setIsBotTyping(false);
  };

  return (
    <div className="min-h-screen bg-theme-bg flex flex-col font-sans text-theme-text selection:bg-voyager-crimson selection:text-white transition-all duration-700">
      
      {/* Dynamic Background Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-30 dark:opacity-20 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-voyager-crimson/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse delay-1000"></div>
      </div>

      {/* Premium Desktop Header */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 h-20 glass-card z-[100] px-12 items-center justify-between shadow-premium">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setView('home')}>
          <div className="voyager-gradient p-2.5 rounded-2xl shadow-lg group-hover:rotate-[15deg] transition-all duration-500">
            <TrainIcon className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent voyager-gradient">TheRailTrain</h1>
        </div>
        <nav className="flex items-center gap-10">
          <NavLink label="Discovery" active={view === 'home'} onClick={() => setView('home')} />
          <NavLink label="Intelligence" active={view === 'pnr'} onClick={() => setView('pnr')} />
          <NavLink label="Logistics" active={view === 'schedule'} onClick={() => setView('schedule')} />
          <NavLink label="Alerts" active={view === 'alerts'} onClick={() => setView('alerts')} />
          <button onClick={toggleTheme} className="p-3 rounded-2xl bg-voyager-pearl dark:bg-voyager-slate/50 border border-theme-border hover:shadow-premium transition-all active:scale-90">
            {theme === 'light' ? <Moon className="w-5 h-5 text-voyager-slate" /> : <Sun className="w-5 h-5 text-yellow-400" />}
          </button>
        </nav>
      </header>

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 glass-card sticky top-0 z-[100] shadow-md">
        <div className="flex items-center gap-2" onClick={() => setView('home')}>
          <div className="voyager-gradient p-1.5 rounded-xl text-white shadow-lg"><TrainIcon className="w-4 h-4" /></div>
          <span className="text-lg font-black tracking-tight">TheRailTrain</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-theme-bg/50 border border-theme-border">
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-12 relative z-10 md:mt-20 mobile-view-padding">
        
        {/* Home Discovery View */}
        {view === 'home' && (
          <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <section className="relative group">
              <div className="voyager-gradient rounded-[2rem] md:rounded-[3rem] p-6 md:p-16 text-white shadow-premium overflow-hidden relative">
                <div className="relative z-10 space-y-4 md:space-y-6">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl px-4 py-1.5 rounded-full w-fit border border-white/20 text-[9px] font-extrabold uppercase tracking-[0.2em]">
                    <Sparkles className="w-3 h-3 text-yellow-300" /> Voyager Access Verified
                  </div>
                  <h2 className="text-3xl md:text-6xl font-black leading-tight">Where shall we <br/>voyage today?</h2>
                  <p className="text-white/80 max-w-lg font-medium text-sm md:text-lg leading-relaxed hidden md:block">Experience rail travel redefined through artificial intelligence and premium logistics.</p>
                  
                  {/* Premium Search Module */}
                  <form onSubmit={handleSearch} className="mt-4 md:mt-12 bg-white/10 backdrop-blur-3xl p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-white/20 shadow-2xl">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-5 items-center">
                      <div className="w-full relative group/input" ref={fromInputRef}>
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5" />
                        <input 
                          type="text" placeholder="Departure Point" autoComplete="off"
                          className="w-full pl-12 pr-4 py-4 md:py-5 bg-white/10 rounded-2xl border-2 border-transparent focus:border-white/40 focus:bg-white/20 outline-none text-white font-bold placeholder:text-white/40 transition-all text-sm md:text-base"
                          value={searchFrom} onFocus={() => setShowFromSuggestions(true)}
                          onChange={(e) => {setSearchFrom(e.target.value); setShowFromSuggestions(true);}} required
                        />
                        {showFromSuggestions && fromSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-3 glass-card rounded-2xl shadow-premium z-[110] p-2 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 backdrop-blur-3xl">
                            {fromSuggestions.map((s, idx) => (
                              <button key={idx} type="button" className="w-full text-left px-4 py-3 text-sm hover:bg-voyager-crimson/20 rounded-xl flex items-center gap-3 font-bold transition-all"
                                onClick={() => {setSearchFrom(s); setShowFromSuggestions(false);}}>
                                <LocateFixed className="w-4 h-4 text-voyager-crimson" /> {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="p-2 md:p-3 bg-white/10 rounded-full cursor-pointer hover:bg-white/20 transition-all active:scale-75 flex shrink-0" onClick={() => {const t = searchFrom; setSearchFrom(searchTo); setSearchTo(t);}}>
                        <ArrowRightLeft className="w-5 h-5 text-white md:rotate-0 rotate-90" />
                      </div>
                      <div className="w-full relative group/input" ref={toInputRef}>
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5" />
                        <input 
                          type="text" placeholder="Destination" autoComplete="off"
                          className="w-full pl-12 pr-4 py-4 md:py-5 bg-white/10 rounded-2xl border-2 border-transparent focus:border-white/40 focus:bg-white/20 outline-none text-white font-bold placeholder:text-white/40 transition-all text-sm md:text-base"
                          value={searchTo} onFocus={() => setShowToSuggestions(true)}
                          onChange={(e) => {setSearchTo(e.target.value); setShowToSuggestions(true);}} required
                        />
                        {showToSuggestions && toSuggestions.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-3 glass-card rounded-2xl shadow-premium z-[110] p-2 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 backdrop-blur-3xl">
                            {toSuggestions.map((s, idx) => (
                              <button key={idx} type="button" className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-600/20 rounded-xl flex items-center gap-3 font-bold transition-all"
                                onClick={() => {setSearchTo(s); setShowToSuggestions(false);}}>
                                <LocateFixed className="w-4 h-4 text-indigo-400" /> {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="submit" className="w-full md:w-auto px-10 py-4 md:py-5 bg-white text-voyager-midnight font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 text-sm md:text-base" disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Voyage <ChevronRight className="w-4 h-4" /></>}
                      </button>
                    </div>
                  </form>
                </div>
                <div className="absolute right-[-15%] bottom-[-15%] opacity-5 md:opacity-10 pointer-events-none">
                  <TrainIcon className="w-[20rem] h-[20rem] md:w-[30rem] md:h-[30rem]" />
                </div>
              </div>
            </section>

            {/* Premium Action Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
              <PremiumAction icon={<Navigation className="w-6 h-6 md:w-7 md:h-7" />} label="Live Status" onClick={() => setView('live-search')} color="crimson" />
              <PremiumAction icon={<Ticket className="w-6 h-6 md:w-7 md:h-7" />} label="PNR Suite" onClick={() => setView('pnr')} color="amber" />
              <PremiumAction icon={<Clock className="w-6 h-6 md:w-7 md:h-7" />} label="Schedules" onClick={() => setView('schedule')} color="indigo" />
              <PremiumAction icon={<LayoutGrid className="w-6 h-6 md:w-7 md:h-7" />} label="Coaches" onClick={() => setView('coaches')} color="teal" />
              <PremiumAction icon={<Bell className="w-6 h-6 md:w-7 md:h-7" />} label="Alerts" onClick={() => setView('alerts')} color="rose" />
            </div>

            {/* AI Assistant Callout */}
            <div className="glass-card p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-premium flex flex-col md:flex-row items-center justify-between gap-4 group cursor-pointer hover:border-voyager-crimson transition-all" onClick={() => setIsBotOpen(true)}>
               <div className="flex items-center gap-4 md:gap-6">
                  <div className="voyager-gradient p-3.5 md:p-5 rounded-[1.5rem] md:rounded-[2rem] shadow-lg flex shrink-0"><Zap className="text-white w-6 h-6 md:w-8 md:h-8" /></div>
                  <div className="text-center md:text-left">
                    <h4 className="text-lg md:text-xl font-black">AI Rail Concierge</h4>
                    <p className="text-[10px] md:text-sm text-theme-muted font-medium">Platform info & delay insights.</p>
                  </div>
               </div>
               <div className="w-full md:w-auto px-6 md:px-8 py-3.5 bg-theme-bg/50 rounded-xl md:rounded-2xl font-black text-xs md:text-sm text-voyager-crimson border border-theme-border group-hover:bg-voyager-crimson group-hover:text-white transition-all text-center uppercase tracking-widest">Open Assistant</div>
            </div>
          </div>
        )}

        {/* Live Tracking Command Dashboard */}
        {view === 'live-search' && (
          <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-4">
              <button onClick={() => setView('home')} className="p-3 glass-card rounded-xl transition-all"><ArrowLeft className="w-5 h-5 text-voyager-crimson" /></button>
              <div>
                <h2 className="text-2xl md:text-4xl font-black tracking-tight">Live Intelligence</h2>
                <p className="text-theme-muted font-bold tracking-widest uppercase text-[9px] mt-1">Satellite Tracking Protocol</p>
              </div>
            </div>
            <form onSubmit={handleLiveSearch} className="glass-card p-4 md:p-6 rounded-[2rem] md:rounded-[3rem] shadow-premium">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Compass className="absolute left-4 top-1/2 -translate-y-1/2 text-voyager-crimson w-5 h-5" />
                  <input 
                    type="text" placeholder="Train Sequence # (e.g. 12002)"
                    className="w-full pl-12 pr-4 py-4 md:py-6 bg-theme-bg/50 rounded-2xl md:rounded-3xl outline-none font-bold text-sm md:text-lg transition-all"
                    value={liveSearchInput} onChange={(e) => setLiveSearchInput(e.target.value.replace(/\D/g, ''))} required
                  />
                </div>
                <button type="submit" className="voyager-gradient text-white px-8 py-4 md:py-6 rounded-2xl md:rounded-3xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm md:text-base">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sync Track <Radio className="w-4 h-4 animate-pulse" /></>}
                </button>
              </div>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <HistoryItem label="12002 Shatabdi Exp" onClick={() => setLiveSearchInput('12002')} />
               <HistoryItem label="12423 Rajdhani Exp" onClick={() => setLiveSearchInput('12423')} />
            </div>
          </div>
        )}

        {/* Live Tracking View */}
        {view === 'live' && selectedTrain && (
          <div className="space-y-6 md:space-y-10 animate-in slide-in-from-right-4 duration-700">
            <div className="flex items-center justify-between">
              <button onClick={() => setView('live-search')} className="flex items-center gap-2 text-theme-muted hover:text-voyager-crimson font-black transition-all text-xs">
                <ArrowLeft className="w-4 h-4" /> Return to Command
              </button>
              <div className="bg-emerald-500/10 px-4 py-2 rounded-full flex items-center gap-2 border border-emerald-500/20">
                 <div className="pulse-ring w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                 <span className="text-[8px] md:text-xs font-black text-emerald-600 uppercase tracking-widest">Live Signal</span>
              </div>
            </div>
            
            <div className="glass-card rounded-[2rem] md:rounded-[4rem] p-6 md:p-16 shadow-premium relative overflow-hidden">
              <div className="mb-8 md:mb-12">
                <h2 className="text-2xl md:text-5xl font-black leading-tight tracking-tight">{selectedTrain.name}</h2>
                <p className="text-voyager-crimson font-black tracking-[0.3em] uppercase text-[10px] md:text-sm mt-2">Identity #{selectedTrain.number}</p>
              </div>
              
              {liveStatus ? (
                <div className="space-y-10 md:space-y-16">
                  <div className="bg-voyager-slate rounded-[2rem] md:rounded-[3rem] p-5 md:p-8 flex items-center gap-4 md:gap-8 text-white shadow-2xl relative">
                    <div className="bg-voyager-crimson p-4 md:p-6 rounded-2xl md:rounded-[2rem] shadow-lg shrink-0">
                      <Navigation className="w-6 h-6 md:w-10 md:h-10" />
                    </div>
                    <div>
                      <p className="text-white/50 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-1">Current Coordinates</p>
                      <h3 className="text-lg md:text-3xl font-black">{liveStatus.currentStation}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black border border-white/20">{liveStatus.status}</span>
                        <span className="px-3 py-1 bg-voyager-crimson rounded-full text-[9px] font-black shadow-lg">{liveStatus.delay}</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative pl-8 md:pl-12 space-y-10">
                    <div className="absolute left-[11px] md:left-[15px] top-6 bottom-6 w-[2px] bg-theme-border rounded-full"></div>
                    {liveStatus.nextStations.map((station, idx) => (
                      <div key={idx} className="relative group">
                        <div className={`absolute -left-[28px] md:-left-[38px] top-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full border-4 border-theme-card z-10 transition-all ${idx === 0 ? 'bg-voyager-crimson scale-110 shadow-lg' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                        <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] flex justify-between items-center group-hover:translate-x-1 transition-all">
                          <div>
                            <h4 className="text-sm md:text-xl font-black text-theme-text group-hover:text-voyager-crimson transition-colors">{station.station}</h4>
                            <p className="text-[8px] md:text-[10px] font-black text-theme-muted uppercase tracking-[0.2em] mt-1">Platform {station.platform || 'TBD'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-base md:text-2xl font-black">{station.expectedTime}</p>
                            <p className="text-[8px] md:text-[9px] font-black text-voyager-crimson uppercase tracking-[0.1em] mt-0.5">Expected</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center gap-6">
                  <div className="relative w-16 h-16 md:w-24 md:h-24">
                    <div className="absolute inset-0 border-4 md:border-8 border-theme-border rounded-full"></div>
                    <div className="absolute inset-0 border-4 md:border-8 border-voyager-crimson border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-sm md:text-xl font-black text-theme-muted tracking-tight animate-pulse">Establishing Satellite Uplink...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schedule Logistics Dashboard */}
        {view === 'schedule' && (
          <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
             <div className="flex items-center gap-4">
              <button onClick={() => setView('home')} className="p-3 glass-card rounded-xl"><ArrowLeft className="w-5 h-5 text-voyager-crimson" /></button>
              <h2 className="text-2xl md:text-4xl font-black tracking-tight">Voyage Logistics</h2>
            </div>
            <form onSubmit={handleScheduleSearch} className="flex flex-col md:flex-row gap-3">
              <input 
                type="text" placeholder="Train Identity Number"
                className="flex-1 px-6 py-4 glass-card rounded-2xl outline-none font-bold text-sm md:text-lg focus:border-voyager-crimson transition-all"
                value={scheduleInput} onChange={(e) => setScheduleInput(e.target.value)} required
              />
              <button type="submit" className="voyager-gradient text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'FETCH MANIFEST'}
              </button>
            </form>

            {scheduleData ? (
              <div className="glass-card rounded-[2rem] md:rounded-[4rem] p-6 md:p-10 shadow-premium space-y-8 animate-in slide-in-from-bottom-4">
                <div className="border-b border-theme-border pb-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl md:text-3xl font-black text-voyager-crimson">{scheduleData.trainName}</h3>
                    <div className="flex gap-2 items-center text-[10px] font-black text-theme-muted mt-2 uppercase tracking-widest">
                      <MapIcon className="w-3.5 h-3.5" /> Comprehensive Itinerary
                    </div>
                  </div>
                </div>

                <div className="relative pl-10 md:pl-14 pr-2 space-y-1">
                  <div className="absolute left-[20px] md:left-[27px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-voyager-crimson via-indigo-500 to-voyager-crimson rounded-full"></div>
                  {scheduleData.stops.map((stop, idx) => {
                    const isSource = idx === 0;
                    const isDestination = idx === scheduleData.stops.length - 1;
                    return (
                      <div key={idx} className="relative py-4 group">
                        <div className={`absolute -left-[32px] md:-left-[42px] top-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full border-4 border-theme-card z-10 ${isSource || isDestination ? 'bg-voyager-crimson scale-110' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                        <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] flex flex-col md:flex-row md:justify-between md:items-center hover:bg-voyager-crimson/5 transition-all gap-2">
                          <div>
                            <h4 className={`text-sm md:text-lg font-black ${isSource || isDestination ? 'text-voyager-crimson' : 'text-theme-text'}`}>{stop.station}</h4>
                            <div className="flex gap-3 mt-1 text-[8px] md:text-[10px] font-extrabold text-theme-muted uppercase tracking-widest">
                              <span>Day {stop.day}</span>
                              {stop.platform && <span className="text-indigo-500">PF {stop.platform}</span>}
                            </div>
                          </div>
                          <div className="flex md:text-right items-center gap-6">
                            <div className="md:text-right">
                              <p className="text-sm md:text-xl font-black">{isSource ? stop.departureTime : stop.arrivalTime}</p>
                              <p className="text-[8px] md:text-[9px] font-black text-theme-muted uppercase tracking-widest">{isSource ? 'DEP' : 'ARR'}</p>
                            </div>
                            {!isSource && !isDestination && <div className="h-6 md:h-10 w-[1px] bg-theme-border"></div>}
                            {!isSource && !isDestination && (
                              <div className="md:text-right">
                                <p className="text-sm md:text-xl font-black">{stop.departureTime}</p>
                                <p className="text-[8px] md:text-[9px] font-black text-theme-muted uppercase tracking-widest">DEP</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : !isLoading && (
              <div className="text-center py-20 opacity-20">
                <Clock className="w-16 h-16 mx-auto mb-4" />
                <p className="text-sm md:text-xl font-black tracking-tight">Identity Data Needed for Logistics</p>
              </div>
            )}
          </div>
        )}

        {/* Train Search Results View */}
        {view === 'search' && (
          <div className="space-y-6 md:space-y-10 animate-in slide-in-from-right-4 duration-700">
            <button onClick={() => setView('home')} className="flex items-center gap-2 text-theme-muted hover:text-voyager-crimson font-black transition-all text-xs">
              <ArrowLeft className="w-4 h-4" /> Back to Discovery
            </button>
            <div className="space-y-5 md:space-y-8">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-8">
                   <div className="relative w-16 h-16">
                      <div className="absolute inset-0 border-4 md:border-8 border-theme-border rounded-full"></div>
                      <div className="absolute inset-0 border-4 md:border-8 border-voyager-crimson border-t-transparent rounded-full animate-spin"></div>
                   </div>
                   <p className="text-theme-muted font-black uppercase tracking-widest text-[10px] animate-pulse">Plotting Trajectories...</p>
                </div>
              ) : trainResults.length === 0 ? (
                <div className="py-20 text-center opacity-20">
                   <TrainIcon className="w-20 h-20 mx-auto mb-4" />
                   <p className="font-black text-lg md:text-2xl uppercase tracking-tighter">No Voyager Matching Signal</p>
                </div>
              ) : trainResults.map((train, idx) => (
                <div key={train.number} className="glass-card border border-transparent hover:border-voyager-crimson/50 p-5 md:p-10 rounded-[2rem] md:rounded-[3.5rem] shadow-premium hover:shadow-2xl transition-all cursor-pointer group active:scale-[0.98] animate-in fade-in" style={{ animationDelay: `${idx * 80}ms` }} onClick={() => handleTrainClick(train)}>
                  <div className="flex justify-between items-start mb-6 md:mb-8">
                    <div>
                      <h3 className="text-xl md:text-3xl font-black text-theme-text group-hover:text-voyager-crimson transition-colors tracking-tight">{train.name}</h3>
                      <p className="text-[8px] md:text-[10px] font-black text-theme-muted bg-theme-bg/50 w-fit px-3 py-1 rounded-full mt-2 tracking-[0.2em]">SEQ #{train.number}</p>
                    </div>
                    <div className="text-[7px] md:text-[9px] font-black text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-emerald-500/20 shrink-0">Ready</div>
                  </div>
                  <div className="flex justify-between items-center relative mb-6 md:mb-10">
                    <div className="text-left shrink-0"><p className="text-xl md:text-3xl font-black">{train.departureTime}</p><p className="text-[8px] md:text-[10px] font-black text-theme-muted uppercase tracking-widest mt-1">{train.source}</p></div>
                    <div className="flex-1 px-4 md:px-12 relative">
                       <div className="w-full h-[1px] md:h-[2px] bg-theme-border rounded-full relative">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-card p-2 md:p-3 rounded-xl md:rounded-2xl border border-theme-border shadow-md group-hover:scale-110 transition-all">
                             <TrainIcon className="w-4 h-4 md:w-6 md:h-6 text-voyager-crimson" />
                          </div>
                       </div>
                    </div>
                    <div className="text-right shrink-0"><p className="text-xl md:text-3xl font-black">{train.arrivalTime}</p><p className="text-[8px] md:text-[10px] font-black text-theme-muted uppercase tracking-widest mt-1">{train.destination}</p></div>
                  </div>
                  <div className="flex gap-2 md:gap-4 pt-4 border-t border-theme-border overflow-x-auto no-scrollbar">
                     {['FIRST', 'EXEC', 'SUITE', 'COUCH'].map(c => <span key={c} className="text-[8px] md:text-[9px] font-black px-3 py-1.5 bg-theme-bg/50 border border-theme-border rounded-lg text-theme-muted tracking-widest shrink-0 uppercase">{c}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Voyager Alerts View */}
        {view === 'alerts' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
              <button onClick={() => setView('home')} className="p-3 glass-card rounded-xl transition-all"><ArrowLeft className="w-5 h-5 text-voyager-crimson" /></button>
              <h2 className="text-2xl md:text-4xl font-black tracking-tight">Global Signals</h2>
            </div>
            {isLoading && alerts.length === 0 ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-12 h-12 animate-spin text-voyager-crimson" /></div>
            ) : (
              <div className="grid gap-5 md:gap-6">
                {alerts.length === 0 && !isLoading && (
                  <div className="text-center py-20 opacity-20">
                    <Bell className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-sm md:text-xl font-black tracking-tight">No alerts currently logged.</p>
                  </div>
                )}
                {alerts.map(alert => (
                  <div key={alert.id} className={`p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border-2 flex gap-4 md:gap-8 transition-all shadow-premium group ${
                    alert.type === 'cancellation' ? 'bg-voyager-crimson/5 border-voyager-crimson/10' :
                    alert.type === 'delay' ? 'bg-amber-500/5 border-amber-500/10' :
                    'bg-indigo-600/5 border-indigo-600/10'
                  }`}>
                    <div className={`p-4 md:p-6 rounded-2xl h-fit group-hover:rotate-12 transition-transform shadow-lg shrink-0 ${
                      alert.type === 'cancellation' ? 'voyager-gradient text-white' :
                      alert.type === 'delay' ? 'bg-amber-500 text-white' :
                      'bg-indigo-600 text-white'
                    }`}>
                      <AlertCircle className="w-5 h-5 md:w-8 md:h-8" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-lg md:text-2xl mb-1 truncate">{alert.title}</h4>
                      <p className="text-theme-muted font-medium mb-4 leading-relaxed text-xs md:text-lg line-clamp-3">{alert.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest bg-theme-bg/50 px-3 py-1.5 rounded-full border border-theme-border">{alert.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isLoading && alerts.length > 0 && (
              <div className="flex justify-center mt-4">
                <Loader2 className="w-6 h-6 animate-spin text-voyager-crimson opacity-50" />
              </div>
            )}
          </div>
        )}

        {/* PNR Suite View */}
        {view === 'pnr' && (
          <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
             <div className="flex items-center gap-4">
              <button onClick={() => setView('home')} className="p-3 glass-card rounded-xl"><ArrowLeft className="w-5 h-5 text-voyager-crimson" /></button>
              <h2 className="text-2xl md:text-4xl font-black tracking-tight">PNR Suite</h2>
            </div>
            <form onSubmit={handlePnrCheck} className="glass-card p-4 md:p-6 rounded-[2rem] md:rounded-[3rem] shadow-premium flex flex-col md:flex-row gap-4">
              <input 
                type="text" maxLength={10} placeholder="10-Digit Access Code"
                className="flex-1 px-6 py-4 bg-theme-bg/50 rounded-xl md:rounded-3xl outline-none font-bold text-sm md:text-lg text-theme-text transition-all focus:border-voyager-crimson border border-transparent"
                value={pnrInput} onChange={(e) => setPnrInput(e.target.value.replace(/\D/g, ''))} required
              />
              <button type="submit" className="voyager-gradient text-white px-8 py-4 rounded-xl md:rounded-3xl font-black shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 text-sm md:text-base uppercase" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <>Sync <Radio className="w-4 h-4" /></>}
              </button>
            </form>
            {pnrData && (
              <div className="glass-card rounded-[2rem] md:rounded-[4rem] p-6 md:p-12 shadow-premium space-y-8 animate-in slide-in-from-bottom-8 overflow-hidden relative">
                <div className="absolute top-0 left-0 voyager-gradient w-full h-2 md:h-3"></div>
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div>
                    <h3 className="text-xl md:text-4xl font-black text-voyager-crimson tracking-tight">{pnrData.trainName}</h3>
                    <p className="text-[10px] md:text-sm font-black text-theme-muted uppercase tracking-widest mt-2">Voyager #{pnrData.trainNumber} • {pnrData.date}</p>
                  </div>
                  <div className="px-5 py-2 bg-emerald-500/10 text-emerald-600 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 w-fit">{pnrData.chartStatus}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 md:gap-10 text-center bg-theme-bg/50 p-6 md:p-10 rounded-[2rem] border border-theme-border relative">
                  <div>
                    <p className="text-[8px] md:text-[10px] font-black text-voyager-crimson uppercase tracking-widest mb-2">Departure</p>
                    <p className="text-xl md:text-4xl font-black tracking-tight">{pnrData.from}</p>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2.5 md:p-4 bg-theme-card rounded-full border border-theme-border shadow-md">
                     <ArrowRightLeft className="w-4 h-4 md:w-6 md:h-6 text-voyager-crimson" />
                  </div>
                  <div>
                    <p className="text-[8px] md:text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">Arrival</p>
                    <p className="text-xl md:text-4xl font-black tracking-tight">{pnrData.to}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Coach Architecture View */}
        {view === 'coaches' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex items-center gap-4">
              <button onClick={() => setView('home')} className="p-3 glass-card rounded-xl"><ArrowLeft className="w-5 h-5 text-voyager-crimson" /></button>
              <h2 className="text-2xl md:text-4xl font-black tracking-tight">Architecture</h2>
            </div>
            <form onSubmit={handleCoachSearch} className="flex flex-col md:flex-row gap-4">
              <input 
                type="text" placeholder="Voyager Identity #"
                className="flex-1 px-6 py-4 glass-card rounded-2xl outline-none font-bold text-sm md:text-lg transition-all focus:border-voyager-crimson"
                value={coachInput} onChange={(e) => setCoachInput(e.target.value)} required
              />
              <button type="submit" className="voyager-gradient text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'DECODE SEQUENCE'}
              </button>
            </form>
            {coachData ? (
              <div className="glass-card rounded-[2rem] md:rounded-[4rem] p-8 md:p-12 shadow-premium space-y-10 animate-in slide-in-from-bottom-8 overflow-hidden">
                <div className="border-b border-theme-border pb-6">
                   <h3 className="text-xl md:text-3xl font-black text-voyager-crimson tracking-tight">{coachData.trainName}</h3>
                   <p className="text-[10px] font-black text-theme-muted uppercase tracking-widest mt-2">Configuration Manifest</p>
                </div>
                <div className="overflow-x-auto pb-8 pt-4 custom-scrollbar">
                  <div className="flex items-end gap-3 min-w-max px-4">
                    {coachData.coaches.map((coach, idx) => (
                      <div key={idx} className="flex flex-col items-center group">
                        <span className="text-[10px] font-black mb-3 text-theme-muted uppercase">{coach.code}</span>
                        <div className={`w-16 h-12 rounded-t-xl rounded-b-md flex items-center justify-center font-black text-sm shadow-md transition-all ${getCoachColor(coach.type)}`}>
                           {coach.code}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : !isLoading && (
              <div className="text-center py-20 opacity-20">
                <LayoutGrid className="w-16 h-16 mx-auto mb-4" />
                <p className="text-sm md:text-xl font-black tracking-tight">Sequence Data Pending Scan</p>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Floating Action Button for AI bot - Positioned to not overlap bottom nav */}
      <div className="fixed bottom-28 right-6 md:bottom-12 md:right-12 z-[150]">
        <button 
          onClick={() => setIsBotOpen(!isBotOpen)} 
          className="voyager-gradient text-white p-5 rounded-2xl md:rounded-[2.5rem] shadow-premium hover:scale-110 active:scale-95 transition-all ring-4 md:ring-8 ring-white/10 group"
        >
          {isBotOpen ? <X className="w-6 h-6 md:w-8 md:h-8" /> : <MessageCircle className="w-6 h-6 md:w-8 md:h-8 group-hover:rotate-12 transition-transform" />}
          {!isBotOpen && <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-voyager-midnight rounded-full animate-pulse"></div>}
        </button>
      </div>

      {/* Premium Chat Bot Overlay */}
      {isBotOpen && (
        <div className="fixed inset-4 md:inset-auto md:bottom-32 md:right-12 md:w-[450px] glass-card rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl z-[200] overflow-hidden flex flex-col md:h-[650px] animate-in zoom-in-95 duration-300 origin-bottom-right">
          <div className="voyager-gradient p-6 md:p-8 text-white flex items-center justify-between shrink-0 relative">
            <div className="flex items-center gap-4 md:gap-5 relative z-10">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 backdrop-blur-2xl rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
                <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-yellow-300" />
              </div>
              <div>
                <h3 className="font-black text-lg md:text-2xl tracking-tight leading-none">Rail Concierge</h3>
                <div className="text-[8px] md:text-[10px] opacity-80 uppercase font-black tracking-[0.2em] flex items-center gap-1.5 mt-2">
                   <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Operational Status
                </div>
              </div>
            </div>
            <button onClick={() => setIsBotOpen(false)} className="hover:rotate-90 transition-all p-2 bg-white/10 rounded-xl relative z-10"><X className="w-5 h-5 md:w-6 md:h-6" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5 bg-theme-bg/40 custom-scrollbar">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[85%] p-4 md:p-6 px-5 md:px-7 rounded-[1.8rem] md:rounded-[2.5rem] text-xs md:text-base font-semibold leading-relaxed shadow-premium ${msg.role === 'user' ? 'voyager-gradient text-white rounded-br-none' : 'glass-card text-theme-text rounded-bl-none'}`}>
                  {msg.text || (isBotTyping && !msg.text ? <div className="flex gap-2 py-1"><div className="w-1.5 h-1.5 bg-voyager-crimson rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-voyager-crimson rounded-full animate-bounce delay-100"></div><div className="w-1.5 h-1.5 bg-voyager-crimson rounded-full animate-bounce delay-200"></div></div> : '')}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 md:p-6 glass-card border-t border-theme-border flex gap-3 items-center shrink-0">
            <input type="text" placeholder="Consult the suite..." className="flex-1 bg-theme-bg/50 rounded-2xl px-5 md:px-8 py-3.5 md:py-5 text-sm md:text-base outline-none font-bold transition-all focus:bg-white dark:focus:bg-voyager-slate"
              value={botInput} onChange={(e) => setBotInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} disabled={isBotTyping}
            />
            <button onClick={handleSendMessage} disabled={isBotTyping || !botInput.trim()} className="voyager-gradient text-white p-3.5 md:p-5 rounded-2xl md:rounded-[2rem] hover:scale-110 active:scale-90 transition-all shadow-xl"><ChevronRight className="w-5 h-5 md:w-7 md:h-7" /></button>
          </div>
        </div>
      )}

      {/* Floating Bottom Navigation */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 h-20 glass-card rounded-[2.5rem] shadow-premium flex items-center justify-around px-4 z-[100] border-2 border-white/20 pb-safe">
        <MobNavButton icon={<Search />} label="Track" active={['home', 'search', 'live', 'live-search'].includes(view)} onClick={() => setView('home')} />
        <MobNavButton icon={<Ticket />} label="PNR" active={view === 'pnr'} onClick={() => setView('pnr')} />
        <MobNavButton icon={<Clock />} label="Routes" active={view === 'schedule'} onClick={() => setView('schedule')} />
        <MobNavButton icon={<Bell />} label="Signals" active={view === 'alerts'} onClick={() => setView('alerts')} />
      </nav>
    </div>
  );
};

/**
 * Navigation Link for Desktop Header.
 */
const NavLink: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => {
  return (
    <button onClick={onClick} className={`text-[11px] font-black tracking-[0.2em] uppercase transition-all relative group ${active ? 'text-voyager-crimson' : 'text-theme-muted hover:text-theme-text'}`}>
      {label}
      <span className={`absolute -bottom-2 left-0 h-1 voyager-gradient transition-all rounded-full ${active ? 'w-full' : 'w-0 group-hover:w-1/2'}`}></span>
    </button>
  );
};

/**
 * Large Action Card for Main Dashboard.
 */
const PremiumAction: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; color: string }> = ({ icon, label, onClick }) => {
  return (
    <button onClick={onClick} className="p-4 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] glass-card shadow-premium hover:shadow-2xl hover:border-voyager-crimson/50 hover:-translate-y-1 transition-all active:scale-95 group flex flex-col items-center gap-2 md:gap-4 min-h-[90px] md:min-h-0">
      <div className="text-voyager-crimson group-hover:scale-110 transition-all duration-300">{icon}</div>
      <span className="text-[8px] md:text-[10px] font-black text-theme-text uppercase tracking-[0.1em] text-center leading-tight opacity-80">{label}</span>
    </button>
  );
};

/**
 * Small Historical Tracking Item.
 */
const HistoryItem: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => {
  return (
    <button onClick={onClick} className="p-4 md:p-6 glass-card rounded-2xl md:rounded-[2rem] flex items-center gap-4 md:gap-5 hover:border-voyager-crimson hover:bg-voyager-crimson/5 transition-all text-left group">
       <div className="voyager-gradient p-2 md:p-3 rounded-xl md:rounded-2xl text-white group-hover:scale-110 transition-transform"><Navigation className="w-4 h-4 md:w-5 md:h-5" /></div>
       <span className="text-sm md:text-lg font-black tracking-tight">{label}</span>
    </button>
  );
};

/**
 * Mobile Navigation Button.
 * Fixed "Cannot find name 'div'" by using explicit return block and cleaner JSX structure.
 */
const MobNavButton: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => {
  return (
    <button onClick={onClick} title={label} className={`flex flex-col items-center gap-1 transition-all flex-1 py-1 rounded-2xl ${active ? 'text-voyager-crimson' : 'text-theme-muted'}`}>
      <div className={`p-2.5 rounded-xl transition-all ${active ? 'bg-voyager-crimson/10 scale-110 shadow-sm' : 'opacity-60'}`}>
        {React.cloneElement(icon as React.ReactElement<any>, { className: `w-5 h-5 ${active ? 'stroke-[3px]' : 'stroke-2'}` })}
      </div>
    </button>
  );
};

export default App;
