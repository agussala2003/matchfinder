import { Bell, MapPin } from 'lucide-react-native'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HomeScreen() {
  return (
    <SafeAreaView className='flex-1 bg-dark'>
      <ScrollView className='flex-1 px-4'>
        {/* HEADER SUPERIOR */}
        <View className='flex-row justify-between items-center mt-4 mb-6'>
          <View>
            <Text className='text-gray-400 font-body text-sm'>Bienvenido de nuevo,</Text>
            <Text className='text-white font-title text-3xl uppercase tracking-wider'>Agustín</Text>
          </View>
          {/* Avatar y Notificaciones */}
          <View className='flex-row items-center gap-4'>
            <TouchableOpacity className='bg-card p-2 rounded-full border border-gray-800'>
              <Bell size={24} color='#39FF14' />
            </TouchableOpacity>
            <View className='h-10 w-10 bg-gray-600 rounded-full border-2 border-primary' />
          </View>
        </View>

        {/* HERO SECTION: PRÓXIMO PARTIDO */}
        <View className='bg-card rounded-2xl p-0 border border-gray-800 overflow-hidden mb-6'>
          {/* Cabecera del Hero */}
          <View className='bg-green-900/20 p-3 flex-row justify-between items-center'>
            <View className='flex-row items-center gap-1'>
              <MapPin size={14} color='#39FF14' />
              <Text className='text-primary font-bodyBold text-xs uppercase'>
                Sede: Fútbol 5 Palermo
              </Text>
            </View>
            <Text className='text-white font-title text-xs bg-red-600 px-2 py-0.5 rounded'>
              HOY 20:00HS
            </Text>
          </View>

          {/* VS Card */}
          <View className='p-6 flex-row justify-between items-center'>
            {/* Equipo Local */}
            <View className='items-center'>
              <View className='w-16 h-16 bg-gray-700 rounded-full mb-2 items-center justify-center'>
                <Text className='text-2xl'>🦁</Text>
              </View>
              <Text className='text-white font-title text-lg'>TU EQUIPO</Text>
            </View>

            <Text className='text-gray-500 font-title text-2xl italic'>VS</Text>

            {/* Rival */}
            <View className='items-center'>
              <View className='w-16 h-16 bg-white/10 rounded-full mb-2 items-center justify-center border border-dashed border-gray-500'>
                <Text className='text-2xl text-gray-500'>?</Text>
              </View>
              <Text className='text-gray-400 font-title text-lg'>BUSCANDO...</Text>
            </View>
          </View>

          {/* Botón de Acción Principal */}
          <TouchableOpacity className='bg-primary m-4 py-3 rounded-xl items-center active:opacity-90'>
            <Text className='text-black font-title text-xl uppercase'>BUSCAR RIVAL AHORA</Text>
          </TouchableOpacity>
        </View>

        {/* ACCESOS RÁPIDOS */}
        <Text className='text-white font-title text-xl mb-4 uppercase'>Acciones Rápidas</Text>
        <View className='flex-row gap-3 mb-8'>
          <TouchableOpacity className='flex-1 bg-card p-4 rounded-xl border border-gray-800 items-start'>
            <Text className='text-primary font-title text-lg mb-1'>+ CREAR</Text>
            <Text className='text-gray-400 font-body text-xs'>Nuevo Equipo</Text>
          </TouchableOpacity>

          <TouchableOpacity className='flex-1 bg-card p-4 rounded-xl border border-gray-800 items-start'>
            <Text className='text-blue-400 font-title text-lg mb-1'>BUSCO</Text>
            <Text className='text-gray-400 font-body text-xs'>Jugador Refuerzo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
