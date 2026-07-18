// =========================================================
// NOME DO ARQUIVO: src/lib/utils.ts
// CTO-Log: Utilitário Core de Estilização Dinâmica (Tailwind Merge).
// Status: Tipagem estrita validada. Previne conflitos de CSS em tempo de execução.
// =========================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Motor de fusão de classes CSS.
 * Permite injetar classes dinâmicas e condicionais no Tailwind sem causar
 * colisões de especificidade (ex: sobrescrever 'bg-red-500' com 'bg-blue-500').
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
