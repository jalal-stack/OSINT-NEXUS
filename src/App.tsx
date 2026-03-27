import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Shield, 
  Globe, 
  MessageSquare, 
  Network, 
  MapPin, 
  Zap, 
  Terminal,
  Activity,
  Database,
  Cpu,
  Lock,
  ChevronRight,
  AlertCircle,
  Loader2,
  User,
  Mail,
  Phone,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  LabelList,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { cn } from './lib/utils';

// --- Types ---

type HistoryItem = {
  target: string;
  type: 'nickname' | 'email' | 'web' | 'phone' | 'tg_id';
  timestamp: number;
};

type OSINTModule = {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  source: string;
  color: string;
  category: 'nickname' | 'email' | 'web' | 'phone' | 'tg_id' | 'all';
};

type ScanResult = {
  moduleId: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  data?: string;
  visualData?: {
    nodes: { x: number, y: number, name: string, type: string, size: number }[];
    attributes: { subject: string, A: number, fullMark: number }[];
    wordFrequency?: { word: string, count: number }[];
    history?: { date: string, value: string, type: 'name' | 'username' }[];
    stats?: {
      diversity: number;
      repliesPercent: number;
      mediaPercent: number;
      favoriteChat: string;
      adminCount: number;
    };
  };
  error?: string;
};

// --- Constants ---

