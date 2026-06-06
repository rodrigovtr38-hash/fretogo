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
  ListFilter
} from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase';

interface DriverCadastroProps {
  onFinish: () => void;
}

export default function DriverCadastro({
  onFinish,
}: DriverCadastroProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    placa: '',
    veiculo: '',
    categoria: '', // 🔥 CAMPO CRÍTICO ADICIONADO PARA A ROLETA
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    
    // Validação básica para não salvar cadastro vazio
    if (!formData.nome || !formData.telefone || !formData.cpf || !formData.placa || !formData.categoria) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      console.log('CADASTRANDO MOTORISTA (FIRESTORE):', formData);

      // 🔥 CORREÇÃO: Salva de verdade no banco de dados com status 'pendente'
      await setDoc(doc(db, 'motoristas_cadastros', user.uid), {
        nome: formData.nome,
        whatsapp: formData.telefone,
        cpf: formData.cpf,
        placa: formData.placa.toUpperCase(),
        modeloVeiculo: formData.veiculo,
        categoria: formData.categoria, // Chave primária para o Dispatch
        status: 'pendente', // Gatilho para o Painel Admin
        criadoEm: serverTimestamp(),
        uid: user.uid,
      });

      // Avança a tela apenas se salvou com sucesso
      onFinish();

    } catch (error: any) {
      console.error('ERRO AO CADASTRAR MOTORISTA:', error);
      setErrorMsg('Ocorreu um erro ao enviar seu cadastro. Tente novamente.');
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
            Complete seu perfil para começar a receber fretes em tempo real.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 rounded-xl bg-red-500/10 p-4 text-center text-sm font-bold text-red-400 border border-red-500/20">
            {errorMsg}
          </div>
        )}

        {/* FORM */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* NOME */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <User size={16} /> Nome completo
            </label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              placeholder="Digite seu nome"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400"
            />
          </div>

          {/* TELEFONE */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Phone size={16} /> Telefone
            </label>
            <input
              type="text"
              name="telefone"
              value={formData.telefone}
              onChange={handleChange}
              placeholder="(11) 99999-9999"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400"
            />
          </div>

          {/* CPF */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <CreditCard size={16} /> CPF
            </label>
            <input
              type="text"
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              placeholder="000.000.000-00"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400"
            />
          </div>

          {/* PLACA */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <BadgeCheck size={16} /> Placa do veículo
            </label>
            <input
              type="text"
              name="placa"
              value={formData.placa}
              onChange={handleChange}
              placeholder="ABC1D23"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400"
            />
          </div>
        </div>

        {/* CATEGORIA OFICIAL */}
        <div className="mt-5">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <ListFilter size={16} /> Categoria Operacional (Para o Radar)
          </label>
          <select
            name="categoria"
            value={formData.categoria}
            onChange={handleChange}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400 [&>option]:bg-slate-900"
          >
            <option value="">Selecione a categoria principal</option>
            <option value="moto">Moto</option>
            <option value="carro">Carro Pequeno / Hatch</option>
            <option value="utilitario">Utilitário / Van</option>
            <option value="toco">Caminhão Toco</option>
            <option value="truck">Caminhão Truck</option>
            <option value="carreta">Carreta LS</option>
            <option value="bitrem">Bi-trem / Cegonha</option>
          </select>
        </div>

        {/* VEÍCULO MODELO */}
        <div className="mt-5">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
            <Truck size={16} /> Modelo exato do veículo
          </label>
          <input
            type="text"
            name="veiculo"
            value={formData.veiculo}
            onChange={handleChange}
            placeholder="Ex: HR, Fiorino, Scania FH..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white outline-none transition-all focus:border-cyan-400"
          />
        </div>

        {/* DOCUMENTOS */}
        <div className="mt-8 rounded-[2rem] border border-dashed border-cyan-500/30 bg-cyan-500/5 p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10">
              <Camera className="text-cyan-400" />
            </div>
            <h3 className="text-lg font-black text-white">
              Envio de documentos
            </h3>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              CNH, documento do veículo e selfie serão enviados na próxima etapa.
            </p>
          </div>
        </div>

        {/* SECURITY */}
        <div className="mt-8 flex items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <ShieldCheck className="text-emerald-400" />
          <div>
            <h3 className="font-bold text-white">
              Dados protegidos
            </h3>
            <p className="text-sm text-slate-400">
              Todas as informações são criptografadas e protegidas pela plataforma.
            </p>
          </div>
        </div>

        {/* BUTTON */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-8 w-full rounded-[1.5rem] bg-cyan-500 py-5 text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02] hover:bg-cyan-400 disabled:opacity-60"
        >
          {loading ? 'Validando...' : 'Finalizar Cadastro'}
        </button>
      </motion.div>
    </div>
  );
}
