import { CONFIG } from '@/lib/config';
import { supabase } from '@/lib/supabase';

class StorageService {
  /**
   * Sube una imagen a Supabase Storage y devuelve la URL pública.
   * Versión optimizada para Expo 50+ usando ArrayBuffer directo.
   */
  async uploadAvatar(uri: string, userId: string): Promise<string | null> {
    try {
      // 1. Transformar la imagen en un buffer (binario) usando fetch nativo
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      // 2. Configurar nombre y tipo
      const fileName = `${userId}/avatar.png`;
      const contentType = 'image/png';

      // 3. Subir a Supabase
      const { error } = await supabase.storage
        .from(CONFIG.supabase.storageBucket)
        .upload(fileName, arrayBuffer, {
          contentType,
          upsert: true, // Sobrescribir la anterior
        });

      if (error) throw error;

      // 4. Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(CONFIG.supabase.storageBucket)
        .getPublicUrl(fileName);

      // Truco: Agregamos timestamp para forzar que la imagen se refresque en la app
      return `${urlData.publicUrl}?t=${new Date().getTime()}`;

    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }
  }
}

export const storageService = new StorageService();