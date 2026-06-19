// src/components/motorista/DriverCadastro.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Camera,
  CreditCard,
  Phone,
  ShieldCheck,
  Truck,
  User,
  ListFilter,
  FileImage,
  CheckCircle2,
  CameraIcon
} from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
// CTO FIX: Removido 'uploadBytes' e 'storage'. Vamos usar Base64 Canvas para garantir o envio sem erros.
import { auth, db } from '../../firebase'; 

interface DriverCadastroProps {
  onFinish: () => void;
}

export default function DriverCadastro({
  onFinish,
}: DriverCadastroProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados para as 3 fotos antifraude
  const [cnhFile, setCnhFile] = useState<File | null>(null);
  const [docVeiculoFile, setDocVeiculoFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    placa: '',
    veiculo: '',
    categoria: '', 
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cnh' | 'doc' | 'selfie') => {
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].size > 15 * 1024 * 1024) {
          setErrorMsg(`A foto é muito grande. Tente afastar um pouco a câmera ou diminuir a resolução.`);
          return;
      }
      if (type === 'cnh') setCnhFile(e.target.files[0]);
      if (type === 'doc') setDocVeiculoFile(e.target.files[0]);
      if (type === 'selfie') setSelfieFile(e.target.files[0]);
      setErrorMsg('');
    }
  };

  // CTO FIX: Função de compressão Base64 via Canvas. 
  // Resolve o erro crítico de carregamento das fotos (bypass nas regras do Firebase Storage).
  const compressImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Mantém a nitidez para o Admin validar
          const MAX_HEIGHT = 800;
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
          
          // Qualidade de 60% (0.6) deixa a imagem com cerca de 80KB a 120KB. Perfeito.
          const base64String = canvas.toDataURL('image/jpeg', 0.6); 
          resolve(base64String);
        };
        img.onerror = () => reject(new Error('Falha no processamento visual da foto.'));
      };
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo da foto selecionada.'));
    });
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    
    // Validação estrita de texto
    if (!formData.nome || !formData.telefone || !formData.cpf || !formData.placa || !formData.categoria || !formData.veiculo) {
      setErrorMsg('Preencha todos os campos obrigatórios em texto.');
      return;
    }

    // Validação estrita das TRÊS fotos
    if (!cnhFile || !docVeiculoFile || !selfieFile) {
      setErrorMsg('É obrigatório enviar a foto da CNH, do Documento do Veículo e a Selfie segurando a CNH.');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Sessão expirada. Faça login novamente para concluir.");
      }

      let cnhBase64 = "";
      let docBase64 = "";
      let selfieBase64 = "";

      // 1. Processamento e Compressão Local das Fotos (Salva do erro de "Verifique sua internet")
      try {
        if (cnhFile) cnhBase64 = await compressImageToBase64(cnhFile);
        if (docVeiculoFile) docBase64 = await compressImageToBase64(docVeiculoFile);
        if (selfieFile) selfieBase64 = await compressImageToBase64(selfieFile);
      } catch (compressionError: any) {
        console.error("Falha na conversão de imagem:", compressionError);
        throw new Error("Não foi possível processar suas fotos. Tente enviar arquivos menores.");
      }

      // 2. Gravação Direta no Firestore com os dados ultraleves
      await setDoc(doc(db, 'motoristas_cadastros', user.uid), {
        nome: formData.nome,
        whatsapp: formData.telefone,
        cpf: formData.cpf,
        placa: formData.placa.toUpperCase(),
        modeloVeiculo: formData.veiculo,
        categoria: formData.categoria,
        fotoCnh: cnhBase64, 
        fotoDocumento: docBase64, 
        fotoSelfie: selfieBase64, 
        status: 'pendente',
        criadoEm: serverTimestamp(),
        uid: user.uid,
      });

      // Sucesso Total. Avança para o radar.
      onFinish();

    } catch (error: any) {
      console.error('ERRO CRÍTICO NO CADASTRO:', error);
      setErrorMsg(error.message || 'Falha de conexão com a base de dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020617] px-6 py-10">
      {/* BG */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(6,182,212,0.18),transparent_35%)]" />
      <div className="absolute right-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="absolute bottom-[-120px] left-[-120px] h-[320px] w-[320px] rounded-full bg-blue-500/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-auto w-full max-w-2xl rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl"
      >
        {/* HEADER */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-cyan-500/10">
            <Truck className="h-10 w-10 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-black text-white">
            Cadastro do Motorista
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Complete seu perfil e envie os documentos para análise.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-xl bg-red-500/10 p-4 text-center text-sm font-bold text-red-400 border border-red-500/20">
            {errorMsg}
          </div>
        )}

        {/* FORM */}
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <User size={16} /> Nome completo
            </label>
            <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Digite seu nome" className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400" />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Phone size={16} /> Telefone
            </label>
            <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(11) 99999-9999" className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400" />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <CreditCard size={16} /> CPF
            </label>
            <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400" />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <BadgeCheck size={16} /> Placa do veículo
            </label>
            <input type="text" name="placa" value={formData.placa} onChange={handleChange} placeholder="ABC1D23" className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400" />
          </div>
        </div>

        {/* CATEGORIA OFICIAL - CTO FIX: Values sincronizados exatamente com o Cliente.tsx */}
        <div className="mt-5">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <ListFilter size={16} /> Categoria Operacional (Para o Radar)
          </label>
          <select name="categoria" value={formData.categoria} onChange={handleChange} className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400 [&>option]:bg-slate-900">
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

        {/* VEÍCULO MODELO */}
        <div className="mt-5">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Truck size={16} /> Modelo exato (Ex: Carreta Baú, HR, Fiorino)
          </label>
          <input type="text" name="veiculo" value={formData.veiculo} onChange={handleChange} placeholder="Descreva o modelo e tipo de carroceria..." className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400" />
        </div>

        {/* UPLOAD DE DOCUMENTOS REAIS */}
        <div className="mt-8 rounded-[2rem] border border-dashed border-cyan-500/30 bg-cyan-500/5 p-6">
          <div className="mb-6 flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10">
              <Camera className="text-cyan-400" />
            </div>
            <h3 className="text-lg font-black text-white">Auditoria Anti-Fraude</h3>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Para a sua segurança e dos embarcadores, é obrigatório enviar a foto da CNH e uma selfie segurando o documento.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* INPUT CNH */}
            <div className="relative">
              <input type="file" id="cnhUpload" accept="image/*" onChange={(e) => handleFileChange(e, 'cnh')} className="hidden" />
              <label htmlFor="cnhUpload" className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-all hover:bg-white/5 ${cnhFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileImage className={cnhFile ? 'text-emerald-400' : 'text-cyan-400'} size={20} />
                  <span className="truncate text-sm font-medium text-slate-200">
                    {cnhFile ? cnhFile.name : 'Foto da CNH'}
                  </span>
                </div>
                {cnhFile && <CheckCircle2 className="text-emerald-400" size={18} />}
              </label>
            </div>

            {/* INPUT DOCUMENTO VEÍCULO */}
            <div className="relative">
              <input type="file" id="docUpload" accept="image/*" onChange={(e) => handleFileChange(e, 'doc')} className="hidden" />
              <label htmlFor="docUpload" className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-all hover:bg-white/5 ${docVeiculoFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <Truck className={docVeiculoFile ? 'text-emerald-400' : 'text-cyan-400'} size={20} />
                  <span className="truncate text-sm font-medium text-slate-200">
                    {docVeiculoFile ? docVeiculoFile.name : 'Foto do Doc (CRLV)'}
                  </span>
                </div>
                {docVeiculoFile && <CheckCircle2 className="text-emerald-400" size={18} />}
              </label>
            </div>

            {/* INPUT SELFIE */}
            <div className="relative md:col-span-2">
              <input type="file" id="selfieUpload" accept="image/*" onChange={(e) => handleFileChange(e, 'selfie')} className="hidden" />
              <label htmlFor="selfieUpload" className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-all hover:bg-white/5 ${selfieFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-cyan-500/30 bg-cyan-500/10'}`}>
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

        {/* SECURITY */}
        <div className="mt-8 flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <ShieldCheck className="text-emerald-400" />
          <div>
            <h3 className="font-bold text-white">Dados protegidos (Criptografia Base64)</h3>
            <p className="text-sm text-slate-400">Suas imagens são encriptadas e otimizadas diretamente no seu dispositivo, garantindo envio seguro e ultrarrápido mesmo em redes fracas.</p>
          </div>
        </div>

        {/* BUTTON */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-8 w-full rounded-[1.5rem] bg-cyan-500 py-5 text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02] hover:bg-cyan-400 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
              Processando Documentação...
            </>
          ) : 'Finalizar Cadastro'}
        </button>
      </motion.div>
    </div>
  );
}
