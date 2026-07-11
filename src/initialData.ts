/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, User } from './types';

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_USERS: (User & { passwordHash: string })[] = [
  {
    username: 'admin',
    name: 'Carlos Caninana',
    role: 'Administrador',
    passwordHash: '123'
  },
  {
    username: 'operador',
    name: 'Thiago Silva',
    role: 'Operador',
    passwordHash: '123'
  },
  {
    username: 'consulta',
    name: 'Juliana Santos',
    role: 'Consulta',
    passwordHash: '123'
  }
];
