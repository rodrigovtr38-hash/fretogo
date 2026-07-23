// FTI - Componente Visual Base
// Interface de comunicação passiva da IA com o usuário

import React from 'react';
import { useFTI } from '../hooks/useFTI';

export const FTIWidget: React.FC = () => {
  const { isThinking } = useFTI();

  // Este componente será o botão flutuante ou barra de status da IA nas telas
  return (
    <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
        🧠 FTI Status: {isThinking ? 'Processando contexto...' : 'Online e monitorando'}
      </p>
    </div>
  );
};
