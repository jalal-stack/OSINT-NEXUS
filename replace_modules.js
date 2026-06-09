const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const MODULES: OSINTModule\[\] = \[[\s\S]*?\];/;

const newModules = `const MODULES: OSINTModule[] = [
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
    description: 'OSINT по открытым данным Google (внешнее)',
    source: 'github.com/mxrch/ghunt',
    color: 'text-red-400',
    category: 'email'
  }
];`;

fs.writeFileSync('src/App.tsx', content.replace(regex, newModules));
