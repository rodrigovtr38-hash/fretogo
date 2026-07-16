// =========================================================
// NOME DO ARQUIVO: src/pages/Cliente.tsx (PAINEL DO EMBARCADOR / B2B)
// CTO-Log: Refatoração Sprint 2 - Transição de B2C (Push) para B2B Marketplace (Pull).
// CTO-Log 2: Injeção de Input de "Valor da Oferta Livre". Cálculo de Split Dinâmico automatizado.
// CTO-Log 3: Restauração da Engine Original de Precificação (ANTT, MOPP, Pedágio) como âncora/sugestão.
// CTO-Log 4: Injeção da Fase 2 (Gamificação de Oferta, Contraste UI, Central da Carga Viva).
// CTO-Log 5: Auditoria Financeira Concluída. Split 20% (Leves) e 15% (Pesados) confirmado. PIN ativado.
// =========================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore'; 
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ArrowLeft, Zap, Truck, Loader2, CheckCircle, MapPin, AlertTriangle, ShieldCheck, XCircle, MessageCircle, Building2, User, Package, CalendarDays, Plus, Trash2, Flame, DollarSign, Activity, Eye, Users, HeadphonesIcon, RefreshCw, Lock } from 'lucide-react';
import MapaCliente from '../components/MapaCliente';
import ChatFrete from '../components/ChatFrete';
import ClientStatusCard from '../components/client/ClientStatusCard';
import ClientCancelModal from '../components/client/ClientCancelModal';

import { AppTripState as TripState } from '../state/tripStateMachine'; 
import { mapsLoader } from '../services/mapsLoader'; 
import { NotificationService } from '../services/notificationService'; 

interface AddressData { cep: string; bairro: string; rua: string; num: string; lat?: number; lng?: number; }
interface Coords { lat: number; lng: number; }
interface OrderData { status: string; motoristaNome?: string; motoristaZap?: string; rotaInteligente?: boolean; motoristaId?: string; veiculo?: string; distancia?: number; valorTotal?: number; origemLat?: number; origemLng?: number; destinoLat?: number; destinoLng?: number; paradas?: any[]; pinColeta?: string; pinEntregas?: string[]; multiplasEntregas?: boolean; paradaAtualIndex?: number; pagamentoStatus?: string; createdAt?: any; valorFreteBruto?: number; }
type VehicleType = 'moto' | 'carro_pequeno' | 'utilitario' | 'toco' | 'truck' | 'carreta_ls' | 'bi_trem_cegonha';

const VEHICLE_CONFIG: Record<VehicleType, { nome: string; fator: number }> = {
  moto: { nome: 'Moto', fator: 0.6 }, 
  carro_pequeno: { nome: 'Carro Pequeno', fator: 1.0 },
  utilitario: { nome: 'Utilitário', fator: 1.6 }, 
  toco: { nome: 'Caminhão Toco', fator: 2.9 },
  truck: { nome: 'Caminhão Truck', fator: 3.8 }, 
  carreta_ls: { nome: 'Carreta LS', fator: 5.5 },
  bi_trem_cegonha: { nome: 'Bi-trem / Cegonha', fator: 7.2 },
};
const LIMITES_PESO: Record<VehicleType, number> = { moto: 30, carro_pequeno: 250, utilitario: 800, toco: 4000, truck: 12000, carreta_ls: 30000, bi_trem_cegonha: 45000 };

const getFallbackCoordsByCEP = (cep: string): Coords => {
  const prefix = parseInt(cep.replace(/\D/g, '').substring(0, 1) || '0', 10);
  const regions: Record<number, Coords> = {
    0: { lat: -23.5505, lng: -46.6333 }, 1: { lat: -22.9056, lng: -47.0608 }, 2: { lat: -22.9068, lng: -43.1729 },
    3: { lat: -19.9167, lng: -43.9345 }, 4: { lat: -12.9714, lng: -38.5014 }, 5: { lat: -8.0476, lng: -34.877 },
    6: { lat: -3.7319, lng: -38.5267 }, 7: { lat: -15.7975, lng: -47.8919 }, 8: { lat: -25.4284, lng: -49.2733 }, 9: { lat: -30.0346, lng: -51.2177 },
  };
  return regions[prefix] || regions[0];
};

const callWithRetryAndTimeout = async <T,>(callableName: string, payload: unknown, maxRetries = 2, timeoutMs = 8000): Promise<T> => {
  const functions = getFunctions();
  const fn = httpsCallable(functions, callableName);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_API')), timeoutMs));
      const result = (await Promise.race([fn(payload), timeoutPromise])) as { data: T };
      if (!result || typeof result.data === 'undefined') throw new Error('INVALID_API_RESPONSE');
      return result.data;
    } catch (error) { if (attempt === maxRetries) throw error; }
  }
  throw new Error('MAX_RETRIES_EXCEEDED');
};

