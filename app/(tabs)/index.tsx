import { Bell, MapPin } from 'lucide-react-native'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HomeScreen() {
  return (
    <SafeAreaView className='flex-1 bg-background'>
      <ScrollView className='flex-1 px-4'>
        {/* HEADER SUPERIOR */}
        <View className='flex-row justify-between items-center mt-4 mb-6'>
          <View>
            <Text className='text-text-muted font-body text-sm'>Bienvenido de nuevo,</Text>
            <Text className='text-text-main font-title text-3xl uppercase tracking-wider'>
              Agustín
            </Text>
          </View>
          {/* Avatar y Notificaciones */}
          <View className='flex-row items-center gap-4'>
            <TouchableOpacity className='bg-card p-2 rounded-full border border-border'>
              <Bell size={24} color='#39FF14' />
            </TouchableOpacity>
            <View className='h-10 w-10 bg-modal rounded-full border-2 border-primary' />
          </View>
        </View>

        {/* HERO SECTION: PRÓXIMO PARTIDO */}
        <View className='bg-card rounded-2xl p-0 border border-border overflow-hidden mb-6'>
          {/* Cabecera del Hero */}
          <View className='bg-primary/10 p-3 flex-row justify-between items-center'>
            <View className='flex-row items-center gap-1'>
              <MapPin size={14} color='#39FF14' />
              <Text className='text-primary font-bodyBold text-xs uppercase'>
                Sede: Fútbol 5 Palermo
              </Text>
            </View>
            <Text className='text-text-main font-title text-xs bg-error px-2 py-0.5 rounded'>
              HOY 20:00HS
            </Text>
          </View>

          {/* VS Card */}
          <View className='p-6 flex-row justify-between items-center'>
            {/* Equipo Local */}
            <View className='items-center'>
              <View className='w-16 h-16 bg-modal rounded-full mb-2 items-center justify-center'>
                <Text className='text-2xl'>🦁</Text>
              </View>
              <Text className='text-text-main font-title text-lg'>TU EQUIPO</Text>
            </View>

            <Text className='text-text-muted font-title text-2xl italic'>VS</Text>

            {/* Rival */}
            <View className='items-center'>
              <View className='w-16 h-16 bg-modal/30 rounded-full mb-2 items-center justify-center border border-dashed border-border'>
                <Text className='text-2xl text-text-muted'>?</Text>
              </View>
              <Text className='text-text-muted font-title text-lg'>BUSCANDO...</Text>
            </View>
          </View>

          {/* Botón de Acción Principal */}
          <TouchableOpacity className='bg-primary m-4 py-3 rounded-xl items-center active:opacity-90'>
            <Text className='text-background font-title text-xl uppercase'>BUSCAR RIVAL AHORA</Text>
          </TouchableOpacity>
        </View>

        {/* ACCESOS RÁPIDOS */}
        <Text className='text-text-main font-title text-xl mb-4 uppercase'>Acciones Rápidas</Text>
        <View className='flex-row gap-3 mb-8'>
          <TouchableOpacity className='flex-1 bg-card p-4 rounded-xl border border-border items-start'>
            <Text className='text-primary font-title text-lg mb-1'>+ CREAR</Text>
            <Text className='text-text-muted font-body text-xs'>Nuevo Equipo</Text>
          </TouchableOpacity>

          <TouchableOpacity className='flex-1 bg-card p-4 rounded-xl border border-border items-start'>
            <Text className='text-primary font-title text-lg mb-1'>BUSCO</Text>
            <Text className='text-text-muted font-body text-xs'>Jugador Refuerzo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
