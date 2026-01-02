import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { colors } from '../styles/colors'; // Adjust path if needed

type ThemedTextProps = TextProps & {
  type?: 'title' | 'link' | 'default';
};

export const ThemedText: React.FC<ThemedTextProps> = ({
  children,
  type = 'default',
  style,
  ...rest
}) => {
  const textStyles = [styles.defaultText, style];

  if (type === 'title') {
    textStyles.push(styles.title);
  } else if (type === 'link') {
    textStyles.push(styles.link);
  }

  return (
    <Text style={textStyles} {...rest}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  defaultText: {
    color: colors.text.primary,
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
