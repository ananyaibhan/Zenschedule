import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors } from '../styles/colors'; 

export const ThemedView: React.FC<ViewProps> = ({ style, children, ...rest }) => {
  return (
    <View style={[styles.container, style]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