const MODULES: OSINTModule[] = [
  { 
    id: 'teleosinter', 
    name: 'TeleOSinter', 
    icon: <MessageSquare className="w-4 h-4" />, 
    description: 'Анализ метаданных Telegram и связей пользователей',
    source: 'github.com/C3EQUALZz/TeleOSinter',
    color: 'text-sky-400',
    category: 'nickname'
  },
  { 
    id: 'recon-ng', 
    name: 'Recon-ng', 
    icon: <Network className="w-4 h-4" />, 
    description: 'Полнофункциональный фреймворк для веб-разведки',
    source: 'github.com/lanmaster53/recon-ng',
    color: 'text-emerald-400',
    category: 'web'
  },
  { 
    id: 'ghosttrack', 
    name: 'GhostTrack', 
    icon: <MapPin className="w-4 h-4" />, 
    description: 'Отслеживание IP и геолокационная разведка',
    source: 'github.com/HunxByts/GhostTrack',
    color: 'text-rose-400',
    category: 'web'
  },
  { 
    id: 'spiderfoot', 
    name: 'SpiderFoot', 
    icon: <Globe className="w-4 h-4" />, 
    description: 'Автоматизированный сбор и корреляция OSINT',
    source: 'github.com/smicallef/spiderfoot',
    color: 'text-amber-400',
    category: 'all'
  },
  { 
    id: 'sonarsearch', 
    name: 'SonarSearch', 
    icon: <Database className="w-4 h-4" />, 
    description: 'Перечисление поддоменов и DNS-записей',
    source: 'github.com/Cgboal/SonarSearch',
    color: 'text-indigo-400',
    category: 'web'
  },
  { 
    id: 'enigma', 
    name: 'Enigma Bot', 
    icon: <Lock className="w-4 h-4" />, 
    description: 'Взаимодействие с Telegram-ботами и анализ утечек',
    source: 'github.com/OSINT-searcher/telegram_bot_Enigma',
    color: 'text-purple-400',
    category: 'nickname'
  },
  { 
    id: 'reconspider', 
    name: 'ReconSpider', 
    icon: <Cpu className="w-4 h-4" />, 
    description: 'Продвинутый универсальный OSINT-фреймворк',
    source: 'github.com/bhavsec/reconspider',
    color: 'text-cyan-400',
    category: 'all'
  },
  { 
    id: 'sherlock', 
    name: 'Sherlock', 
    icon: <Search className="w-4 h-4" />, 
    description: 'Поиск аккаунтов в соцсетях по имени пользователя',
    source: 'github.com/sherlock-project/sherlock',
    color: 'text-orange-400',
    category: 'nickname'
  },
  { 
    id: 'maigret', 
    name: 'Maigret', 
    icon: <User className="w-4 h-4" />, 
    description: 'Сбор досье на человека по никнейму с тысяч сайтов',
    source: 'github.com/soxoj/maigret',
    color: 'text-fuchsia-400',
    category: 'nickname'
  },
  { 
    id: 'holehe', 
    name: 'Holehe', 
    icon: <Mail className="w-4 h-4" />, 
    description: 'Проверка использования email на более чем 120 сервисах',
    source: 'github.com/megadose/holehe',
    color: 'text-lime-400',
    category: 'email'
  },
  {
    id: 'mosint',
    name: 'Mosint',
    icon: <Mail className="w-4 h-4" />,
    description: 'Автоматизированный инструмент для глубокой разведки email',
    source: 'github.com/alpkeskin/mosint',
    color: 'text-blue-400',
    category: 'email'
  },
  {
    id: 'epios',
    name: 'EPIOS',
    icon: <Search className="w-4 h-4" />,
    description: 'Поиск связанных профилей и данных по адресу почты',
    source: 'epios.com',
    color: 'text-yellow-400',
    category: 'email'
  },
  {
    id: 'hibp',
    name: 'HIBP',
    icon: <Shield className="w-4 h-4" />,
    description: 'Анализ утечек данных и компрометации паролей',
    source: 'haveibeenpwned.com',
    color: 'text-red-500',
    category: 'email'
  },
  {
    id: 'infoga',
    name: 'Infoga',
    icon: <Database className="w-4 h-4" />,
    description: 'Сбор информации об email из публичных источников',
    source: 'github.com/m4ll0k/Infoga',
    color: 'text-green-500',
    category: 'email'
  },
  {
    id: 'phoneinfoga',
    name: 'PhoneInfoga',
    icon: <Phone className="w-4 h-4" />,
    description: 'Сбор технической информации и геолокации по номеру',
    source: 'github.com/sundowndev/phoneinfoga',
    color: 'text-rose-500',
    category: 'phone'
  },
  {
    id: 'truesearch',
    name: 'TrueSearch',
    icon: <User className="w-4 h-4" />,
    description: 'Идентификация владельца номера и поиск в базах контактов',
    source: 'internal/nexus-truesearch',
    color: 'text-sky-500',
    category: 'phone'
  },
  {
    id: 'whatsmyname',
    name: 'WhatsMyName',
    icon: <Search className="w-4 h-4" />,
    description: 'Проверка существования аккаунтов на сотнях ресурсов',
    source: 'github.com/webbreacher/whatsmyname',
    color: 'text-cyan-300',
    category: 'nickname'
  },
  {
    id: 'maltego-telegram',
    name: 'Maltego Telegram',
    icon: <Network className="w-4 h-4" />,
    description: 'Визуализация связей и графов в Telegram',
    source: 'github.com/vognik/maltego-telegram',
    color: 'text-indigo-500',
    category: 'nickname'
  },
  {
    id: 'tg-id-lookup',
    name: 'TG ID Lookup',
    icon: <MessageSquare className="w-4 h-4" />,
    description: 'Поиск аккаунта, номера телефона и метаданных по Telegram ID',
    source: 'internal/tg-id-lookup',
    color: 'text-sky-300',
    category: 'tg_id'
  },
  {
    id: 'tg-bot-recon',
    name: 'TG Bot Recon',
    icon: <Terminal className="w-4 h-4" />,
    description: 'Анализ активности и связанных данных через Telegram ботов',
    source: 'internal/tg-bot-recon',
    color: 'text-blue-500',
    category: 'tg_id'
  },
  {
    id: 'tele-deep-recon',
    name: 'Tele-Deep Recon',
    icon: <Network className="w-4 h-4" />,
    description: 'Глубокий анализ связей, активности в группах и метаданных сообщений',
    source: 'internal/tele-deep-recon',
    color: 'text-indigo-400',
    category: 'tg_id'
  },
  {
    id: 'social-parser',
    name: 'Social Parser',
    icon: <Globe className="w-4 h-4" />,
    description: 'Глубокий парсинг профилей соцсетей: био, связи, активность',
    source: 'internal/social-parser',
    color: 'text-sky-400',
    category: 'all'
  },
  {
    id: 'identity-verifier',
    name: 'Identity Verifier',
    icon: <Shield className="w-4 h-4" />,
    description: 'Кросс-платформенная проверка подлинности никнеймов',
    source: 'internal/identity-verifier',
    color: 'text-emerald-400',
    category: 'nickname'
  },
  {
    id: 'anti-fake-engine',
    name: 'Anti-Fake Engine',
    icon: <AlertCircle className="w-4 h-4" />,
    description: 'Фильтрация фейковых аккаунтов и ботов на основе паттернов',
    source: 'internal/anti-fake-filter',
    color: 'text-rose-500',
    category: 'all'
  }
];

