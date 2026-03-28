import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend
} from 'recharts';
import { 
  Activity, Trophy, Target, Plus, History, Scale, 
  TrendingDown, Sparkles, Loader2, Utensils, Dumbbell, BarChart3, LayoutDashboard, ChevronRight
} from 'lucide-react';

const INITIAL_HEIGHT = 170; 
const START_WEIGHT = 110; 
const TARGET_WEIGHT = 86; 
const TOTAL_WEEKS = 24; 
const APP_ID = 'health-tracker-v1';

// Vercel Environment Variable: VITE_GEMINI_API_KEY
const apiKey = ""; 

const App = () => {
  const [history, setHistory] = useState([]);
  const [currentWeightInput, setCurrentWeightInput] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [aiPlan, setAiPlan] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planMood, setPlanMood] = useState('motivated');
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const saved = localStorage.getItem(APP_ID);
    if (saved) {
      setHistory(JSON.parse(saved));
    } else {
      const initial = [{ date: '2024-01-01', weight: START_WEIGHT }];
      setHistory(initial);
      localStorage.setItem(APP_ID, JSON.stringify(initial));
    }
  }, []);

  const currentWeight = useMemo(() => {
    return history.length > 0 ? history[history.length - 1].weight : START_WEIGHT;
  }, [history]);

  const bmi = useMemo(() => {
    const heightInMeters = INITIAL_HEIGHT / 100;
    return (currentWeight / (heightInMeters * heightInMeters)).toFixed(1);
  }, [currentWeight]);

  const bmiCategory = useMemo(() => {
    const val = parseFloat(bmi);
    if (val < 18.5) return { label: 'Underweight', color: 'text-blue-400' };
    if (val < 25) return { label: 'Healthy', color: 'text-emerald-400' };
    if (val < 30) return { label: 'Overweight', color: 'text-orange-400' };
    return { label: 'Obese', color: 'text-rose-400' };
  }, [bmi]);

  const progressPercent = useMemo(() => {
    const totalToLose = START_WEIGHT - TARGET_WEIGHT;
    const lostSoFar = START_WEIGHT - currentWeight;
    return Math.min(Math.max((lostSoFar / totalToLose) * 100, 0), 100).toFixed(0);
  }, [currentWeight]);

  const remainingKg = (currentWeight - TARGET_WEIGHT).toFixed(1);

  const comparisonData = useMemo(() => {
    if (history.length === 0) return [];
    const startDate = new Date(history[0].date);
    const weightPerWeek = (START_WEIGHT - TARGET_WEIGHT) / TOTAL_WEEKS;
    return history.map((entry) => {
      const entryDate = new Date(entry.date);
      const diffWeeks = Math.abs(entryDate - startDate) / (1000 * 60 * 60 * 24 * 7);
      return {
        date: entry.date,
        actual: entry.weight,
        target: parseFloat((START_WEIGHT - (weightPerWeek * diffWeeks)).toFixed(1)),
        isFriday: entryDate.getDay() === 5
      };
    });
  }, [history]);

  const callGemini = async (prompt, isJson = false) => {
    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: isJson ? { responseMimeType: "application/json" } : {}
        };
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('API Error');
        const result = await response.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text;
      } catch (error) {
        if (i === 4) throw error;
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  };

  const generateInsight = async () => {
    setIsGeneratingInsight(true);
    try {
      const text = await callGemini(`Supportive health coach. Weight ${currentWeight}kg (start ${START_WEIGHT}), goal ${TARGET_WEIGHT}. BMI ${bmi}. 2 motivating sentences.`);
      setAiInsight(text);
    } catch (err) {
      setAiInsight("You're doing great! Every Friday counts.");
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const generatePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const jsonStr = await callGemini(`Goal 86kg. Mood: ${planMood}. Suggest meal & 15m exercise in JSON {"meal": "...", "exercise": "..."}`, true);
      setAiPlan(JSON.parse(jsonStr));
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleAddWeight = (e) => {
    e.preventDefault();
    const weight = parseFloat(currentWeightInput);
    if (isNaN(weight) || weight <= 0) return;
    const newEntry = { date: new Date().toISOString().split('T')[0], weight };
    const updated = [...history, newEntry];
    setHistory(updated);
    localStorage.setItem(APP_ID, JSON.stringify(updated));
    setCurrentWeightInput('');
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans pb-24 selection:bg-orange-500/30">
      <nav className="bg-[#1e293b]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3 py-4">
            <div className="bg-gradient-to-br from-orange-500 to-rose-600 p-2.5 rounded-xl shadow-lg">
              <Activity className="text-white w-5 h-5" />
            </div>
            <span className="font-black text-xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">HealthTrack</span>
          </div>
          <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('analysis')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'analysis' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <BarChart3 size={16} /> Analysis
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="relative overflow-hidden bg-[#1e293b] rounded-[2.5rem] border border-white/10 shadow-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-orange-500/20">
                  <Sparkles size={12} /> AI Performance Coach
                </div>
                <h2 className="text-3xl font-black text-white mb-3 tracking-tight leading-none">
                  Fueling your <span className="text-orange-500">86kg</span> vision.
                </h2>
                <p className="text-slate-400 text-base leading-relaxed italic max-w-xl">
                  "{aiInsight || "Log your Friday weigh-in to unlock high-performance insights."}"
                </p>
              </div>
              <button 
                onClick={generateInsight}
                disabled={isGeneratingInsight}
                className="bg-white text-[#0f172a] hover:bg-orange-500 hover:text-white px-8 py-4 rounded-2xl font-black text-sm transition-all flex items-center gap-3 shadow-xl disabled:opacity-50"
              >
                {isGeneratingInsight ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                Generate Insight
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCardV2 icon={<Scale className="text-orange-500" />} label="Weight" value={currentWeight} unit="KG" sub={`-${(START_WEIGHT - currentWeight).toFixed(1)}kg lost`} accent="orange" />
              <StatCardV2 icon={<Target className="text-rose-500" />} label="Goal Gap" value={remainingKg} unit="KG" sub={`${progressPercent}% complete`} accent="rose" />
              <StatCardV2 icon={<Trophy className="text-amber-500" />} label="Status" value={bmi} unit="BMI" sub={bmiCategory.label} subColor={bmiCategory.color} accent="amber" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-[#1e293b] rounded-[2.5rem] p-8 border border-white/5 shadow-xl">
                  <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3"><TrendingDown className="text-orange-500" /> Progression Curve</h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="colorWeightDashboard" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis domain={['dataMin - 3', 'dataMax + 2']} stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <Area type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorWeightDashboard)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 rounded-[2.5rem] p-8 border border-indigo-500/20">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-white">Lifestyle Plan</h3>
                      <p className="text-indigo-300 text-sm">Customized based on your energy levels.</p>
                    </div>
                    <div className="flex bg-black/20 p-1.5 rounded-2xl gap-2">
                      <select value={planMood} onChange={(e) => setPlanMood(e.target.value)} className="bg-transparent text-white border-none px-4 py-2 text-xs font-black">
                        <option value="motivated" className="bg-[#1e293b]">Energetic</option>
                        <option value="tired" className="bg-[#1e293b]">Tired</option>
                        <option value="busy" className="bg-[#1e293b]">Busy</option>
                      </select>
                      <button onClick={generatePlan} disabled={isGeneratingPlan} className="bg-indigo-500 text-white px-6 py-2 rounded-xl text-xs font-black">
                        {isGeneratingPlan ? <Loader2 className="animate-spin w-3 h-3" /> : 'Re-Plan'}
                      </button>
                    </div>
                  </div>
                  {aiPlan && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <PlanCard icon={<Utensils className="text-white w-5 h-5" />} color="bg-indigo-500" title="Fuel" text={aiPlan.meal} />
                      <PlanCard icon={<Dumbbell className="text-white w-5 h-5" />} color="bg-rose-500" title="Move" text={aiPlan.exercise} />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-gradient-to-br from-orange-500 to-rose-600 rounded-[2.5rem] p-8 text-white shadow-2xl">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Plus size={18} /> Check-in</h3>
                  <form onSubmit={handleAddWeight} className="space-y-6">
                    <div className="relative">
                      <input type="number" step="0.1" value={currentWeightInput} onChange={(e) => setCurrentWeightInput(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-3xl py-6 px-6 text-3xl font-black text-white text-center" placeholder="00.0" />
                      <span className="absolute right-8 top-1/2 -translate-y-1/2 text-white/40 font-black text-sm">KG</span>
                    </div>
                    <button className="w-full bg-white text-orange-600 font-black py-5 rounded-3xl shadow-xl hover:bg-orange-50 transition-colors">Submit Record</button>
                  </form>
                </div>
                <div className="bg-[#1e293b] rounded-[2.5rem] p-8 border border-white/5 shadow-xl">
                   <h3 className="font-black text-lg mb-6 flex items-center justify-between text-white">Recent Logs <History className="w-5 h-5 text-slate-500" /></h3>
                   <div className="max-h-80 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                     {history.slice().reverse().map((h, i) => (
                       <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                         <div className="flex flex-col">
                           <span className="text-[10px] font-black text-slate-500 uppercase">{new Date(h.date).getDay() === 5 ? 'Friday Check-in' : 'Casual'}</span>
                           <span className="text-sm font-bold text-slate-300">{h.date}</span>
                         </div>
                         <div className="text-white font-black">{h.weight} kg</div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-emerald-100 text-[#0f172a]">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-black tracking-tight">Strategy Analysis</h2>
                  <p className="text-emerald-600 font-bold text-sm">Tracking against the 86kg goal line.</p>
                </div>
                <div className="flex gap-6">
                  <LegendItem color="bg-emerald-500" label="Actual" />
                  <LegendItem color="bg-rose-400" label="Target" />
                </div>
              </div>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis domain={[TARGET_WEIGHT - 2, START_WEIGHT + 2]} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '24px', border: 'none' }} />
                    <Line name="Target" type="monotone" dataKey="target" stroke="#fb7185" strokeWidth={3} strokeDasharray="8 8" dot={false} />
                    <Line name="Actual" type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={5} dot={(props) => props.payload.isFriday ? <circle cx={props.cx} cy={props.cy} r={6} fill="#10b981" stroke="white" strokeWidth={3} /> : null} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[#0f172a]">
               <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <h3 className="font-black text-xl mb-6">Pace Metrics</h3>
                  <div className="space-y-6">
                    <MetricRow label="Avg Loss/Week" value={history.length > 1 ? ((START_WEIGHT - currentWeight) / (comparisonData.length || 1)).toFixed(2) : "0.00"} unit="KG" color="text-indigo-600" />
                    <MetricRow label="Required Target" value="1.00" unit="KG" color="text-rose-500" />
                  </div>
               </div>
               <div className="bg-gradient-to-br from-[#10b981] to-[#059669] p-10 rounded-[2.5rem] text-white shadow-2xl flex flex-col justify-center">
                  <h3 className="font-black text-xl mb-4 flex items-center gap-3"><Trophy className="w-6 h-6" /> Long Term Projection</h3>
                  <div className="text-6xl font-black tracking-tighter mb-2">
                    {(START_WEIGHT - (START_WEIGHT - currentWeight) * (TOTAL_WEEKS / Math.max(comparisonData.length, 1))).toFixed(1)} <span className="text-2xl">KG</span>
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest text-emerald-100">Estimated Final Result @ Week 24</p>
               </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

const StatCardV2 = ({ icon, label, value, unit, sub, subColor, accent }) => (
  <div className={`bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl transition-transform hover:scale-[1.02]`}>
    <div className="bg-slate-900/50 p-4 rounded-2xl w-fit mb-6 shadow-inner">{icon}</div>
    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">{label}</p>
    <div className="flex items-baseline gap-2">
      <p className="text-4xl font-black text-white">{value}</p>
      <p className="text-sm font-black text-slate-600">{unit}</p>
    </div>
    <p className={`text-[11px] mt-4 font-black uppercase tracking-widest ${subColor || 'text-slate-500'}`}>{sub}</p>
  </div>
);

const PlanCard = ({ icon, color, title, text }) => (
  <div className="bg-white/5 p-6 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
    <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-lg`}>{icon}</div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
    <p className="text-slate-200 text-sm font-bold">{text}</p>
  </div>
);

const LegendItem = ({ color, label }) => (
  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
    <div className={`w-4 h-4 rounded-md ${color}`} /> {label}
  </div>
);

const MetricRow = ({ label, value, unit, color }) => (
  <div className="flex justify-between items-center p-6 bg-slate-50 rounded-[2rem]">
    <span className="text-xs text-slate-400 font-black uppercase tracking-tight">{label}</span>
    <span className={`text-3xl font-black ${color}`}>{value} <span className="text-sm">{unit}</span></span>
  </div>
);

export default App;
