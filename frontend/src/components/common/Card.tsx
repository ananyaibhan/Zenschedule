import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { commonStyles } from '../../styles/commonStyles';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>; 
}

export const Card = ({ children, style }: CardProps) => {
  return <View style={[commonStyles.card, style]}>{children}</View>;
};
