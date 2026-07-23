# 🧠 FretoGo Intelligence (FTI) - Constituição Oficial

## 🎯 Objetivo da IA
A FTI atua como o Cérebro Logístico e Funcional da FretoGo. Ela não é um chatbot convencional; é uma camada de inteligência passiva que auxilia, explica, recomenda e analisa o contexto operacional em tempo real para Empresas (Embarcadores) e Motoristas (Agregados), mantendo a estabilidade financeira e operacional.

## 🏗️ Arquitetura e Regras de Ouro
1. **Isolamento Absoluto:** Todo o código da IA vive APENAS dentro de `src/core/ai/`. Nada vaza para o resto do sistema.
2. **Desacoplamento Operacional:** A IA interpreta eventos e sugere ações, mas NUNCA controla, aprova pagamentos, altera rotas ou interage diretamente com o Firebase/Mercado Pago sem que o usuário tome a ação na interface oficial.
3. **Responsabilidade Única:** Cada arquivo possui uma função estrita. Nunca duplicar, nunca misturar lógicas.

## 📁 Estrutura de Pastas
*   `/analytics/` - Extração de métricas de engajamento e funil de conversão.
*   `/components/` - Elementos visuais React isolados (Widget, FloatingButton, Chat).
*   `/config/` - Chaves e configurações globais de inicialização da IA.
*   `/engine/` - O núcleo de processamento (Roteamento de intenções, Validações).
*   `/events/` - Sistema que escuta as ações do usuário sem interferir na UI.
*   `/hooks/` - Conexão limpa entre os componentes React e a Engine da IA.
*   `/knowledge/` - O "Cérebro" de regras de negócios (Textos puros em Markdown).
*   `/memory/` - Controle de contexto (quem é o usuário, em qual tela ele está).
*   `/prompts/` - Geradores de contexto para a API de LLM.
*   `/services/` - Comunicação com APIs externas (Gemini, Logger, Cache local).
*   `/types/` - Contratos rigorosos de TypeScript para toda a arquitetura FTI.
*   `/utils/` - Ferramentas de formatação de moeda, data, tempo e tokens.

## 🔄 Fluxos Principais
*   **Fluxo de Eventos:** O aplicativo dispara gatilhos (ex: `empresa_abandonou`) -> A FTI escuta (Observer) -> Atualiza o Contexto.
*   **Fluxo de Memória:** O estado atual (Tela, ID do Frete, Categoria) é mantido vivo no `ia.session.ts`.
*   **Fluxo React:** O `IAWidget.tsx` consome os Hooks da IA, garantindo que o ciclo de renderização não quebre o painel principal.

## ⚠️ Checklist de Manutenção Diária
- [ ] Verificar se há dependências circulares nos módulos de IA.
- [ ] Confirmar se a IA continua isolada (sem imports proibidos do App Principal).
- [ ] Validar consumo de tokens na integração com API externa.
- [ ] Manter os documentos em `/knowledge/` atualizados com novas objeções de mercado.

> **Regra Magna:** A FretoGo Intelligence é um funcionário digital de alta performance. Suas respostas devem ser firmes, estratégicas e 100% embasadas na realidade técnica da plataforma.
