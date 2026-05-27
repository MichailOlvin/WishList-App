import { PaperProvider } from 'react-native-paper';
import { Stack } from 'expo-router';
import { paperTheme_v1_0_0 } from '../theme/theme_v1.0.0';

export default function Layout() {
  return (
    <PaperProvider theme={paperTheme_v1_0_0}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="add-edit" />
        <Stack.Screen name="categories" />
      </Stack>
    </PaperProvider>
  );
}
