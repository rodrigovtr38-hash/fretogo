// src/services/locationService.ts

type Coordinates = {
  lat: number;
  lng: number;
};

type ViaCepResponse = {
  cep?: string;

  logradouro?: string;

  bairro?: string;

  localidade?: string;

  uf?: string;

  erro?: boolean;
};

type RouteResult = {
  distanceKm: number;

  durationMinutes: number;
};

/* =========================================================
   LOCATION SERVICE
========================================================= */

class LocationService {
  private readonly fallbackRegions: Record<
    number,
    Coordinates
  > = {
    0: {
      lat: -23.5505,
      lng: -46.6333,
    },

    1: {
      lat: -22.9068,
      lng: -43.1729,
    },

    2: {
      lat: -19.9167,
      lng: -43.9345,
    },

    3: {
      lat: -12.9714,
      lng: -38.5014,
    },

    4: {
      lat: -8.0476,
      lng: -34.877,
    },

    5: {
      lat: -3.7319,
      lng: -38.5267,
    },

    6: {
      lat: -15.7797,
      lng: -47.9297,
    },

    7: {
      lat: -25.4284,
      lng: -49.2733,
    },

    8: {
      lat: -30.0346,
      lng: -51.2177,
    },

    9: {
      lat: -16.6869,
      lng: -49.2648,
    },
  };

  private readonly cepCache =
    new Map<
      string,
      Coordinates
    >();

  /* =======================================================
     CEP LOOKUP
  ======================================================= */

  async buscarEnderecoPorCEP(
    cep: string,
    signal?: AbortSignal,
  ): Promise<
    ViaCepResponse | null
  > {
    try {
      const sanitizedCep =
        cep.replace(
          /\D/g,
          '',
        );

      if (
        sanitizedCep.length !==
        8
      ) {
        return null;
      }

      const response =
        await fetch(
          `https://viacep.com.br/ws/${sanitizedCep}/json/`,
          {
            method: 'GET',

            signal,

            headers: {
              'Content-Type':
                'application/json',
            },
          },
        );

      if (!response.ok) {
        return null;
      }

      const data: ViaCepResponse =
        await response.json();

      if (data.erro) {
        return null;
      }

      return data;
    } catch (error) {
      console.error(
        '❌ ERRO CEP:',
        error,
      );

      return null;
    }
  }

  /* =======================================================
     CURRENT LOCATION
  ======================================================= */

  async getCurrentLocation(): Promise<Coordinates | null> {
    if (
      typeof navigator ===
      'undefined'
    ) {
      return null;
    }

    if (
      !navigator.geolocation
    ) {
      console.warn(
        '⚠️ Geolocation indisponível.',
      );

      return null;
    }

    return new Promise(
      resolve => {
        navigator.geolocation.getCurrentPosition(
          position => {
            resolve({
              lat: position
                .coords
                .latitude,

              lng: position
                .coords
                .longitude,
            });
          },

          error => {
            console.error(
              '❌ GEOLOCATION ERROR:',
              error,
            );

            resolve(null);
          },

          {
            enableHighAccuracy:
              true,

            timeout: 15000,

            maximumAge: 10000,
          },
        );
      },
    );
  }

  /* =======================================================
     CEP TO COORDINATES
  ======================================================= */

  async getCoordinatesFromCEP(
    cep: string,
  ): Promise<Coordinates | null> {
    try {
      const sanitizedCep =
        cep.replace(
          /\D/g,
          '',
        );

      if (
        this.cepCache.has(
          sanitizedCep,
        )
      ) {
        return (
          this.cepCache.get(
            sanitizedCep,
          ) || null
        );
      }

      const address =
        await this.buscarEnderecoPorCEP(
          sanitizedCep,
        );

      if (!address) {
        return this.getFallbackCoords(
          sanitizedCep,
        );
      }

      /*
       * IMPORTANTE:
       * Mantém compatibilidade
       * sem alterar lógica logística.
       */

      const fallback =
        this.getFallbackCoords(
          sanitizedCep,
        );

      this.cepCache.set(
        sanitizedCep,
        fallback,
      );

      return fallback;
    } catch (error) {
      console.error(
        '❌ CEP COORDINATES ERROR:',
        error,
      );

      return null;
    }
  }

  /* =======================================================
     ROUTE CALCULATION
  ======================================================= */

  async calculateRoute(
    origem: Coordinates,
    destino: Coordinates,
  ): Promise<RouteResult> {
    const distanceKm =
      this.calcularDistanciaKm(
        origem,
        destino,
      );

    /*
     * Estimativa operacional segura.
     * Mantida para preservar
     * compatibilidade atual.
     */

    const averageSpeedKmH =
      38;

    const durationMinutes =
      Math.max(
        5,
        Math.round(
          (distanceKm /
            averageSpeedKmH) *
            60,
        ),
      );

    return {
      distanceKm,

      durationMinutes,
    };
  }

  /* =======================================================
     FALLBACK COORDS
  ======================================================= */

  getFallbackCoords(
    cep: string,
  ): Coordinates {
    const prefix =
      parseInt(
        cep
          .replace(
            /\D/g,
            '',
          )
          .substring(0, 1) ||
          '0',
        10,
      );

    return (
      this.fallbackRegions[
        prefix
      ] ||
      this.fallbackRegions[0]
    );
  }

  /* =======================================================
     DISTANCE
  ======================================================= */

  calcularDistanciaKm(
    origem: Coordinates,
    destino: Coordinates,
  ): number {
    const R = 6371;

    const dLat =
      ((destino.lat -
        origem.lat) *
        Math.PI) /
      180;

    const dLon =
      ((destino.lng -
        origem.lng) *
        Math.PI) /
      180;

    const a =
      Math.sin(
        dLat / 2,
      ) *
        Math.sin(
          dLat / 2,
        ) +
      Math.cos(
        (origem.lat *
          Math.PI) /
          180,
      ) *
        Math.cos(
          (destino.lat *
            Math.PI) /
            180,
        ) *
        Math.sin(
          dLon / 2,
        ) *
        Math.sin(
          dLon / 2,
        );

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      );

    return Number(
      (R * c).toFixed(2),
    );
  }

  /* =======================================================
     VALIDATE COORDS
  ======================================================= */

  validarCoordenadas(
    coords?: Coordinates,
  ): boolean {
    if (!coords) {
      return false;
    }

    if (
      typeof coords.lat !==
        'number' ||
      typeof coords.lng !==
        'number'
    ) {
      return false;
    }

    if (
      Number.isNaN(
        coords.lat,
      ) ||
      Number.isNaN(
        coords.lng,
      )
    ) {
      return false;
    }

    return true;
  }
}

export const locationService =
  new LocationService();
