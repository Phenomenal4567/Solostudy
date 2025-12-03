const { useState, useEffect, useRef } = React;

// --- GLOBAL HELPERS ---
const getIsWeekend = (d = new Date()) => {
    return d.getDay() === 0 || d.getDay() === 6;
};

// --- ICON COMPONENT ---
const Icon = ({ name, size = 24, className = "" }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (!window.lucide || !window.lucide.icons || !ref.current) return;
        const pascalName = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
        const iconDef = window.lucide.icons[pascalName];
        if (iconDef) {
            const svg = window.lucide.createElement(iconDef);
            svg.setAttribute('width', size);
            svg.setAttribute('height', size);
            svg.setAttribute('class', `lucide lucide-${name} ${className}`);
            ref.current.innerHTML = '';
            ref.current.appendChild(svg);
        }
    }, [name, size, className]);
    return <span ref={ref} className="inline-flex items-center justify-center"></span>;
};

// --- MAIN APP ---
const SolostudyApp = () => {
    const [view, setView] = useState('setup'); 
    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [subjects, setSubjects] = useState([]);
    const [newSubject, setNewSubject] = useState('');
    const [newPriority, setNewPriority] = useState('Medium'); 
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    
    const [sessionDuration, setSessionDuration] = useState(45);
    const [breakDuration, setBreakDuration] = useState(10);
    
    const [dailyFocus, setDailyFocus] = useState([]); 
    const [tomorrowFocus, setTomorrowFocus] = useState([]); 
    const [schedule, setSchedule] = useState([]);

    const [timeLeft, setTimeLeft] = useState(sessionDuration * 60);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerMode, setTimerMode] = useState('focus'); 
    const [soundEnabled, setSoundEnabled] = useState(true); 
    
    const timerRef = useRef(null);
    const fileInputRef = useRef(null);
    const audioContextRef = useRef(null); 

    const defaultCourses = [
        { id: '1', name: 'COS101: Intro to Computing', priority: 'High' },
        { id: '2', name: 'MTH101: Elementary Math I', priority: 'Medium' },
        { id: '3', name: 'PHY101: General Physics I', priority: 'Medium' }
    ];

    useEffect(() => {
        const savedTheme = localStorage.getItem('isDarkMode');
        if (savedTheme) setIsDarkMode(JSON.parse(savedTheme));

        const savedSubjects = localStorage.getItem('studySubjects');
        if (savedSubjects) {
            try { 
                const parsed = JSON.parse(savedSubjects);
                if(Array.isArray(parsed)) setSubjects(parsed); 
            } catch (e) { setSubjects(defaultCourses); }
        } else {
            setSubjects(defaultCourses);
        }
        
        const savedSchedule = localStorage.getItem('studySchedule');
        if (savedSchedule) {
            try {
                const parsed = JSON.parse(savedSchedule);
                if (Array.isArray(parsed) && parsed.length > 0) { setSchedule(parsed); setView('dashboard'); }
            } catch (e) {}
        }

        try {
            const savedFocus = localStorage.getItem('dailyFocus');
            if (savedFocus) setDailyFocus(JSON.parse(savedFocus));
            const savedTomorrow = localStorage.getItem('tomorrowFocus');
            if (savedTomorrow) setTomorrowFocus(JSON.parse(savedTomorrow));
            const savedSession = localStorage.getItem('sessionDuration');
            if (savedSession) setSessionDuration(parseInt(savedSession) || 45);
            const savedBreak = localStorage.getItem('breakDuration');
            if (savedBreak) setBreakDuration(parseInt(savedBreak) || 10);
        } catch(e) { localStorage.clear(); }
    }, []);

    useEffect(() => {
        localStorage.setItem('studySubjects', JSON.stringify(subjects));
        localStorage.setItem('studySchedule', JSON.stringify(schedule));
        localStorage.setItem('dailyFocus', JSON.stringify(dailyFocus));
        localStorage.setItem('tomorrowFocus', JSON.stringify(tomorrowFocus));
        localStorage.setItem('sessionDuration', sessionDuration.toString());
        localStorage.setItem('breakDuration', breakDuration.toString());
        localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
    }, [subjects, schedule, dailyFocus, tomorrowFocus, sessionDuration, breakDuration, isDarkMode]);

    const initAudio = () => {
        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioContextRef.current = new AudioContext();
        }
        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
    };

    const playAlarm = () => {
        if (!soundEnabled || !audioContextRef.current) return;
        try {
            const ctx = audioContextRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); 
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
            osc.frequency.setValueAtTime(0, ctx.currentTime + 0.11);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2); 
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) { console.error("Audio failed", e); }
    };

    useEffect(() => {
        if (isTimerRunning && timeLeft > 0) {
            timerRef.current = setInterval(() => setTimeLeft(p => p - 1), 1000);
        } else if (timeLeft === 0 && isTimerRunning) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);
            playAlarm();
            const nextMode = timerMode === 'focus' ? 'break' : 'focus';
            const nextDuration = nextMode === 'focus' ? sessionDuration * 60 : breakDuration * 60;
            setTimerMode(nextMode);
            setTimeLeft(nextDuration);
        }
        return () => clearInterval(timerRef.current);
    }, [isTimerRunning, timeLeft, timerMode, sessionDuration, breakDuration, soundEnabled]);

    const addSubject = () => {
        if (!newSubject.trim()) return;
        setSubjects([...subjects, { id: Date.now().toString(), name: newSubject, priority: newPriority }]);
        setNewSubject('');
    };

    const removeSubject = (id) => setSubjects(subjects.filter(s => s.id !== id));

    // --- File Handling Logic ---
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Reset file input so same file can be selected again
        e.target.value = null;

        setIsLoading(true);

        try {
            if (file.name.endsWith('.json')) {
                // Restore Backup
                const text = await file.text();
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) {
                    setSubjects(parsed);
                    alert("Backup restored!");
                }
            } else if (file.name.endsWith('.pdf')) {
                // Parse PDF
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(' ') + "\n";
                }
                setImportText(fullText);
                setShowImport(true);
            } else if (file.name.endsWith('.docx')) {
                // Parse Word
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                setImportText(result.value);
                setShowImport(true);
            } else {
                alert("Unsupported file. Please use .pdf, .docx, or .json");
            }
        } catch (err) {
            console.error(err);
            alert("Error reading file. Is it corrupted?");
        } finally {
            setIsLoading(false);
        }
    };

    const parseImportText = () => {
        if (!importText.trim()) return;
        const lines = importText.split('\n');
        const newCourses = [];
        // Regex to find course codes like "MTH101" or "COS 102"
        const courseCodeRegex = /([A-Za-z]{3,4}\s?[\d]{3})/i;
        
        // Helper to scan a raw block of text if lines didn't work well
        const rawMatches = importText.match(/[A-Za-z]{3,4}\s?[\d]{3}/g);
        
        if (rawMatches && rawMatches.length > 0) {
             rawMatches.forEach(code => {
                 // Basic duplication check
                 if (!newCourses.some(c => c.name.includes(code))) {
                     newCourses.push({ 
                         id: Date.now() + Math.random().toString(), 
                         name: code.toUpperCase(), 
                         priority: 'Medium' 
                     });
                 }
             });
        }

        if (newCourses.length > 0) {
            // Filter out duplicates from existing subjects
            const uniqueNew = newCourses.filter(nc => !subjects.some(s => s.name.includes(nc.name)));
            if(uniqueNew.length > 0) {
                setSubjects([...subjects, ...uniqueNew]);
                setImportText('');
                setShowImport(false);
                alert(`Found ${uniqueNew.length} new courses!`);
            } else {
                alert("Courses found, but you already added them!");
            }
        } else {
            alert("Couldn't find any course codes (e.g. MTH101) in that file.");
        }
    };

    const clearAllData = () => {
        if (window.confirm("Are you sure? This will delete all data.")) {
            setSubjects([]);
            setSchedule([]);
            setDailyFocus([]);
            setTomorrowFocus([]);
            setView('setup');
            localStorage.clear();
        }
    };

    const generateSchedule = () => {
        try {
            if (subjects.length === 0) { alert("Please add some courses first!"); return; }
            const start = new Date();
            const [sH, sM] = startTime.split(':');
            start.setHours(parseInt(sH), parseInt(sM), 0, 0);
            
            const end = new Date();
            const [eH, eM] = endTime.split(':');
            end.setHours(parseInt(eH), parseInt(eM), 0, 0);
            
            if (end < start) end.setDate(end.getDate() + 1);

            let totalMinutes = (end - start) / 1000 / 60;
            if (totalMinutes <= 0) { alert("Check Start/End times."); return; }

            const isWeekend = getIsWeekend(new Date());
            
            let selected = [];
            if (isWeekend) {
                const highPriority = subjects.filter(s => s.priority === 'High' || s.priority === 'Medium');
                selected = [...(highPriority.length ? highPriority : subjects)].sort(() => 0.5 - Math.random()).slice(0, 4);
            } else {
                selected = [...subjects].sort(() => 0.5 - Math.random()).slice(0, 2);
            }
            
            if(selected.length === 0 && subjects.length > 0) selected = [subjects[0]];

            setDailyFocus(selected);
            setTomorrowFocus([]);

            const newSchedule = [];
            let currentTime = new Date(start);
            let subjectIndex = 0;
            let loops = 0;

            while (totalMinutes > 0 && loops < 50) {
                loops++;
                
                let dur = sessionDuration;
                let type = 'study';
                let subName = "Study";
                let pri = "Medium";

                const safeSub = selected.length > 0 ? selected[subjectIndex % selected.length] : null;

                if (safeSub) {
                    if (isWeekend) {
                        dur = Math.max(sessionDuration, 60);
                        type = subjectIndex % 2 === 0 ? 'test' : 'revision';
                        const baseName = safeSub.name.split(':')[0];
                        subName = type === 'test' ? `Mock Test: ${baseName}` : `Revision: ${baseName}`;
                        pri = safeSub.priority;
                    } else {
                        subName = safeSub.name;
                        pri = safeSub.priority;
                    }
                }

                dur = Math.min(dur, totalMinutes);
                newSchedule.push({
                    id: Date.now() + Math.random(), type, subject: subName, priority: pri,
                    time: currentTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                    duration: Math.floor(dur), completed: false
                });

                currentTime = new Date(currentTime.getTime() + dur * 60000);
                totalMinutes -= dur;
                subjectIndex++;

                if (totalMinutes > 5) {
                    const breakDur = Math.min(breakDuration, totalMinutes);
                    newSchedule.push({
                        id: Date.now() + Math.random(), type: 'break', subject: 'Brain Break',
                        time: currentTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                        duration: Math.floor(breakDur), completed: false
                    });
                    currentTime = new Date(currentTime.getTime() + breakDur * 60000);
                    totalMinutes -= breakDur;
                }
            }
            setSchedule(newSchedule);
            setTimeLeft(sessionDuration * 60);
            setTimerMode('focus');
            setIsTimerRunning(false);
            setView('dashboard');
        } catch(e) {
            console.error(e);
            alert("Error generating schedule. Resetting data recommended.");
        }
    };

    const toggleTimer = () => { initAudio(); setIsTimerRunning(!isTimerRunning); };
    const resetTimer = () => { setIsTimerRunning(false); setTimeLeft(timerMode === 'focus' ? sessionDuration * 60 : breakDuration * 60); };
    const toggleComplete = (id) => setSchedule(schedule.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
    const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

    const revealTomorrow = () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayOfWeek = tomorrow.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        let selected = [];
        if (subjects.length === 0) return;
        if (isWeekend) {
            const highPriority = subjects.filter(s => s.priority === 'High' || s.priority === 'Medium');
            selected = [...(highPriority.length ? highPriority : subjects)].sort(() => 0.5 - Math.random()).slice(0, 4);
        } else {
            selected = [...subjects].sort(() => 0.5 - Math.random()).slice(0, 2);
        }
        setTomorrowFocus(selected);
    };

    const theme = {
        bg: isDarkMode ? 'bg-slate-950' : 'bg-slate-50',
        text: isDarkMode ? 'text-slate-100' : 'text-slate-800',
        textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
        card: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100',
        input: isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400',
        border: isDarkMode ? 'border-slate-800' : 'border-slate-100'
    };

    // --- Render Functions ---
    const renderImportModal = () => (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in backdrop-blur-sm">
            <div className={`${theme.card} rounded-2xl w-full max-w-lg p-6 shadow-2xl border`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${theme.text}`}>
                        <Icon name="file-text" className="text-indigo-500" /> Import Courses
                    </h3>
                    <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-rose-500"><Icon name="x" size={20} /></button>
                </div>
                <textarea 
                    className={`w-full h-40 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none font-mono border ${theme.input}`}
                    placeholder="Parsed text will appear here. You can also paste manually."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                />
                <div className="flex gap-2 mt-4">
                    <button onClick={() => setImportText('')} className={`flex-1 py-2 rounded-xl transition-colors font-medium ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}>Clear</button>
                    <button onClick={parseImportText} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all font-bold">Extract Codes</button>
                </div>
            </div>
        </div>
    );

    const renderSetupView = () => (
        <div className="max-w-md mx-auto space-y-8 animate-fade-in relative pb-10 pt-4">
            {showImport && renderImportModal()}
            <div className="text-center space-y-2 pt-4">
                <h1 className={`text-2xl md:text-3xl font-bold ${theme.text}`}>Plan Your Semester.</h1>
                <p className={theme.textMuted}>Add courses manually or upload PDF/Word.</p>
            </div>
            
            <div className={`${theme.card} p-6 rounded-2xl shadow-sm border space-y-4 relative overflow-hidden`}>
                <div className="flex justify-between items-center">
                    <h2 className={`font-semibold flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}><Icon name="book-open" size={18} className="text-indigo-500" /> Your Courses</h2>
                    <div className="flex gap-1">
                        <button onClick={() => fileInputRef.current.click()} title="Import (PDF/Word/JSON)" className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-slate-500 hover:text-indigo-400 hover:bg-slate-800' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                            {isLoading ? <span className="animate-spin">⌛</span> : <Icon name="upload" size={16} />}
                        </button>
                        <button onClick={clearAllData} title="Clear Data" className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}><Icon name="trash-2" size={16} /></button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".json,.pdf,.docx" />
                    </div>
                </div>
                <div className="min-h-[100px] max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {subjects.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center h-32 text-sm border-2 border-dashed rounded-xl ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}><p>No courses yet.</p></div>
                    ) : subjects.map(sub => (
                        <div key={sub.id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex flex-col">
                                <span className={`font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{sub.name.split(':')[0]}</span>
                                <span className={`text-xs truncate max-w-[180px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{sub.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${sub.priority === 'High' ? 'bg-rose-100 text-rose-600' : sub.priority === 'Medium' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>{sub.priority}</span>
                                <button onClick={() => removeSubject(sub.id)} className="text-slate-300 hover:text-rose-500"><Icon name="x" size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className={`pt-4 border-t ${theme.border} flex gap-2`}>
                    <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSubject()} placeholder="Course Name..." className={`flex-[2] rounded-xl px-4 py-2 text-sm outline-none border ${theme.input}`} />
                    <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className={`flex-1 rounded-xl px-2 py-2 text-sm font-bold outline-none border ${theme.input}`}>
                        <option value="High">High</option><option value="Medium">Med</option><option value="Low">Low</option>
                    </select>
                    <button onClick={addSubject} className={`p-2 rounded-xl ${isDarkMode ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white'}`}><Icon name="plus" size={20} /></button>
                </div>
            </div>

            <div className={`${theme.card} p-6 rounded-2xl shadow-sm border space-y-4`}>
                <h2 className={`font-semibold flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}><Icon name="clock" size={18} className="text-rose-500" /> Time Settings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-xs font-semibold text-slate-400 uppercase">Start Day</label><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`w-full rounded-xl px-3 py-2 font-medium border ${theme.input}`}/></div>
                    <div className="space-y-1"><label className="text-xs font-semibold text-slate-400 uppercase">End Day</label><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`w-full rounded-xl px-3 py-2 font-medium border ${theme.input}`}/></div>
                </div>
                <div className={`pt-2 border-t ${theme.border} grid grid-cols-1 sm:grid-cols-2 gap-4`}>
                    <div className="space-y-1"><label className="text-xs font-semibold text-slate-400 uppercase">Study (min)</label><input type="number" min="1" max="180" value={sessionDuration} onChange={(e) => setSessionDuration(Number(e.target.value))} className={`w-full rounded-xl px-3 py-2 font-bold text-center border ${theme.input}`}/></div>
                    <div className="space-y-1"><label className="text-xs font-semibold text-slate-400 uppercase">Break (min)</label><input type="number" min="1" max="60" value={breakDuration} onChange={(e) => setBreakDuration(Number(e.target.value))} className={`w-full rounded-xl px-3 py-2 font-bold text-center border ${theme.input}`}/></div>
                </div>
            </div>

            <button onClick={generateSchedule} className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 rounded-2xl shadow-lg transition-all active:scale-95 transform`}>Generate My Schedule</button>
        </div>
    );

    const renderDashboardView = () => (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in pb-10 pt-4">
            <div className="md:col-span-1 space-y-6">
                <div className={`${theme.card} rounded-3xl p-6 shadow-xl border text-center relative overflow-hidden`}>
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${timerMode === 'focus' ? 'from-indigo-500 to-purple-500' : 'from-emerald-400 to-teal-500'}`}></div>
                    <div className="flex justify-between items-start mb-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${timerMode === 'focus' ? (isDarkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (isDarkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600')}`}>{timerMode === 'focus' ? 'Focus Mode' : 'Break Time'}</span>
                        <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}><Icon name={soundEnabled ? "volume-2" : "volume-x"} size={16} /></button>
                    </div>
                    <div className={`text-6xl font-black tracking-tighter mb-6 font-mono ${theme.text}`}>{formatTime(timeLeft)}</div>
                    <div className="flex justify-center gap-4">
                        <button onClick={toggleTimer} className={`p-4 rounded-2xl text-white transition-all transform hover:scale-105 active:scale-95 ${timerMode === 'focus' ? 'bg-indigo-600' : 'bg-emerald-500'}`}><Icon name={isTimerRunning ? "pause" : "play"} size={24} fill="currentColor" /></button>
                        <button onClick={resetTimer} className={`p-4 rounded-2xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}><Icon name="rotate-ccw" size={24} /></button>
                    </div>
                </div>
                <div className={`${theme.card} p-4 rounded-2xl border shadow-sm`}>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Today's Focus</h3>
                    {dailyFocus.map((sub, i) => <div key={i} className={`flex items-center gap-2 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}><div className="w-2 h-2 rounded-full bg-indigo-500"></div>{sub.name}</div>)}
                    <div className={`pt-3 mt-3 border-t ${theme.border} flex justify-between items-center`}>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Icon name="sparkles" size={12} className="text-amber-400" /> Tomorrow</h3>
                        {tomorrowFocus.length === 0 && <button onClick={revealTomorrow} className="text-[10px] text-indigo-500 font-bold hover:underline">REVEAL</button>}
                    </div>
                    {tomorrowFocus.length > 0 && tomorrowFocus.map((sub, i) => <div key={i} className="flex items-center gap-2 text-sm text-slate-500 mt-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>{sub.name}</div>)}
                </div>
                <button onClick={() => {setSchedule([]); setView('setup');}} className={`w-full flex items-center justify-center gap-2 text-sm font-bold rounded-xl py-3 transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}><Icon name="settings" size={14} /> Adjust Schedule</button>
            </div>
            <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className={`text-xl font-bold ${theme.text}`}>Today's Roadmap</h2>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{schedule.length} Sessions</span>
                </div>
                <div className="space-y-3 pb-20">
                    {schedule.map((item) => (
                        <div key={item.id} className={`relative flex items-center p-4 rounded-2xl transition-all border ${item.completed ? 'opacity-60' : ''} ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'} ${item.type === 'break' ? 'border-l-4 border-l-emerald-400' : 'border-l-4 border-l-indigo-500'}`}>
                            <div className="mr-4 text-center min-w-[3rem]"><span className="block text-xs font-bold text-slate-400">{item.time}</span><span className="block text-[10px] text-slate-500">{item.duration}m</span></div>
                            <div className="flex-1"><h3 className={`font-semibold ${item.completed ? 'line-through text-slate-500' : theme.text}`}>{item.subject}</h3><p className="text-xs capitalize text-slate-400">{item.type}</p></div>
                            <button onClick={() => toggleComplete(item.id)} className={`p-2 rounded-full transition-colors ${item.completed ? 'text-emerald-500' : 'text-slate-300'}`}><Icon name="check-circle" size={24} /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen font-sans selection:bg-indigo-100 transition-colors duration-300 ${theme.bg}`}>
            <header className="p-6 flex items-center justify-between max-w-5xl mx-auto">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('setup')}>
                    <div className={`w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg ${isDarkMode ? 'shadow-indigo-900/40' : 'shadow-indigo-200'}`}>S</div>
                    <span className={`font-bold tracking-tight ${theme.text}`}>Solostudy</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full transition-all ${isDarkMode ? 'bg-slate-800 text-yellow-400' : 'bg-white text-slate-400 shadow-sm'}`}>
                        <Icon name={isDarkMode ? "sun" : "moon"} size={20} />
                    </button>
                    <div className="text-sm font-medium text-slate-400 hidden sm:block">
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>
                </div>
            </header>
            <main className="p-4 md:p-6 max-w-5xl mx-auto">
                {view === 'setup' ? renderSetupView() : renderDashboardView()}
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SolostudyApp />);