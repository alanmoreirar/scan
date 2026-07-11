/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Scan, 
  Settings2, 
  ArrowRightLeft, 
  Plus, 
  Minus, 
  Check, 
  AlertCircle, 
  Camera, 
  HelpCircle, 
  MapPin, 
  Sparkles, 
  UserPlus 
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Product, Movement, InventoryItem, User } from '../types';
import { playBeep } from '../utils/audio';

interface ScannerTabProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onAddMovement: (movement: Movement) => void;
  onAddInventoryItem: (item: InventoryItem) => void;
  user: User;
  onCustomScan?: (text: string) => boolean;
  getApiUrl?: (path: string) => string;
}

export default function ScannerTab({ products, onAddProduct, onAddMovement, onAddInventoryItem, user, onCustomScan, getApiUrl }: ScannerTabProps) {
  const [scanMode, setScanMode] = useState<'Entrada' | 'Saída' | 'Transferência' | 'Inventário'>('Inventário');
  const [isContinuous, setIsContinuous] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [originLocation, setOriginLocation] = useState('Geral');
  const [destinationLocation, setDestinationLocation] = useState('Prateleira A');
  const [flashOn, setFlashOn] = useState(false);

  // Camera scanner states
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  
  // Scanned item modal/form states
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  
  // New Product Creator Dialog states
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Vidros Dianteiros');
  const [newApplication, setNewApplication] = useState('');
  const [newMinStock, setNewMinStock] = useState(3);
  const [aiLoading, setAiLoading] = useState(false);

  // Animation visual feedback
  const [flashSuccess, setFlashSuccess] = useState(false);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'html5-qrcode-scanner-viewport';

  // Toggle Camera
  const toggleCamera = async () => {
    if (scannerActive) {
      await stopCamera();
    } else {
      await startCamera();
    }
  };

  const startCamera = async () => {
    setScannerError(null);
    try {
      setScannerActive(true);
      const html5Qrcode = new Html5Qrcode(scannerId);
      html5QrcodeRef.current = html5Qrcode;

      const qrCodeSuccessCallback = (decodedText: string, decodedResult: any) => {
        handleBarcodeScanned(decodedText);
      };

      const config = { 
        fps: 25, 
        qrbox: (width: number, height: number) => {
          // Square scan area for perfect QR Code and barcode capture
          const size = Math.floor(Math.min(width, height) * 0.75);
          return {
            width: size,
            height: size
          };
        },
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      // Try back camera first
      await html5Qrcode.start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        undefined
      );
    } catch (err: any) {
      console.error("Camera start failed:", err);
      setScannerError("Câmera não disponível ou permissão negada. Use o Simulador de Código de Barras abaixo.");
      setScannerActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (err) {
        console.error("Stop failed:", err);
      }
    }
    html5QrcodeRef.current = null;
    setScannerActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current) {
        stopCamera();
      }
    };
  }, []);

  // Handle successful barcode scan (Real or Simulated)
  const handleBarcodeScanned = (barcode: string) => {
    const code = barcode.trim();
    if (!code) return;

    // Check for custom scans (e.g. spreadsheet configuration link)
    if (onCustomScan && onCustomScan(code)) {
      return;
    }

    // Beep & flash UI
    setFlashSuccess(true);
    setTimeout(() => setFlashSuccess(false), 300);

    const product = products.find((p) => p.barcode === code);

    if (isContinuous) {
      // In Continuous scan, register instantly
      playBeep('success');
      if (product) {
        commitScan(code, product, 1);
      } else {
        // Unknown product: force open product creator so they can register it,
        // since we cannot guess description without user input or AI
        playBeep('warning');
        setScannedBarcode(code);
        setMatchedProduct(null);
        setNewDescription('');
        setNewApplication('');
        setIsCreatingProduct(true);
      }
    } else {
      // Manual mode: open edit form/modal
      playBeep('success');
      setScannedBarcode(code);
      setMatchedProduct(product || null);
      setQuantity(1);
      if (!product) {
        // Prepare product creation fields
        setNewDescription('');
        setNewApplication('');
      }
    }
  };

  // Commit scan result into movements or inventory
  const commitScan = (code: string, product: Product | null, qty: number) => {
    const timestamp = new Date().toISOString();

    if (scanMode === 'Inventário') {
      onAddInventoryItem({
        barcode: code,
        description: product ? product.description : 'Produto Novo',
        countedQuantity: qty,
        date: timestamp,
        user: user.username,
        synced: false,
      });
    } else {
      onAddMovement({
        id: 'mov_' + Math.random().toString(36).substr(2, 9),
        barcode: code,
        type: scanMode === 'Transferência' ? 'Transferência' : (scanMode as any),
        quantity: qty,
        originLocation: scanMode === 'Transferência' ? originLocation : undefined,
        destinationLocation: scanMode === 'Transferência' || scanMode === 'Entrada' ? destinationLocation : undefined,
        date: timestamp,
        user: user.username,
        synced: false,
      });
    }

    // Reset scan wizard
    setScannedBarcode(null);
    setMatchedProduct(null);
  };

  // AI-powered product builder
  const handleAiSuggest = async () => {
    if (!scannedBarcode || aiLoading) return;
    setAiLoading(true);
    playBeep('success');

    try {
      const response = await fetch(getApiUrl ? getApiUrl('/api/gemini/suggest-product') : '/api/gemini/suggest-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: scannedBarcode,
          descriptionHint: newDescription,
        }),
      });

      const data = await response.json();
      if (response.ok && data.description) {
        setNewDescription(data.description);
        setNewCategory(data.category);
        setNewApplication(data.application);
        playBeep('success');
      } else {
        throw new Error(data.error || 'Erro na sugestão de dados');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro na IA: ${err.message || 'Verifique a chave do Gemini'}. Sugerindo valores padrão.`);
      setNewDescription(`Para-brisa Dianteiro Importado Cód: ${scannedBarcode}`);
      setNewCategory('Vidros Dianteiros');
      setNewApplication('Veículo Compatível');
      playBeep('error');
    } finally {
      setAiLoading(false);
    }
  };

  // Save new product and then commit the scan movement
  const handleSaveAndCommitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedBarcode) return;

    const newProd: Product = {
      barcode: scannedBarcode,
      description: newDescription || `Produto Novo EAN ${scannedBarcode}`,
      category: newCategory,
      application: newApplication || 'Aplicação Universal',
      stock: 0, // Starts at zero, then stock is updated by the commit movement
      minStock: Number(newMinStock) || 3,
    };

    onAddProduct(newProd);
    commitScan(scannedBarcode, newProd, quantity);
    setIsCreatingProduct(false);
    setScannedBarcode(null);
  };

  return (
    <div id="scanner-tab-container" className="p-4 max-w-lg mx-auto pb-24 space-y-4">
      
      {/* MODE SELECTOR */}
      <div id="mode-selector" className="bg-slate-100 p-1 rounded-xl border border-slate-200 grid grid-cols-4 gap-1">
        {(['Entrada', 'Saída', 'Transferência', 'Inventário'] as const).map((mode) => (
          <button
            key={mode}
            id={`mode-btn-${mode.toLowerCase()}`}
            onClick={() => {
              setScanMode(mode);
            }}
            className={`py-2 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono text-center cursor-pointer transition-all ${
              scanMode === mode 
                ? 'bg-[#2497DE] text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {mode === 'Entrada' && 'Entrada'}
            {mode === 'Saída' && 'Saída'}
            {mode === 'Transferência' && 'Transf.'}
            {mode === 'Inventário' && 'Invent.'}
          </button>
        ))}
      </div>

      {/* CONTINUOUS READING AND SCANNING SETUP */}
      <div className="flex items-center justify-between bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-[#2497DE]" />
          <div>
            <div className="text-xs font-bold text-slate-800 uppercase font-mono">Leitura Contínua</div>
            <div className="text-[10px] text-slate-400">Auto-salva coletas em lote</div>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            id="continuous-scan-toggle"
            type="checkbox"
            className="sr-only peer"
            checked={isContinuous}
            onChange={(e) => {
              setIsContinuous(e.target.checked);
            }}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2497DE]"></div>
        </label>
      </div>

      {/* CORE CAMERA VIEWPORT PANELS - Square Aspect for QR Codes */}
      <div 
        id="camera-panel-wrapper" 
        className={`relative aspect-square w-full max-w-sm mx-auto rounded-3xl overflow-hidden border transition ${
          flashSuccess ? 'border-green-500 scale-101' : 'border-slate-200'
        } bg-slate-950 flex flex-col items-center justify-center`}
      >
        {/* Professional Square QR Code Aiming Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="w-64 h-64 border border-[#2497DE]/20 relative flex items-center justify-center bg-black/5">
            {/* Scanning line laser */}
            <div className="w-full h-0.5 bg-cyan-400 scanner-laser absolute shadow-[0_0_8px_#22d3ee]"></div>
            
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#2497DE] rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#2497DE] rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#2497DE] rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#2497DE] rounded-br-lg"></div>
          </div>
        </div>

        {/* HTML5 QRCODE CONTAINER ELEMENT */}
        <div 
          id={scannerId} 
          className="w-full h-full object-cover"
          style={{ display: scannerActive ? 'block' : 'none' }}
        ></div>

        {/* Idle display overlay */}
        {!scannerActive && (
          <div className="text-center p-6 space-y-3 z-10">
            <div className="w-12 h-12 bg-zinc-850/80 border border-zinc-750 rounded-full flex items-center justify-center mx-auto text-zinc-300">
              <Camera size={22} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Scanner da Câmera Desativado</div>
              <p className="text-[10px] text-slate-400 max-w-xs mt-1 leading-normal">Instale ou inicie a câmera para leituras em lote profissionais pela lente do celular.</p>
            </div>
            <button
              id="activate-camera-btn"
              onClick={toggleCamera}
              className="bg-[#2497DE] hover:bg-[#1d7ebc] text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Scan size={14} />
              ATIVAR CÂMERA SCANNER
            </button>
          </div>
        )}

        {scannerActive && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800 flex items-center gap-2 z-20">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-widest">Câmera Ativa</span>
            <button 
              onClick={stopCamera} 
              className="text-red-400 hover:text-red-300 text-[9px] uppercase font-bold ml-2 cursor-pointer font-mono"
            >
              Parar
            </button>
          </div>
        )}
      </div>

      {scannerError && (
        <div id="scanner-error-log" className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5 text-xs text-amber-700 leading-normal shadow-sm">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
          <span>{scannerError}</span>
        </div>
      )}

      {/* RUGGED SIMULATOR FOR DESKTOP AND SANDBOX TESTING (Foolproof integration) */}
      <div id="barcode-simulator-panel" className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#2497DE]/10 text-[#2497DE] flex items-center justify-center font-bold text-[10px]">SIM</div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Simulador de Coletores</h4>
          </div>
          <span className="text-[9px] text-slate-400 font-mono">Útil para testar no computador</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1 font-mono">Escolha um item de teste:</label>
            <select
              id="simulator-product-select"
              onChange={(e) => {
                if (e.target.value) {
                  handleBarcodeScanned(e.target.value);
                  e.target.value = ''; // Reset select
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#2497DE] font-mono transition"
            >
              <option value="">-- Selecione para simular "beep" --</option>
              {products.map((p) => (
                <option key={p.barcode} value={p.barcode}>
                  [{p.stock} un] {p.description.substring(0, 32)}...
                </option>
              ))}
              <option value="7890000000000">Novo Código de Barras (Desconhecido - 789000...)</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleBarcodeScanned('https://docs.google.com/spreadsheets/d/1hpSmTKNZPfvopm_ZayB3KXibNF2CFLwnpqG-OC8WFvg/edit?usp=sharing')}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#2497DE] py-1.5 px-1 rounded-lg text-[9px] font-mono font-bold transition cursor-pointer"
            >
              Simular QR Planilha
            </button>
            <button
              onClick={() => handleBarcodeScanned('1973')}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-1.5 px-1 rounded-lg text-[9px] font-mono font-bold transition cursor-pointer"
            >
              Simular QR Uno '1973'
            </button>
            <button
              onClick={() => handleBarcodeScanned('7890000000000')}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-amber-600 py-1.5 px-1 rounded-lg text-[9px] font-mono font-bold transition cursor-pointer"
            >
              Simular QR Novo
            </button>
          </div>

          {/* ONLINE QR CODES VIEW */}
          <div className="mt-4 pt-4 border-t border-slate-150 space-y-2">
            <div className="text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider">QR Codes para testar no Chrome (Celular p/ Tela):</div>
            <div className="flex gap-4 items-center justify-center bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-center">
                <img src="/qr_code_sheet.jpg" alt="QR Code Planilha" className="w-20 h-20 mx-auto border border-slate-200 rounded-md" />
                <div className="text-[8px] text-slate-500 font-mono mt-1">1. Vincular Planilha</div>
              </div>
              <div className="text-center">
                <img src="/qr_code_1973.jpg" alt="QR Code Uno" className="w-20 h-20 mx-auto border border-slate-200 rounded-md" />
                <div className="text-[8px] text-slate-500 font-mono mt-1">2. Bipar Uno '1973'</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC FORM MODALS BASED ON READ BARCODES */}

      {/* 1. Manual scan verification dialogue (when isContinuous is false) */}
      {!isContinuous && scannedBarcode && !matchedProduct && !isCreatingProduct && (
        <div id="unknown-item-panel" className="bg-white border border-amber-500/30 rounded-xl p-4 space-y-3 animate-fade-in shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-bold text-slate-800">Código não encontrado no sistema</h4>
              <p className="text-xs text-slate-500 mt-0.5">O código de barras <strong className="text-amber-600 font-mono">{scannedBarcode}</strong> não corresponde a nenhum item cadastrado.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              id="start-create-product-btn"
              onClick={() => {
                setIsCreatingProduct(true);
                setNewDescription('');
                setNewApplication('');
                setNewCategory('Vidros Dianteiros');
              }}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
            >
              <UserPlus size={14} />
              CADASTRAR PRODUTO NOVO
            </button>
            <button
              id="cancel-scan-btn"
              onClick={() => setScannedBarcode(null)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 text-xs py-2.5 px-4 rounded-xl transition cursor-pointer"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* 2. Manual Scanned Confirmation Form (for existing items, isContinuous = false) */}
      {!isContinuous && scannedBarcode && matchedProduct && (
        <div id="manual-commit-panel" className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 animate-fade-in shadow-md border-l-4 border-l-[#2497DE]">
          <div className="border-b border-slate-100 pb-2.5">
            <span className="bg-[#2497DE]/10 text-[#2497DE] font-bold font-mono text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider">Leitura Manual</span>
            <h4 className="text-sm font-bold text-slate-800 mt-1.5">{matchedProduct.description}</h4>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
              <span>Cód: {scannedBarcode}</span>
              <span>Estoque Atual: <strong className="text-slate-800 font-bold font-mono">{matchedProduct.stock} un</strong></span>
            </div>
          </div>

          {/* TRANSFER OPTIONS */}
          {scanMode === 'Transferência' && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1 font-mono">Origem</label>
                <div className="relative">
                  <MapPin size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <select
                    value={originLocation}
                    onChange={(e) => setOriginLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-7 pr-2 text-slate-750 focus:outline-none focus:border-[#2497DE]"
                  >
                    <option value="Geral">Geral</option>
                    <option value="Prateleira A">Prateleira A</option>
                    <option value="Prateleira B">Prateleira B</option>
                    <option value="Carro de Serviço">Serviço Móvel</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1 font-mono">Destino</label>
                <div className="relative">
                  <MapPin size={12} className="absolute left-2.5 top-2.5 text-[#2497DE]" />
                  <select
                    value={destinationLocation}
                    onChange={(e) => setDestinationLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-7 pr-2 text-slate-750 focus:outline-none focus:border-[#2497DE]"
                  >
                    <option value="Prateleira A">Prateleira A</option>
                    <option value="Prateleira B">Prateleira B</option>
                    <option value="Prateleira C">Prateleira C</option>
                    <option value="Carro de Serviço">Serviço Móvel</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* QUANTITY CONTROL CHANGER */}
          <div className="space-y-1.5">
            <label className="block text-slate-400 text-[10px] uppercase font-bold font-mono">Quantidade para {scanMode}</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setQuantity((q) => Math.max(1, q - 1));
                }}
                className="w-12 h-12 bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl flex items-center justify-center font-bold text-lg cursor-pointer active:bg-slate-100"
              >
                <Minus size={16} />
              </button>
              <input
                id="quantity-picker"
                type="number"
                className="flex-1 h-12 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-center text-lg font-mono font-bold focus:outline-none focus:border-[#2497DE]"
                value={quantity}
                min={1}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <button
                type="button"
                onClick={() => {
                  setQuantity((q) => q + 1);
                }}
                className="w-12 h-12 bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl flex items-center justify-center font-bold text-lg cursor-pointer active:bg-slate-100"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* CONFIRM / CANCEL */}
          <div className="flex gap-2">
            <button
              id="confirm-manual-commit-btn"
              onClick={() => {
                commitScan(scannedBarcode, matchedProduct, quantity);
                playBeep('success');
              }}
              className="flex-1 bg-[#2497DE] hover:bg-[#1d7ebc] text-white text-xs font-bold py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
            >
              <Check size={16} />
              REGISTRAR {scanMode.toUpperCase()}
            </button>
            <button
              onClick={() => setScannedBarcode(null)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 text-xs py-3 px-4 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* 3. New Product Creator Drawer / Dialog */}
      {isCreatingProduct && scannedBarcode && (
        <form onSubmit={handleSaveAndCommitProduct} id="new-product-form" className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 animate-fade-in shadow-md border-t-4 border-t-amber-500">
          <div className="border-b border-slate-100 pb-2.5 flex justify-between items-start">
            <div>
              <span className="bg-amber-500/10 text-amber-600 font-bold font-mono text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider">Cadastro Rápido</span>
              <h4 className="text-sm font-bold text-slate-800 mt-1.5 font-sans">Novo Produto Caninana</h4>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">EAN: {scannedBarcode}</p>
            </div>
            <button
              type="button"
              id="ai-suggest-fields-btn"
              onClick={handleAiSuggest}
              disabled={aiLoading}
              className="bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 text-[9px] font-bold py-1.5 px-2.5 rounded-lg transition cursor-pointer flex items-center gap-1 uppercase tracking-wider font-mono disabled:opacity-50 shadow-sm"
            >
              <Sparkles size={12} className={aiLoading ? 'animate-spin' : ''} />
              {aiLoading ? 'IA Pensando...' : 'Sugerir com IA'}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">Descrição Técnica (Modelo/Ano/Detalhes)</label>
              <input
                id="new-product-desc"
                type="text"
                required
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#2497DE] focus:bg-white transition"
                placeholder="Ex: Para-brisa Onix 2015 Verde Térmico"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">Categoria</label>
                <select
                  id="new-product-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-705 rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#2497DE] focus:bg-white transition"
                >
                  <option value="Vidros Dianteiros">Vidros Dianteiros</option>
                  <option value="Vidros Traseiros">Vidros Traseiros</option>
                  <option value="Vidros Laterais">Vidros Laterais</option>
                  <option value="Retrovisores">Retrovisores</option>
                  <option value="Palhetas">Palhetas</option>
                  <option value="Acessórios e Colas">Acessórios e Colas</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">Estoque Mínimo</label>
                <input
                  id="new-product-min-stock"
                  type="number"
                  required
                  min={1}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#2497DE] focus:bg-white transition font-mono"
                  value={newMinStock}
                  onChange={(e) => setNewMinStock(parseInt(e.target.value) || 3)}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">Veículos & Anos Aplicáveis</label>
              <input
                id="new-product-app"
                type="text"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#2497DE] focus:bg-white transition"
                placeholder="Ex: Chevrolet Onix Hatch (2013-2019)"
                value={newApplication}
                onChange={(e) => setNewApplication(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 font-mono">Quantidade Inicial para {scanMode}</label>
              <input
                id="new-product-initial-qty"
                type="number"
                min={1}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#2497DE] focus:bg-white transition font-mono font-bold"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              id="save-new-product-btn"
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-sm active:scale-98"
            >
              <Check size={14} />
              CADASTRAR E LANÇAR {scanMode.toUpperCase()}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingProduct(false);
                setScannedBarcode(null);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 text-xs py-3 px-4 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* RUGGED COLLECTOR LOGO / DETAILS */}
      <div className="text-center text-slate-400 text-[10px] font-mono uppercase pt-4 leading-relaxed">
        Modo de Leitura: {scanMode === 'Inventário' ? 'Contagem Acumulada' : 'Ajuste Imediato'}<br />
        Dispositivo: Android / iOS Scanner Core v2.5
      </div>
    </div>
  );
}
