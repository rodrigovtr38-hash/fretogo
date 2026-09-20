// ============================================================================
// ARQUIVO: src/core/ai/memory/ia.memory.ts
// PASTA: src/core/ai/memory/
// CTO-Log: FASE 3 - BLOCO 3 (Faxina de Banco de Dados)
// Status: Garbage Collector perigoso extirpado. Apenas memória de sessão na RAM.
// ============================================================================

export interface MessageRecord {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

/**
 * Classe responsável por manter a coerência da conversa na sessão atual do usuário.
 * Totalmente isolada de banco de dados e persistência física.
 */
export class FTIMemoryManager {
  private history: Map<string, MessageRecord[]> = new Map();
  private readonly MAX_HISTORY_LENGTH = 8; 

  // --- GERENCIAMENTO DE MEMÓRIA VOLÁTIL (CHAT E CONTEXTO) ---

  public getHistory(userId: string): MessageRecord[] {
    return this.history.get(userId) || [];
  }

  public addMessage(userId: string, role: 'user' | 'model', content: string): void {
    const currentHistory = this.getHistory(userId);
    
    currentHistory.push({
      role,
      content,
      timestamp: Date.now()
    });

    if (currentHistory.length > this.MAX_HISTORY_LENGTH) {
      currentHistory.shift(); 
    }

    this.history.set(userId, currentHistory);
  }

  public clearMemory(userId: string): void {
    this.history.delete(userId);
  }
}

export const ftiMemory = new FTIMemoryManager();
