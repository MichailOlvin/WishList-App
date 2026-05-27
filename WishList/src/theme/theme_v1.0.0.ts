import { MD3DarkTheme } from 'react-native-paper';

// v1.0.0: Единая dark theme palette для всех экранов WishList.
export const colors = {
  background: '#0F1115',
  surface: '#171A21',
  surfaceMuted: '#20242D',
  border: '#2B303B',
  text: '#F4F7FB',
  textMuted: '#A8B0BE',
  accent: '#14B8A6',
  accentPressed: '#0F9488',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#22C55E',
};

export const paperTheme_v1_0_0 = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.accent,
    secondary: colors.accent,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceMuted,
    onSurface: colors.text,
    onSurfaceVariant: colors.textMuted,
    outline: colors.border,
    error: colors.danger,
  },
};
