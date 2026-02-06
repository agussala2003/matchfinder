import { Tabs } from 'expo-router';
import { House, Megaphone, Search, Trophy, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // <--- Importante

export default function TabLayout() {
  // Obtenemos las medidas exactas de los bordes del celular
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopWidth: 0,
          // ALTURA DINÁMICA: 
          // 60px para el contenido del menú + lo que mida la barra del celular (insets.bottom)
          height: 60 + insets.bottom, 
          // PADDING INFERIOR:
          // Si hay barra (insets.bottom > 0), usamos ese espacio. Si no (botones físicos), dejamos 10px.
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
        },
        tabBarActiveTintColor: '#39FF14',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontFamily: 'Inter_400Regular',
          fontSize: 10,
          marginTop: -4,
        },
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <House size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rivals"
        options={{
          title: 'Rivales',
          tabBarIcon: ({ color }) => <Search size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="match"
        options={{
          title: 'Partido',
          tabBarIcon: ({ color }) => <Trophy size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Mercado',
          tabBarIcon: ({ color }) => <Megaphone size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}