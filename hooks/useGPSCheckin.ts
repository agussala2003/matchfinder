import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface UseGPSCheckinReturn {
  userLocation: UserLocation | null;
  distanceInMeters: number | null;
  hasPermissions: boolean;
  isLoading: boolean;
  isWithinRange: boolean;  refreshLocation: () => Promise<void>}

const CHECKIN_RADIUS_METERS = 150;

/**
 * Calcula la distancia en metros entre dos coordenadas GPS
 * usando la fórmula de Haversine
 */
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Hook para check-in por GPS real
 * @param destinationLat - Latitud de la cancha
 * @param destinationLng - Longitud de la cancha
 * @returns Objeto con ubicación del usuario, distancia, permisos, carga e isWithinRange
 */
export const useGPSCheckin = (
  destinationLat: number,
  destinationLng: number
): UseGPSCheckinReturn => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [distanceInMeters, setDistanceInMeters] = useState<number | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLocation = useCallback(async () => {
    try {
      setIsLoading(true);

      // Solicitar permisos de ubicación en primer plano
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.warn("Permiso de ubicación denegado");
        setHasPermissions(false);
        setIsLoading(false);
        return;
      }

      setHasPermissions(true);

      // Obtener ubicación actual con alta precisión
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const currentLocation: UserLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setUserLocation(currentLocation);

      // Calcular distancia entre ubicación actual y destino
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        destinationLat,
        destinationLng
      );

      setDistanceInMeters(distance);
    } catch (error) {
      console.error("Error obteniendo ubicación GPS:", error);
      setHasPermissions(false);
    } finally {
      setIsLoading(false);
    }
  }, [destinationLat, destinationLng]);

  const refreshLocation = async () => {
    await fetchLocation();
  };

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Verificar si la distancia está dentro del rango permitido (150 metros)
  const isWithinRange =
    distanceInMeters !== null && distanceInMeters <= CHECKIN_RADIUS_METERS;

  return {
    userLocation,
    distanceInMeters,
    hasPermissions,
    isLoading,
    isWithinRange,
    refreshLocation,
  };
};
