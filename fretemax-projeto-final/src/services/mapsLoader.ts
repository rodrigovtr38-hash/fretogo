// src/services/mapsLoader.ts

import {
  Loader,
} from '@googlemaps/js-api-loader';

/* =========================================================
   TYPES
========================================================= */

type MapsRuntimeStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error';

type MapsLoaderConfig = {
  apiKey: string;
  libraries?: (
    | 'places'
    | 'geometry'
    | 'routes'
    | 'marker'
  )[];
  language?: string;
  region?: string;
  retries?: number;
};

/* =========================================================
   GLOBAL TYPES
========================================================= */

declare global {
  interface Window {
    __FRETOGO_MAPS_LOADER__?:
      MapsLoaderService;

    __FRETOGO_MAPS_READY__?: boolean;
  }
}

/* =========================================================
   MAPS LOADER SERVICE
========================================================= */

class MapsLoaderService {
  private loader:
    | Loader
    | null = null;

  private mapsPromise:
    | Promise<
        typeof google
      >
    | null = null;

  private status:
    MapsRuntimeStatus =
    'idle';

  private error:
    Error | null = null;

  private retries = 0;

  private readonly maxRetries =
    3;

  /* =======================================================
     STATUS
  ======================================================= */

  getStatus() {
    return this.status;
  }

  getError() {
    return this.error;
  }

  isReady() {
    return (
      this.status ===
      'ready'
    );
  }

  /* =======================================================
     LOAD MAPS
  ======================================================= */

  async load(
    config?: MapsLoaderConfig,
  ): Promise<
    typeof google
  > {
    if (
      typeof window ===
      'undefined'
    ) {
      throw new Error(
        'Maps indisponível fora do browser.',
      );
    }

    if (
      window.google?.maps
    ) {
      this.status =
        'ready';

      window.__FRETOGO_MAPS_READY__ =
        true;

      return window.google;
    }

    if (
      this.mapsPromise
    ) {
      return this.mapsPromise;
    }

    this.status =
      'loading';

    // 🔥 GATILHO CORRIGIDO: Lê a variável com o nome exato que está na sua Vercel
    const apiKey =
      config?.apiKey ||
      import.meta.env.VITE_GOOGLE_MAPS_KEY || 
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      this.status =
        'error';

      throw new Error(
        '❌ CHAVE DO GOOGLE MAPS NÃO ENCONTRADA.',
      );
    }

    this.loader =
      new Loader({
        apiKey,

        version: 'weekly',

        language:
          config?.language ||
          'pt-BR',

        region:
          config?.region ||
          'BR',

        // 🔥 INJETADO: Bibliotecas necessárias para Rotas e Marcadores Múltiplos
        libraries:
          config?.libraries || [
            'places',
            'geometry',
            'routes',
            'marker'
          ],
      });

    this.mapsPromise =
      this.initializeLoader();

    return this.mapsPromise;
  }

  /* =======================================================
     INTERNAL LOADER
  ======================================================= */

  private async initializeLoader(): Promise<
    typeof google
  > {
    try {
      await this.loader?.load();

      if (
        !window.google ||
        !window.google.maps
      ) {
        throw new Error(
          'Google Maps runtime indisponível.',
        );
      }

      this.status =
        'ready';

      this.error = null;

      window.__FRETOGO_MAPS_READY__ =
        true;

      console.log(
        '✅ Google Maps runtime carregado com sucesso.',
      );

      return window.google;
    } catch (error) {
      this.status =
        'error';

      this.error =
        error instanceof Error
          ? error
          : new Error(
              'Erro desconhecido Maps.',
            );

      console.error(
        '❌ Maps Loader Error:',
        this.error,
      );

      if (
        this.retries <
        this.maxRetries
      ) {
        this.retries += 1;

        console.warn(
          `♻️ Retry Google Maps (${this.retries}/${this.maxRetries})`,
        );

        this.mapsPromise =
          null;

        return this.load();
      }

      throw this.error;
    }
  }
}

/* =========================================================
   SINGLETON
========================================================= */

function createMapsLoader() {
  if (
    typeof window !==
      'undefined' &&
    window.__FRETOGO_MAPS_LOADER__
  ) {
    return window.__FRETOGO_MAPS_LOADER__;
  }

  const service =
    new MapsLoaderService();

  if (
    typeof window !==
    'undefined'
  ) {
    window.__FRETOGO_MAPS_LOADER__ =
      service;
  }

  return service;
}

export const mapsLoader =
  createMapsLoader();

export default mapsLoader;
