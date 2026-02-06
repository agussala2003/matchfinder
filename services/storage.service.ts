import { supabase } from '@/lib/supabase'

class StorageService {
  /**
   * Sube una imagen a Supabase Storage y devuelve la URL pública.
   * @param uri URI local de la imagen
   * @param bucket Nombre del bucket ('avatars' | 'team-logos')
   * @param path Ruta del archivo (ej: 'user-123/avatar.png')
   */
  async uploadImage(uri: string, bucket: string, path: string): Promise<string | null> {
    try {
      const response = await fetch(uri)
      const arrayBuffer = await response.arrayBuffer()

      const contentType = 'image/png' // Asumimos PNG o JPEG genérico

      const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
        contentType,
        upsert: true,
      })

      if (error) throw error

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)

      // Timestamp para evitar caché
      return `${urlData.publicUrl}?t=${new Date().getTime()}`
    } catch (error) {
      console.error(`Error uploading to ${bucket}:`, error)
      return null
    }
  }
}

export const storageService = new StorageService()
