// postcss.config.js  ← ESM
export default {
  plugins: {
    "@tailwindcss/postcss": {},   // ✅ 새 플러그인 사용
    autoprefixer: {},
  },
};