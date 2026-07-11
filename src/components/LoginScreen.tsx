/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, Key, UserCheck, AlertTriangle } from 'lucide-react';
import { User } from '../types';
import { INITIAL_USERS } from '../initialData';
import { playBeep } from '../utils/audio';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  users?: (User & { passwordHash: string })[];
}

export default function LoginScreen({ onLogin, users = INITIAL_USERS }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const adminUser = users.find(u => u.username === 'admin');
  const operatorUser = users.find(u => u.username === 'operador');
  const queryUser = users.find(u => u.username === 'consulta');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.passwordHash === password
    );

    if (found) {
      setError('');
      playBeep('success');
      onLogin({
        username: found.username,
        name: found.name,
        role: found.role,
        email: found.email,
        avatar: found.avatar,
      });
    } else {
      setError('Usuário ou senha incorretos (Dica: use "admin", "operador" ou "consulta" com senha "123")');
      playBeep('error');
    }
  };

  const handleQuickLogin = (role: 'admin' | 'operador' | 'consulta') => {
    const found = users.find((u) => u.username === role);
    if (found) {
      setError('');
      playBeep('success');
      onLogin({
        username: found.username,
        name: found.name,
        role: found.role,
        email: found.email,
        avatar: found.avatar,
      });
    }
  };

  const renderQuickAvatar = (user: User | undefined) => {
    if (!user) return null;
    const initial = user.name ? user.name.substring(0, 1) : 'U';
    
    if (user.avatar) {
      if (user.avatar.startsWith('linear-gradient')) {
        return (
          <div 
            className="w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-white font-bold text-[11px] uppercase shadow-inner"
            style={{ background: user.avatar }}
          >
            {initial}
          </div>
        );
      }
      return (
        <img 
          src={user.avatar} 
          alt={user.name} 
          className="w-8 h-8 rounded-full mx-auto mb-1 object-cover border border-slate-200 shadow-sm" 
        />
      );
    }
    
    return (
      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-400 mx-auto mb-1 flex items-center justify-center font-bold text-[11px] uppercase font-mono">
        {initial}
      </div>
    );
  };

  return (
    <div id="login-container" className="min-h-screen bg-[#f4f7f9] flex flex-col items-center justify-center p-4 animate-fade-in">
      <div id="login-card" className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        {/* Branding decoration */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[#2497DE]"></div>
        
        {/* Header */}
        <div className="text-center mb-8 mt-2">
          <div className="mx-auto w-14 h-14 bg-[#2497DE]/10 border border-[#2497DE]/20 rounded-xl flex items-center justify-center mb-4">
            <span className="text-xl font-black text-[#2497DE] tracking-widest font-mono">CN</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight uppercase">Caninana Coletor</h1>
          <p className="text-slate-400 text-[9px] font-bold font-mono uppercase tracking-wider mt-1">Coletor Profissional de Dados v2.5</p>
          <p className="text-[#2497DE] text-[10px] font-bold uppercase tracking-wider mt-0.5">Caninana Auto Vidros</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-slate-500 text-[10px] font-bold mb-1 uppercase tracking-wider font-mono">Usuário</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <UserCheck size={16} />
              </span>
              <input
                id="username-input"
                type="text"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs focus:border-[#2497DE] focus:bg-white focus:outline-none placeholder-slate-400 transition"
                placeholder="Ex: admin, operador, consulta"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 text-[10px] font-bold mb-1 uppercase tracking-wider font-mono">Senha</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Key size={16} />
              </span>
              <input
                id="password-input"
                type="password"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs focus:border-[#2497DE] focus:bg-white focus:outline-none placeholder-slate-400 transition"
                placeholder="Digite a senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div id="login-error" className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs leading-relaxed">
              <AlertTriangle className="shrink-0 mt-0.5 text-red-500" size={15} />
              <span>{error}</span>
            </div>
          )}

          <button
            id="submit-login"
            type="submit"
            className="w-full bg-[#2497DE] hover:bg-[#1d7ebc] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-sm active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <Shield size={14} />
            Autenticar Dispositivo
          </button>
        </form>

        {/* Quick selection divider */}
        <div className="my-6 flex items-center justify-between text-slate-400 text-[9px] uppercase font-bold font-mono">
          <div className="h-px bg-slate-200 flex-grow mr-3"></div>
          <span>Acesso Rápido de Testes</span>
          <div className="h-px bg-slate-200 flex-grow ml-3"></div>
        </div>

        {/* Quick selection buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            id="quick-login-admin"
            onClick={() => handleQuickLogin('admin')}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2.5 px-1 rounded-xl text-xs font-medium text-center transition cursor-pointer hover:border-[#2497DE]/50 flex flex-col items-center justify-between min-h-[84px]"
          >
            <div className="font-bold text-amber-600 mb-1 text-[8px] uppercase font-mono">Admin</div>
            {renderQuickAvatar(adminUser)}
            <div className="text-[10px] text-slate-600 font-bold truncate max-w-full px-0.5">
              {adminUser ? adminUser.name.split(' ')[0] : 'Carlos'}
            </div>
          </button>
          <button
            id="quick-login-operator"
            onClick={() => handleQuickLogin('operador')}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2.5 px-1 rounded-xl text-xs font-medium text-center transition cursor-pointer hover:border-[#2497DE]/50 flex flex-col items-center justify-between min-h-[84px]"
          >
            <div className="font-bold text-[#2497DE] mb-1 text-[8px] uppercase font-mono">Operador</div>
            {renderQuickAvatar(operatorUser)}
            <div className="text-[10px] text-slate-600 font-bold truncate max-w-full px-0.5">
              {operatorUser ? operatorUser.name.split(' ')[0] : 'Thiago'}
            </div>
          </button>
          <button
            id="quick-login-query"
            onClick={() => handleQuickLogin('consulta')}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2.5 px-1 rounded-xl text-xs font-medium text-center transition cursor-pointer hover:border-[#2497DE]/50 flex flex-col items-center justify-between min-h-[84px]"
          >
            <div className="font-bold text-emerald-600 mb-1 text-[8px] uppercase font-mono">Consulta</div>
            {renderQuickAvatar(queryUser)}
            <div className="text-[10px] text-slate-600 font-bold truncate max-w-full px-0.5">
              {queryUser ? queryUser.name.split(' ')[0] : 'Juliana'}
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-slate-400 text-[9px] font-mono leading-relaxed uppercase">
          Caninana Auto Vidros Ltda © 2026<br />
          Sistema Offline-First Capable
        </div>
      </div>
    </div>
  );
}
