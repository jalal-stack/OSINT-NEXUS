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
  ExternalLink,
  History,
  Download,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  type: 'nickname' | 'email' | 'web' | 'phone' | 'tg_id' | 'universal';
  timestamp: number;
};

// --- Request Queue ---

class GeminiQueue {
  private queue: (() => Promise<void>)[] = [];
  private activeCount = 0;
  private maxConcurrent = 2; // Limit to 2 concurrent requests to avoid 429s

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) return;

    this.activeCount++;
    const fn = this.queue.shift()!;
    try {
      await fn();
    } finally {
      this.activeCount--;
      this.process();
    }
  }
}

const geminiQueue = new GeminiQueue();

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
    nodes: { id: string, name: string, type: string, val?: number, x?: number, y?: number }[];
    links?: { source: string, target: string, label: string }[];
    attributes: { subject: string, A: number, fullMark: number }[];
    wordFrequency?: { word: string, count: number }[];
    history?: { date: string, value: string, type: 'name' | 'username' }[];
    trustScore?: number;
    fakeIndicators?: string[];
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
    id: 'sherlock', 
    name: 'Sherlock', 
    icon: <Search className="w-4 h-4" />, 
    description: 'Поиск аккаунтов в соцсетях (без API)',
    source: 'github.com/sherlock-project/sherlock',
    color: 'text-orange-400',
    category: 'nickname'
  },
  { 
    id: 'maigret', 
    name: 'Maigret', 
    icon: <User className="w-4 h-4" />, 
    description: 'Сбор досье на человека по никнейму (без API)',
    source: 'github.com/soxoj/maigret',
    color: 'text-fuchsia-400',
    category: 'nickname'
  },
  { 
    id: 'holehe', 
    name: 'Holehe', 
    icon: <Mail className="w-4 h-4" />, 
    description: 'Проверка использования email (без API)',
    source: 'github.com/megadose/holehe',
    color: 'text-lime-400',
    category: 'email'
  },
  {
    id: 'whatsmyname',
    name: 'WhatsMyName',
    icon: <Search className="w-4 h-4" />,
    description: 'Поиск аккаунтов на открытых платформах',
    source: 'github.com/webbreacher/whatsmyname',
    color: 'text-cyan-300',
    category: 'nickname'
  },
  {
    id: 'google-dorking',
    name: 'Google Dorking',
    icon: <Search className="w-4 h-4" />,
    description: 'Систематизированный поиск в Google (без API)',
    source: 'internal/google-dorking',
    color: 'text-orange-500',
    category: 'all'
  },
  {
    id: 'theharvester',
    name: 'theHarvester',
    icon: <Search className="w-4 h-4" />,
    description: 'Open-Source сбор emails и связей из открытых БД',
    source: 'github.com/laramies/theharvester',
    color: 'text-blue-300',
    category: 'all'
  },
  {
    id: 'ghunt',
    name: 'GHunt',
    icon: <Mail className="w-4 h-4" />,
    description: 'OSINT по открытым данным Google',
    source: 'github.com/mxrch/ghunt',
    color: 'text-red-400',
    category: 'email'
  }
];

const MOCK_ACTIVITY_DATA = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  requests: Math.floor(Math.random() * 50) + 10,
  latency: Math.floor(Math.random() * 200) + 50,
}));

// --- Components ---