export default function Cliente() {
  const [step, setStep] = useState<'form' | 'preview' | 'busca'>('form');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' | 'warning'; } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [documento, setDocumento] = useState('');
  const [coleta, setColeta] = useState<AddressData>({ cep: '', bairro: '', rua: '', num: '' });
  const [entregas, setEntregas] = useState<AddressData[]>([{ cep: '', bairro: '', rua: '', num: '' }]);
  const [peso, setPeso] = useState('');
  const [qtdVolumes, setQtdVolumes] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('');
  const [vehicle, setVehicle] = useState<VehicleType>('carreta_ls');
  const [tipoFrete, setTipoFrete] = useState<'imediato' | 'agendado'>('imediato');
  const [dataAgendada, setDataAgendada] = useState('');
  
  const [valorOferta, setValorOferta] = useState('');

  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [distanciaReal, setDistanciaReal] = useState(0);
  
  // Simuladores de Eventos (Startup Feel da Central da Carga)
  const [simViews, setSimViews] = useState(0);
  const [simCompat, setSimCompat] = useState(0);
  const [simInterest, setSimInterest] = useState(0);
  
  const [origemGPS, setOrigemGPS] = useState<Coords | null>(null);
  const [destinoGPS, setDestinoGPS] = useState<Coords | null>(null);
  const [paradasGPS, setParadasGPS] = useState<Coords[]>([]);
  const [mapsReady, setMapsReady] = useState(false); 

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const coordsCache = useRef<Record<string, Coords>>({});
  const isProcessingPayment = useRef(false);

  useEffect(() => {
    mapsLoader.load().then(() => setMapsReady(true)).catch(console.error);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const validDistancia = useMemo(() => Number.isNaN(distanciaReal) || distanciaReal <= 0 ? (5 * entregas.length) : distanciaReal, [distanciaReal, entregas.length]);

  // 🔥 RESTAURAÇÃO DO MOTOR DE CÁLCULO ORIGINAL COMO ÂNCORA/SUGESTÃO
  const calculoFinanceiro = useMemo(() => {
    const isHeavy = ['toco', 'truck', 'carreta_ls', 'bi_trem_cegonha'].includes(vehicle);
    const isMOPP = tipoMaterial.toLowerCase().includes('mopp') || 
                   tipoMaterial.toLowerCase().includes('quimic') || 
                   tipoMaterial.toLowerCase().includes('perigo');

    let valorMotoristaBase = 0;

    switch (vehicle) {
      case 'moto': valorMotoristaBase = validDistancia <= 15 ? 30 : 30 + (validDistancia - 15) * 2; break;
      case 'carro_pequeno': valorMotoristaBase = validDistancia <= 15 ? 100 : 100 + (validDistancia - 15) * 4; break;
      case 'utilitario': valorMotoristaBase = validDistancia <= 15 ? 180 : 180 + (validDistancia - 15) * 6; break;
      case 'toco': valorMotoristaBase = validDistancia <= 15 ? 350 : 350 + (validDistancia - 15) * 7; break;
      case 'truck': valorMotoristaBase = validDistancia <= 15 ? 550 : 550 + (validDistancia - 15) * 8.5; break;
      case 'carreta_ls': valorMotoristaBase = Math.max(1200, validDistancia * 10.5); break;
      case 'bi_trem_cegonha': valorMotoristaBase = Math.max(1800, validDistancia * 12.5); break;
      default: valorMotoristaBase = 100;
    }

    const custoParadasExtras = Math.max(0, entregas.length - 1) * (isHeavy ? 150.0 : 8.0);
    let valorLiquidoMotorista = valorMotoristaBase + custoParadasExtras;

    if (isMOPP) valorLiquidoMotorista *= 1.20;

    const divisorMargem = isHeavy ? 0.85 : 0.80;
    const precoFinalClienteCalculado = valorLiquidoMotorista / divisorMargem;
    
    const precisaPedagio = validDistancia > 40 && ['utilitario', 'toco', 'truck', 'carreta_ls', 'bi_trem_cegonha'].includes(vehicle);
    const valorPedagioCalculado = precisaPedagio ? validDistancia * (isHeavy ? 0.85 : 0.35) : 0;

    return {
      precoFinalCliente: Math.round(precoFinalClienteCalculado),
      tollCost: Number(valorPedagioCalculado.toFixed(2))
    };
  }, [validDistancia, vehicle, entregas.length, tipoMaterial]);

  const valorSugeridoCalculado = calculoFinanceiro.precoFinalCliente + calculoFinanceiro.tollCost;
  
  // Lógica de Inteligência Visual (Gamificação)
  const valorOfertaNum = Number(valorOferta.replace(/\./g, '').replace(',', '.')) || 0;
  const isOfertaBoa = valorOfertaNum >= valorSugeridoCalculado;
  const isOfertaValida = valorOfertaNum > 0;

  const pesoValido = useMemo(() => {
    const pesoNum = parseInt(peso.replace(/\D/g, ''), 10);
    return Number.isNaN(pesoNum) || pesoNum <= LIMITES_PESO[vehicle];
  }, [peso, vehicle]);

  const isFormValid = nome.trim() !== '' && whatsapp.length >= 10 && documento.replace(/\D/g, '').length >= 11 && coleta.rua.trim() !== '' && entregas.every(e => e.rua.trim() !== '' && e.cep.replace(/\D/g, '').length === 8) && peso.trim() !== '' && pesoValido && qtdVolumes.trim() !== '' && isOfertaValida && (tipoFrete === 'imediato' || (tipoFrete === 'agendado' && dataAgendada.trim() !== ''));

  const showToast = (msg: string, type: 'error' | 'success' | 'warning' = 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  // Simulação de Eventos em Tempo Real para a Central da Carga
  useEffect(() => {
    if (step === 'busca' && orderData?.status === TripState.DISPONIVEL) {
      setSimCompat(Math.floor(Math.random() * 50) + 20); // Simula motoristas compatíveis na área
      const interval = setInterval(() => {
        setSimViews(prev => prev + Math.floor(Math.random() * 3));
        if (Math.random() > 0.7) setSimInterest(prev => prev + 1);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [step, orderData?.status]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderFromUrl = params.get('order');

    if (orderFromUrl) {
      localStorage.removeItem('fretogo_pending_payment');
      localStorage.setItem('fretogo_current_order', orderFromUrl);
      setCurrentOrderId(orderFromUrl);
      setStep('busca');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const savedOrder = localStorage.getItem('fretogo_current_order');
    const savedForm = localStorage.getItem('fretogo_form_backup');
    
    if (savedForm) {
      try {
        const data = JSON.parse(savedForm);
        setNome(data.nome || ''); setColeta(data.coleta || coleta); 
        setEntregas(data.entregas || (data.entrega ? [data.entrega] : [{ cep: '', bairro: '', rua: '', num: '' }]));
        setPeso(data.peso || ''); setQtdVolumes(data.qtdVolumes || ''); setTipoMaterial(data.tipoMaterial || '');
        setVehicle(data.vehicle || 'carreta_ls'); setTipoFrete(data.tipoFrete || 'imediato');
        setDataAgendada(data.dataAgendada || ''); setWhatsapp(data.whatsapp || ''); setDocumento(data.documento || '');
        setValorOferta(data.valorOferta || '');
      } catch { localStorage.removeItem('fretogo_form_backup'); }
    }
    if (savedOrder && savedOrder !== 'null') { setCurrentOrderId(savedOrder); setStep('busca'); }
  }, []);

  useEffect(() => {
    localStorage.setItem('fretogo_form_backup', JSON.stringify({ nome, coleta, entregas, peso, qtdVolumes, tipoMaterial, vehicle, tipoFrete, dataAgendada, whatsapp, documento, valorOferta }));
  }, [nome, coleta, entregas, peso, qtdVolumes, tipoMaterial, vehicle, tipoFrete, dataAgendada, whatsapp, documento, valorOferta]);

  useEffect(() => {
    if (!currentOrderId) return;
    const unsubscribe = onSnapshot(doc(db, 'fretes', currentOrderId), (snap) => {
      if (!snap.exists()) {
        localStorage.removeItem('fretogo_current_order'); 
        setCurrentOrderId(null); 
        setStep('form');
        return;
      }
      
      const data = snap.data() as OrderData;
      setOrderData(data);

      if (data.origemLat && data.origemLng) {
        setOrigemGPS({ lat: data.origemLat, lng: data.origemLng });
      }
      if (data.destinoLat && data.destinoLng) {
        setDestinoGPS({ lat: data.destinoLat, lng: data.destinoLng });
      }
      if (data.paradas && data.paradas.length > 1) {
         setParadasGPS(data.paradas.slice(0, -1).map((p: any) => ({ lat: p.lat, lng: p.lng })));
      }

      if (data.status === 'finalizado') {
        showToast('Entrega Finalizada! Agradecemos pela parceria.', 'success');
        localStorage.removeItem('fretogo_current_order'); 
        setCurrentOrderId(null); 
        setStep('form');
        return;
      }

      if (['cancelado', 'erro_pagamento'].includes(data.status as any)) {
        showToast(data.status === 'cancelado' ? 'Postagem cancelada e estornada.' : 'Erro de pagamento.', 'warning');
        localStorage.removeItem('fretogo_current_order'); 
        setCurrentOrderId(null); 
        setStep('form');
      }
    });
    return () => unsubscribe();
  }, [currentOrderId]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser?.uid) return;
      const solicitarNotificacao = async () => {
        await NotificationService.solicitarPermissao(currentUser.uid, 'cliente');
      };
      solicitarNotificacao();
    });
    return () => unsubscribe();
  }, []);

  const getValidCoords = async (addressStr: string, cepFallback: string): Promise<Coords> => {
    if (coordsCache.current[addressStr]) return coordsCache.current[addressStr];
    try {
      const coords = await callWithRetryAndTimeout<Coords>('getCoords', { address: addressStr });
      if (coords && typeof coords.lat === 'number') { coordsCache.current[addressStr] = coords; return coords; }
      throw new Error('INVALID');
    } catch { return getFallbackCoordsByCEP(cepFallback); }
  };

  const calcularDistanciaReal = async () => {
    if (loadingRoute || loadingPayment || !isFormValid) return;
    
    if (!pesoValido) {
      showToast(`O peso excede o limite da categoria.`, 'error'); return;
    }

    setLoadingRoute(true);
    if (entregas.length > 1) showToast('Mapeando múltiplas rotas...', 'warning');
    
    try {
      const origStr = `${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`;
      const origCoords = await getValidCoords(origStr, coleta.cep);
      setOrigemGPS(origCoords);

      const pGPS: Coords[] = [];
      let totalKm = 0;
      let lastOrigin = origStr;

      for (const stop of entregas) {
        const destStr = `${stop.rua}, ${stop.num}, ${stop.bairro}, Brazil`;
        const destCoords = await getValidCoords(destStr, stop.cep);
        pGPS.push(destCoords);

        const distanceResult = await callWithRetryAndTimeout<number | string>('getDistance', { origin: lastOrigin, destination: destStr });
        const km = Number(distanceResult);
        if (!Number.isNaN(km) && km > 0) {
            totalKm += km;
        }
        lastOrigin = destStr;
      }
      
      setParadasGPS(pGPS);
      setDestinoGPS(pGPS[pGPS.length - 1]);
      if(totalKm > 0) setDistanciaReal(totalKm);
      
      setStep('preview');
    } catch {
      showToast('Calculando rota por estimativa de CEP.', 'warning');
      setDistanciaReal(15 * entregas.length); 

      const fallbackOrigem = getFallbackCoordsByCEP(coleta.cep);
      const fallbackDestino = getFallbackCoordsByCEP(entregas[entregas.length - 1].cep);
      setOrigemGPS(fallbackOrigem);
      setDestinoGPS(fallbackDestino);

      setStep('preview');
    } finally { setLoadingRoute(false); }
  };

  const handleContratar = async () => {
    if (loadingRoute || loadingPayment || isProcessingPayment.current) return;
    isProcessingPayment.current = true;
    setLoadingPayment(true);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (tipoFrete === 'agendado' && dataAgendada) {
      const agoraTimestamp = Date.now();
      const dataAlvoTimestamp = new Date(dataAgendada).getTime();
      const diferencaHorasJanela = (dataAlvoTimestamp - agoraTimestamp) / (1000 * 60 * 60);
      const isHeavy = ['toco', 'truck', 'carreta_ls', 'bi_trem_cegonha'].includes(vehicle);

      if (isHeavy && diferencaHorasJanela < 12) {
        showToast("Janela inválida. Pesados exigem mín. 12 horas de antecedência.", "error");
        setLoadingPayment(false); isProcessingPayment.current = false; return;
      }
    }

    try {
      const c1 = await getValidCoords(`${coleta.rua}, ${coleta.num}, ${coleta.bairro}, Brazil`, coleta.cep);
      
      const coordsEntregas = [];
      for (const e of entregas) {
         const c = await getValidCoords(`${e.rua}, ${e.num}, ${e.bairro}, Brazil`, e.cep);
         coordsEntregas.push({ ...e, lat: c.lat, lng: c.lng });
      }
      const destinoFinal = coordsEntregas[coordsEntregas.length - 1];
      const documentoLimpo = documento.replace(/\D/g, ''); 
      
      const pinColeta = Math.floor(1000 + Math.random() * 9000).toString();
      const pinEntregas = entregas.map(() => Math.floor(1000 + Math.random() * 9000).toString());

      const parsedDate = tipoFrete === 'agendado' && dataAgendada ? new Date(dataAgendada) : null;
      const firebaseTimestamp = parsedDate ? Timestamp.fromDate(parsedDate) : null;

      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Sua sessão expirou. Faça login novamente.");

      // CÁLCULO DINÂMICO DE SPLIT B2B COM BASE NA OFERTA DO CLIENTE
      const isHeavy = ['toco', 'truck', 'carreta_ls', 'bi_trem_cegonha'].includes(vehicle);
      const taxaPlataforma = isHeavy ? 0.15 : 0.20;
      const valorFreteBruto = valorOfertaNum; 
      const lucroPlataforma = valorFreteBruto * taxaPlataforma; 
      const valorLiquidoMotorista = valorFreteBruto - lucroPlataforma; 

      const docRef = await addDoc(collection(db, 'fretes'), {
        
        // --- IDENTIFICAÇÃO DA EMPRESA E TIPO DE CONTA ---
        empresaId: currentUser.uid, 
        clienteId: currentUser.uid, 
        tipoConta: 'b2b',
        empresaNome: nome || 'Empresa Embarcadora',
        empresaDocumento: documentoLimpo,
        clienteNome: nome || 'Empresa Embarcadora', 
        clienteZap: whatsapp, 
        clienteDocumento: documentoLimpo,
        
        // --- ESPECIFICAÇÕES DO FRETE ---
        distancia: validDistancia, 
        veiculo: vehicle, 
        peso: peso || 'Não informado', 
        qtdVolumes: qtdVolumes || 'Não informado', 
        tipoMaterial: tipoMaterial || 'Carga geral',
        
        // --- CÁLCULO E SPLIT FINANCEIRO B2B ---
        valorTotal: valorFreteBruto, 
        valorFreteBruto: valorFreteBruto,
        valorLiquidoMotorista: Number(valorLiquidoMotorista.toFixed(2)),
        valorMotorista: Number(valorLiquidoMotorista.toFixed(2)), 
        lucroPlataforma: Number(lucroPlataforma.toFixed(2)),
        valorPedagio: calculoFinanceiro.tollCost, // Gravando pedágio sugerido para log
        
        // --- ENDEREÇOS E COORDENADAS ---
        cidadeOrigem: coleta.bairro, 
        cidadeDestino: destinoFinal.bairro,
        enderecoColetaTexto: `${coleta.rua}, ${coleta.num} - ${coleta.bairro}`, 
        enderecoEntregaTexto: `${destinoFinal.rua}, ${destinoFinal.num} - ${destinoFinal.bairro}`,
        coleta, 
        entrega: destinoFinal, 
        paradas: coordsEntregas,
        origemLat: c1.lat, 
        origemLng: c1.lng, 
        destinoLat: destinoFinal.lat, 
        destinoLng: destinoFinal.lng, 
        
        // --- SEGURANÇA E GERENCIAMENTO DE ESTADO ---
        pinColeta, 
        pinEntregas, 
        multiplasEntregas: entregas.length > 1,
        tipoFrete,
        dataAgendada: firebaseTimestamp,
        status: tipoFrete === 'agendado' ? 'agendado' : TripState.AGUARDANDO_PAGAMENTO,
        createdAt: serverTimestamp(),
      });

      localStorage.setItem('fretogo_current_order', docRef.id); setCurrentOrderId(docRef.id);

      if (tipoFrete === 'imediato') {
        try {
          const res = await fetch('/api/pagamento', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo: `Postagem de Carga - ${VEHICLE_CONFIG[vehicle].nome}`, idPedido: docRef.id }),
          });
          if (!res.ok) throw new Error('API indisponível');
          const data = await res.json();
          if (data?.url && data.url.startsWith('https://')) {
             window.location.href = data.url; 
             return;
          } else {
             throw new Error('Link inválido');
          }
        } catch (apiError) {
           showToast("Erro ao processar custódia. Tente novamente.", "error");
        }
      } else { 
        setStep('busca'); 
      }
    } catch (e: any) {
      showToast(`Falha estrutural: ${e.message}`, 'error'); localStorage.removeItem('fretogo_current_order'); setCurrentOrderId(null);
    } finally { setLoadingPayment(false); isProcessingPayment.current = false; }
  };

  const handleCancelarPedido = async () => {
    if (!currentOrderId || isCancelling) return;
    setIsCancelling(true);
    
    try {
      showToast('Iniciando estorno seguro junto ao banco...', 'warning');
      const res = await fetch('/api/reembolso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPedido: currentOrderId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detalhe || 'Erro na devolução.');

      showToast('Estorno realizado! O PIX retornou para sua conta.', 'success');
      setShowCancelModal(false);
      resetFlow(); 

    } catch (error: any) { 
      showToast(error.message, 'error'); 
      setShowCancelModal(false);
    } finally { 
      setIsCancelling(false); 
    }
  };

  const handleWhatsAppClick = () => {
    if (!orderData?.motoristaZap) return;
    window.open(`https://wa.me/55${orderData?.motoristaZap.replace(/\D/g, '')}`, '_blank');
  };

  const handleRetrySearch = async () => {
    if (!currentOrderId) return;
    showToast("Reativando postagem no Feed...", "success");
    try {
      await updateDoc(doc(db, 'fretes', currentOrderId), {
        status: 'disponivel',
        updatedAt: serverTimestamp()
      });
    } catch { showToast('Erro ao reiniciar busca.', 'error'); }
  };

  const resetFlow = () => {
    localStorage.removeItem('fretogo_current_order'); 
    setCurrentOrderId(null); 
    setOrderData(null); 
    setStep('form');
  };

  const handleAddEntrega = () => {
    if (entregas.length < 5) setEntregas([...entregas, { cep: '', bairro: '', rua: '', num: '' }]);
    else showToast('Limite máximo de 5 paradas.', 'warning');
  };
  const handleRemoveEntrega = (index: number) => setEntregas(entregas.filter((_, i) => i !== index));
  const updateEntrega = (index: number, field: string, value: string) => {
    const newEntregas = [...entregas];
    newEntregas[index] = { ...newEntregas[index], [field]: value };
    setEntregas(newEntregas);
  };

  const formatCurrency = (val: string) => {
    let numeric = val.replace(/\D/g, '');
    if (!numeric) return '';
    numeric = (Number(numeric) / 100).toFixed(2).replace('.', ',');
    return numeric;
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Agora';
    const seconds = Math.floor((new Date().getTime() - timestamp.toDate().getTime()) / 1000);
    if (seconds < 60) return `${seconds}s atrás`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
    return `${Math.floor(seconds / 3600)}h atrás`;
  };

  const podeCancelar = orderData && ['aguardando_pagamento', 'agendado', 'sem_motorista', 'expirado', 'disponivel'].includes(orderData?.status || '');
  const textoCancelar = ((orderData as any)?.pagamentoStatus === 'aprovado' || orderData?.status === 'disponivel') 
    ? 'Cancelar e Estornar Pagamento'
    : 'Cancelar Postagem';

  const inputClass = "w-full rounded-2xl border-2 border-slate-200 bg-white p-5 text-base md:text-lg font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none";
  const smallInputClass = "w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-sm font-bold text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none";

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-blue-500/20">
      
      <div className="fixed inset-0 -z-10 bg-slate-50" style={{height: '100dvh'}}></div>

      <header className="relative z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl shadow-sm">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button onClick={() => { if (step === 'form') window.location.href = '/'; else resetFlow(); }} className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white transition-all duration-300 hover:bg-slate-100 hover:scale-105 active:scale-95">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div className="flex items-center gap-3">
              <Building2 className="h-7 w-7 text-blue-600 drop-shadow-sm" />
              <span className="text-2xl font-black italic tracking-tighter text-slate-900">PAINEL EMBARCADOR</span>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border-2 border-emerald-100 bg-emerald-50 px-5 py-2 md:flex">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800">Pagamento 100% Protegido</span>
          </div>
        </nav>
      </header>

      <main className="relative z-10 w-full max-w-6xl mx-auto flex flex-col justify-center px-4 py-8 pb-20 sm:px-6 lg:px-8">
        
        {step === 'form' && (
          <div className="w-full rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 md:p-12">
            <div className="mb-10 text-center md:text-left">
              <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl leading-tight">
                Publicar <span className="italic text-blue-600">Carga</span>
              </h1>
              <p className="mt-4 text-slate-500 font-medium max-w-2xl text-lg">Insira os dados da operação e defina o valor que deseja pagar. A carga irá direto para o Mural de Fretes da FretoGo.</p>
            </div>

            <div className="space-y-8">
              {/* DADOS EMPRESA */}
              <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100">
                <h2 className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  <Building2 className="h-5 w-5 text-blue-500" /> Dados da Empresa
                </h2>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <input className={inputClass} placeholder="Nome / Razão Social" value={nome} onChange={(e) => setNome(e.target.value)} />
                  <input className={inputClass} placeholder="WhatsApp Contato" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                  <input className={inputClass} placeholder="CNPJ / CPF" value={documento} onChange={(e) => setDocumento(e.target.value)} />
                </div>
              </div>

              {/* ENDEREÇOS E ROTAS */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100">
                  <h2 className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <MapPin className="h-5 w-5 text-blue-500" /> Endereço de Coleta
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <input className={`col-span-2 ${smallInputClass}`} placeholder="Rua da Retirada" value={coleta.rua} onChange={e => setColeta({...coleta, rua: e.target.value})} />
                      <input className={`col-span-1 ${smallInputClass}`} placeholder="Nº" value={coleta.num} onChange={e => setColeta({...coleta, num: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input className={smallInputClass} placeholder="Bairro" value={coleta.bairro} onChange={e => setColeta({...coleta, bairro: e.target.value})} />
                      <input className={smallInputClass} placeholder="CEP" value={coleta.cep} onChange={e => setColeta({...coleta, cep: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-6 md:p-8 rounded-3xl border border-blue-100">
                  <h2 className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600">
                    <Truck className="h-5 w-5 text-blue-600" /> Destino(s)
                  </h2>
                  <div className="space-y-4">
                    {entregas.map((entrega, index) => (
                      <div key={index} className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm relative">
                        {index > 0 && (
                          <button onClick={() => handleRemoveEntrega(index)} className="absolute right-4 top-4 text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        )}
                        <p className="text-[10px] font-black uppercase text-blue-400 mb-2">Parada {index + 1}</p>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <input className={`col-span-2 ${smallInputClass}`} placeholder="Rua da Entrega" value={entrega.rua} onChange={e => updateEntrega(index, 'rua', e.target.value)} />
                          <input className={`col-span-1 ${smallInputClass}`} placeholder="Nº" value={entrega.num} onChange={e => updateEntrega(index, 'num', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input className={smallInputClass} placeholder="Bairro" value={entrega.bairro} onChange={e => updateEntrega(index, 'bairro', e.target.value)} />
                          <input className={smallInputClass} placeholder="CEP" value={entrega.cep} onChange={e => updateEntrega(index, 'cep', e.target.value)} />
                        </div>
                      </div>
                    ))}
                    {entregas.length < 5 && (
                      <button onClick={handleAddEntrega} className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-600 font-bold rounded-2xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm">
                        <Plus size={18}/> Adicionar Parada Extra
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* CARGA E INTELIGÊNCIA DE MERCADO */}
              <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-100">
                <h2 className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                  <Package className="h-5 w-5 text-amber-500" /> Especificações da Carga
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <select className={`col-span-1 md:col-span-2 ${inputClass} cursor-pointer`} value={vehicle} onChange={e => setVehicle(e.target.value as VehicleType)}>
                    {Object.entries(VEHICLE_CONFIG).map(([key, conf]) => (<option key={key} value={key}>{conf.nome}</option>))}
                  </select>
                  <input className={inputClass} placeholder="Peso (Ex: 25000kg)" value={peso} onChange={e => setPeso(e.target.value)} />
                  <input className={inputClass} placeholder="Produto / Volume" value={tipoMaterial} onChange={e => setTipoMaterial(e.target.value)} />
                </div>

                {/* 🔥 FASE 2: BLOCO DE GAMIFICAÇÃO DA OFERTA */}
                <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm mb-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-5 w-5 text-blue-500" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-600">Inteligência de Mercado</p>
                      </div>
                      <p className="text-sm text-slate-500 mb-6">Nossa IA calcula o valor base (ANTT + Pedágios). Faça sua oferta baseada na sugestão para atrair motoristas mais rápido.</p>
                      
                      <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Tabela ANTT (Sugerido)</p>
                          <p className="text-xl font-black text-slate-800">R$ {valorSugeridoCalculado.toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Chance de Aceite</p>
                          {valorOfertaNum === 0 ? (
                             <span className="text-sm font-bold text-slate-400">Aguardando valor...</span>
                          ) : isOfertaBoa ? (
                             <span className="flex items-center gap-1 text-sm font-black text-emerald-600"><Flame size={16}/> Muito Alta</span>
                          ) : (
                             <span className="flex items-center gap-1 text-sm font-black text-amber-500"><AlertTriangle size={16}/> Baixa (Demorada)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-600 mb-3 ml-2 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-600"/> Valor Ofertado pela Carga</p>
                      <span className="absolute left-6 top-[46px] text-2xl font-black text-emerald-600">R$</span>
                      <input 
                        type="text" 
                        className={`w-full rounded-[2rem] border-4 ${isOfertaValida && isOfertaBoa ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'} py-8 pl-16 pr-6 text-4xl font-black text-slate-900 transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none`} 
                        placeholder="0,00" 
                        value={valorOferta} 
                        onChange={e => setValorOferta(formatCurrency(e.target.value))} 
                      />
                      <p className="text-[10px] font-bold text-slate-500 mt-3 uppercase tracking-widest text-center">
                        O valor será mantido em custódia segura.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-slate-200 pt-8">
                  <div className="mb-4 flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-purple-500" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-600">Horário da Coleta</p>
                  </div>
                  <div className="flex w-full max-w-md bg-slate-100 p-2 rounded-2xl">
                    <button onClick={() => setTipoFrete('imediato')} className={`flex-1 rounded-xl py-4 text-sm font-black uppercase tracking-wider transition-all ${tipoFrete === 'imediato' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>Imediato</button>
                    <button onClick={() => setTipoFrete('agendado')} className={`flex-1 rounded-xl py-4 text-sm font-black uppercase tracking-wider transition-all ${tipoFrete === 'agendado' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}>Agendar Data</button>
                  </div>
                  {tipoFrete === 'agendado' && <input type="datetime-local" className={`mt-4 max-w-md ${inputClass}`} value={dataAgendada} onChange={(e) => setDataAgendada(e.target.value)} />}
                </div>
              </div>
            </div>

            {!isFormValid && (
              <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
                <p className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-amber-600">
                  <AlertTriangle size={18}/> Preencha todos os campos operacionais e o Valor da Oferta para postar a carga.
                </p>
              </div>
            )}

            <div className="mt-8">
              <button onClick={calcularDistanciaReal} disabled={loadingRoute || loadingPayment || !isFormValid} className={`flex w-full min-h-[72px] items-center justify-center gap-3 rounded-[2rem] text-lg font-black uppercase tracking-[0.2em] transition-all duration-300 ${!isFormValid ? 'cursor-not-allowed bg-slate-200 text-slate-400' : 'bg-blue-600 text-white shadow-2xl shadow-blue-600/40 hover:scale-[1.01] hover:bg-blue-700'}`}>
                {loadingRoute ? <><Loader2 className="h-6 w-6 animate-spin"/> Validando Informações...</> : <><Zap size={24}/> Validar Postagem e Pagamento</>}
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="w-full grid grid-cols-1 gap-8 animate-in fade-in zoom-in duration-500 lg:grid-cols-[1fr_450px]">
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl">
              <div className="mb-8 flex items-center justify-between border-b border-slate-100 pb-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">Resumo da Rota</h2>
                  <p className="text-sm text-slate-500 font-medium mt-1">Confira os detalhes antes de postar no Feed.</p>
                </div>
                <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center"><MapPin className="h-6 w-6 text-blue-600" /></div>
              </div>
        
              <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Origem</p>
                  <p className="text-lg font-bold text-slate-900">{coleta.rua}, {coleta.num}</p>
                  <p className="text-sm text-slate-500">{coleta.bairro}</p>
                </div>
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Destino</p>
                  <p className="text-lg font-bold text-slate-900">{entregas[entregas.length - 1].rua}, {entregas[entregas.length - 1].num}</p>
                  <p className="text-sm text-slate-500">{entregas.length > 1 ? `+ ${entregas.length - 1} paradas no trajeto` : entregas[0].bairro}</p>
                </div>
              </div>

              <div className="h-[300px] md:h-[450px] w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 relative">
                {mapsReady && origemGPS && destinoGPS ? (
                  <MapaCliente origem={origemGPS} destino={destinoGPS} paradasExtras={paradasGPS.length > 1 ? paradasGPS.slice(0, -1) : undefined} vehicleType={vehicle} operationalMessage={`Validando Trajeto B2B...`} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-500"><Loader2 className="w-8 h-8 animate-spin mb-3"/></div>
                )}
              </div>
            </div>

            {/* 🔥 FASE 2: BLOCO DE CONFIANÇA (ESCROW) EXPLICADO */}
            <div className="flex flex-col gap-6">
              <div className="rounded-[2.5rem] border-2 border-emerald-500 bg-emerald-600 p-8 shadow-2xl text-white relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10"><ShieldCheck size={200} /></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <ShieldCheck className="h-6 w-6 text-emerald-300" />
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100">Garantia Escrow FretoGo</span>
                  </div>
                  <h3 className="text-5xl font-black mb-2">R$ {valorOferta}</h3>
                  <p className="text-emerald-100 text-sm font-medium border-b border-emerald-500/50 pb-6 mb-6">Sua oferta oficial para a rede de parceiros.</p>
                  
                  <ul className="space-y-4 text-sm font-medium text-emerald-50">
                    <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-300 shrink-0"/> O motorista NÃO recebe o valor agora.</li>
                    <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-300 shrink-0"/> O dinheiro fica 100% blindado na plataforma.</li>
                    <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-300 shrink-0"/> Liberado ao motorista APENAS após você informar o PIN de Entrega no destino final.</li>
                    <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-300 shrink-0"/> Estorno imediato caso a carga seja cancelada.</li>
                  </ul>
                </div>
              </div>

              <button onClick={handleContratar} disabled={loadingPayment || isProcessingPayment.current} className={`flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[2rem] text-[15px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${loadingPayment ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white shadow-xl hover:bg-black hover:scale-[1.02]'}`}>
                {loadingPayment ? <><Loader2 className="h-6 w-6 animate-spin" /> Processando Escrow...</> : <><Lock size={22} /> Pagar e Ativar no Feed</>}
              </button>
              <button onClick={() => setStep('form')} className="flex min-h-[54px] w-full items-center justify-center rounded-[2rem] border-2 border-slate-200 bg-white text-xs font-black uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-50">
                Voltar e Editar Dados
              </button>
            </div>
          </div>
        )}

        {/* 🔥 FASE 2: CENTRAL DA CARGA VIVA */}
        {step === 'busca' && orderData && (
          <div className="mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
              
              <div className="flex flex-col gap-8">
                {/* Cabeçalho da Central (Dark Mode Dashboard) */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5"><Activity size={150} /></div>
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8 mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span></span>
                        <p className="text-cyan-400 font-bold tracking-widest uppercase text-xs">Carga Ativa no Feed</p>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-black">ID: #{currentOrderId?.slice(0,8).toUpperCase()}</h2>
                    </div>
                    <div className="md:text-right bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                      <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Valor Protegido (Escrow)</p>
                      <p className="text-2xl font-black text-emerald-400 flex items-center gap-2"><ShieldCheck size={20}/> R$ {orderData?.valorFreteBruto?.toFixed(2).replace('.', ',')}</p>
                    </div>
                  </div>

                  {/* Estatísticas Vivas (Simuladores UX) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
                      <Eye className="w-5 h-5 text-blue-400 mb-2"/>
                      <p className="text-3xl font-black text-white">{simViews}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Visualizações</p>
                    </div>
                    <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
                      <Truck className="w-5 h-5 text-emerald-400 mb-2"/>
                      <p className="text-3xl font-black text-white">{simCompat}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Compatíveis</p>
                    </div>
                    <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
                      <Users className="w-5 h-5 text-purple-400 mb-2"/>
                      <p className="text-3xl font-black text-white">{simInterest}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">Interessados</p>
                    </div>
                    <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
                      <CalendarDays className="w-5 h-5 text-amber-400 mb-2"/>
                      <p className="text-xl font-black text-white mt-2">{formatTimeAgo(orderData.createdAt)}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">No ar</p>
                    </div>
                  </div>
                </div>

                {/* Mapa Live */}
                <div className="h-[400px] w-full rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-xl relative">
                  {mapsReady ? (
                    <MapaCliente origem={origemGPS} destino={destinoGPS} motoristaId={orderData?.motoristaId} paradasExtras={paradasGPS} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
                  )}
                  {['aguardando_pagamento', 'disponivel', 'buscando_motorista'].includes(orderData?.status || '') && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                      <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.5)] mb-6">
                        <Activity className="h-10 w-10 text-white animate-pulse" />
                      </div>
                      <h3 className="text-2xl font-black text-white tracking-tighter text-center">Transmitindo no Feed...</h3>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar de Ações e Status */}
              <div className="flex flex-col gap-6">
                
                {['sem_motorista', 'expirado'].includes(orderData?.status || '') && (
                  <div className="bg-white/90 p-6 rounded-[2rem] border border-amber-200 text-center shadow-xl">
                    <div className="bg-amber-100 p-4 rounded-full mb-4 inline-block"><AlertTriangle className="h-8 w-8 text-amber-500" /></div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Nenhum Aceite</h3>
                    <p className="text-xs font-bold text-slate-500 mb-6">A oferta expirou no Feed.</p>
                    <button onClick={handleRetrySearch} className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs mb-3 shadow-lg"><RefreshCw size={16} /> Republicar Carga</button>
                    <button onClick={() => setShowCancelModal(true)} className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 border border-red-200 rounded-xl font-black uppercase text-xs hover:bg-red-100"><XCircle size={16} /> Cancelar e Reembolsar PIX</button>
                  </div>
                )}

                <ClientStatusCard orderData={orderData} />
                
                {orderData?.motoristaNome && (
                  <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Motorista Designado</p>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center"><User className="w-7 h-7 text-blue-600" /></div>
                      <div>
                        <p className="text-lg font-black text-slate-900 leading-none">{orderData?.motoristaNome}</p>
                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase">{orderData?.veiculo?.replace('_', ' ') || 'Veículo'}</p>
                      </div>
                    </div>
                    {orderData?.motoristaZap && (
                      <button onClick={handleWhatsAppClick} className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">
                        <MessageCircle size={18} /> Falar no WhatsApp
                      </button>
                    )}
                  </div>
                )}

                {/* Bloco de PIN de Segurança */}
                {['aceito', 'indo_coleta', 'chegou_coleta', 'coletando', 'em_transporte', 'finalizando'].includes(orderData?.status || '') && (
                  <div className="bg-slate-900 rounded-[2rem] p-6 shadow-xl text-center text-white border border-slate-800">
                    <p className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-3 flex items-center justify-center gap-2"><Lock size={14}/> Seu PIN de Segurança</p>
                    <p className="text-5xl font-mono font-black tracking-[0.2em]">
                      {['em_transporte', 'finalizando'].includes(orderData?.status) 
                        ? (orderData?.multiplasEntregas && orderData?.pinEntregas ? orderData?.pinEntregas[orderData?.paradaAtualIndex || 0] : (orderData?.pinEntregas ? orderData?.pinEntregas[0] : '---')) 
                        : orderData?.pinColeta}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 mt-4 leading-relaxed">
                      {['em_transporte', 'finalizando'].includes(orderData?.status) 
                        ? 'Informe na ENTREGA para liberar o pagamento.' 
                        : 'Informe na COLETA para iniciar o trajeto coberto.'}
                    </p>
                  </div>
                )}

                <div className="bg-white rounded-[2rem] p-4 shadow-xl border border-slate-100 flex flex-col gap-3">
                  {podeCancelar ? (
                    <button onClick={() => setShowCancelModal(true)} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-100 transition-all">
                      <XCircle size={18} /> {textoCancelar}
                    </button>
                  ) : (
                    <button onClick={() => window.open('https://wa.me/5511946099840', '_blank')} className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-600 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">
                      <HeadphonesIcon size={18} /> Suporte B2B
                    </button>
                  )}
                </div>
              </div>

            </div>
            {currentOrderId && <div className="mt-8"><ChatFrete freteId={currentOrderId} isCliente={true} nome={nome || "Empresa"} /></div>}
          </div>
        )}

      </main>

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-[120] -translate-x-1/2 animate-in slide-in-from-bottom-5">
          <div className={`rounded-2xl border px-8 py-5 text-sm font-black uppercase tracking-widest shadow-2xl ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : toast.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {toast.msg}
          </div>
        </div>
      )}

      <ClientCancelModal open={showCancelModal} isCancelling={isCancelling} onClose={() => setShowCancelModal(false)} onConfirm={handleCancelarPedido} />
    </div>
  );
}
