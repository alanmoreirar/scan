import fs from 'fs';
import path from 'path';
import { Product, Movement, InventoryItem, SystemLog, User } from './src/types';

interface DatabaseData {
  products: Product[];
  movements: Movement[];
  inventory: InventoryItem[];
  logs: SystemLog[];
  users: (User & { passwordHash: string })[];
}

const DB_FILE = path.join(process.cwd(), 'database.json');

const INITIAL_PRODUCTS: Product[] = [];

const INITIAL_USERS = [
  {
    username: 'admin',
    name: 'Carlos Caninana',
    role: 'Administrador' as const,
    email: 'carlos@caninana.com.br',
    avatar: '',
    passwordHash: '123'
  },
  {
    username: 'operador',
    name: 'Thiago Silva',
    role: 'Operador' as const,
    email: 'thiago@caninana.com.br',
    avatar: '',
    passwordHash: '123'
  },
  {
    username: 'consulta',
    name: 'Juliana Santos',
    role: 'Consulta' as const,
    email: 'juliana@caninana.com.br',
    avatar: '',
    passwordHash: '123'
  }
];

export function getDatabase(): DatabaseData {
  if (!fs.existsSync(DB_FILE)) {
    const data: DatabaseData = {
      products: INITIAL_PRODUCTS,
      movements: [],
      inventory: [],
      logs: [
        {
          id: 'log_init',
          timestamp: new Date().toISOString(),
          message: 'Banco de dados do servidor Caninana inicializado com sucesso.',
          type: 'success',
          user: 'Sistema'
        }
      ],
      users: INITIAL_USERS
    };
    saveDatabase(data);
    return data;
  }

  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading database file, resetting to initial data', error);
    const data: DatabaseData = {
      products: INITIAL_PRODUCTS,
      movements: [],
      inventory: [],
      logs: [
        {
          id: 'log_reset_error',
          timestamp: new Date().toISOString(),
          message: 'Banco de dados corrompido. Restaurado dados iniciais do sistema.',
          type: 'error',
          user: 'Sistema'
        }
      ],
      users: INITIAL_USERS
    };
    saveDatabase(data);
    return data;
  }
}

export function saveDatabase(data: DatabaseData): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function resetDatabase(): DatabaseData {
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
  }
  return getDatabase();
}
