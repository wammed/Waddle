import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'src/components/EditorWarningBanner.tsx',
        'src/services/editorService.ts',
        'src/services/secretMasker.ts',
        'src/services/sessionHistory.ts',
      ],
      thresholds: {
        statements: 80,
      },
    },
  },
});
