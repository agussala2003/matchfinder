import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

// Services & Constants
import { useToast } from '@/context/ToastContext';
import { POSICIONES_ARGENTINAS, POSICIONES_LISTA, type Posicion } from '@/lib/constants';
import { authService } from '@/services/auth.service';

// UI Components Modulares
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthInput } from '@/components/ui/AuthInput';
import { Button } from '@/components/ui/Button';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { Select } from '@/components/ui/Select';

export default function OnboardingScreen() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState<Posicion>('ANY');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ username?: string; fullName?: string }>({});

  const { showToast } = useToast();

  const positionOptions = useMemo(() => {
    return POSICIONES_LISTA.map(key => ({
        label: POSICIONES_ARGENTINAS[key],
        value: key
    }));
  }, []);

  useEffect(() => {
    async function loadSession() {
      const result = await authService.getSession();
      if (result.success && result.data) {
        setUserId(result.data.user.id);
      }
    }
    loadSession();
  }, []);

  async function completeProfile() {
    setErrors({});

    if (!username || !fullName) {
      showToast('Completa tu nombre y usuario para continuar', 'error');
      return;
    }

    if (!userId) {
      showToast('No hay usuario autenticado', 'error');
      return;
    }

    setLoading(true);

    try {
      const result = await authService.upsertProfile({
        id: userId,
        username: username.trim(),
        full_name: fullName.trim(),
        position: position,
      });

      if (!result.success) {
        showToast(result.error || 'Error al crear el perfil', 'error');
        setLoading(false);
        return;
      }

      showToast('¡Perfil creado exitosamente!', 'success');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Unexpected error:', error);
      showToast('Ocurrió un error inesperado', 'error');
      setLoading(false);
    }
  }

  return (
    <ScreenLayout scrollable withPadding>
      <View className="flex-1 justify-center py-8">
        
        <AuthHeader 
            title="¡CASI LISTO!" 
            subtitle="Completa tu ficha técnica para saltar a la cancha."
            showLogo={false}
        />

        <View className="mt-8 gap-5">
            <AuthInput
                label="Nombre Completo"
                placeholder="Ej: Lionel Andrés"
                value={fullName}
                onChangeText={setFullName}
                error={errors.fullName}
            />

            <AuthInput
                label="Nombre de Usuario (@)"
                placeholder="Ej: leomessi10"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                error={errors.username}
            />

            <Select 
                label="Posición Favorita"
                placeholder="Selecciona tu posición"
                options={positionOptions}
                value={position}
                onChange={(val) => setPosition(val as Posicion)}
            />

            <View className="mt-4">
              <Button 
                  title="Finalizar Registro" 
                  onPress={completeProfile} 
                  loading={loading}
              />
            </View>
        </View>

        <Text className="text-gray-600 text-center text-xs mt-8 font-body">
            Al completar tu registro aceptas nuestras Reglas de Juego y Política de Fair Play.
        </Text>
      </View>
    </ScreenLayout>
  );
}