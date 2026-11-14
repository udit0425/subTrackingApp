import { useColorScheme } from 'react-native';

const light = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  primary: '#4F46E5',
  onPrimary: '#FFFFFF',
  primarySoft: '#EEF0FF',
  danger: '#DC2626',
  warn: '#B45309',
  track: '#E9ECF3',
};

const dark: typeof light = {
  bg: '#0B0F19',
  card: '#151B2B',
  text: '#F1F5F9',
  muted: '#94A3B8',
  border: '#243049',
  primary: '#8B93FF',
  onPrimary: '#0B0F19',
  primarySoft: '#232A4A',
  danger: '#F87171',
  warn: '#FBBF24',
  track: '#202842',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: '#E11D48',
  Music: '#16A34A',
  Productivity: '#2563EB',
  Cloud: '#0891B2',
  Education: '#9333EA',
  Fitness: '#EA580C',
  News: '#64748B',
  Utilities: '#CA8A04',
  Other: '#6B7280',
};
