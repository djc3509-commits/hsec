// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/i18n',
    '@nuxtjs/color-mode'
  ],

  imports: {
    dirs: [
      'composables',
      'composables/**'
    ]
  },

  devtools: {
    enabled: true
  },

  app: {
    head: {
      title: 'HSEC',
      link: [{
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap'
      }]
    }
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: ''
  },

  runtimeConfig: {
    groqApiKey: process.env.GROQ_API_KEY
  },

  alias: {
    '#dtos': './server/dtos'
  },

  experimental: {
    viewTransition: true
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    alias: {
      '#dtos': './server/dtos'
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'vi', name: 'Tiếng Việt', file: 'vi.json' }
    ],
    langDir: '../app/locales',
    defaultLocale: 'vi',
    strategy: 'no_prefix'
  }
})
