import React from 'react';
import { Text, View } from 'react-native';

interface AuthHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
}

export function AuthHeader({ 
  title, 
  subtitle, 
  showLogo = true 
}: AuthHeaderProps) {
  return (
    <View className="items-center mb-8">
      {showLogo && (
        <View className="items-center mb-4">
          <Text className="text-primary font-title text-6xl tracking-tighter shadow-lg shadow-primary/50">
            MATCH
          </Text>
          <Text className="text-white font-title text-6xl tracking-tighter -mt-4">
            FINDER
          </Text>
        </View>
      )}
      
      {title && (
        <Text className="text-white font-title text-3xl mb-2 text-center uppercase">
          {title}
        </Text>
      )}
      
      {subtitle && (
        <Text className="text-gray-400 font-body text-sm tracking-widest uppercase text-center px-4">
          {subtitle}
        </Text>
      )}
    </View>
  );
}