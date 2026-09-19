import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // ใส่ base: './' เพื่อให้โหลดไฟล์แบบ Relative path ได้ถูกต้องเสมอ
  base: './', 
  plugins: [react(), tailwindcss()],
});
