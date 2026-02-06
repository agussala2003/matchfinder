// Constantes de la aplicación MatchFinder

// Posiciones de fútbol con nombres argentinos
export const POSICIONES_ARGENTINAS = {
  GK: 'Arquero',
  DEF: 'Defensor',
  MID: 'Mediocampista',
  FWD: 'Delantero',
  ANY: 'Cualquiera',
} as const

// Tipo para las posiciones
export type Posicion = keyof typeof POSICIONES_ARGENTINAS

// Lista ordenada de posiciones para mostrar en selectors
export const POSICIONES_LISTA: Posicion[] = ['GK', 'DEF', 'MID', 'FWD', 'ANY']

// Función helper para obtener el nombre argentino de una posición
export function getNombrePosicion(posicion: string): string {
  return POSICIONES_ARGENTINAS[posicion as Posicion] || 'Desconocida'
}

// Estados de partido
export const ESTADOS_PARTIDO = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  LIVE: 'En vivo',
  FINISHED: 'Finalizado',
  WO_A: 'W.O. Equipo A',
  WO_B: 'W.O. Equipo B',
  CANCELLED: 'Cancelado',
} as const

// Estados de mercado
export const ESTADOS_MERCADO = {
  OPEN: 'Abierto',
  FILLED: 'Completo',
  EXPIRED: 'Expirado',
} as const

// Roles de equipo
export const ROLES_EQUIPO = {
  ADMIN: 'Administrador',
  SUB_ADMIN: 'Sub-administrador',
  PLAYER: 'Jugador',
} as const

// Zonas del AMBA para selección de ubicación
export const ZONAS_AMBA = [
  'CABA - Palermo',
  'CABA - Belgrano',
  'CABA - Caballito',
  'CABA - Microcentro',
  'CABA - Nuñez',
  'GBA Norte - Vicente López',
  'GBA Norte - San Isidro',
  'GBA Norte - Tigre',
  'GBA Oeste - Ramos Mejía',
  'GBA Oeste - Morón',
  'GBA Sur - Avellaneda',
  'GBA Sur - Lanús',
  'GBA Sur - Lomas de Zamora',
  'Otra',
] as const

export const CATEGORIAS_EQUIPO = {
  MALE: 'Masculino',
  FEMALE: 'Femenino',
  MIXED: 'Mixto',
} as const

// Lista para selectores
export const CATEGORIAS_LISTA: (keyof typeof CATEGORIAS_EQUIPO)[] = ['MALE', 'FEMALE', 'MIXED']