// Extract API URL if running separately
const API_URL = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [target, setTarget] = useState('');
  const [searchType, setSearchType] = useState<'nickname' | 'email' | 'web' | 'phone' | 'tg_id' | 'universal'>('universal');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<Record<string, ScanResult>>({});
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [generalSummary, setGeneralSummary] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
    const [discoveredEntities, setDiscoveredEntities] = useState<Set<string>>(new Set());
  const [apiStatus, setApiStatus] = useState<{ configured: boolean, message: string } | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/status`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setApiStatus(data);
      } catch (error: any) {
        console.error("Failed to check API status:", error);
        setApiStatus({ 
          configured: false, 
          message: `Ошибка связи с сервером (${error.message}). Если код на Vercel - укажите VITE_API_URL на Render.` 
        });
      }
    };
    
    checkStatus();
    // Poll every 5 seconds to catch when the user adds the secret
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  };

  const callGeminiWithRetry = async (prompt: string, useSearch = true, maxRetries = 5): Promise<any> => {
    return geminiQueue.add(async () => {
      let lastError: any;
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await fetch(`${API_URL}/api/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, useSearch })
          });

          if (!response.ok) {
            let errorMessage = `Error ${response.status}`;
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } catch (e) {
              const textError = await response.text();
              errorMessage = `Server returned HTML/Text instead of JSON (Status ${response.status}). Check if backend is running.`;
              console.error("Non-JSON response:", textError.slice(0, 200));
            }
            throw { status: response.status, message: errorMessage };
          }

          return await response.json();
        } catch (error: any) {
          lastError = error;
          const errorStr = JSON.stringify(error);
          const isRateLimit = 
            error.status === 429 || 
            errorStr.includes('429') || 
            errorStr.includes('RESOURCE_EXHAUSTED') ||
            errorStr.includes('quota');
          
          if (isRateLimit) {
            // Exponential backoff: 5s, 10s, 20s, 40s, 80s + jitter
            const waitTime = Math.pow(2, i) * 5000 + Math.random() * 2000;
            addLog(`[System] Квота API исчерпана. Повтор ${i+1}/${maxRetries} через ${Math.round(waitTime/1000)}с...`);
            await new Promise(r => setTimeout(r, waitTime));
            continue;
          }
          
          // If search tool fails, try without it
          if (useSearch && (error.message?.includes('tool') || errorStr.includes('tool'))) {
             addLog(`[System] Ошибка инструмента поиска. Повтор без Google Search...`);
             return callGeminiWithRetry(prompt, false, maxRetries);
          }
          
          throw error;
        }
      }
      throw lastError;
    });
  };


  const detectType = (val: string): 'nickname' | 'email' | 'web' | 'phone' | 'tg_id' => {
    if (val.includes('@') && val.includes('.')) return 'email';
    if (/^\+?\d{7,15}$/.test(val.replace(/[\s\-()]/g, ''))) return 'phone';
    if (/^@[\w\d_]+$/.test(val)) return 'tg_id';
    if (val.includes('.') && !val.includes(' ')) return 'web';
    return 'nickname';
  };

  const handleScan = async (e?: React.FormEvent, manualTarget?: string, manualType?: 'nickname' | 'email' | 'web' | 'phone' | 'tg_id' | 'universal') => {
    if (e) e.preventDefault();
    
    const currentTarget = manualTarget || target;
    const currentType = manualType || searchType;

    if (!currentTarget || isScanning) return;

    const detectedType = currentType === 'universal' ? detectType(currentTarget) : currentType as any;

    // Validation
    if (detectedType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(currentTarget)) {
        addLog("ОШИБКА: Некорректный формат email.");
        if (!manualTarget) return;
      }
    }

    if (detectedType === 'phone') {
      const cleanPhone = currentTarget.replace(/[\s\-()]/g, '');
      const phoneRegex = /^\+?\d{7,15}$/;
      if (!phoneRegex.test(cleanPhone)) {
        addLog("ОШИБКА: Некорректный формат номера.");
        if (!manualTarget) return;
      }
    }

    if (detectedType === 'tg_id') {
      const tgIdRegex = /^(\d+|@[\w\d_]+)$/;
      if (!tgIdRegex.test(currentTarget)) {
        addLog("ОШИБКА: Некорректный формат TG ID.");
        if (!manualTarget) return;
      }
    }

    if (!manualTarget) {
      setLogs([]);
      setGeneralSummary(null);
      setResults({});
      setDiscoveredEntities(new Set([currentTarget]));
    }
    
    setIsScanning(true);
    setSelectedModule(null);
    
    await runScanRound(currentTarget, detectedType);
    
    if (!manualTarget) {
      setIsScanning(false);
      addLog("Все модули разведки и автоматические цепочки завершены.");
      generateFinalSummary(currentTarget, detectedType);
    }
  };

  const runScanRound = async (currentTarget: string, detectedType: 'nickname' | 'email' | 'web' | 'phone' | 'tg_id' | 'universal', depth = 0, localDiscovered = new Set<string>()) => {
    if (depth > 1) return; // Reduced recursion depth to 2 rounds (0 and 1) to save quota

    const actualType = detectedType === 'universal' ? detectType(currentTarget) : detectedType as any;
    
    if (localDiscovered.has(currentTarget) && depth > 0) return;
    localDiscovered.add(currentTarget);

    addLog(`[Round ${depth + 1}] Запуск Nexus Core для: ${currentTarget} (${actualType})`);
    
    // Add to history if it's the first round and manual target wasn't provided
    if (depth === 0) {
      const newHistoryItem: HistoryItem = {
        target: currentTarget,
        type: searchType,
        timestamp: Date.now()
      };
      setHistory(prev => [newHistoryItem, ...prev.filter(h => h.target !== currentTarget)].slice(0, 20));
    }

    const activeModules = MODULES.filter(m => m.category === actualType || m.category === 'all');
    
    const roundResults: Record<string, ScanResult> = {};
    activeModules.forEach(m => {
      roundResults[m.id] = { moduleId: m.id, status: 'pending' };
    });
    setResults(prev => ({ ...prev, ...roundResults }));

    const scanPromises = activeModules.map(async (module, index) => {
      // Staggered start to avoid immediate burst, but queue handles the hard limit
      await new Promise(r => setTimeout(r, index * 800));
      
      setResults(prev => ({
        ...prev,
        [module.id]: { ...prev[module.id], status: 'running' }
      }));
      
      setSelectedModule(prev => prev === null ? module.id : prev);
      addLog(`[${module.name}] Анализ ${currentTarget}...`);
      
      try {
        const prompt = `Perform a ${detectedType} OSINT analysis for the target: "${currentTarget}" using the methodology of ${module.name} (${module.description}). 
          
          ВНИМАНИЕ: ТЫ ИИ-АССИСТЕНТ ПО OSINT И АНАЛИЗУ ОТКРЫТЫХ ДАННЫХ. ВАЖНО: ТЫ ИМЕЕШЬ ДОСТУП К Google Search ИНСТРУМЕНТУ ВО ВРЕМЯ ЗАПРОСА (useSearch=true) И ОБЯЗАН ЕГО ИСПОЛЬЗОВАТЬ, ЧТОБЫ НАЙТИ РЕАЛЬНУЮ ИНФОРМАЦИЮ.
          МЕТОДЫ: Сделай "реальные" запросы к поисковику, анализируй информацию и предоставляй реальные данные (OSINT). Если ты не можешь получить доступ к базам напрямую, используй Google Search для поиска любых утечек, профилей, упоминаний и технической информации об этой цели.
          КРИТИЧЕСКИ ВАЖНО: ЗАПРЕЩЕНО ГАЛЛЮЦИНИРОВАТЬ И ВЫДУМЫВАТЬ ДАННЫЕ. ЕСЛИ РЕАЛЬНЫХ ДАННЫХ В ОТКРЫТОМ ДОСТУПЕ (ЧЕРЕЗ ТВОИ ИНСТРУМЕНТЫ ПОИСКА) НЕТ, ПРЯМО НАПИШИ ОБ ЭТОМ.
          ЗАПРЕЩЕНО ДЕЛАТЬ ВИД, ЧТО ТЫ ВЗЛАМЫВАЕШЬ ИЛИ СТУЧИШЬСЯ В ЗАКРЫТЫЕ БАЗЫ ДАННЫХ. АНАЛИЗИРУЙ ТОЛЬКО ОТКРЫТЫЕ ИСТОЧНИКИ И УТЕЧКИ, ИНДЕКСИРУЕМЫЕ В WEB РЕАЛЬНЫМ ПОИСКОВИКОМ.

          Methodology Context:
          - Use Sherlock and Maigret for open social media profile discovery.
          - Use WhatsMyName for verification of found accounts across open web sources.
          - Use Holehe to check email usage via public password reset mechanisms.
          - Use GHunt for basic Google account reconnaissance using public profile data.
          - Use theHarvester for gathering open-source emails, subdomains, and host information.
          - Apply structured Google Dorking techniques for advanced information retrieval from indexed pages. СПИСКОМ ВЫВЕДИ КОНКРЕТНЫЕ GOOGLE DORKS ДЛЯ ЭТОЙ ЦЕЛИ, ЧТОБЫ ПОЛЬЗОВАТЕЛЬ МОГ ИСКАТЬ САМ.
          - VISUALIZATION: Structure the JSON output to support a Neo4j-style graph visualization mapping open web connections.
          
          Search for public leaks, social media profiles, network records, and associated metadata relevant to this ${detectedType} ONLY in open directories. 
          
          ${detectedType === 'phone' ? 'ОСОБОЕ ВНИМАНИЕ: Постарайся определить ИМЯ ВЛАДЕЛЬЦА (Owner Name), связанные аккаунты в мессенджерах (WhatsApp, Telegram), теги из телефонных книг и СВЯЗАННЫЕ EMAIL-АДРЕСА. Активно ищи данные в ВЕБ-АГРЕГАТОРАХ УТЕЧЕК (Breach Aggregators) для поиска исторических связей.' : ''}
          ${detectedType === 'email' ? 'ОСОБОЕ ВНИМАНИЕ: Найди все связанные аккаунты в соцсетях, упоминания в УТЕЧКАХ ДАННЫХ (Breaches), связанные домены, имена владельцев и любые публичные профили (Google, Gravatar, LinkedIn и т.д.). Используй агрегаторы открытых баз.' : ''}
          ${detectedType === 'nickname' ? 'ОСОБОЕ ВНИМАНИЕ: Проверь подлинность никнейма на разных платформах. Если обнаружены связанные EMAIL-АДРЕСА или НОМЕРА ТЕЛЕФОНОВ, укажи их.' : ''}
          ${detectedType === 'tg_id' ? 'ОСОБОЕ ВНИМАНИЕ: Проведи максимально глубокий поиск по Telegram ID или @username в открытом вебе. Твоя цель: найти связанные аккаунты в сервисах.' : ''}
          
          Provide a technical summary of findings in Markdown. 
          
          IMPORTANT: The entire technical summary and all descriptive text MUST be in RUSSIAN language.
          
          КРИТИЧЕСКИ ВАЖНО: Если реальные данные не найдены, НЕ придумывай их. Выведи только реальную найденную информацию, а также Google Dorks для ручного поиска.
          
          ADDITIONAL REQUIREMENT: If you find any specific URLs (social media profiles, leaked pages, etc.), list them clearly in a section titled "### 🔗 Найденные ссылки и ресурсы".
          ADDITIONAL REQUIREMENT: Create a mandatory section "### 🔍 Google Dorks для ручного поиска" and suggest 3-5 search queries specific to this target.
          
          CRITICAL: You MUST provide a JSON block at the end of your response (wrapped in \`\`\`json) even if no data is found. 
          
          JSON Schema:
          {
            "nodes": [{"id": string, "name": string, "type": "account" | "server" | "email" | "phone" | "domain" | "ip", "val": number}],
            "links": [{"source": string, "target": string, "label": string}],
            "attributes": [{"subject": string, "A": number, "fullMark": 100}],
            "wordFrequency": [{"word": string, "count": number}],
            "history": [{"date": string, "value": string, "type": "name" | "username"}],
            "trustScore": number, // 0-100, where 100 is highly authentic, 0 is definitely fake/bot
            "fakeIndicators": [string], // List of specific red flags found
            "stats": {
              "diversity": number,
              "repliesPercent": number,
              "mediaPercent": number,
              "favoriteChat": string,
              "adminCount": number
            }
          }
          Ensure the JSON is valid and represents the relationships found. Use "id" for nodes and reference them in "links".`;

        const response = await callGeminiWithRetry(prompt, true);

        const text = response.text || '';
        let markdown = text;
        let visualData = undefined;

        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            const jsonStr = jsonMatch[1].trim();
            visualData = JSON.parse(jsonStr);
            markdown = text.replace(jsonMatch[0], '');
            
            // AUTO-CHAIN LOGIC: Extract new entities for next round
            if (visualData.nodes && depth < 1) {
              const newEntities = visualData.nodes
                .filter((n: any) => n.type === 'email' || n.type === 'phone' || n.type === 'account')
                .map((n: any) => n.name)
                .filter((name: string) => name && name !== currentTarget && !localDiscovered.has(name))
                .slice(0, 2); // Limit to 2 new entities per module to save quota

              if (newEntities.length > 0) {
                addLog(`[Auto-Chain] Обнаружены новые сущности: ${newEntities.join(', ')}. Запуск следующего этапа...`);
                await Promise.all(newEntities.map(async (entity: string) => {
                  setDiscoveredEntities(prev => new Set([...prev, entity]));
                  await runScanRound(entity, 'universal', depth + 1, localDiscovered);
                }));
              }
            }
          } catch (e) {
            console.error("Failed to parse visual data", e);
          }
        }

        const result: ScanResult = { moduleId: module.id, status: 'completed', data: markdown, visualData };
        setResults(prev => ({ ...prev, [module.id]: result }));
        addLog(`[${module.name}] Завершено.`);
      } catch (error) {
        const errorResult: ScanResult = { moduleId: module.id, status: 'error', error: 'Module execution failed' };
        setResults(prev => ({ ...prev, [module.id]: errorResult }));
        addLog(`Ошибка в модуле ${module.name}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    });

    await Promise.all(scanPromises);
  };

  const generateFinalSummary = async (currentTarget: string, detectedType: string) => {
    addLog("Генерация финального AI отчета...");
    try {
      const successfulResults = Object.entries(results).filter(([_, r]) => r.status === 'completed' && r.data);
      const allData = successfulResults
        .map(([id, r]) => {
          const moduleName = MODULES.find(m => m.id === id)?.name || id;
          return `### ${moduleName}\n${r.data}`;
        })
        .join('\n\n');

      const prompt = `На основе всех найденных открытых данных (OSINT) для цели "${currentTarget}", составь итоговый отчет.
        
        ВНИМАНИЕ: ТЫ ИИ-АССИСТЕНТ ПО OSINT И АНАЛИЗУ ОТКРЫТЫХ ДАННЫХ.
        КРИТИЧЕСКИ ВАЖНО: ЗАПРЕЩЕНО ГАЛЛЮЦИНИРОВАТЬ И ВЫДУМЫВАТЬ ДАННЫЕ. ЕСЛИ РЕАЛЬНЫХ ДАННЫХ В ОТКРЫТОМ ДОСТУПЕ НЕТ ИЛИ ИХ МАЛО, ПРЯМО НАПИШИ ОБ ЭТОМ. СТРОЙ ВЫВОДЫ ТОЛЬКО НА ПРЕДОСТАВЛЕННЫХ ТЕБЕ ДАННЫХ ОТ МОДУЛЕЙ И РЕАЛЬНЫХ ПОИСКОВЫХ ЗАПРОСАХ ЧЕРЕЗ GOOGLE SEARCH.
        ВЫ ДОЛЖНЫ ВЫПОЛНИТЬ РЕАЛЬНЫЙ ПОИСК В INTERNET И ПРОВЕРИТЬ ИНФОРМАЦИЮ ПЕРЕД ВЫВОДОМ.
        
        СТРУКТУРА ОТЧЕТА:
        1. **Вероятность идентификации**: (Укажи процент вероятности, напр. 82%)
        2. **Найденные аккаунты**: (Список подтвержденных соцсетей и мессенджеров ИЗ ДАННЫХ)
        3. **Связи**: (Почему мы считаем, что это один человек? Напр. совпадает bio, username, фото ИЗ ДАННЫХ)
        4. **Риск**: (Оценка активности, потенциальные угрозы, признаки фейка)
        
        При анализе придерживайся методологии анализа открытых источников без имитации "взломов" закрытых баз данных.
        
        ОБЯЗАТЕЛЬНО: Добавь раздел "### 🛡️ Анализ подлинности (Anti-Fake Filter)", где оценишь достоверность найденных аккаунтов.
        ОБЯЗАТЕЛЬНО: Добавь раздел "### 🔍 Рекомендованные Google Dorks", предложи 3-5 формул Google Dorking для самостоятельного поиска.
        ОБЯЗАТЕЛЬНО: Собери все РЕАЛЬНО НАЙДЕННЫЕ ссылки в "### 🌐 Сводный список ресурсов" (не придумывай ссылки).
        
        Весь текст на РУССКОМ языке в Markdown.
        
        Данные от модулей для формирования отчета:
        ${allData}`;

      const summaryResponse = await callGeminiWithRetry(prompt, true);

      setGeneralSummary(summaryResponse.text || "Ошибка генерации отчета.");
      addLog("Финальный отчет готов.");
    } catch (err) {
      console.error(err);
      addLog("Ошибка при генерации финального отчета.");
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

            {apiStatus && !apiStatus.configured && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="text-[10px] text-red-400 font-medium">
                  {apiStatus.message}
                </div>
              </div>
            )}

            {/* Search Type Selector */}
            <div className="grid grid-cols-6 gap-1 p-1 bg-black/40 border border-white/5 rounded-lg">
              {[
                { id: 'universal', icon: Zap, label: 'Все' },
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
                    searchType === 'universal' ? "Ник, Email или Телефон..." :
                    searchType === 'nickname' ? "Введите никнейм..." :
                    searchType === 'email' ? "Введите email..." :
                    searchType === 'web' ? "Введите домен или IP..." :
                    searchType === 'phone' ? "Введите номер (напр. +7999...)" :
                    searchType === 'tg_id' ? "Введите TG ID или @username..." :
                    "Введите идентификатор..."
                  }
                  className={cn(
                    "w-full bg-black/40 border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-colors placeholder:text-slate-600",
                    (searchType !== 'universal' && (
                      (searchType === 'email' && target && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) ||
                      (searchType === 'phone' && target && !/^\+?\d{7,15}$/.test(target.replace(/[\s\-()]/g, ''))) ||
                      (searchType === 'tg_id' && target && !/^(\d+|@[\w\d_]+)$/.test(target))
                    ))
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
                    Некорректный формат (ID или @username)
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
                disabled={isScanning || !target || (apiStatus !== null && !apiStatus.configured)}
                className={cn(
                  "w-full py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  (isScanning || (apiStatus !== null && !apiStatus.configured))
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                    : "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/20"
                )}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Сканирование...
                  </>
                ) : (apiStatus !== null && !apiStatus.configured) ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Нужен API-ключ
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Запустить сканирование
                  </>
                )}
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
                          {/* Trust Score & Fake Indicators */}
                          {results[selectedModule]?.visualData?.trustScore !== undefined && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              <div className="md:col-span-1 bg-black/40 border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                                <div className={cn(
                                  "absolute inset-0 opacity-10 blur-2xl transition-all group-hover:opacity-20",
                                  (results[selectedModule]?.visualData?.trustScore ?? 0) > 70 ? "bg-emerald-500" : 
                                  (results[selectedModule]?.visualData?.trustScore ?? 0) > 40 ? "bg-amber-500" : "bg-rose-500"
                                )} />
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 relative z-10">Индекс доверия</h4>
                                <div className="relative z-10 flex items-center justify-center">
                                  <svg className="w-24 h-24 transform -rotate-90">
                                    <circle
                                      cx="48"
                                      cy="48"
                                      r="40"
                                      stroke="currentColor"
                                      strokeWidth="8"
                                      fill="transparent"
                                      className="text-white/5"
                                    />
                                    <circle
                                      cx="48"
                                      cy="48"
                                      r="40"
                                      stroke="currentColor"
                                      strokeWidth="8"
                                      fill="transparent"
                                      strokeDasharray={251.2}
                                      strokeDashoffset={251.2 - (251.2 * (results[selectedModule]?.visualData?.trustScore ?? 0)) / 100}
                                      className={cn(
                                        "transition-all duration-1000 ease-out",
                                        (results[selectedModule]?.visualData?.trustScore ?? 0) > 70 ? "text-emerald-500" : 
                                        (results[selectedModule]?.visualData?.trustScore ?? 0) > 40 ? "text-amber-500" : "text-rose-500"
                                      )}
                                    />
                                  </svg>
                                  <span className="absolute text-2xl font-black text-white">{results[selectedModule]?.visualData?.trustScore}%</span>
                                </div>
                                <p className="mt-4 text-[10px] font-bold uppercase tracking-tighter relative z-10">
                                  {(results[selectedModule]?.visualData?.trustScore ?? 0) > 70 ? "Высокая подлинность" : 
                                   (results[selectedModule]?.visualData?.trustScore ?? 0) > 40 ? "Подозрительная активность" : "Вероятный бот / фейк"}
                                </p>
                              </div>

                              <div className="md:col-span-2 bg-black/40 border border-white/5 rounded-xl p-6">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Индикаторы подлинности (Anti-Fake)</h4>
                                <div className="space-y-3">
                                  {results[selectedModule]?.visualData?.fakeIndicators?.map((indicator, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
                                      <AlertCircle className={cn(
                                        "w-4 h-4 mt-0.5",
                                        (results[selectedModule]?.visualData?.trustScore ?? 0) > 70 ? "text-emerald-500" : "text-amber-500"
                                      )} />
                                      <p className="text-xs text-slate-300 leading-relaxed">{indicator}</p>
                                    </div>
                                  )) || (
                                    <div className="flex items-center justify-center h-full py-4 text-slate-500 italic text-xs">
                                      Специфических индикаторов не обнаружено
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* FunStat Bot Stats Grid */}
                          {results[selectedModule]?.visualData?.stats && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              {[
                                { label: 'Разнообразие', value: `${results[selectedModule]?.visualData?.stats?.diversity}%`, icon: Zap },
                                { label: 'Ответы', value: `${results[selectedModule]?.visualData?.stats?.repliesPercent}%`, icon: MessageSquare },
                                { label: 'Медиа', value: `${results[selectedModule]?.visualData?.stats?.mediaPercent}%`, icon: Globe },
                                { label: 'Админ в', value: results[selectedModule]?.visualData?.stats?.adminCount, icon: Shield },
                                { label: 'Любимый чат', value: results[selectedModule]?.visualData?.stats?.favoriteChat, icon: Network },
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
                            {/* Relationship Map (Neo4j Style) */}
                            <div className="bg-black/40 border border-white/5 rounded-xl p-4 overflow-hidden relative">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Граф связей (Neo4j Visual Layer)</h4>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                    <span className="text-[8px] text-slate-500 uppercase">Аккаунт</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[8px] text-slate-500 uppercase">Сервер</span>
                                  </div>
                                </div>
                              </div>
                              <div className="h-[250px] relative bg-black/20 rounded-lg border border-white/5 overflow-hidden">
                                <svg width="100%" height="100%" viewBox="0 0 400 250" className="cursor-move">
                                  <defs>
                                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="15" refY="3.5" orient="auto">
                                      <polygon points="0 0, 10 3.5, 0 7" fill="#ffffff20" />
                                    </marker>
                                  </defs>
                                  {/* Render Links */}
                                  {results[selectedModule]?.visualData?.links?.map((link, idx) => {
                                    const sourceNode = results[selectedModule]?.visualData?.nodes.find(n => n.id === link.source);
                                    const targetNode = results[selectedModule]?.visualData?.nodes.find(n => n.id === link.target);
                                    if (!sourceNode || !targetNode) return null;
                                    
                                    // Generate random positions if not present (since AI might not provide x,y now)
                                    const sourceX = (sourceNode as any).x || (Math.random() * 300 + 50);
                                    const sourceY = (sourceNode as any).y || (Math.random() * 150 + 50);
                                    const targetX = (targetNode as any).x || (Math.random() * 300 + 50);
                                    const targetY = (targetNode as any).y || (Math.random() * 150 + 50);
                                    
                                    // Store positions back for consistency in this render
                                    (sourceNode as any).x = sourceX;
                                    (sourceNode as any).y = sourceY;
                                    (targetNode as any).x = targetX;
                                    (targetNode as any).y = targetY;

                                    return (
                                      <g key={`link-${idx}`}>
                                        <line 
                                          x1={sourceX} y1={sourceY} 
                                          x2={targetX} y2={targetY} 
                                          stroke="#ffffff10" 
                                          strokeWidth="1"
                                          markerEnd="url(#arrowhead)"
                                        />
                                        <text 
                                          x={(sourceX + targetX) / 2} 
                                          y={(sourceY + targetY) / 2} 
                                          fill="#ffffff30" 
                                          fontSize="6" 
                                          textAnchor="middle"
                                          dy="-4"
                                        >
                                          {link.label}
                                        </text>
                                      </g>
                                    );
                                  })}
                                  {/* Render Nodes */}
                                  {results[selectedModule]?.visualData?.nodes.map((node, idx) => {
                                    const x = (node as any).x || (Math.random() * 300 + 50);
                                    const y = (node as any).y || (Math.random() * 150 + 50);
                                    (node as any).x = x;
                                    (node as any).y = y;
                                    
                                    const color = node.type === 'account' ? '#0ea5e9' : 
                                                  node.type === 'server' ? '#10b981' : 
                                                  node.type === 'email' ? '#f59e0b' : 
                                                  node.type === 'phone' ? '#f43f5e' : '#94a3b8';
                                    
                                    return (
                                      <g 
                                        key={`node-${idx}`} 
                                        className="group cursor-pointer"
                                        onClick={() => {
                                          if (!isScanning) {
                                            handleScan(undefined, node.name, 'universal');
                                          }
                                        }}
                                      >
                                        <circle 
                                          cx={x} cy={y} r={node.val ? 10 + (node.val / 10) : 12} 
                                          fill={color} fillOpacity="0.2" 
                                          stroke={color} strokeWidth="1.5"
                                          className="transition-all group-hover:r-14 group-hover:fill-opacity-40"
                                        />
                                        <circle cx={x} cy={y} r="4" fill={color} />
                                        <text 
                                          x={x} y={y + 22} 
                                          fill="white" 
                                          fontSize="8" 
                                          fontWeight="bold" 
                                          textAnchor="middle"
                                          className="pointer-events-none"
                                        >
                                          {node.name}
                                        </text>
                                        <text 
                                          x={x} y={y + 30} 
                                          fill="#ffffff40" 
                                          fontSize="6" 
                                          textAnchor="middle"
                                          className="pointer-events-none uppercase tracking-tighter"
                                        >
                                          {node.type}
                                        </text>
                                      </g>
                                    );
                                  })}
                                </svg>
                                <div className="absolute bottom-2 right-2 flex gap-2">
                                  <div className="px-2 py-1 rounded bg-black/60 border border-white/10 text-[8px] text-slate-400 uppercase font-bold">Neo4j Engine</div>
                                </div>
                              </div>
                            </div>

                            {/* Activity Radar Chart */}
                            {results[selectedModule]?.visualData?.attributes && (
                              <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Профиль активности</h4>
                                <div className="h-[200px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={results[selectedModule]?.visualData?.attributes}>
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
                    {isScanning ? (
                      <>
                        <div className="relative">
                          <Shield className="w-16 h-16 text-blue-500 animate-pulse" />
                          <div className="absolute inset-0 w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">Выполняется сканирование...</p>
                          <p className="text-xs text-slate-500">Nexus Core анализирует цифровой след цели. Пожалуйста, подождите.</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Shield className="w-16 h-16 text-slate-700" />
                        <div className="text-center">
                          <p className="text-lg font-bold text-white">Выберите модуль</p>
                          <p className="text-xs text-slate-500">Выберите активный модуль разведки для просмотра детальных данных.</p>
                        </div>
                      </>
                    )}
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
