/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Mic, 
  MicOff, 
  Layers, 
  AlertTriangle, 
  CheckCircle, 
  Bookmark, 
  Info
} from 'lucide-react';
import { Product, User } from '../types';
import { playBeep, startVoiceSearch } from '../utils/audio';

interface QueryTabProps {
  products: Product[];
  user: User;
}

export default function QueryTab({ products, user }: QueryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const categories = [
    'Todos',
    'Vidros Dianteiros',
    'Vidros Traseiros',
    'Vidros Laterais',
    'Retrovisores',
    'Palhetas',
    'Acessórios e Colas'
  ];

  // Voice recognition trigger
  const handleVoiceSearch = () => {
    if (isListening) return;
    
    setIsListening(true);
    setVoiceError(null);
    playBeep('success');

    startVoiceSearch(
      (text) => {
        setSearchQuery(text);
        playBeep('success');
      },
      (err) => {
        setVoiceError(err);
        playBeep('error');
      },
      () => {
        setIsListening(false);
      }
    );
  };

  // Filter products based on search queries and category filters
  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.barcode.includes(searchQuery) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.application.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div id="query-tab-container" className="p-4 max-w-lg mx-auto pb-24 space-y-4 animate-fade-in">
      {/* Search Input Area */}
      <div className="space-y-2">
        <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono">Pesquisa de Produtos</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search size={18} />
            </span>
            <input
              id="query-text-search"
              type="text"
              placeholder="Código, descrição ou aplicação..."
              className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs focus:outline-none focus:border-[#2497DE] focus:ring-1 focus:ring-[#2497DE]/20 transition shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Voice Search Button */}
          <button
            id="voice-search-trigger"
            type="button"
            onClick={handleVoiceSearch}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition border cursor-pointer shrink-0 ${
              isListening 
                ? 'bg-red-50 border-red-300 text-red-600 animate-pulse' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-[#2497DE] shadow-sm'
            }`}
            title="Pesquisar por voz (Português)"
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        </div>
      </div>

      {/* Voice Status Alert */}
      {isListening && (
        <div id="voice-listening-indicator" className="bg-[#2497DE]/5 border border-[#2497DE]/10 p-2.5 rounded-xl flex items-center gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1 font-mono text-[10px] text-[#2497DE] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
            GRAVANDO VOZ:
          </div>
          <span className="font-sans text-xs">Diga o nome do produto (ex: "para-brisa onix")</span>
        </div>
      )}

      {voiceError && (
        <div id="voice-error-log" className="bg-red-50 border border-red-200 p-2.5 rounded-xl text-xs text-red-700 font-mono shadow-sm">
          ⚠️ {voiceError}
        </div>
      )}

      {/* READ-ONLY LICENSE BANNER FOR CONSULTA ROLE */}
      {user.role === 'Consulta' && (
        <div id="consulta-role-banner" className="bg-teal-50 border border-teal-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-teal-800 shadow-sm">
          <Info size={16} className="shrink-0 mt-0.5 text-teal-600" />
          <span>Seu perfil é de <strong>Consulta</strong>. Você tem acesso somente-leitura às informações, sem permissão para registrar movimentações ou inventários.</span>
        </div>
      )}

      {/* CATEGORY SELECTOR CAROUSEL (scrolling) */}
      <div className="space-y-1.5">
        <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider font-mono">Filtrar Categoria</label>
        <div id="category-filter-carousel" className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x">
          {categories.map((cat) => (
            <button
              key={cat}
              id={`cat-filter-btn-${cat.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => {
                setSelectedCategory(cat);
                playBeep('success');
              }}
              className={`snap-start shrink-0 px-3.5 py-1.5 rounded-full text-[10px] font-bold font-mono transition cursor-pointer border ${
                selectedCategory === cat 
                  ? 'bg-[#2497DE] border-[#2497DE] text-white shadow-sm' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 shadow-sm'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* PRODUCT LIST RESULTS */}
      <div id="query-results-panel" className="space-y-3">
        <div className="flex justify-between items-center text-slate-400 text-[10px] font-mono uppercase tracking-wider">
          <span>Resultados Encontrados</span>
          <span>{filteredProducts.length} itens</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-xl p-6 text-slate-400 text-xs font-mono shadow-sm">
            Nenhum vidro automotivo ou acessório encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {filteredProducts.map((p) => {
              const isLowStock = p.stock <= p.minStock;
              return (
                <div 
                  key={p.barcode}
                  id={`product-card-${p.barcode}`} 
                  className={`bg-white border rounded-xl p-4 space-y-3 relative overflow-hidden transition shadow-sm hover:shadow-md ${
                    isLowStock 
                      ? 'border-amber-300 border-l-4 border-l-amber-500' 
                      : 'border-slate-200/60'
                  }`}
                >
                  {/* Top line with category and stock status icon */}
                  <div className="flex justify-between items-start">
                    <span className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded-md font-mono uppercase font-bold">
                      {p.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isLowStock ? (
                        <span className="text-amber-700 flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                          <AlertTriangle size={10} />
                          Estoque Baixo
                        </span>
                      ) : (
                        <span className="text-green-700 flex items-center gap-1 text-[10px] font-bold font-mono uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                          <CheckCircle size={10} />
                          Estoque Seguro
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 leading-normal pr-4">{p.description}</h4>
                    <p className="text-[10px] text-slate-500 leading-normal flex items-start gap-1">
                      <Bookmark size={11} className="shrink-0 mt-0.5 text-[#2497DE]" />
                      <span>Aplicação: {p.application || 'Universal'}</span>
                    </p>
                  </div>

                  {/* Stock Levels & Barcode */}
                  <div className="flex items-end justify-between border-t border-slate-100 pt-2.5 text-xs">
                    <div>
                      <div className="text-[9px] text-slate-400 font-mono">CÓDIGO DE BARRAS</div>
                      <div className="text-xs font-bold text-slate-700 font-mono tracking-wider mt-0.5">{p.barcode}</div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-[9px] text-slate-400 font-mono">SALDO REAL</div>
                      <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
                        <span className={`text-base font-bold font-mono ${isLowStock ? 'text-red-600' : 'text-[#2497DE]'}`}>
                          {p.stock} un
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">/ mín: {p.minStock}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
