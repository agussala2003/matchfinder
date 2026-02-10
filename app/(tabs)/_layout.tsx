import { Tabs } from 'expo-router'
import { House, Megaphone, Search, Trophy, User } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function TabLayout() {
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1A21', // card background
          borderTopWidth: 1,
          borderTopColor: '#32323A', // border color
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 0,
          elevation: 0, // Android: quitar sombra
          shadowOpacity: 0, // iOS: quitar sombra
        },
        tabBarActiveTintColor: '#00D54B', // primary (nuevo verde neón)
        tabBarInactiveTintColor: '#A1A1AA', // text-muted
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold', // Más peso para mejor legibilidad
          fontSize: 11,
          marginTop: -2,
          letterSpacing: 0.3,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <House size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name='rivals'
        options={{
          title: 'Rivales',
          tabBarIcon: ({ color, focused }) => (
            <Search size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name='match'
        options={{
          title: 'Partidos',
          tabBarIcon: ({ color, focused }) => (
            <Trophy size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name='market'
        options={{
          title: 'Mercado',
          tabBarIcon: ({ color, focused }) => (
            <Megaphone size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  )
}
