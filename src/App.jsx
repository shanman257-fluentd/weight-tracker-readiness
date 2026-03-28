import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart
} from 'recharts';
import { 
  Activity, Trophy, Target, Plus, History, Scale, 
  TrendingDown, Sparkles, Loader2, Utensils, Dumbbell, BarChart3, LayoutDashboard, ChevronRight,
  Download, Upload, Settings, Calendar, TrendingUp, Zap, Award, Bell, X, Check, AlertCircle,
  Moon, Sun, Edit, Trash2, Filter, RefreshCw, Share2, FileText, PieChart, Flame
} from 'lucide-react';

const APP_ID = 'health-tracker-v2';
const SETTINGS_ID = 'health-tracker-settings-v2';

const DEFAULT_SETTINGS = {
  height: 170,
  startWeight: 110,
  targetWeight: 86,
  totalWeeks: 24,
  theme: 'dark'
};

// Vercel Environment Variable: VITE_GEMINI_API_KEY
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 

const App = () => {
  const [history, setHistory] = useState([]);
  const [currentWeightInput, setCurrentWeightInput] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [aiPlan, setAiPlan] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planMood, setPlanMood] = useState('motivated');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [notification, setNotification] = useState(null);
  const [analysisRange, setAnalysisRange] = useState('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const [calorieHistory, setCalorieHistory] = useState([]);
  const [todayCalories, setTodayCalories] = useState(0);
  const [mealInput, setMealInput] = useState({ name: '', calories: '' });
  const [metricsHistory, setMetricsHistory] = useState([]);
  const [currentMetrics, setCurrentMetrics] = useState({ chest: '', waist: '', hips: '', arms: '', thighs: '' });
  const [selectedDay, setSelectedDay] = useState('push');

  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_ID);
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    } else {
      setShowOnboarding(true);
    }

    const savedCalories = localStorage.getItem('health-tracker-calories');
    if (savedCalories) setCalorieHistory(JSON.parse(savedCalories));

    const savedMetrics = localStorage.getItem('health-tracker-metrics');
    if (savedMetrics) setMetricsHistory(JSON.parse(savedMetrics));

    const saved = localStorage.getItem(APP_ID);
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_ID, JSON.stringify(newSettings));
    showNotification('Settings saved successfully!', 'success');
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const exportData = () => {
    const data = { history, settings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthtrack-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showNotification('Data exported successfully!', 'success');
  };

  const exportCSV = () => {
    const csv = ['Date,Weight,BMI\n', ...history.map(h => {
      const bmi = (h.weight / ((settings.height / 100) ** 2)).toFixed(1);
      return `${h.date},${h.weight},${bmi}`;
    })].join('');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healthtrack-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showNotification('CSV exported successfully!', 'success');
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.history) {
          setHistory(data.history);
          localStorage.setItem(APP_ID, JSON.stringify(data.history));
        }
        if (data.settings) {
          saveSettings(data.settings);
        }
        showNotification('Data imported successfully!', 'success');
      } catch (err) {
        showNotification('Failed to import data. Invalid file format.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const deleteEntry = (index) => {
    const updated = history.filter((_, i) => i !== index);
    setHistory(updated);
    localStorage.setItem(APP_ID, JSON.stringify(updated));
    showNotification('Entry deleted', 'info');
  };

  const currentWeight = useMemo(() => {
    return history.length > 0 ? history[history.length - 1].weight : settings.startWeight;
  }, [history, settings.startWeight]);

  const bmi = useMemo(() => {
    const heightInMeters = settings.height / 100;
    return (currentWeight / (heightInMeters * heightInMeters)).toFixed(1);
  }, [currentWeight, settings.height]);

  const bmiCategory = useMemo(() => {
    const val = parseFloat(bmi);
    if (val < 18.5) return { label: 'Underweight', color: 'text-blue-400' };
    if (val < 25) return { label: 'Healthy', color: 'text-emerald-400' };
    if (val < 30) return { label: 'Overweight', color: 'text-orange-400' };
    return { label: 'Obese', color: 'text-rose-400' };
  }, [bmi]);

  const progressPercent = useMemo(() => {
    const totalToLose = settings.startWeight - settings.targetWeight;
    const lostSoFar = settings.startWeight - currentWeight;
    return Math.min(Math.max((lostSoFar / totalToLose) * 100, 0), 100).toFixed(0);
  }, [currentWeight, settings]);

  const remainingKg = Math.abs(currentWeight - settings.targetWeight).toFixed(1);

  // Calorie Calculations
  const calorieMetrics = useMemo(() => {
    // Mifflin-St Jeor Equation for BMR (assuming male, age 30)
    const age = 30;
    const bmr = (10 * currentWeight) + (6.25 * settings.height) - (5 * age) + 5;
    
    // TDEE (Total Daily Energy Expenditure) - assuming moderate activity
    const tdee = bmr * 1.55;
    
    // Target weight BMR and TDEE
    const targetBmr = (10 * settings.targetWeight) + (6.25 * settings.height) - (5 * age) + 5;
    const targetTdee = targetBmr * 1.55;
    
    // Calorie deficit needed (500 cal/day = ~0.5kg/week)
    const weeklyGoal = (currentWeight - settings.targetWeight) / settings.totalWeeks;
    const dailyDeficit = weeklyGoal * 7700 / 7; // 7700 cal = 1kg
    const targetCalories = tdee - dailyDeficit;
    
    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      maintenance: Math.round(tdee),
      targetCalories: Math.round(targetCalories),
      deficit: Math.round(dailyDeficit),
      targetMaintenance: Math.round(targetTdee)
    };
  }, [currentWeight, settings]);

  const handleAddMeal = () => {
    if (!mealInput.name || !mealInput.calories) {
      showNotification('Please enter meal name and calories', 'error');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const newMeal = {
      date: today,
      name: mealInput.name,
      calories: parseInt(mealInput.calories),
      time: new Date().toLocaleTimeString()
    };
    const updated = [...calorieHistory, newMeal];
    setCalorieHistory(updated);
    localStorage.setItem('health-tracker-calories', JSON.stringify(updated));
    setMealInput({ name: '', calories: '' });
    showNotification('Meal logged!', 'success');
  };

  const handleAddMetrics = () => {
    const today = new Date().toISOString().split('T')[0];
    const newMetrics = {
      date: today,
      ...currentMetrics
    };
    const updated = [...metricsHistory, newMetrics];
    setMetricsHistory(updated);
    localStorage.setItem('health-tracker-metrics', JSON.stringify(updated));
    setCurrentMetrics({ chest: '', waist: '', hips: '', arms: '', thighs: '' });
    showNotification('Metrics saved!', 'success');
  };

  const todayCalorieTotal = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return calorieHistory
      .filter(meal => meal.date === today)
      .reduce((sum, meal) => sum + meal.calories, 0);
  }, [calorieHistory]);

  const comparisonData = useMemo(() => {
    if (history.length === 0) return [];
    const startDate = new Date(history[0].date);
    const weightPerWeek = (settings.startWeight - settings.targetWeight) / settings.totalWeeks;
    return history.map((entry) => {
      const entryDate = new Date(entry.date);
      const diffWeeks = Math.abs(entryDate - startDate) / (1000 * 60 * 60 * 24 * 7);
      const heightInMeters = settings.height / 100;
      const idealWeight = parseFloat((settings.startWeight - (weightPerWeek * diffWeeks)).toFixed(1));
      const actualWeight = entry.weight;
      const difference = actualWeight - idealWeight;
      
      return {
        date: entry.date,
        actual: actualWeight,
        ideal: idealWeight,
        target: idealWeight,
        isFriday: entryDate.getDay() === 5,
        bmi: parseFloat((entry.weight / (heightInMeters * heightInMeters)).toFixed(1)),
        weekNumber: Math.floor(diffWeeks),
        status: difference > 2 ? 'lagging' : difference < -2 ? 'ahead' : 'ontrack',
        upperBound: idealWeight + 2,
        lowerBound: idealWeight - 2
      };
    });
  }, [history, settings]);

  const fullProjectionData = useMemo(() => {
    if (history.length === 0) return [];
    const startDate = new Date(history[0].date);
    const weightPerWeek = (settings.startWeight - settings.targetWeight) / settings.totalWeeks;
    const data = [];
    
    for (let week = 0; week <= settings.totalWeeks; week++) {
      const weekDate = new Date(startDate);
      weekDate.setDate(weekDate.getDate() + (week * 7));
      const idealWeight = parseFloat((settings.startWeight - (weightPerWeek * week)).toFixed(1));
      
      const actualEntry = history.find(h => {
        const hDate = new Date(h.date);
        const diffWeeks = Math.abs(hDate - startDate) / (1000 * 60 * 60 * 24 * 7);
        return Math.floor(diffWeeks) === week;
      });
      
      data.push({
        week: `W${week}`,
        date: weekDate.toISOString().split('T')[0],
        ideal: idealWeight,
        actual: actualEntry ? actualEntry.weight : null,
        upperBound: idealWeight + 2,
        lowerBound: idealWeight - 2,
        onTrackZone: [idealWeight - 2, idealWeight + 2]
      });
    }
    
    return data;
  }, [history, settings]);

  const advancedMetrics = useMemo(() => {
    if (history.length < 2) return null;
    
    const weights = history.map(h => h.weight);
    const avgWeeklyLoss = (settings.startWeight - currentWeight) / Math.max(comparisonData.length / 7, 1);
    const last7Days = history.slice(-7);
    const last30Days = history.slice(-30);
    
    const avg7 = last7Days.reduce((sum, h) => sum + h.weight, 0) / last7Days.length;
    const avg30 = last30Days.reduce((sum, h) => sum + h.weight, 0) / last30Days.length;
    
    const bestWeek = Math.max(...weights.slice(0, -1).map((w, i) => w - weights[i + 1]));
    const totalLost = settings.startWeight - currentWeight;
    const weeksElapsed = comparisonData.length / 7;
    const projectedFinal = settings.startWeight - (avgWeeklyLoss * settings.totalWeeks);
    
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - (weights.reduce((a, b) => a + b) / weights.length), 2), 0) / weights.length;
    const consistency = Math.max(0, 100 - (Math.sqrt(variance) * 10));
    
    return {
      avgWeeklyLoss: avgWeeklyLoss.toFixed(2),
      avg7Day: avg7.toFixed(1),
      avg30Day: avg30.toFixed(1),
      bestWeekLoss: bestWeek.toFixed(2),
      totalLost: totalLost.toFixed(1),
      weeksElapsed: weeksElapsed.toFixed(1),
      projectedFinal: projectedFinal.toFixed(1),
      consistency: consistency.toFixed(0),
      onTrack: avgWeeklyLoss >= (settings.startWeight - settings.targetWeight) / settings.totalWeeks
    };
  }, [history, currentWeight, comparisonData, settings]);

  const weeklyData = useMemo(() => {
    if (history.length < 2) return [];
    const weeks = {};
    comparisonData.forEach(entry => {
      const week = entry.weekNumber;
      if (!weeks[week]) weeks[week] = [];
      weeks[week].push(entry.actual);
    });
    return Object.keys(weeks).map(week => ({
      week: `Week ${week}`,
      avgWeight: (weeks[week].reduce((a, b) => a + b) / weeks[week].length).toFixed(1),
      entries: weeks[week].length
    }));
  }, [comparisonData]);

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
    if (!apiKey) {
      showNotification('Please add your Gemini API key in settings', 'error');
      return;
    }
    setIsGeneratingInsight(true);
    try {
      const text = await callGemini(`Supportive health coach. Weight ${currentWeight}kg (start ${settings.startWeight}), goal ${settings.targetWeight}. BMI ${bmi}. 2 motivating sentences.`);
      setAiInsight(text);
    } catch (err) {
      setAiInsight("You're doing great! Every step forward counts.");
      showNotification('Failed to generate insight', 'error');
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const generatePlan = async () => {
    if (!apiKey) {
      showNotification('Please add your Gemini API key in settings', 'error');
      return;
    }
    setIsGeneratingPlan(true);
    try {
      const jsonStr = await callGemini(`Goal ${settings.targetWeight}kg. Mood: ${planMood}. Suggest meal & 15m exercise in JSON {"meal": "...", "exercise": "..."}`, true);
      setAiPlan(JSON.parse(jsonStr));
    } catch (err) {
      showNotification('Failed to generate plan', 'error');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleAddWeight = (e) => {
    e.preventDefault();
    const weight = parseFloat(currentWeightInput);
    if (isNaN(weight) || weight <= 0) {
      showNotification('Please enter a valid weight', 'error');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const existingIndex = history.findIndex(h => h.date === today);
    let updated;
    if (existingIndex >= 0) {
      updated = [...history];
      updated[existingIndex] = { date: today, weight };
      showNotification('Weight updated for today!', 'success');
    } else {
      const newEntry = { date: today, weight };
      updated = [...history, newEntry];
      showNotification('Weight logged successfully!', 'success');
    }
    setHistory(updated);
    localStorage.setItem(APP_ID, JSON.stringify(updated));
    setCurrentWeightInput('');
  };

  const filteredHistory = useMemo(() => {
    if (analysisRange === 'all') return history;
    const days = analysisRange === '7d' ? 7 : analysisRange === '30d' ? 30 : 90;
    return history.slice(-days);
  }, [history, analysisRange]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100 font-sans pb-24 selection:bg-blue-500/30">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border animate-in slide-in-from-top-5 ${
          notification.type === 'success' ? 'bg-emerald-500/90 border-emerald-400/50' :
          notification.type === 'error' ? 'bg-rose-500/90 border-rose-400/50' :
          'bg-blue-500/90 border-blue-400/50'
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' && <Check className="w-5 h-5" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {notification.type === 'info' && <Bell className="w-5 h-5" />}
            <span className="font-bold text-white">{notification.message}</span>
          </div>
        </div>
      )}

      {showOnboarding && (
        <OnboardingModal 
          onComplete={(userSettings) => {
            saveSettings(userSettings);
            setShowOnboarding(false);
            const today = new Date().toISOString().split('T')[0];
            const initial = [{ date: today, weight: userSettings.startWeight }];
            setHistory(initial);
            localStorage.setItem(APP_ID, JSON.stringify(initial));
          }}
        />
      )}

      {showSettings && (
        <SettingsModal 
          settings={settings}
          onSave={(newSettings) => {
            saveSettings(newSettings);
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showExportModal && (
        <ExportModal
          onExportJSON={exportData}
          onExportCSV={exportCSV}
          onImport={importData}
          onClose={() => setShowExportModal(false)}
        />
      )}

      <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-blue-500/20 sticky top-0 z-30 shadow-lg shadow-blue-500/5">
        <div className="max-w-7xl mx-auto px-4 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3 py-4">
            <div className="bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/50">
              <Activity className="text-white w-5 h-5" />
            </div>
            <span className="font-black text-xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400">HealthTrack Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-blue-500/20">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <LayoutDashboard size={16} /> Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('analysis')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'analysis' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <BarChart3 size={16} /> Analysis
              </button>
              <button 
                onClick={() => setActiveTab('nutrition')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'nutrition' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Utensils size={16} /> Nutrition
              </button>
              <button 
                onClick={() => setActiveTab('metrics')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'metrics' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Activity size={16} /> Metrics
              </button>
              <button 
                onClick={() => setActiveTab('exercise')}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'exercise' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Dumbbell size={16} /> Exercise
              </button>
            </div>
            <button onClick={() => setShowExportModal(true)} className="p-2.5 rounded-xl bg-slate-800/50 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all">
              <Download size={18} />
            </button>
            <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-xl bg-slate-800/50 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-900/40 via-slate-800/40 to-purple-900/40 backdrop-blur-xl rounded-[2.5rem] border border-blue-500/20 shadow-2xl shadow-blue-500/10 p-8 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-blue-500/30">
                  <Sparkles size={12} /> AI Performance Coach
                </div>
                <h2 className="text-3xl font-black text-white mb-3 tracking-tight leading-none">
                  Fueling your <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{settings.targetWeight}kg</span> vision.
                </h2>
                <p className="text-slate-300 text-base leading-relaxed italic max-w-xl">
                  "{aiInsight || "Track your progress to unlock AI-powered insights and personalized guidance."}"
                </p>
              </div>
              <button 
                onClick={generateInsight}
                disabled={isGeneratingInsight}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 px-8 py-4 rounded-2xl font-black text-sm transition-all flex items-center gap-3 shadow-xl shadow-blue-500/30 disabled:opacity-50"
              >
                {isGeneratingInsight ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                Generate Insight
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCardV2 icon={<Scale className="text-blue-400" />} label="Current Weight" value={currentWeight} unit="KG" sub={`-${(settings.startWeight - currentWeight).toFixed(1)}kg lost`} accent="blue" />
              <StatCardV2 icon={<Target className="text-purple-400" />} label="Goal Gap" value={remainingKg} unit="KG" sub={`${progressPercent}% complete`} accent="purple" />
              <StatCardV2 icon={<Trophy className="text-cyan-400" />} label="BMI Status" value={bmi} unit="BMI" sub={bmiCategory.label} subColor={bmiCategory.color} accent="cyan" />
              <StatCardV2 icon={<Flame className="text-pink-400" />} label="Streak" value={history.length} unit="Days" sub="Total check-ins" accent="pink" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-blue-500/20 shadow-xl">
                  <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3"><TrendingDown className="text-blue-400" /> Progression Curve</h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="colorWeightDashboard" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(59,130,246,0.1)" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis domain={['dataMin - 3', 'dataMax + 2']} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid rgba(59,130,246,0.3)' }} />
                        <Area type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorWeightDashboard)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-xl rounded-[2.5rem] p-8 border border-purple-500/20">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-white">AI Lifestyle Plan</h3>
                      <p className="text-purple-300 text-sm">Customized based on your energy levels.</p>
                    </div>
                    <div className="flex bg-black/20 p-1.5 rounded-2xl gap-2">
                      <select value={planMood} onChange={(e) => setPlanMood(e.target.value)} className="bg-transparent text-white border-none px-4 py-2 text-xs font-black">
                        <option value="motivated" className="bg-slate-800">Energetic</option>
                        <option value="tired" className="bg-slate-800">Tired</option>
                        <option value="busy" className="bg-slate-800">Busy</option>
                      </select>
                      <button onClick={generatePlan} disabled={isGeneratingPlan} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg">
                        {isGeneratingPlan ? <Loader2 className="animate-spin w-3 h-3" /> : 'Generate'}
                      </button>
                    </div>
                  </div>
                  {aiPlan ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <PlanCard icon={<Utensils className="text-white w-5 h-5" />} color="bg-gradient-to-br from-purple-500 to-purple-600" title="Nutrition" text={aiPlan.meal} />
                      <PlanCard icon={<Dumbbell className="text-white w-5 h-5" />} color="bg-gradient-to-br from-pink-500 to-pink-600" title="Exercise" text={aiPlan.exercise} />
                    </div>
                  ) : (
                    <div className="text-center py-12 text-purple-300">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="font-bold">Click Generate to get your personalized plan</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-500/20">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Plus size={18} /> Daily Check-in</h3>
                  <form onSubmit={handleAddWeight} className="space-y-6">
                    <div className="relative">
                      <input type="number" step="0.1" value={currentWeightInput} onChange={(e) => setCurrentWeightInput(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-3xl py-6 px-6 text-3xl font-black text-white text-center placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/50" placeholder="00.0" />
                      <span className="absolute right-8 top-1/2 -translate-y-1/2 text-white/60 font-black text-sm">KG</span>
                    </div>
                    <button className="w-full bg-white text-blue-600 font-black py-5 rounded-3xl shadow-xl hover:bg-blue-50 transition-all hover:scale-[1.02]">Log Weight</button>
                  </form>
                </div>
                <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-blue-500/20 shadow-xl">
                   <h3 className="font-black text-lg mb-6 flex items-center justify-between text-white">Recent Logs <History className="w-5 h-5 text-blue-400" /></h3>
                   {history.length === 0 ? (
                     <div className="text-center py-12 text-slate-400">
                       <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                       <p className="font-bold">No entries yet</p>
                       <p className="text-sm">Start tracking your progress!</p>
                     </div>
                   ) : (
                     <div className="max-h-80 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                       {history.slice().reverse().map((h, i) => {
                         const actualIndex = history.length - 1 - i;
                         return (
                           <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all group">
                             <div className="flex flex-col flex-1">
                               <span className="text-[10px] font-black text-blue-400 uppercase">{new Date(h.date).getDay() === 5 ? '📅 Friday' : '📊 Daily'}</span>
                               <span className="text-sm font-bold text-slate-300">{h.date}</span>
                             </div>
                             <div className="flex items-center gap-3">
                               <div className="text-white font-black">{h.weight} kg</div>
                               <button onClick={() => deleteEntry(actualIndex)} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-all">
                                 <Trash2 size={14} />
                               </button>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-4xl font-black text-white mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Advanced Analytics</h1>
                <p className="text-slate-400 font-bold">Deep insights into your health journey</p>
              </div>
              <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-purple-500/20">
                <button onClick={() => setAnalysisRange('7d')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${analysisRange === '7d' ? 'bg-purple-500 text-white' : 'text-slate-400'}`}>7D</button>
                <button onClick={() => setAnalysisRange('30d')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${analysisRange === '30d' ? 'bg-purple-500 text-white' : 'text-slate-400'}`}>30D</button>
                <button onClick={() => setAnalysisRange('90d')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${analysisRange === '90d' ? 'bg-purple-500 text-white' : 'text-slate-400'}`}>90D</button>
                <button onClick={() => setAnalysisRange('all')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${analysisRange === 'all' ? 'bg-purple-500 text-white' : 'text-slate-400'}`}>ALL</button>
              </div>
            </div>

            {advancedMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <AnalyticsCard icon={<TrendingDown className="text-blue-400" />} label="Avg Weekly Loss" value={advancedMetrics.avgWeeklyLoss} unit="KG" trend={advancedMetrics.onTrack ? 'positive' : 'negative'} />
                <AnalyticsCard icon={<Zap className="text-purple-400" />} label="7-Day Average" value={advancedMetrics.avg7Day} unit="KG" />
                <AnalyticsCard icon={<Award className="text-cyan-400" />} label="Consistency Score" value={advancedMetrics.consistency} unit="%" />
                <AnalyticsCard icon={<Target className="text-pink-400" />} label="Projected Final" value={advancedMetrics.projectedFinal} unit="KG" trend={parseFloat(advancedMetrics.projectedFinal) <= settings.targetWeight ? 'positive' : 'negative'} />
              </div>
            )}

            <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-[3rem] p-10 border border-blue-200/50 shadow-2xl mb-8 backdrop-blur-xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full mb-3 border border-blue-300/30">
                    <BarChart3 className="text-blue-600" size={16} />
                    <span className="text-xs font-black text-blue-700 uppercase tracking-wider">Progress Analytics</span>
                  </div>
                  <h2 className="text-4xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                    Your Journey Visualization
                  </h2>
                  <p className="text-slate-600 text-sm font-bold">Real-time tracking against your {settings.targetWeight}kg target • {history.length} check-ins recorded</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-xs font-black text-white uppercase">Your Progress</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-400 to-rose-500 rounded-xl shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-white opacity-60" />
                    <span className="text-xs font-black text-white uppercase">Ideal Pace</span>
                  </div>
                </div>
              </div>
              <div className="h-[500px] w-full bg-white/60 backdrop-blur-sm rounded-3xl p-8 relative shadow-inner border border-white/50">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fullProjectionData}>
                    <defs>
                      <linearGradient id="actualGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="targetGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#fb7185" />
                        <stop offset="100%" stopColor="#f43f5e" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e7ff" opacity={0.5} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
                      }}
                      interval="preserveStartEnd"
                      height={50}
                    />
                    <YAxis 
                      domain={[settings.targetWeight - 10, settings.startWeight + 5]} 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                      width={50}
                      label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11, fontWeight: 'bold' } }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                        borderRadius: '16px', 
                        border: 'none',
                        padding: '0',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const diff = data.actual ? (data.actual - data.ideal).toFixed(1) : null;
                          return (
                            <div className="bg-gradient-to-br from-white to-blue-50 p-4 rounded-2xl border border-blue-200/50 backdrop-blur-xl">
                              <p className="text-slate-600 font-bold text-xs mb-3 uppercase tracking-wider">{data.date}</p>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-6">
                                  <span className="text-xs font-bold text-slate-500">Target</span>
                                  <span className="text-lg font-black text-rose-500">{data.ideal}kg</span>
                                </div>
                                {data.actual && (
                                  <>
                                    <div className="flex items-center justify-between gap-6">
                                      <span className="text-xs font-bold text-slate-500">Actual</span>
                                      <span className="text-lg font-black text-emerald-600">{data.actual}kg</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200">
                                      <div className={`text-xs font-black text-center py-1.5 px-3 rounded-lg ${
                                        parseFloat(diff) > 2 ? 'bg-rose-100 text-rose-700' :
                                        parseFloat(diff) < -2 ? 'bg-emerald-100 text-emerald-700' :
                                        'bg-blue-100 text-blue-700'
                                      }`}>
                                        {parseFloat(diff) > 0 ? `+${diff}kg` : `${diff}kg`} from target
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      name="Target" 
                      type="monotone" 
                      dataKey="ideal" 
                      stroke="url(#targetGradient)" 
                      strokeWidth={3} 
                      strokeDasharray="8 4"
                      dot={false}
                      opacity={0.7}
                    />
                    <Line 
                      name="Actual" 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="url(#actualGradient)" 
                      strokeWidth={5} 
                      dot={(props) => {
                        if (!props.payload.actual) return null;
                        const isAhead = props.payload.actual < props.payload.lowerBound;
                        const isLagging = props.payload.actual > props.payload.upperBound;
                        return (
                          <>
                            <circle 
                              cx={props.cx} 
                              cy={props.cy} 
                              r={8} 
                              fill={isLagging ? '#f43f5e' : isAhead ? '#10b981' : '#10b981'}
                              opacity={0.2}
                            />
                            <circle 
                              cx={props.cx} 
                              cy={props.cy} 
                              r={5} 
                              fill={isLagging ? '#f43f5e' : isAhead ? '#10b981' : '#10b981'}
                              stroke="white" 
                              strokeWidth={2.5}
                              filter="url(#glow)"
                            />
                          </>
                        );
                      }}
                      connectNulls={false}
                    />
                  </LineChart>
                  {comparisonData.length > 0 && (
                    <div className="absolute top-6 right-6 bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-xl p-5 rounded-2xl border border-blue-200/50 shadow-xl">
                      <p className="text-slate-500 text-xs font-bold mb-3 uppercase tracking-wider">{comparisonData[comparisonData.length - 1].date}</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-rose-400" />
                          <span className="text-xs font-bold text-slate-600">Target</span>
                          <span className="text-sm font-black text-rose-500 ml-auto">{comparisonData[comparisonData.length - 1].ideal}kg</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-bold text-slate-600">Actual</span>
                          <span className="text-xl font-black text-emerald-600 ml-auto">{currentWeight}kg</span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-slate-200">
                          <div className={`text-xs font-black text-center py-2 px-3 rounded-lg ${
                            currentWeight > (comparisonData[comparisonData.length - 1].ideal + 2) ? 'bg-rose-100 text-rose-700' :
                            currentWeight < (comparisonData[comparisonData.length - 1].ideal - 2) ? 'bg-emerald-100 text-emerald-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {currentWeight > (comparisonData[comparisonData.length - 1].ideal + 2) ? '⚠️ Behind Pace' :
                             currentWeight < (comparisonData[comparisonData.length - 1].ideal - 2) ? '🚀 Ahead!' :
                             '✅ On Track'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </ResponsiveContainer>
              </div>
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 shadow-xl border border-emerald-400/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                      <TrendingDown className="text-white" size={24} />
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-100 text-xs font-black uppercase tracking-wider">Total Lost</p>
                      <p className="text-white text-3xl font-black">{(settings.startWeight - currentWeight).toFixed(1)}kg</p>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-emerald-100 text-xs font-bold">Progress</span>
                      <span className="text-white text-sm font-black">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white rounded-full h-2 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 shadow-xl border border-blue-400/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                      <Target className="text-white" size={24} />
                    </div>
                    <div className="text-right">
                      <p className="text-blue-100 text-xs font-black uppercase tracking-wider">Remaining</p>
                      <p className="text-white text-3xl font-black">{remainingKg}kg</p>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                    <p className="text-blue-100 text-xs font-bold mb-1">Target Weight</p>
                    <p className="text-white text-2xl font-black">{settings.targetWeight}kg</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-6 shadow-xl border border-purple-400/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                      <Calendar className="text-white" size={24} />
                    </div>
                    <div className="text-right">
                      <p className="text-purple-100 text-xs font-black uppercase tracking-wider">Week</p>
                      <p className="text-white text-3xl font-black">{Math.floor(comparisonData.length / 7)}/{settings.totalWeeks}</p>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-purple-100 text-xs font-bold">Timeline</span>
                      <span className="text-white text-sm font-black">{Math.floor((comparisonData.length / 7 / settings.totalWeeks) * 100)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white rounded-full h-2 transition-all duration-500" style={{ width: `${Math.floor((comparisonData.length / 7 / settings.totalWeeks) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-purple-500/20 shadow-xl">
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3"><PieChart className="text-purple-400" /> BMI Progression</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredHistory.length > 0 ? comparisonData.slice(-filteredHistory.length) : comparisonData}>
                      <defs>
                        <linearGradient id="colorBMI" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(168,85,247,0.1)" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid rgba(168,85,247,0.3)' }} />
                      <Area type="monotone" dataKey="bmi" stroke="#a855f7" strokeWidth={4} fillOpacity={1} fill="url(#colorBMI)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {weeklyData.length > 0 && (
              <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-cyan-500/20 shadow-xl">
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3"><Calendar className="text-cyan-400" /> Weekly Breakdown</h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <defs>
                        <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(6,182,212,0.1)" />
                      <XAxis dataKey="week" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid rgba(6,182,212,0.3)' }} />
                      <Bar dataKey="avgWeight" fill="url(#colorBar)" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 backdrop-blur-xl p-8 rounded-[2.5rem] border border-blue-500/20">
                <h3 className="font-black text-xl mb-6 text-white flex items-center gap-3"><TrendingUp className="text-blue-400" /> Progress Stats</h3>
                <div className="space-y-4">
                  {advancedMetrics && (
                    <>
                      <StatRow label="Total Lost" value={advancedMetrics.totalLost} unit="kg" color="text-blue-400" />
                      <StatRow label="Weeks Elapsed" value={advancedMetrics.weeksElapsed} unit="weeks" color="text-cyan-400" />
                      <StatRow label="Best Week" value={advancedMetrics.bestWeekLoss} unit="kg" color="text-purple-400" />
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-xl p-8 rounded-[2.5rem] border border-purple-500/20">
                <h3 className="font-black text-xl mb-6 text-white flex items-center gap-3"><Trophy className="text-purple-400" /> Achievements</h3>
                <div className="space-y-4">
                  <AchievementBadge unlocked={history.length >= 7} icon="🔥" label="Week Warrior" desc="7 day streak" />
                  <AchievementBadge unlocked={history.length >= 30} icon="💪" label="Month Master" desc="30 day streak" />
                  <AchievementBadge unlocked={progressPercent >= 50} icon="🎯" label="Halfway Hero" desc="50% complete" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 backdrop-blur-xl p-8 rounded-[2.5rem] border border-cyan-500/20">
                <h3 className="font-black text-xl mb-6 text-white flex items-center gap-3"><Sparkles className="text-cyan-400" /> Insights</h3>
                <div className="space-y-3 text-sm text-slate-300">
                  {advancedMetrics && (
                    <>
                      <InsightItem text={advancedMetrics.onTrack ? "✅ You're on track to reach your goal!" : "⚠️ Need to increase pace to meet target"} positive={advancedMetrics.onTrack} />
                      <InsightItem text={`📊 Your consistency score is ${advancedMetrics.consistency}%`} positive={parseFloat(advancedMetrics.consistency) > 70} />
                      <InsightItem text={`🎯 Projected to reach ${advancedMetrics.projectedFinal}kg by week ${settings.totalWeeks}`} positive={parseFloat(advancedMetrics.projectedFinal) <= settings.targetWeight} />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'nutrition' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-4xl font-black text-white mb-2 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Nutrition Tracker</h1>
                <p className="text-slate-400 font-bold">Track your calorie intake and manage your diet</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 shadow-xl border border-orange-400/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <Flame className="text-white" size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-orange-100 text-xs font-black uppercase tracking-wider">BMR</p>
                    <p className="text-white text-3xl font-black">{calorieMetrics.bmr}</p>
                  </div>
                </div>
                <p className="text-orange-100 text-xs font-bold">Basal Metabolic Rate - calories burned at rest</p>
              </div>

              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-3xl p-6 shadow-xl border border-red-400/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <Activity className="text-white" size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-red-100 text-xs font-black uppercase tracking-wider">TDEE</p>
                    <p className="text-white text-3xl font-black">{calorieMetrics.tdee}</p>
                  </div>
                </div>
                <p className="text-red-100 text-xs font-bold">Total Daily Energy Expenditure (moderate activity)</p>
              </div>

              <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-3xl p-6 shadow-xl border border-pink-400/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                    <Target className="text-white" size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-pink-100 text-xs font-black uppercase tracking-wider">Daily Deficit</p>
                    <p className="text-white text-3xl font-black">{calorieMetrics.deficit}</p>
                  </div>
                </div>
                <p className="text-pink-100 text-xs font-bold">Calorie deficit needed per day</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-orange-500/20 shadow-xl">
                <h3 className="text-2xl font-black text-white mb-6">Calorie Goals</h3>
                <div className="space-y-6">
                  <div className="bg-slate-700/50 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300 font-bold">Maintenance (Current Weight)</span>
                      <span className="text-2xl font-black text-blue-400">{calorieMetrics.maintenance} cal</span>
                    </div>
                    <p className="text-slate-400 text-sm">Calories to maintain {currentWeight}kg</p>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-600/20 to-emerald-500/20 border border-emerald-500/30 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-emerald-300 font-bold">Target Intake</span>
                      <span className="text-2xl font-black text-emerald-400">{calorieMetrics.targetCalories} cal</span>
                    </div>
                    <p className="text-emerald-300 text-sm">Daily calories to reach {settings.targetWeight}kg in {settings.totalWeeks} weeks</p>
                  </div>

                  <div className="bg-slate-700/50 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300 font-bold">Target Maintenance</span>
                      <span className="text-2xl font-black text-purple-400">{calorieMetrics.targetMaintenance} cal</span>
                    </div>
                    <p className="text-slate-400 text-sm">Calories to maintain {settings.targetWeight}kg (goal weight)</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-orange-500/20 shadow-xl">
                <h3 className="text-2xl font-black text-white mb-6">Today's Intake</h3>
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-slate-300 font-bold">Consumed</span>
                    <span className="text-3xl font-black text-orange-400">{todayCalorieTotal} cal</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full transition-all duration-500 ${
                        todayCalorieTotal > calorieMetrics.targetCalories ? 'bg-gradient-to-r from-rose-500 to-red-500' : 'bg-gradient-to-r from-emerald-500 to-green-500'
                      }`}
                      style={{ width: `${Math.min((todayCalorieTotal / calorieMetrics.targetCalories) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-slate-400">Target: {calorieMetrics.targetCalories} cal</span>
                    <span className={`text-xs font-bold ${
                      todayCalorieTotal > calorieMetrics.targetCalories ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {todayCalorieTotal > calorieMetrics.targetCalories ? '+' : ''}{todayCalorieTotal - calorieMetrics.targetCalories} cal
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Meal name (e.g., Breakfast)"
                    value={mealInput.name}
                    onChange={(e) => setMealInput({ ...mealInput, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  />
                  <input
                    type="number"
                    placeholder="Calories"
                    value={mealInput.calories}
                    onChange={(e) => setMealInput({ ...mealInput, calories: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={handleAddMeal}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl font-black hover:from-orange-600 hover:to-red-600 transition-all shadow-lg"
                  >
                    <Plus className="inline mr-2" size={20} /> Log Meal
                  </button>
                </div>

                <div className="mt-6 space-y-2 max-h-64 overflow-y-auto">
                  {calorieHistory.filter(m => m.date === new Date().toISOString().split('T')[0]).map((meal, idx) => (
                    <div key={idx} className="bg-slate-700/50 rounded-xl p-3 flex justify-between items-center">
                      <div>
                        <p className="text-white font-bold">{meal.name}</p>
                        <p className="text-slate-400 text-xs">{meal.time}</p>
                      </div>
                      <span className="text-orange-400 font-black">{meal.calories} cal</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-4xl font-black text-white mb-2 bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Body Metrics</h1>
                <p className="text-slate-400 font-bold">Track your body measurements and progress</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-emerald-500/20 shadow-xl">
                <h3 className="text-2xl font-black text-white mb-6">Log Measurements</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-300 text-sm font-bold mb-2 block">Chest (cm)</label>
                    <input
                      type="number"
                      placeholder="e.g., 100"
                      value={currentMetrics.chest}
                      onChange={(e) => setCurrentMetrics({ ...currentMetrics, chest: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-bold mb-2 block">Waist (cm)</label>
                    <input
                      type="number"
                      placeholder="e.g., 90"
                      value={currentMetrics.waist}
                      onChange={(e) => setCurrentMetrics({ ...currentMetrics, waist: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-bold mb-2 block">Hips (cm)</label>
                    <input
                      type="number"
                      placeholder="e.g., 95"
                      value={currentMetrics.hips}
                      onChange={(e) => setCurrentMetrics({ ...currentMetrics, hips: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-bold mb-2 block">Arms (cm)</label>
                    <input
                      type="number"
                      placeholder="e.g., 35"
                      value={currentMetrics.arms}
                      onChange={(e) => setCurrentMetrics({ ...currentMetrics, arms: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-bold mb-2 block">Thighs (cm)</label>
                    <input
                      type="number"
                      placeholder="e.g., 55"
                      value={currentMetrics.thighs}
                      onChange={(e) => setCurrentMetrics({ ...currentMetrics, thighs: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    onClick={handleAddMetrics}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl font-black hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg"
                  >
                    <Plus className="inline mr-2" size={20} /> Save Measurements
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-emerald-500/20 shadow-xl">
                <h3 className="text-2xl font-black text-white mb-6">Measurement History</h3>
                {metricsHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="mx-auto text-slate-600 mb-4" size={48} />
                    <p className="text-slate-400 font-bold">No measurements logged yet</p>
                    <p className="text-slate-500 text-sm mt-2">Start tracking your body measurements</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {metricsHistory.slice().reverse().map((metric, idx) => (
                      <div key={idx} className="bg-slate-700/50 rounded-2xl p-4">
                        <p className="text-slate-300 text-sm font-bold mb-3">{metric.date}</p>
                        <div className="grid grid-cols-2 gap-3">
                          {metric.chest && <div><span className="text-slate-400 text-xs">Chest:</span> <span className="text-white font-bold">{metric.chest}cm</span></div>}
                          {metric.waist && <div><span className="text-slate-400 text-xs">Waist:</span> <span className="text-white font-bold">{metric.waist}cm</span></div>}
                          {metric.hips && <div><span className="text-slate-400 text-xs">Hips:</span> <span className="text-white font-bold">{metric.hips}cm</span></div>}
                          {metric.arms && <div><span className="text-slate-400 text-xs">Arms:</span> <span className="text-white font-bold">{metric.arms}cm</span></div>}
                          {metric.thighs && <div><span className="text-slate-400 text-xs">Thighs:</span> <span className="text-white font-bold">{metric.thighs}cm</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'exercise' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-4xl font-black text-white mb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Exercise Routine</h1>
                <p className="text-slate-400 font-bold">Push / Pull / Legs split for optimal muscle growth</p>
              </div>
            </div>

            <div className="flex gap-4 mb-8">
              <button
                onClick={() => setSelectedDay('push')}
                className={`px-6 py-3 rounded-xl font-black transition-all ${
                  selectedDay === 'push' ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg' : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                🔥 Push Day
              </button>
              <button
                onClick={() => setSelectedDay('pull')}
                className={`px-6 py-3 rounded-xl font-black transition-all ${
                  selectedDay === 'pull' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                💪 Pull Day
              </button>
              <button
                onClick={() => setSelectedDay('legs')}
                className={`px-6 py-3 rounded-xl font-black transition-all ${
                  selectedDay === 'legs' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-slate-800/50 text-slate-400 hover:text-white'
                }`}
              >
                🦵 Leg Day
              </button>
            </div>

            {selectedDay === 'push' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ExerciseCard 
                  title="Bench Press"
                  sets="4 sets x 8-10 reps"
                  description="Primary chest exercise. Lie on bench, lower bar to chest, press up explosively."
                  tips={['Keep shoulder blades retracted', 'Touch chest lightly', 'Full range of motion']}
                />
                <ExerciseCard 
                  title="Overhead Press"
                  sets="3 sets x 8-10 reps"
                  description="Main shoulder builder. Press barbell overhead from shoulder height."
                  tips={['Brace core tight', 'Press slightly back', 'Lock out at top']}
                />
                <ExerciseCard 
                  title="Incline Dumbbell Press"
                  sets="3 sets x 10-12 reps"
                  description="Upper chest focus. 30-45 degree incline, press dumbbells up."
                  tips={['Control the descent', 'Full stretch at bottom', 'Squeeze at top']}
                />
                <ExerciseCard 
                  title="Lateral Raises"
                  sets="3 sets x 12-15 reps"
                  description="Side delts. Raise dumbbells to shoulder height laterally."
                  tips={['Slight bend in elbows', 'Lead with elbows', 'Control the weight']}
                />
                <ExerciseCard 
                  title="Tricep Dips"
                  sets="3 sets x 10-12 reps"
                  description="Tricep mass builder. Lower body between parallel bars, push up."
                  tips={['Lean forward slightly', 'Full range of motion', 'Add weight when ready']}
                />
                <ExerciseCard 
                  title="Tricep Pushdowns"
                  sets="3 sets x 12-15 reps"
                  description="Tricep isolation. Push cable attachment down, squeeze at bottom."
                  tips={['Keep elbows pinned', 'Full extension', 'Slow negative']}
                />
              </div>
            )}

            {selectedDay === 'pull' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ExerciseCard 
                  title="Deadlifts"
                  sets="4 sets x 6-8 reps"
                  description="King of back exercises. Lift barbell from floor to hip level."
                  tips={['Neutral spine', 'Drive through heels', 'Engage lats']}
                />
                <ExerciseCard 
                  title="Pull-ups"
                  sets="4 sets x 8-10 reps"
                  description="Best lat builder. Pull body up until chin over bar."
                  tips={['Full hang at bottom', 'Pull elbows down', 'Chest to bar']}
                />
                <ExerciseCard 
                  title="Barbell Rows"
                  sets="3 sets x 8-10 reps"
                  description="Thick back builder. Row barbell to lower chest while bent over."
                  tips={['Hinge at hips', 'Pull to belly button', 'Squeeze shoulder blades']}
                />
                <ExerciseCard 
                  title="Face Pulls"
                  sets="3 sets x 15-20 reps"
                  description="Rear delts and upper back. Pull rope to face level."
                  tips={['High rep range', 'Pull apart at face', 'External rotation']}
                />
                <ExerciseCard 
                  title="Bicep Curls"
                  sets="3 sets x 10-12 reps"
                  description="Bicep mass. Curl dumbbells or barbell to shoulder level."
                  tips={['No swinging', 'Full supination', 'Squeeze at top']}
                />
                <ExerciseCard 
                  title="Hammer Curls"
                  sets="3 sets x 12-15 reps"
                  description="Brachialis focus. Curl with neutral grip."
                  tips={['Thumbs up position', 'Slow and controlled', 'Alternate or together']}
                />
              </div>
            )}

            {selectedDay === 'legs' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ExerciseCard 
                  title="Squats"
                  sets="4 sets x 8-10 reps"
                  description="King of leg exercises. Squat down until thighs parallel, drive up."
                  tips={['Depth is key', 'Knees track toes', 'Chest up']}
                />
                <ExerciseCard 
                  title="Romanian Deadlifts"
                  sets="3 sets x 10-12 reps"
                  description="Hamstring focus. Lower bar down legs with slight knee bend."
                  tips={['Feel hamstring stretch', 'Hinge at hips', 'Neutral spine']}
                />
                <ExerciseCard 
                  title="Leg Press"
                  sets="3 sets x 12-15 reps"
                  description="Quad mass builder. Press platform away with feet shoulder-width."
                  tips={['Full range of motion', 'Dont lock knees', 'Control the weight']}
                />
                <ExerciseCard 
                  title="Leg Curls"
                  sets="3 sets x 12-15 reps"
                  description="Hamstring isolation. Curl weight up by bending knees."
                  tips={['Squeeze at top', 'Slow negative', 'Full extension']}
                />
                <ExerciseCard 
                  title="Calf Raises"
                  sets="4 sets x 15-20 reps"
                  description="Calf development. Raise up on toes, lower slowly."
                  tips={['Full stretch at bottom', 'Pause at top', 'High reps']}
                />
                <ExerciseCard 
                  title="Lunges"
                  sets="3 sets x 10 reps each leg"
                  description="Unilateral leg work. Step forward, lower back knee, push back."
                  tips={['Long stride', 'Knee behind toes', 'Upright torso']}
                />
              </div>
            )}

            <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-3xl p-8">
              <h3 className="text-2xl font-black text-white mb-4">💡 Training Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-blue-400 font-black mb-2">Progressive Overload</p>
                  <p className="text-slate-300 text-sm">Gradually increase weight, reps, or sets each week to continue making gains.</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-purple-400 font-black mb-2">Rest & Recovery</p>
                  <p className="text-slate-300 text-sm">Allow 48-72 hours between training the same muscle groups. Sleep 7-9 hours.</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-emerald-400 font-black mb-2">Form Over Weight</p>
                  <p className="text-slate-300 text-sm">Perfect form prevents injury and maximizes muscle activation. Start light.</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <p className="text-orange-400 font-black mb-2">Consistency is Key</p>
                  <p className="text-slate-300 text-sm">Train 4-6 days per week. Missing workouts slows progress significantly.</p>
                </div>
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
  <div className="bg-slate-800/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-blue-500/20 shadow-xl transition-all hover:scale-[1.02] hover:border-blue-500/40 group">
    <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 p-4 rounded-2xl w-fit mb-6 shadow-inner group-hover:scale-110 transition-transform">{icon}</div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">{label}</p>
    <div className="flex items-baseline gap-2">
      <p className="text-4xl font-black text-white">{value}</p>
      <p className="text-sm font-black text-slate-500">{unit}</p>
    </div>
    <p className={`text-[11px] mt-4 font-black uppercase tracking-widest ${subColor || 'text-slate-400'}`}>{sub}</p>
  </div>
);

const AnalyticsCard = ({ icon, label, value, unit, trend }) => (
  <div className="bg-slate-800/40 backdrop-blur-xl p-6 rounded-[2rem] border border-purple-500/20 shadow-xl hover:border-purple-500/40 transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 p-3 rounded-xl">{icon}</div>
      {trend && (
        <div className={`px-2 py-1 rounded-lg text-xs font-black ${trend === 'positive' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
          {trend === 'positive' ? '↗' : '↘'}
        </div>
      )}
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
    <div className="flex items-baseline gap-2">
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="text-xs font-black text-slate-500">{unit}</p>
    </div>
  </div>
);

const StatRow = ({ label, value, unit, color }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-slate-300 font-bold">{label}</span>
    <span className={`text-2xl font-black ${color}`}>{value} <span className="text-xs">{unit}</span></span>
  </div>
);

const AchievementBadge = ({ unlocked, icon, label, desc }) => (
  <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${unlocked ? 'bg-white/5 border-purple-500/30' : 'bg-slate-900/20 border-slate-700/30 opacity-40'}`}>
    <div className="text-2xl">{icon}</div>
    <div className="flex-1">
      <p className="text-sm font-black text-white">{label}</p>
      <p className="text-xs text-slate-400">{desc}</p>
    </div>
    {unlocked && <Check className="w-4 h-4 text-emerald-400" />}
  </div>
);

const InsightItem = ({ text, positive }) => (
  <div className={`p-3 rounded-xl border ${positive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
    <p className="font-bold">{text}</p>
  </div>
);

const StatusIndicator = ({ icon, label, color, bgColor, borderColor, desc }) => (
  <div className={`${bgColor} ${borderColor} border rounded-2xl p-4 text-center`}>
    <div className="text-3xl mb-2">{icon}</div>
    <p className={`font-black text-sm ${color} mb-1`}>{label}</p>
    <p className="text-xs text-slate-400">{desc}</p>
  </div>
);

const PlanCard = ({ icon, color, title, text }) => (
  <div className="bg-white/5 backdrop-blur-sm p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-all hover:scale-[1.02]">
    <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-lg`}>{icon}</div>
    <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest mb-2">{title}</p>
    <p className="text-white text-sm font-bold leading-relaxed">{text}</p>
  </div>
);

const LegendItem = ({ color, label }) => (
  <div className="flex items-center gap-2">
    <div className={`w-3 h-3 rounded-full ${color}`} />
    <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">{label}</span>
  </div>
);

const ExerciseCard = ({ title, sets, description, tips }) => (
  <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all">
    <h4 className="text-xl font-black text-white mb-2">{title}</h4>
    <p className="text-blue-400 font-bold text-sm mb-3">{sets}</p>
    <p className="text-slate-300 text-sm mb-4">{description}</p>
    <div className="space-y-1">
      {tips.map((tip, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <Check className="text-emerald-400 flex-shrink-0 mt-0.5" size={14} />
          <p className="text-slate-400 text-xs">{tip}</p>
        </div>
      ))}
    </div>
  </div>
);

const OnboardingModal = ({ onComplete }) => {
  const [step, setStep] = React.useState(1);
  const [formData, setFormData] = React.useState(DEFAULT_SETTINGS);

  const handleSubmit = () => {
    onComplete(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[3rem] p-10 max-w-2xl w-full border border-blue-500/30 shadow-2xl">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-600 p-4 rounded-2xl w-fit mx-auto mb-6 shadow-lg">
            <Activity className="text-white w-12 h-12" />
          </div>
          <h2 className="text-4xl font-black text-white mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Welcome to HealthTrack Pro</h2>
          <p className="text-slate-400 font-bold">Let's personalize your health journey</p>
        </div>

        <div className="space-y-6">
          <InputField label="Height (cm)" type="number" value={formData.height} onChange={(e) => setFormData({...formData, height: parseFloat(e.target.value)})} />
          <InputField label="Starting Weight (kg)" type="number" value={formData.startWeight} onChange={(e) => setFormData({...formData, startWeight: parseFloat(e.target.value)})} />
          <InputField label="Target Weight (kg)" type="number" value={formData.targetWeight} onChange={(e) => setFormData({...formData, targetWeight: parseFloat(e.target.value)})} />
          <InputField label="Timeline (weeks)" type="number" value={formData.totalWeeks} onChange={(e) => setFormData({...formData, totalWeeks: parseInt(e.target.value)})} />
        </div>

        <button onClick={handleSubmit} className="w-full mt-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-black py-5 rounded-3xl shadow-xl hover:from-blue-600 hover:to-purple-600 transition-all">
          Start My Journey
        </button>
      </div>
    </div>
  );
};

const SettingsModal = ({ settings, onSave, onClose }) => {
  const [formData, setFormData] = React.useState(settings);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[3rem] p-10 max-w-2xl w-full border border-blue-500/30 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-white">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-700/50 text-slate-400 hover:text-white transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <InputField label="Height (cm)" type="number" value={formData.height} onChange={(e) => setFormData({...formData, height: parseFloat(e.target.value)})} />
          <InputField label="Starting Weight (kg)" type="number" value={formData.startWeight} onChange={(e) => setFormData({...formData, startWeight: parseFloat(e.target.value)})} />
          <InputField label="Target Weight (kg)" type="number" value={formData.targetWeight} onChange={(e) => setFormData({...formData, targetWeight: parseFloat(e.target.value)})} />
          <InputField label="Timeline (weeks)" type="number" value={formData.totalWeeks} onChange={(e) => setFormData({...formData, totalWeeks: parseInt(e.target.value)})} />
        </div>

        <div className="flex gap-4 mt-8">
          <button onClick={onClose} className="flex-1 bg-slate-700/50 text-white font-black py-4 rounded-2xl hover:bg-slate-700 transition-all">
            Cancel
          </button>
          <button onClick={() => onSave(formData)} className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-black py-4 rounded-2xl shadow-xl hover:from-blue-600 hover:to-purple-600 transition-all">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const ExportModal = ({ onExportJSON, onExportCSV, onImport, onClose }) => {
  const fileInputRef = React.useRef(null);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[3rem] p-10 max-w-lg w-full border border-blue-500/30 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black text-white">Data Management</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-700/50 text-slate-400 hover:text-white transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <button onClick={onExportJSON} className="w-full flex items-center justify-between p-6 bg-blue-500/10 border border-blue-500/30 rounded-2xl hover:bg-blue-500/20 transition-all group">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Download className="text-blue-400" size={24} />
              </div>
              <div className="text-left">
                <p className="font-black text-white">Export as JSON</p>
                <p className="text-xs text-slate-400">Full backup with settings</p>
              </div>
            </div>
            <ChevronRight className="text-slate-400" />
          </button>

          <button onClick={onExportCSV} className="w-full flex items-center justify-between p-6 bg-purple-500/10 border border-purple-500/30 rounded-2xl hover:bg-purple-500/20 transition-all group">
            <div className="flex items-center gap-4">
              <div className="bg-purple-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <FileText className="text-purple-400" size={24} />
              </div>
              <div className="text-left">
                <p className="font-black text-white">Export as CSV</p>
                <p className="text-xs text-slate-400">Data only for spreadsheets</p>
              </div>
            </div>
            <ChevronRight className="text-slate-400" />
          </button>

          <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-between p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl hover:bg-cyan-500/20 transition-all group">
            <div className="flex items-center gap-4">
              <div className="bg-cyan-500/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Upload className="text-cyan-400" size={24} />
              </div>
              <div className="text-left">
                <p className="font-black text-white">Import Data</p>
                <p className="text-xs text-slate-400">Restore from JSON backup</p>
              </div>
            </div>
            <ChevronRight className="text-slate-400" />
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={onImport} className="hidden" />
        </div>
      </div>
    </div>
  );
};

const InputField = ({ label, type, value, onChange }) => (
  <div>
    <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
    <input type={type} value={value} onChange={onChange} className="w-full bg-slate-700/50 border border-blue-500/30 rounded-2xl py-4 px-6 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
  </div>
);

export default App;
