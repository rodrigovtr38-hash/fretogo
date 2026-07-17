// =========================================================
// NOME DO ARQUIVO: src/components/motorista/DriverCadastro.tsx
// CTO-Log: Auditoria de Segurança de Banco de Dados.
// Status: Máscaras de CPF/Telefone mantêm o DB higienizado. Compressão de imagem nativa ativa.
// =========================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck, Camera, CreditCard, Phone, ShieldCheck, 
  Truck, User, ListFilter, FileImage, CheckCircle2, CameraIcon
} from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../firebase';

interface DriverCadastroProps {
  onFinish: () => void;
}

export default function DriverCadastro({ onFinish }: DriverCadastroProps) {
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Finalizar Cadastro');
  const [errorMsg, setErrorMsg] = useState('');

  const [cnhFile, setCnhFile] = useState<File | null>(null);
  const [docVeiculoFile, setDocVeiculoFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    nome: '', telefone: '', cpf: '', placa: '', veiculo: '', categoria: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;

    if (name === 'telefone') {
      value = value.replace(/\D/g, '').substring(0, 11);
      value = value.replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    if (name === 'cpf') {
      value = value.replace(/\D/g, '').substring(0, 11);
      value = value.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    if (name === 'placa') {
      value = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 7);
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cnh' | 'doc' | 'selfie') => {
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].size > 15 * 1024 * 1024) {
          setErrorMsg(`A foto é muito grande. Tente afastar um pouco a câmera.`);
          return;
      }
      if (type === 'cnh') setCnhFile(e.target.files[0]);
      if (type === 'doc') setDocVeiculoFile(e.target.files[0]);
      if (type === 'selfie') setSelfieFile(e.target.files[0]);
      setErrorMsg('');
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 1280;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Falha na compressão'));
          }, 'image/jpeg', 0.7);
        };
        img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      };
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    });
  };

  const uploadFoto = async (file: File, path: string): Promise<string> => {
    const blob = await compressImage(file);
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, blob, { contentType: 'image/jpeg' });
    await uploadTask;
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async () => {
    setErrorMsg('');

    if (!formData.nome || !formData.telefone || !formData.cpf || !formData.placa || !formData.categoria || !formData.veiculo) {
      setErrorMsg('Preencha todos os campos obrigatórios em texto.');
      return;
    }

    if (!cnhFile || !docVeiculoFile || !selfieFile) {
      setErrorMsg('É obrigatório enviar a foto da CNH, do Documento do Veículo e a Selfie segurando a CNH.');
      return;
    }

    setLoading(true);
    setLoadingText('Otimizando imagens...');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Sessão expirada. Faça login novamente para concluir.");

      let cnhUrl = "";
      let docUrl = "";
      let selfieUrl = "";

      try {
        const timestamp = Date.now();
        setLoadingText('Enviando documentos (1/3)...');
        cnhUrl = await uploadFoto(cnhFile, `motoristas_docs/${user.uid}/cnh_${timestamp}.jpg`);
        setLoadingText('Enviando documentos (2/3)...');
        docUrl = await uploadFoto(docVeiculoFile, `motoristas_docs/${user.uid}/doc_${timestamp}.jpg`);
        setLoadingText('Enviando documentos (3/3)...');
        selfieUrl = await uploadFoto(selfieFile, `motoristas_docs/${user.uid}/selfie_${timestamp}.jpg`);
      } catch (uploadError: any) {
        console.error("Falha no upload:", uploadError);
        throw new Error("Não foi possível enviar as fotos. Verifique sua internet e tente novamente.");
      }

      setLoadingText('Criando perfil seguro...');
      
      const telefoneLimpo = formData.telefone.replace(/\D/g, '');
      const cpfLimpo = formData.cpf.replace(/\D/g, '');

      await setDoc(doc(db, 'motoristas_cadastros', user.uid), {
        nome: formData.nome,
        whatsapp: telefoneLimpo,
        cpf: cpfLimpo,
        placa: formData.placa,
        modeloVeiculo: formData.veiculo,
        categoria: formData.categoria,
        fotoCnh: cnhUrl,
        fotoDocumento: docUrl,
        fotoSelfie: selfieUrl,
        status: 'pendente',
        criadoEm: serverTimestamp(),
        uid: user.uid,
      });

      onFinish();

    } catch (error: any) {
      console.error('ERRO CRÍTICO NO CADASTRO:', error);
      setErrorMsg(error.message || 'Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
      setLoadingText('Finalizar Cadastro');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),transparent_35%)]" />
      <div className="absolute right-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="absolute bottom-[-120px] left-[-120px] h-[320px] w-[320px] rounded-full bg-blue-500/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-auto w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl shadow-2xl"
      >
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-cyan-500/10 border border-cyan-500/20">
            <Truck className="h-10 w-10 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Cadastro do Motorista
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Complete seu perfil e envie os documentos para análise.
          </p>
        </div>

        {errorMsg && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 rounded-xl bg-red-500/10 p-4 text-center text-sm font-bold text-red-400 border border-red-500/20">
            {errorMsg}
          </motion.div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <User size={16} className="text-cyan-500" /> Nome completo
            </label>
            <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Digite seu nome" className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400 focus:bg-white/10" />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Phone size={16} className="text-cyan-500" /> WhatsApp
            </label>
            <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(11) 99999-9999" className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400 focus:bg-white/10" />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <CreditCard size={16} className="text-cyan-500" /> CPF
            </label>
            <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400 focus:bg-white/10" />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <BadgeCheck size={16} className="text-cyan-500" /> Placa do veículo
            </label>
            <input type="text" name="placa" value={formData.placa} onChange={handleChange} placeholder="ABC1D23" className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400 focus:bg-white/10" />
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <ListFilter size={16} className="text-cyan-500" /> Categoria Operacional (Para o Radar)
          </label>
          <select name="categoria" value={formData.categoria} onChange={handleChange} className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400 focus:bg-white/10 [&>option]:bg-slate-900">
            <option value="">Selecione a categoria principal</option>
            <option value="moto">Moto</option>
            <option value="carro_pequeno">Carro Pequeno / Hatch</option>
            <option value="utilitario">Utilitário / Van</option>
            <option value="toco">Caminhão Toco</option>
            <option value="truck">Caminhão Truck</option>
            <option value="carreta_ls">Carreta LS</option>
            <option value="bi_trem_cegonha">Bi-trem / Cegonha</option>
          </select>
        </div>

        <div className="mt-5">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Truck size={16} className="text-cyan-500" /> Modelo exato (Ex: Carreta Baú, HR, Fiorino)
          </label>
          <input type="text" name="veiculo" value={formData.veiculo} onChange={handleChange} placeholder="Descreva o modelo e tipo de carroceria..." className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400 focus:bg-white/10" />
        </div>

        <div className="mt-8 rounded-[2rem] border border-dashed border-cyan-500/30 bg-cyan-500/5 p-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 opacity-5"><ShieldCheck size={150} /></div>
          <div className="mb-6 flex-col items-center justify-center text-center relative z-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Camera className="text-cyan-400" />
            </div>
            <h3 className="text-lg font-black text-white">Auditoria Anti-Fraude</h3>
            <p className="mt-2 max-w-md text-sm text-slate-400 mx-auto">
              Para a sua segurança e dos embarcadores, é obrigatório enviar a foto da CNH e uma selfie segurando o documento.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 relative z-10">
            <div className="relative">
              <input type="file" id="cnhUpload" accept="image/*" onChange={(e) => handleFileChange(e, 'cnh')} className="hidden" />
              <label htmlFor="cnhUpload" className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-all hover:bg-white/5 ${cnhFile ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileImage className={cnhFile ? 'text-emerald-400' : 'text-cyan-400'} size={20} />
                  <span className="truncate text-sm font-medium text-slate-200">
                    {cnhFile ? cnhFile.name : 'Foto da CNH'}
                  </span>
                </div>
                {cnhFile && <CheckCircle2 className="text-emerald-400" size={18} />}
              </label>
            </div>

            <div className="relative">
              <input type="file" id="docUpload" accept="image/*" onChange={(e) => handleFileChange(e, 'doc')} className="hidden" />
              <label htmlFor="docUpload" className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-all hover:bg-white/5 ${docVeiculoFile ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <Truck className={docVeiculoFile ? 'text-emerald-400' : 'text-cyan-400'} size={20} />
                  <span className="truncate text-sm font-medium text-slate-200">
                    {docVeiculoFile ? docVeiculoFile.name : 'Foto do Doc (CRLV)'}
                  </span>
                </div>
                {docVeiculoFile && <CheckCircle2 className="text-emerald-400" size={18} />}
              </label>
            </div>

            <div className="relative md:col-span-2">
              <input type="file" id="selfieUpload" accept="image/*" onChange={(e) => handleFileChange(e, 'selfie')} className="hidden" />
              <label htmlFor="selfieUpload" className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-4 transition-all hover:bg-white/5 ${selfieFile ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.1)]'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <CameraIcon className={selfieFile ? 'text-emerald-400' : 'text-cyan-400'} size={20} />
                  <span className="truncate text-sm font-medium text-slate-200">
                    {selfieFile ? selfieFile.name : 'Selfie (Rosto + CNH em mãos)'}
                  </span>
                </div>
                {selfieFile && <CheckCircle2 className="text-emerald-400" size={18} />}
              </label>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <ShieldCheck className="text-emerald-400 shrink-0" size={24}/>
          <div>
            <h3 className="font-bold text-white text-sm">Dados 100% Protegidos</h3>
            <p className="text-xs text-slate-400 mt-1">Suas imagens são comprimidas localmente e enviadas com criptografia para nossos servidores seguros.</p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-8 w-full rounded-[1.5rem] bg-cyan-500 py-5 text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02] hover:bg-cyan-400 disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          {loading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
              {loadingText}
            </>
          ) : 'Finalizar Cadastro'}
        </button>
      </motion.div>
    </div>
  );
}
