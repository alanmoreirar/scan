import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Camera, 
  Upload, 
  Trash2, 
  Users, 
  Check, 
  Plus, 
  Edit2, 
  X,
  Lock,
  UserCheck
} from 'lucide-react';
import { User } from '../types';
import { playBeep } from '../utils/audio';

interface ProfileTabProps {
  currentUser: User;
  users: (User & { passwordHash: string })[];
  onUpdateProfile: (updatedFields: Partial<User>) => void;
  onUpdateAnyUser: (username: string, updatedFields: Partial<User & { passwordHash?: string }>) => void;
  onAddUser?: (newUser: User & { passwordHash: string }) => void;
}

export default function ProfileTab({
  currentUser,
  users,
  onUpdateProfile,
  onUpdateAnyUser,
  onAddUser
}: ProfileTabProps) {
  // Mode: 'me' (My profile) or 'team' (Team members roster)
  const [activeSubTab, setActiveSubTab] = useState<'me' | 'team'>('me');
  
  // My Profile Form States
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileEmail, setProfileEmail] = useState(currentUser.email || '');
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatar || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Selected User to Edit (Admin only)
  const [editingUser, setEditingUser] = useState<(User & { passwordHash: string }) | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editRole, setEditRole] = useState<'Administrador' | 'Operador' | 'Consulta'>('Operador');
  const [editPassword, setEditPassword] = useState('');
  const [editDragActive, setEditDragActive] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // Add User Form States (Admin only)
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [newRole, setNewRole] = useState<'Administrador' | 'Operador' | 'Consulta'>('Operador');
  const [newPassword, setNewPassword] = useState('123');

  // Keep state in sync when current user changes
  useEffect(() => {
    setProfileName(currentUser.name);
    setProfileEmail(currentUser.email || '');
    setProfileAvatar(currentUser.avatar || '');
    setProfilePassword('');
    setSaveSuccess(false);
  }, [currentUser]);

  const avatarPresets = [
    'linear-gradient(135deg, #2497DE 0%, #1d7ebc 100%)', // Brand blue
    'linear-gradient(135deg, #10B981 0%, #059669 100%)', // Emerald
    'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', // Amber
    'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', // Violet
    'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)', // Pink
  ];

  const handleDrag = (e: React.DragEvent, type: 'me' | 'edit' | 'new') => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      if (type === 'me') setDragActive(true);
      if (type === 'edit') setEditDragActive(true);
    } else if (e.type === "dragleave") {
      if (type === 'me') setDragActive(false);
      if (type === 'edit') setEditDragActive(false);
    }
  };

  const processFile = (file: File, targetSetter: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, envie apenas arquivos de imagem.');
      return;
    }
    // Limit size to ~500kb to keep localStorage happy
    if (file.size > 500 * 1024) {
      alert('A imagem é muito grande. Escolha uma imagem de até 500 KB para economizar memória offline.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        targetSetter(e.target.result as string);
        playBeep('success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent, type: 'me' | 'edit' | 'new') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'me') {
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0], setProfileAvatar);
      }
    } else if (type === 'edit') {
      setEditDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0], setEditAvatar);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, targetSetter: (dataUrl: string) => void) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0], targetSetter);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      alert('O nome do operador não pode estar vazio.');
      return;
    }
    
    const fields: Partial<User & { passwordHash?: string }> = {
      name: profileName.trim(),
      email: profileEmail.trim(),
      avatar: profileAvatar,
    };

    if (profilePassword.trim()) {
      fields.passwordHash = profilePassword;
    }

    onUpdateProfile(fields);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleStartEditUser = (u: User & { passwordHash: string }) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email || '');
    setEditAvatar(u.avatar || '');
    setEditRole(u.role);
    setEditPassword(u.passwordHash);
    setEditSuccess(false);
  };

  const handleSaveEditedUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim()) {
      alert('O nome do operador não pode estar vazio.');
      return;
    }

    const fields: Partial<User & { passwordHash?: string }> = {
      name: editName.trim(),
      email: editEmail.trim(),
      avatar: editAvatar,
      role: editRole,
      passwordHash: editPassword,
    };

    onUpdateAnyUser(editingUser.username, fields);
    setEditSuccess(true);
    setTimeout(() => {
      setEditSuccess(false);
      setEditingUser(null);
    }, 1500);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim()) {
      alert('Preencha o nome e o nome de usuário.');
      return;
    }

    const usernameClean = newUsername.trim().toLowerCase().replace(/\s+/g, '');
    const exists = users.some((u) => u.username === usernameClean);
    if (exists) {
      alert('Este nome de usuário já está cadastrado.');
      return;
    }

    if (onAddUser) {
      onAddUser({
        username: usernameClean,
        name: newName.trim(),
        role: newRole,
        email: newEmail.trim(),
        avatar: newAvatar,
        passwordHash: newPassword || '123'
      });
      
      // Reset
      setIsAddingUser(false);
      setNewName('');
      setNewUsername('');
      setNewEmail('');
      setNewAvatar('');
      setNewRole('Operador');
      setNewPassword('123');
      playBeep('success');
    }
  };

  const renderAvatar = (avatar: string, name: string, sizeClass: string = "w-16 h-16", textClass: string = "text-xl") => {
    if (!avatar) {
      return (
        <div className={`${sizeClass} rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center font-black uppercase font-mono`}>
          {name ? name.substring(0, 2) : 'OP'}
        </div>
      );
    }
    if (avatar.startsWith('linear-gradient')) {
      return (
        <div 
          className={`${sizeClass} rounded-full border border-slate-200 text-white flex items-center justify-center font-black uppercase shadow-inner`}
          style={{ background: avatar }}
        >
          {name ? name.substring(0, 2) : 'OP'}
        </div>
      );
    }
    return (
      <img src={avatar} alt="Foto de perfil" className={`${sizeClass} rounded-full border border-slate-200 object-cover shadow-sm`} />
    );
  };

  return (
    <div id="profile-tab-container" className="p-4 max-w-lg mx-auto pb-24 space-y-4 animate-fade-in">
      
      {/* HEADER HERO CARD */}
      <div className="bg-gradient-to-r from-[#2497DE] to-[#1a7bb7] rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] opacity-10 pointer-events-none">
          <UserIcon size={140} />
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          {renderAvatar(currentUser.avatar || '', currentUser.name, "w-16 h-16 ring-4 ring-white/25")}
          <div>
            <h2 className="text-base font-black tracking-tight">{currentUser.name}</h2>
            <p className="text-[10px] font-mono uppercase bg-white/10 px-2 py-0.5 rounded-full inline-block mt-1 font-bold">
              @{currentUser.username} • {currentUser.role}
            </p>
            {currentUser.email && (
              <p className="text-xs text-blue-100 mt-1 flex items-center gap-1">
                <Mail size={12} />
                {currentUser.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SUB TAB SELECTOR */}
      <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-2 gap-1">
        <button
          onClick={() => {
            setActiveSubTab('me');
            setEditingUser(null);
            setIsAddingUser(false);
          }}
          className={`py-2 text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'me' 
              ? 'bg-white text-[#2497DE] shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Meu Perfil
        </button>
        <button
          onClick={() => {
            setActiveSubTab('team');
            setEditingUser(null);
            setIsAddingUser(false);
          }}
          className={`py-2 text-xs font-bold font-mono uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'team' 
              ? 'bg-white text-[#2497DE] shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={14} />
          Equipe ({users.length})
        </button>
      </div>

      {/* TAB SUB-PAGES */}
      {activeSubTab === 'me' ? (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Camera className="text-[#2497DE]" size={16} />
            <h3 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">Alterar Meus Dados</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Gallery Avatar Selector */}
            <div>
              <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-2 font-mono">
                Foto de Perfil (Galeria do Celular ou Câmera)
              </label>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Preview */}
                <div className="shrink-0 relative group">
                  {renderAvatar(profileAvatar, profileName, "w-20 h-20 ring-2 ring-slate-100")}
                  <button
                    type="button"
                    onClick={() => document.getElementById('my-gallery-input')?.click()}
                    className="absolute bottom-0 right-0 bg-[#2497DE] hover:bg-[#1d7ebc] text-white p-1.5 rounded-full shadow-md transition active:scale-95 cursor-pointer"
                    title="Carregar da galeria"
                  >
                    <Camera size={12} />
                  </button>
                </div>

                {/* Dropzone/Selector */}
                <div className="flex-1 w-full">
                  <div
                    onDragEnter={(e) => handleDrag(e, 'me')}
                    onDragOver={(e) => handleDrag(e, 'me')}
                    onDragLeave={(e) => handleDrag(e, 'me')}
                    onDrop={(e) => handleDrop(e, 'me')}
                    className={`border-2 border-dashed rounded-xl p-3 text-center transition-all cursor-pointer relative ${
                      dragActive 
                        ? 'border-[#2497DE] bg-[#2497DE]/5' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100/50'
                    }`}
                    onClick={() => document.getElementById('my-gallery-input')?.click()}
                  >
                    <input
                      id="my-gallery-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, setProfileAvatar)}
                    />
                    <Upload className="mx-auto text-slate-400 mb-1" size={16} />
                    <p className="text-[10px] font-medium text-slate-600">
                      Toque para abrir a <span className="text-[#2497DE] font-semibold">Galeria do Celular</span>
                    </p>
                    <p className="text-[8px] text-slate-400 font-mono mt-0.5 uppercase">Suporta PNG ou JPG (máx 500kb)</p>
                  </div>
                </div>
              </div>

              {/* Avatar Preset Colors */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase font-mono">Ou escolha uma cor:</span>
                  <div className="flex items-center gap-1">
                    {avatarPresets.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setProfileAvatar(preset);
                          playBeep('success');
                        }}
                        className="w-5 h-5 rounded-full cursor-pointer transition active:scale-90 hover:scale-105 border border-white shadow-sm shrink-0"
                        style={{ background: preset }}
                      />
                    ))}
                  </div>
                </div>

                {profileAvatar && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileAvatar('');
                      playBeep('warning');
                    }}
                    className="text-[10px] text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-red-50 transition cursor-pointer"
                  >
                    <X size={12} />
                    Remover Foto
                  </button>
                )}
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1 font-mono">
                  Nome do Operador
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <UserIcon size={12} />
                  </span>
                  <input
                    type="text"
                    placeholder="Ex: Alan Moreira"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-[#2497DE]"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1 font-mono">
                  E-mail de Trabalho
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail size={12} />
                  </span>
                  <input
                    type="email"
                    placeholder="Ex: alan@autovidros.com.br"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-[#2497DE]"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1 font-mono">
                  Alterar Senha de Acesso
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock size={12} />
                  </span>
                  <input
                    type="password"
                    placeholder="Deixe em branco para manter a atual"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-[#2497DE]"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                <span>Nível de Acesso:</span>
                <span className="font-bold uppercase text-[#2497DE]">{currentUser.role}</span>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                className={`py-2 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-sm flex items-center gap-1.5 cursor-pointer ${
                  saveSuccess 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                    : 'bg-[#2497DE] hover:bg-[#1d7ebc] text-white'
                }`}
              >
                {saveSuccess ? (
                  <>
                    <Check size={14} />
                    Perfil Atualizado!
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* TEAM ROSTER VIEW */
        <div className="space-y-4">
          
          {/* Admin panel to edit selected user */}
          {editingUser && (
            <div className="bg-slate-50 border-2 border-amber-500/30 rounded-xl p-4 space-y-4 shadow-md animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 text-amber-700">
                  <Edit2 size={15} />
                  <h4 className="text-xs font-bold uppercase font-mono">Editar Operador: @{editingUser.username}</h4>
                </div>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    playBeep('warning');
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditedUser} className="space-y-3">
                {/* Avatar Selection for Edit */}
                <div>
                  <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-1 font-mono">
                    Foto do Operador
                  </label>
                  <div className="flex items-center gap-3">
                    {renderAvatar(editAvatar, editName, "w-12 h-12")}
                    <div className="flex-1">
                      <div
                        onClick={() => document.getElementById('edit-gallery-input')?.click()}
                        className="border border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-1.5 text-center cursor-pointer text-[9px] font-medium text-slate-500 bg-white"
                      >
                        <input
                          id="edit-gallery-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, setEditAvatar)}
                        />
                        <span className="text-[#2497DE] font-semibold">Alterar Foto</span> (Celular/Galeria)
                      </div>
                    </div>
                  </div>
                  {/* Presets */}
                  <div className="flex items-center gap-1 mt-2">
                    {avatarPresets.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setEditAvatar(preset)}
                        className="w-4 h-4 rounded-full border border-white shadow-xs"
                        style={{ background: preset }}
                      />
                    ))}
                    {editAvatar && (
                      <button
                        type="button"
                        onClick={() => setEditAvatar('')}
                        className="text-[9px] text-red-500 font-semibold ml-2"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                {/* Info Inputs */}
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider font-mono">Nome</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg p-2 text-xs"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider font-mono">E-mail</label>
                    <input
                      type="email"
                      className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg p-2 text-xs"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider font-mono">Senha</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg p-2 text-xs font-mono"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Senha de Login"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider font-mono">Nível</label>
                      <select
                        className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg p-2 text-xs focus:outline-none"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as any)}
                      >
                        <option value="Administrador">Administrador</option>
                        <option value="Operador">Operador</option>
                        <option value="Consulta">Consulta</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <Check size={12} />
                    Salvar Operador
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Add User panel */}
          {isAddingUser && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 text-[#2497DE]">
                  <Plus size={16} />
                  <h4 className="text-xs font-bold uppercase font-mono tracking-wider">Novo Operador</h4>
                </div>
                <button
                  onClick={() => setIsAddingUser(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider font-mono">Nome de Usuário</label>
                    <input
                      type="text"
                      placeholder="Ex: alan"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 text-xs font-mono"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider font-mono">Senha Inicial</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 text-xs font-mono"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider font-mono">Nome Completo</label>
                    <input
                      type="text"
                      placeholder="Ex: Alan Moreira"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 text-xs"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider font-mono">E-mail</label>
                    <input
                      type="email"
                      placeholder="Ex: alan@autovidros.com.br"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 text-xs"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider font-mono">Nível de Acesso</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 text-xs focus:outline-none"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                    >
                      <option value="Administrador">Administrador</option>
                      <option value="Operador">Operador</option>
                      <option value="Consulta">Consulta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[9px] uppercase font-bold tracking-wider font-mono">Cor de Avatar</label>
                    <div className="flex items-center gap-1 h-9">
                      {avatarPresets.map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setNewAvatar(preset)}
                          className={`w-5 h-5 rounded-full border-2 ${newAvatar === preset ? 'border-[#2497DE]' : 'border-white'} shadow-sm`}
                          style={{ background: preset }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-4 bg-[#2497DE] hover:bg-[#1d7ebc] text-white rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} />
                    Adicionar Operador
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users List */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="text-[#2497DE]" size={16} />
                <h3 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">Membros da Equipe</h3>
              </div>

              {/* Add User button available only for Admins */}
              {currentUser.role === 'Administrador' && onAddUser && !isAddingUser && (
                <button
                  onClick={() => {
                    setIsAddingUser(true);
                    setEditingUser(null);
                    playBeep('success');
                  }}
                  className="py-1 px-2.5 bg-slate-50 hover:bg-[#2497DE]/10 border border-slate-200 hover:border-[#2497DE]/40 rounded-lg font-bold text-[9px] uppercase tracking-wider font-mono text-[#2497DE] transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={10} />
                  Novo Operador
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {users.map((u) => {
                const isMe = u.username === currentUser.username;
                const isAdmin = currentUser.role === 'Administrador';
                
                return (
                  <div key={u.username} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {renderAvatar(u.avatar || '', u.name, "w-10 h-10 ring-1 ring-slate-100")}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800 truncate">{u.name}</span>
                          {isMe && (
                            <span className="bg-blue-50 text-[#2497DE] border border-blue-100 text-[8px] font-bold uppercase tracking-wider font-mono px-1 rounded-sm">
                              Você
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          @{u.username} • <span className={`font-semibold ${
                            u.role === 'Administrador' ? 'text-amber-600' : u.role === 'Operador' ? 'text-blue-500' : 'text-emerald-600'
                          }`}>{u.role}</span>
                        </p>
                      </div>
                    </div>

                    {/* Admin Action: Edit User */}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          handleStartEditUser(u);
                          playBeep('success');
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-50 border border-slate-100 rounded-lg hover:border-amber-200 transition cursor-pointer"
                        title="Editar operador"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