const MOCK_ACTIVITY_DATA = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  requests: Math.floor(Math.random() * 50) + 10,
  latency: Math.floor(Math.random() * 200) + 50,
}));

// --- Components ---

export default function App() {
  const [target, setTarget] = useState('');
  const [searchType, setSearchType] = useState<'nickname' | 'email' | 'web' | 'phone' | 'tg_id'>('nickname');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<Record<string, ScanResult>>({});
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [generalSummary, setGeneralSummary] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('osint_nexus_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('osint_nexus_history', JSON.stringify(history));
  }, [history]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target || isScanning) return;

    // Email validation for Holehe and other email modules
    if (searchType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(target)) {
        addLog("ОШИБКА: Некорректный формат email. Введите валидный адрес (напр. user@example.com)");
        return;
      }
    }

    // Phone validation for PhoneInfoga and TrueSearch
    if (searchType === 'phone') {
      const cleanPhone = target.replace(/[\s\-()]/g, '');
      const phoneRegex = /^\+?\d{7,15}$/;
      if (!phoneRegex.test(cleanPhone)) {
        addLog("ОШИБКА: Некорректный формат номера. Введите валидный номер (напр. +79991234567)");
        return;
      }
    }

    // Telegram ID validation
    if (searchType === 'tg_id') {
      const tgIdRegex = /^(\d+|@[\w\d_]+)$/;
      if (!tgIdRegex.test(target)) {
        addLog("ОШИБКА: Некорректный формат TG ID. Введите числовой ID или @username");
        return;
      }
    }

    setIsScanning(true);
    setLogs([]);
    setGeneralSummary(null);
    setSelectedModule(null);
    addLog(`Инициализация Nexus Core для цели: ${target}`);
    
    // Add to history
    const newHistoryItem: HistoryItem = {
      target,
      type: searchType,
      timestamp: Date.now()
    };
    setHistory(prev => [newHistoryItem, ...prev.filter(h => h.target !== target || h.type !== searchType)].slice(0, 20));

    const activeModules = MODULES.filter(m => m.category === searchType || m.category === 'all');
    
    const currentResults: Record<string, ScanResult> = {};
    activeModules.forEach(m => {
      currentResults[m.id] = { moduleId: m.id, status: 'pending' };
    });
    setResults(currentResults);

    // Simulate sequential module execution
    for (const module of activeModules) {
      setResults(prev => ({
        ...prev,
        [module.id]: { ...prev[module.id], status: 'running' }
      }));
      addLog(`Running ${module.name} module for ${searchType} search...`);
      
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Perform a ${searchType} OSINT analysis for the target: "${target}" using the methodology of ${module.name} (${module.description}). 
          
          Methodology Context:
          - Use Maigret/Sherlock for initial account discovery.
          - Use WhatsMyName for verification of found accounts.
          - Use Maltego (Telegram) for linking identities and building relationship graphs.
          - Use SpiderFoot for final data enrichment and correlation.
          
          Search for public leaks, social media profiles, network records, and associated metadata relevant to this ${searchType}. 
          
          ${searchType === 'phone' ? 'ОСОБОЕ ВНИМАНИЕ: Постарайся определить ИМЯ ВЛАДЕЛЬЦА (Owner Name), связанные аккаунты в мессенджерах (WhatsApp, Telegram), теги из телефонных книг и СВЯЗАННЫЕ EMAIL-АДРЕСА.' : ''}
          ${searchType === 'email' ? 'ОСОБОЕ ВНИМАНИЕ: Найди все связанные аккаунты в соцсетях, упоминания в утечках данных (Breaches), связанные домены, имена владельцев и любые публичные профили (Google, Gravatar, LinkedIn и т.д.).' : ''}
          ${searchType === 'nickname' ? 'ОСОБОЕ ВНИМАНИЕ: Проверь подлинность никнейма на разных платформах. Если обнаружены связанные EMAIL-АДРЕСА или НОМЕРА ТЕЛЕФОНОВ, укажи их. Проведи кросс-верификацию данных профиля (фото, био, друзья).' : ''}
          ${searchType === 'tg_id' ? 'ОСОБОЕ ВНИМАНИЕ: Найди НОМЕР ТЕЛЕФОНА и EMAIL-АДРЕС, связанные с этим Telegram ID, имя пользователя, историю имен, связанные группы и любые другие метаданные. Проанализируй активность в группах (частота сообщений, роли, связи с другими участниками).' : ''}
          
          НОВЫЕ ТРЕБОВАНИЯ (Анти-Фейк и Парсинг):
          1. ПАРСИНГ: Извлеки максимум деталей из найденных профилей (количество подписчиков, дата создания, последние посты, связанные ссылки).
          2. АНТИ-ФЕЙК: Оцени вероятность того, что аккаунт является фейком или ботом. Проанализируй:
             - Частоту публикаций (слишком высокая или подозрительно регулярная).
             - Паттерны вовлеченности (соотношение лайков/репостов к охвату, однотипные комментарии).
             - Стиль языка (использование шаблонов, неестественные грамматические конструкции, повторение одних и тех же фраз).
             - Признаки: пустой био, отсутствие оригинальных фото, недавняя дата регистрации.
          3. ВЕРИФИКАЦИЯ: Сравни данные между разными соцсетями. Совпадают ли интересы, стиль общения, аватары?
          
          Provide a technical summary of findings in Markdown. 
          
          IMPORTANT: The entire technical summary and all descriptive text MUST be in RUSSIAN language.
          
          ADDITIONAL REQUIREMENT: If you find any specific URLs (social media profiles, leaked pages, etc.), list them clearly in a section titled "### 🔗 Найденные ссылки и ресурсы".
          
          CRITICAL: You MUST provide a JSON block at the end of your response (wrapped in \`\`\`json) even if no data is found. 
          
          JSON Schema:
          {
            "nodes": [{"x": number, "y": number, "name": string, "type": "account" | "server" | "email" | "phone", "size": number}],
            "attributes": [{"subject": string, "A": number, "fullMark": 100}],
            "wordFrequency": [{"word": string, "count": number}],
            "history": [{"date": string, "value": string, "type": "name" | "username"}],
            "stats": {
              "diversity": number,
              "repliesPercent": number,
              "mediaPercent": number,
              "favoriteChat": string,
              "adminCount": number
            }
          }
          Ensure the JSON is valid and represents the relationships found.`,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });

        const text = response.text || '';
        let markdown = text;
        let visualData = undefined;

        // More robust JSON extraction
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            const jsonStr = jsonMatch[1].trim();
            visualData = JSON.parse(jsonStr);
            markdown = text.replace(jsonMatch[0], '');
          } catch (e) {
            console.error("Failed to parse visual data", e);
            addLog(`Warning: Failed to parse visual data for ${module.name}`);
          }
        }

        const result: ScanResult = { moduleId: module.id, status: 'completed', data: markdown, visualData };
        currentResults[module.id] = result;
        setResults(prev => ({
          ...prev,
          [module.id]: result
        }));
        addLog(`${module.name} scan completed.`);
      } catch (error) {
        const errorResult: ScanResult = { moduleId: module.id, status: 'error', error: 'Module execution failed' };
        currentResults[module.id] = errorResult;
        setResults(prev => ({
          ...prev,
          [module.id]: errorResult
        }));
        addLog(`Error in ${module.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Small delay between modules for visual effect
      await new Promise(r => setTimeout(r, 500));
    }

    setIsScanning(false);
    addLog("Все модули разведки завершены.");

    // Generate General Summary
    const successfulResults = Object.entries(currentResults).filter(([_, r]) => r.status === 'completed' && r.data);
    
    if (successfulResults.length > 0) {
      addLog("Генерация общего отчета разведки...");
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const allData = successfulResults
          .map(([id, r]) => {
            const moduleName = MODULES.find(m => m.id === id)?.name || id;
            return `### ${moduleName}\n${r.data}`;
          })
          .join('\n\n');

        const summaryResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `На основе следующих данных OSINT для цели "${target}", составь краткий, но информативный общий итог (Summary). 
          
          При анализе придерживайся методологии:
          1. Обнаружение (Maigret/Sherlock)
          2. Верификация (WhatsMyName)
          3. Связи и графы (Maltego)
          4. Обогащение данных (SpiderFoot)
          
          Выдели ключевые находки, уровни риска и рекомендации. 
          
          ${searchType === 'phone' ? 'ОБЯЗАТЕЛЬНО: В самом начале укажи наиболее вероятное ИМЯ ВЛАДЕЛЬЦА (Owner Identification), если оно было найдено.' : ''}
          
          ОБЯЗАТЕЛЬНО: Добавь раздел "### 🛡️ Анализ подлинности (Anti-Fake Filter)", где оценишь достоверность найденных аккаунтов. Проанализируй частоту постов, вовлеченность и стиль общения для выявления ботов.
          
          ОБЯЗАТЕЛЬНО: Собери все найденные ссылки на социальные сети и ресурсы в отдельный финальный список "### 🌐 Сводный список ресурсов".
          
          Весь текст должен быть на РУССКОМ языке в формате Markdown.
          
          Данные от модулей:
          ${allData}`,
        });

        setGeneralSummary(summaryResponse.text || null);
        addLog("Общий отчет успешно сформирован.");
        setSelectedModule('summary');
      } catch (error) {
        console.error("Summary generation failed", error);
        addLog("Ошибка при генерации общего отчета.");
      }
    } else {
      addLog("Недостаточно данных для генерации общего отчета.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-300 font-sans selection:bg-sky-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0A0A0B]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">OSINT NEXUS</h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Advanced Reconnaissance Suite</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-500 uppercase font-bold">System Online</span>
            </div>
            <div className="flex items-center gap-4 text-slate-500">
              <Activity className="w-4 h-4" />
              <Database className="w-4 h-4" />
              <Terminal className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-12 gap-6">
        
        {/* Left Sidebar: Controls & Modules */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          
          {/* Search Panel */}
          <section className="bg-[#121214] border border-white/5 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-white mb-2">
              <Zap className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Поиск цели</h2>
            </div>

            {/* Search Type Selector */}
            <div className="grid grid-cols-5 gap-1 p-1 bg-black/40 border border-white/5 rounded-lg">
              {[
                { id: 'nickname', icon: User, label: 'Ник' },
                { id: 'email', icon: Mail, label: 'Email' },
                { id: 'web', icon: Globe, label: 'Сайт/IP' },
                { id: 'phone', icon: Phone, label: 'Тел' },
                { id: 'tg_id', icon: MessageSquare, label: 'TG ID' },
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSearchType(type.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 rounded-md transition-all gap-1",
                    searchType === type.id 
                      ? "bg-sky-600 text-white shadow-lg" 
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  )}
                >
                  <type.icon className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">{type.label}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleScan} className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={
                    searchType === 'nickname' ? "Введите никнейм..." :
                    searchType === 'email' ? "Введите email..." :
                    searchType === 'web' ? "Введите домен или IP..." :
                    searchType === 'phone' ? "Введите номер (напр. +7999...)" :
                    searchType === 'tg_id' ? "Введите TG ID или @username..." :
                    "Введите идентификатор..."
                  }
                  className={cn(
                    "w-full bg-black/40 border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-colors placeholder:text-slate-600",
                    (searchType === 'email' && target && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) ||
                    (searchType === 'phone' && target && !/^\+?\d{7,15}$/.test(target.replace(/[\s\-()]/g, ''))) ||
                    (searchType === 'tg_id' && target && !/^(\d+|@[\w\d_]+)$/.test(target))
                      ? "border-rose-500/50 focus:border-rose-500"
                      : "border-white/10 focus:border-sky-500/50"
                  )}
                />
                {searchType === 'email' && target && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target) && (
                  <p className="text-[9px] text-rose-500 mt-1 ml-1 flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" />
                    Некорректный формат email
                  </p>
                )}
                {searchType === 'phone' && target && !/^\+?\d{7,15}$/.test(target.replace(/[\s\-()]/g, '')) && (
                  <p className="text-[9px] text-rose-500 mt-1 ml-1 flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" />
                    Некорректный формат номера
                  </p>
                )}
                {searchType === 'tg_id' && target && !/^(\d+|@[\w\d_]+)$/.test(target) && (
                  <p className="text-[9px] text-rose-500 mt-1 ml-1 flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" />
                    Некорректный формат TG ID
                  </p>
                )}
                {searchType === 'phone' && (
                  <p className="text-[9px] text-sky-500/70 mt-1 ml-1 flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" />
                    Идентификация владельца и поиск в базах контактов активны
                  </p>
                )}
              </div>
              <button 
                type="submit"
                disabled={isScanning || !target}
                className={cn(
                  "w-full py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  isScanning 
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                    : "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/20"
                )}
              >
                {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {isScanning ? "Сканирование..." : "Запустить сканирование"}
              </button>
            </form>
          </section>

          {/* Module List */}
          <section className="bg-[#121214] border border-white/5 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Активные модули</h2>
              <span className="text-[9px] font-mono text-sky-500 bg-sky-500/10 px-1.5 py-0.5 rounded">
                {MODULES.filter(m => m.category === searchType || m.category === 'all').length} Активно
              </span>
            </div>
            <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
              {generalSummary && (
                <button
                  onClick={() => setSelectedModule('summary')}
                  className={cn(
                    "w-full p-4 flex items-start gap-3 text-left hover:bg-white/5 transition-colors group",
                    selectedModule === 'summary' && "bg-sky-500/10 border-l-2 border-sky-500"
                  )}
                >
                  <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Общий итог</span>
                      <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse" />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed truncate">Сводный отчет по всем модулям</p>
                  </div>
                </button>
              )}
              {MODULES.filter(m => m.category === searchType || m.category === 'all').map((module) => (
                <button
                  key={module.id}
                  onClick={() => setSelectedModule(module.id)}
                  className={cn(
                    "w-full p-4 flex items-start gap-3 text-left hover:bg-white/5 transition-colors group",
                    selectedModule === module.id && "bg-sky-500/5 border-l-2 border-sky-500"
                  )}
                >
                  <div className={cn("p-2 rounded-lg bg-black/40", module.color)}>
                    {module.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-white">{module.name}</span>
                      {results[module.id]?.status === 'completed' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                      {results[module.id]?.status === 'running' && <Loader2 className="w-3 h-3 text-sky-500 animate-spin" />}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed truncate">{module.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* System Logs */}
          <section className="bg-[#121214] border border-white/5 rounded-xl p-4 h-[300px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Вывод консоли</h2>
              <Terminal className="w-3 h-3 text-slate-600" />
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1.5 text-slate-500 custom-scrollbar">
              {logs.length === 0 && <p className="italic opacity-30">Ожидание команд...</p>}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-sky-500/50 shrink-0">›</span>
                  <span className={cn(log.includes('Error') && "text-rose-500")}>{log}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Search History */}
          <section className="bg-[#121214] border border-white/5 rounded-xl p-4 flex flex-col max-h-[400px]">
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">История поиска</h2>
              <button 
                onClick={() => setHistory([])}
                className="text-[9px] text-slate-600 hover:text-rose-500 transition-colors uppercase font-bold"
              >
                Очистить
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
              {history.length === 0 && <p className="text-[10px] text-slate-600 italic text-center py-4">История пуста</p>}
              {history.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setTarget(item.target);
                    setSearchType(item.type);
                  }}
                  className="w-full text-left p-2 rounded bg-black/20 border border-white/5 hover:border-sky-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-sky-500 uppercase tracking-tighter">
                      {item.type === 'nickname' ? 'Ник' : 
                       item.type === 'email' ? 'Email' : 
                       item.type === 'web' ? 'Сайт' : 
                       item.type === 'phone' ? 'Тел' : 'TG ID'}
                    </span>
                    <span className="text-[8px] text-slate-600 font-mono">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-white truncate group-hover:text-sky-400 transition-colors">{item.target}</p>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Main Content: Results & Visualization */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          
          {/* Top Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Модули готовы', value: MODULES.filter(m => m.category === searchType || m.category === 'all').length, icon: Cpu, color: 'text-sky-400' },
              { label: 'Активные сканы', value: Object.values(results).filter(r => r.status === 'running').length, icon: Activity, color: 'text-emerald-400' },
              { label: 'Точки данных', value: '1.2k', icon: Database, color: 'text-indigo-400' },
              { label: 'Уровень угрозы', value: 'Низкий', icon: Shield, color: 'text-amber-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-[#121214] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <div className={cn("p-2.5 rounded-lg bg-black/40", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{stat.label}</p>
                  <p className="text-xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Visualization Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#121214] border border-white/5 rounded-xl p-5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Анализ сетевого трафика</h3>
                <span className="text-[10px] text-slate-500 font-mono">Живой поток</span>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MOCK_ACTIVITY_DATA}>
                    <defs>
                      <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#121214', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '10px' }}
                      itemStyle={{ color: '#0ea5e9' }}
                    />
                    <Area type="monotone" dataKey="requests" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorRequests)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#121214] border border-white/5 rounded-xl p-5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Задержка модулей (ms)</h3>
                <span className="text-[10px] text-slate-500 font-mono">Отклик модуля</span>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MOCK_ACTIVITY_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#121214', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '10px' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Line type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Results Viewer */}
          <div className="bg-[#121214] border border-white/5 rounded-xl min-h-[500px] flex flex-col">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-sky-500 rounded-full" />
                <h2 className="text-sm font-bold text-white tracking-tight">Отчет разведки</h2>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest px-3 py-1 border border-white/10 rounded-md">Экспорт PDF</button>
                <button className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest px-3 py-1 border border-white/10 rounded-md">Очистить все</button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="wait">
                {selectedModule === 'summary' ? (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 rounded-xl bg-sky-500/10 text-sky-500">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Общий отчет разведки (Nexus Summary)</h3>
                        <p className="text-xs text-slate-500">Сводный анализ всех активных модулей для цели: {target}</p>
                      </div>
                    </div>
                    
                    <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-6 prose prose-invert prose-sm max-w-none markdown-content">
                      <ReactMarkdown
                        components={{
                          a: ({ node, ...props }) => (
                            <a 
                              {...props} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-sky-400 hover:text-sky-300 underline underline-offset-4 transition-colors inline-flex items-center gap-1"
                            >
                              {props.children}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )
                        }}
                      >
                        {generalSummary || 'Генерация отчета...'}
                      </ReactMarkdown>
                    </div>
                  </motion.div>
                ) : selectedModule ? (
                  <motion.div 
                    key={selectedModule}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl bg-black/40", MODULES.find(m => m.id === selectedModule)?.color)}>
                          {MODULES.find(m => m.id === selectedModule)?.icon}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{MODULES.find(m => m.id === selectedModule)?.name}</h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <ExternalLink className="w-3 h-3" />
                            {MODULES.find(m => m.id === selectedModule)?.source}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded",
                          results[selectedModule]?.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" :
                          results[selectedModule]?.status === 'running' ? "bg-sky-500/10 text-sky-500" :
                          "bg-slate-500/10 text-slate-500"
                        )}>
                          {results[selectedModule]?.status || 'Idle'}
                        </span>
                        <span className="text-[9px] font-mono text-slate-600 uppercase">
                          Категория: {(() => {
                            const cat = MODULES.find(m => m.id === selectedModule)?.category;
                            switch(cat) {
                              case 'nickname': return 'Никнейм';
                              case 'email': return 'Email';
                              case 'web': return 'Сайт/IP';
                              case 'phone': return 'Телефон';
                              case 'tg_id': return 'Telegram ID';
                              case 'all': return 'Универсальный';
                              default: return cat;
                            }
                          })()}
                        </span>
                      </div>
                    </div>

                    <div className="prose prose-invert prose-sm max-w-none">
                      {results[selectedModule]?.visualData && (
                        <div className="space-y-4 mb-6">
                          {/* FunStat Bot Stats Grid */}
                          {results[selectedModule].visualData.stats && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              {[
                                { label: 'Разнообразие', value: `${results[selectedModule].visualData.stats.diversity}%`, icon: Zap },
                                { label: 'Ответы', value: `${results[selectedModule].visualData.stats.repliesPercent}%`, icon: MessageSquare },
                                { label: 'Медиа', value: `${results[selectedModule].visualData.stats.mediaPercent}%`, icon: Globe },
                                { label: 'Админ в', value: results[selectedModule].visualData.stats.adminCount, icon: Shield },
                                { label: 'Любимый чат', value: results[selectedModule].visualData.stats.favoriteChat, icon: Network },
                              ].map((s, i) => (
                                <div key={i} className="bg-black/40 border border-white/5 rounded-lg p-3 text-center">
                                  <s.icon className="w-3 h-3 mx-auto mb-2 text-slate-500" />
                                  <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">{s.label}</p>
                                  <p className="text-xs font-bold text-white truncate">{s.value}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Relationship Map (Scatter) */}
                            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Социальный граф (Ответы)</h4>
                              <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <XAxis type="number" dataKey="x" hide />
                                    <YAxis type="number" dataKey="y" hide />
                                    <ZAxis type="number" dataKey="size" range={[50, 400]} />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#121214', border: '1px solid #ffffff10', borderRadius: '8px', fontSize: '10px' }} />
                                    <Scatter name="Nodes" data={results[selectedModule].visualData.nodes} fill="#0ea5e9">
                                      {results[selectedModule].visualData.nodes.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.type === 'account' ? '#0ea5e9' : entry.type === 'server' ? '#10b981' : '#f43f5e'} />
                                      ))}
                                      <LabelList dataKey="name" position="top" style={{ fill: '#94a3b8', fontSize: '8px', fontWeight: 'bold' }} />
                                    </Scatter>
                                  </ScatterChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* Activity Radar Chart */}
                            {results[selectedModule].visualData.attributes && (
                              <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Профиль активности</h4>
                                <div className="h-[200px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={results[selectedModule].visualData.attributes}>
                                      <PolarGrid stroke="#ffffff10" />
                                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 8 }} />
                                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                      <Radar
                                        name="Activity"
                                        dataKey="A"
                                        stroke="#0ea5e9"
                                        fill="#0ea5e9"
                                        fillOpacity={0.5}
                                      />
                                    </RadarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Частота слов</h4>
                              <div className="space-y-2">
                                {results[selectedModule].visualData.wordFrequency?.map((w, i) => (
                                  <div key={i} className="flex items-center gap-3">
                                    <span className="text-[10px] font-mono text-slate-500 w-4">{i + 1}.</span>
                                    <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden relative">
                                      <div 
                                        className="h-full bg-sky-500/30 border-r border-sky-500" 
                                        style={{ width: `${(w.count / Math.max(...(results[selectedModule].visualData?.wordFrequency || []).map(x => x.count))) * 100}%` }} 
                                      />
                                      <span className="absolute inset-0 flex items-center px-2 text-[9px] font-bold text-white uppercase">{w.word}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-sky-500">{w.count}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Full History Section */}
                          <div className="bg-black/40 border border-white/5 rounded-xl p-4 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">История метаданных</h4>
                            </div>
                            
                            <div className="space-y-3 transition-all">
                              {results[selectedModule].visualData.history?.map((h, i) => (
                                <div key={i} className="flex items-center justify-between text-[10px] font-mono border-b border-white/5 pb-2">
                                  <span className="text-slate-500">{h.date}</span>
                                  <span className="text-slate-400">{h.type.toUpperCase()}</span>
                                  <span className="text-white font-bold">{h.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {results[selectedModule]?.data ? (
                        <div className="bg-black/20 border border-white/5 rounded-xl p-6 prose prose-invert prose-sm max-w-none markdown-content">
                          <ReactMarkdown
                            components={{
                              a: ({ node, ...props }) => (
                                <a 
                                  {...props} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-sky-400 hover:text-sky-300 underline underline-offset-4 transition-colors inline-flex items-center gap-1"
                                >
                                  {props.children}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )
                            }}
                          >
                            {results[selectedModule].data}
                          </ReactMarkdown>
                        </div>
                      ) : results[selectedModule]?.status === 'running' ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                          <Loader2 className="current-w-8 h-8 text-sky-500 animate-spin" />
                          <p className="text-xs text-slate-500 font-mono animate-pulse">Расшифровка потоков данных...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30">
                          <Database className="w-12 h-12" />
                          <p className="text-sm font-mono">Данные для этого модуля не найдены.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-20 space-y-4 opacity-40">
                    <Shield className="w-16 h-16 text-slate-700" />
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">Выберите модуль</p>
                      <p className="text-xs text-slate-500">Выберите активный модуль разведки для просмотра детальных данных.</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Global CSS for scrollbar */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}} />
    </div>
  );
}
