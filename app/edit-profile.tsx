import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

// Services & Constants
import { useToast } from '@/context/ToastContext';
import { POSICIONES_ARGENTINAS, POSICIONES_LISTA, type Posicion } from '@/lib/constants';
import { authService } from '@/services/auth.service';

// UI Components
import { AuthHeader } from '@/components/auth/AuthHeader';
import { AuthInput } from '@/components/ui/AuthInput';
import { Button } from '@/components/ui/Button';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { Select } from '@/components/ui/Select';

export default function EditProfileScreen() {
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Form State
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [position, setPosition] = useState<Posicion>('ANY');
    const [errors, setErrors] = useState<{ username?: string; fullName?: string }>({});

    const positionOptions = useMemo(() => {
        return POSICIONES_LISTA.map(key => ({
            label: POSICIONES_ARGENTINAS[key],
            value: key
        }));
    }, []);

    useEffect(() => {
        loadProfileData();
    }, []);

    async function loadProfileData() {
        try {
            const session = await authService.getSession();
            if (!session.data?.user) {
                router.replace('/login');
                return;
            }

            const uid = session.data.user.id;
            setUserId(uid);

            const { profile } = await authService.checkProfile(uid);

            if (profile) {
                setUsername(profile.username);
                setFullName(profile.full_name);
                const pos = (profile.position as Posicion) || 'ANY';
                setPosition(pos);
            }
        } catch (e) {
            console.error(e);
            showToast('Error al cargar perfil', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setErrors({});
        if (!username || !fullName) {
            showToast('Todos los campos son obligatorios', 'error');
            return;
        }
        if (!userId) return;

        setSaving(true);

        try {
            const { profile: currentProfile } = await authService.checkProfile(userId);

            const result = await authService.upsertProfile({
                id: userId,
                username: username.trim(),
                full_name: fullName.trim(),
                position: position,
                avatar_url: currentProfile?.avatar_url 
            });

            if (result.success) {
                showToast('Perfil actualizado correctamente', 'success');
                router.back();
            } else {
                showToast(result.error || 'Error al actualizar', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Ocurrió un error inesperado', 'error');
        } finally {
            setSaving(false);
        }
    }

    return (
        <ScreenLayout scrollable withPadding loading={loading}>
            <View className="flex-1 justify-center py-8">
                <AuthHeader
                    title="EDITAR PERFIL"
                    showLogo={false}
                />

                <View className="mt-8 gap-5">
                    <AuthInput
                        label="Nombre Completo"
                        value={fullName}
                        onChangeText={setFullName}
                        error={errors.fullName}
                    />

                    <AuthInput
                        label="Nombre de Usuario (@)"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        error={errors.username}
                    />

                    <Select
                        label="Posición"
                        options={positionOptions}
                        value={position}
                        onChange={(val) => setPosition(val as Posicion)}
                    />

                    <View className="gap-3 mt-4">
                        <Button
                            title="Guardar Cambios"
                            onPress={handleSave}
                            loading={saving}
                        />

                        <Button
                            title="Cancelar"
                            variant="ghost"
                            onPress={() => router.back()}
                            disabled={saving}
                        />
                    </View>
                </View>
            </View>
        </ScreenLayout>
    );
}