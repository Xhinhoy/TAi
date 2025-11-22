/**
 * API service para validación de experiencias
 */

import { api } from './client';

export interface QualityCheckResponse {
  es_valido: boolean;
  tiene_imagen_lugar: boolean;
  tiene_texto_descripcion: boolean;
  tiene_ubicacion_visible: boolean;
  tiene_nombre_visible: boolean;
  plataforma_detectada: string;
  confianza_extraccion: number;
  problemas: string[];
  sugerencia?: string;
}

export interface PlaceIdentification {
  nombre: string;
  tipo: string;
  ubicacion: {
    ciudad: string;
    pais: string;
  };
  confianza_identificacion: number;
  query_busqueda: string;
}

export interface RedFlag {
  descripcion: string;
  severidad: 'alta' | 'media' | 'baja';
  frecuencia: string;
  fuente: string;
}

export interface Aspecto {
  aspecto: string;
  mencionado_en: string;
  descripcion?: string;
}

export interface DiscrepanciaImagenRealidad {
  hay_discrepancia: boolean;
  elementos_coinciden: string[];
  elementos_no_coinciden: string[];
}

export interface TendenciaTemporal {
  mejorando: boolean;
  estable: boolean;
  empeorando: boolean;
  evidencia: string;
}

export interface Analisis {
  aspectos_positivos: Aspecto[];
  aspectos_negativos: Aspecto[];
  red_flags: RedFlag[];
  discrepancia_imagen_realidad: DiscrepanciaImagenRealidad;
  tendencia_temporal: TendenciaTemporal;
}

export interface Alternativa {
  nombre: string;
  ubicacion: string;
  por_que_mejor: string;
  rating?: number;
  distancia_km?: number;
}

export interface ValidationResponse {
  lugar_identificado: PlaceIdentification;
  score_realidad: number;
  recomendacion: 'RESERVAR_CON_CONFIANZA' | 'CONSIDERAR_ALTERNATIVAS' | 'NO_RECOMENDADO';
  razon_recomendacion: string;
  analisis: Analisis;
  alternativas: Alternativa[];
  fuentes_consultadas: {
    google_places: boolean;
    tripadvisor: boolean;
  };
  tiempo_procesamiento_segundos: number;
}

export const validationService = {
  /**
   * Pre-valida la calidad de un screenshot
   */
  async checkQuality(imageUri: string): Promise<QualityCheckResponse> {
    const formData = new FormData();

    formData.append('screenshot', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'screenshot.jpg',
    } as any);

    const response = await api.post('/experience-validation/check-quality', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 10000, // 10 segundos
    });

    return response.data;
  },

  /**
   * Valida una experiencia desde un screenshot
   */
  async validate(imageUri: string, skipCache: boolean = false): Promise<ValidationResponse> {
    console.log('📤 validationService.validate() llamado');
    console.log('📸 imageUri:', imageUri);
    console.log('🔄 skipCache:', skipCache);

    const formData = new FormData();

    // Extraer el nombre del archivo de la URI
    const filename = imageUri.split('/').pop() || 'screenshot.jpg';

    formData.append('screenshot', {
      uri: imageUri,
      type: 'image/jpeg',
      name: filename,
    } as any);

    console.log('📦 FormData creado con filename:', filename);
    console.log('🌐 Endpoint: /experience-validation/validate');
    console.log('⏱️  Timeout: 60000ms (1 minuto)');

    try {
      console.log('📡 Enviando petición POST...');
      const response = await api.post('/experience-validation/validate', formData, {
        params: { skip_cache: skipCache },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 segundos (el backend puede tardar ~45s)
        transformRequest: (data, headers) => {
          // NO transformar FormData - dejarlo como está
          console.log('🔄 transformRequest ejecutado');
          return data;
        },
      });

      console.log('✅ Respuesta recibida del backend');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error en validationService.validate():', error.message);
      console.error('Error code:', error.code);

      if (error.request) {
        console.error('❌ Request fue enviado pero sin respuesta');
        console.error('Request:', error.request);
      }

      throw error;
    }
  },

  /**
   * Health check del servicio
   */
  async health(): Promise<string> {
    const response = await api.get('/experience-validation/health');
    return response.data;
  },
};
