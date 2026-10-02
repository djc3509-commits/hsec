<template>
  <div class="flex flex-col flex-1 min-w-0">
    <!-- Root duy nhất: giữ flex-col như khi các khối là con trực tiếp của UDashboardPanel (layout blank) -->
    <!-- HEADER -->
    <UHeader
      :title="pages.header.title"
      :ui="{
        container: 'max-w-5xl px-4',
        right: 'gap-2'
      }"
    >
      <UNavigationMenu :items="pages.header.link" />

      <template #right>
        <!-- Chọn ngôn ngữ -->
        <UPopover mode="hover">
          <UButton
            icon="i-lucide-languages"
            color="neutral"
            variant="ghost"
          />
          <template #content>
            <div class="p-1">
              <ul class="flex flex-col gap-1">
                <li
                  v-for="lang in locales"
                  :key="lang.code"
                  class="min-w-25"
                >
                  <UButton
                    class="w-full justify-start"
                    :color="locale === lang.code ? 'primary' : 'neutral'"
                    :variant="locale === lang.code ? 'soft' : 'ghost'"
                    size="sm"
                    :label="lang.name"
                    @click="setLocale(lang.code)"
                  />
                </li>
              </ul>
            </div>
          </template>
        </UPopover>

        <UColorModeButton />

        <!-- ĐÃ ĐĂNG NHẬP: hiển thị tên + avatar dropdown -->
        <UDropdownMenu
          v-if="user"
          :items="userMenuItems"
        >
          <UButton
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-chevron-down"
            :ui="{
              base: 'gap-2 whitespace-nowrap flex-nowrap'
            }"
          >
            <UAvatar
              :src="user.avatar || undefined"
              :alt="user.fullname || user.username"
              size="xs"
            />
            <span class="hidden sm:inline font-medium whitespace-nowrap">
              {{ user.fullname || user.username }}
            </span>
          </UButton>
        </UDropdownMenu>

        <!-- CHƯA ĐĂNG NHẬP: hiển thị 2 nút Login + Register -->
        <div
          v-else
          class="flex items-center gap-2"
        >
          <UButton
            :label="t('landing.header.login')"
            color="neutral"
            variant="ghost"
            to="/auth/login"
            class="hidden sm:flex"
          />
          <UButton
            :label="t('landing.header.register')"
            color="primary"
            to="/auth/register"
          />
        </div>
      </template>
    </UHeader>

    <!-- CONTAINER -->
    <UDashboardPanel>
      <div class="relative">
        <!-- HERO -->
        <UPageHero
          :ui="{
            root: 'relative overflow-hidden pb-24 sm:pb-32',
            container: 'relative z-10 lg:py-24',
            wrapper: 'flex flex-col items-center',
            title: 'sm:text-6xl lg:text-7xl xl:text-[80px] tracking-tighter leading-[1.05]',
            description: 'mt-5 max-w-xl mx-auto text-base sm:text-lg leading-relaxed text-default',
            links: 'gap-3'
          }"
        >
          <!-- Background effects -->
          <template #top>
            <Motion v-bind="staggerMotion(0)">
              <HeroShaders class="absolute top-0 inset-x-0 opacity-15 h-full" />
            </Motion>
            <GradientGlow class="top-0 w-2/3 h-1/2" />
          </template>

          <!-- Badge -->
          <template #headline>
            <Motion v-bind="enterMotion(0.2)">
              <UBadge
                color="neutral"
                variant="soft"
                :label="t('landing.hero.badge')"
                class="rounded-full px-3 py-1.5 gap-1.5 bg-elevated/60 backdrop-blur"
              >
                <template #leading>
                  <UChip
                    inset
                    standalone
                    :ui="{ base: 'animate-pulse ring-0' }"
                  />
                </template>
              </UBadge>
            </Motion>
          </template>

          <!-- Title với shimmer -->
          <template #title>
            <Motion
              as="span"
              v-bind="enterMotion(0.35)"
              class="inline-block"
            >
              {{ t('landing.hero.title_primary') }}
              <br>
              <span
                class="animate-shimmer bg-clip-text text-transparent"
                :style="{
                  backgroundImage: 'linear-gradient(90deg, var(--color-primary-400), var(--color-primary-300), var(--color-primary-200), var(--color-primary-100), var(--color-primary-200), var(--color-primary-300), var(--color-primary-400))',
                  backgroundSize: '200% auto'
                }"
              >
                {{ t('landing.hero.title_highlight') }}
              </span>
            </Motion>
          </template>

          <!-- Description -->
          <template #description>
            <Motion
              as="span"
              v-bind="enterMotion(0.5)"
              class="inline-block"
            >
              {{ t('landing.description') }}
            </Motion>
          </template>

          <!-- CTA links -->
          <template #links>
            <Motion
              class="flex flex-wrap justify-center gap-3"
              v-bind="enterMotion(0.65)"
            >
              <UButton
                v-for="link in pages.hero.links"
                :key="link.label"
                v-bind="link"
              />
            </Motion>
          </template>

          <!-- Terminal demo -->
          <Motion
            as-child
            v-bind="enterMotion(0.85)"
            class="max-w-2xl mx-auto w-full mt-12"
          >
            <HeroTerminal :lines="terminalLines" />
          </Motion>

          <!-- Trust logos -->
          <Motion
            class="max-w-lg mx-auto w-full mt-10"
            v-bind="scrollMotion(0.95)"
          >
            <UPageLogos
              :title="t('landing.logos.title')"
              :items="trustLogos"
              :ui="{
                title: 'font-mono uppercase text-xs tracking-[0.12em] text-dimmed',
                logos: 'gap-6',
                logo: 'text-muted size-6'
              }"
            />
          </Motion>
        </UPageHero>

        <!-- INTRO SECTION (giữ structure cũ) -->
        <UPageSection
          id="section"
          :features="pages.section.item"
          orientation="horizontal"
          :ui="{
            container: 'lg:px-2 2xl:px-20 mx-0 max-w-none md:mr-10',
            features: 'gap-0'
          }"
          reverse
        >
          <template #title>
            <Motion
              as="span"
              v-bind="scrollMotion()"
              class="inline-block"
            >
              {{ pages.section.title }}
            </Motion>
          </template>
          <template #description>
            <Motion
              as="span"
              v-bind="scrollMotion(0.1)"
              class="inline-block"
            >
              {{ pages.section.description }}
            </Motion>
          </template>

          <Motion v-bind="scrollMotion(0.2)">
            <img
              :src="pages.section.images"
              class="rounded-lg"
            >
          </Motion>
        </UPageSection>

        <USeparator :ui="{ border: 'border-primary/30' }" />

        <!-- FEATURES (motion stagger) -->
        <UPageSection
          id="features"
          class="relative overflow-hidden"
        >
          <!-- Blob backgrounds -->
          <div class="absolute rounded-full -left-10 top-10 w-75 h-75 bg-primary opacity-10 blur-3xl z-0" />
          <div class="absolute rounded-full -right-10 -bottom-10 w-75 h-75 bg-primary opacity-10 blur-3xl z-0" />

          <template #title>
            <Motion
              as="span"
              v-bind="scrollMotion()"
              class="inline-block"
            >
              {{ pages.features.title }}
            </Motion>
          </template>
          <template #description>
            <Motion
              as="span"
              v-bind="scrollMotion(0.1)"
              class="inline-block"
            >
              {{ pages.features.description }}
            </Motion>
          </template>

          <template #features>
            <Motion
              v-for="(feature, index) in pages.features.features"
              :key="feature.title"
              v-bind="staggerMotion(index)"
            >
              <UPageCard
                :icon="feature.icon"
                :title="feature.title"
                :description="feature.description"
                :ui="feature.ui"
              />
            </Motion>
          </template>
        </UPageSection>

        <USeparator :ui="{ border: 'border-primary/30' }" />

        <!-- STEPS (motion stagger) -->
        <UPageSection
          id="steps"
          class="relative overflow-hidden"
        >
          <template #title>
            <Motion
              as="span"
              v-bind="scrollMotion()"
              class="inline-block"
            >
              {{ pages.steps.title }}
            </Motion>
          </template>
          <template #description>
            <Motion
              as="span"
              v-bind="scrollMotion(0.1)"
              class="inline-block"
            >
              {{ pages.steps.description }}
            </Motion>
          </template>

          <template #features>
            <Motion
              v-for="(item, index) in pages.steps.items"
              :key="index"
              v-bind="staggerMotion(index)"
            >
              <UPageCard
                class="group"
                :ui="{
                  container: 'p-4',
                  title: 'flex items-center gap-1'
                }"
              >
                <UColorModeImage
                  v-if="item.image"
                  :light="item.image.light"
                  :dark="item.image.dark"
                  :alt="item.title"
                  class="size-full rounded-sm"
                />
                <div class="flex flex-col gap-2">
                  <span class="text-lg font-semibold">{{ item.title }}</span>
                  <span class="text-sm text-muted">{{ item.description }}</span>
                </div>
              </UPageCard>
            </Motion>
          </template>
        </UPageSection>

        <USeparator :ui="{ border: 'border-primary/30' }" />

        <!-- METRICS (mới) -->
        <UPageSection
          id="metrics"
          :ui="{
            root: 'py-24 sm:py-32 scroll-mt-(--ui-header-height)',
            container: 'max-w-6xl',
            headline: 'font-mono font-medium text-xs text-primary uppercase tracking-[0.12em] text-center',
            title: 'max-w-2xl mx-auto',
            description: 'max-w-md mx-auto text-dimmed'
          }"
        >
          <template #headline>
            <Motion
              as="span"
              v-bind="scrollMotion()"
              class="inline-block"
            >
              {{ t('landing.metrics.headline') }}
            </Motion>
          </template>
          <template #title>
            <Motion
              as="span"
              v-bind="scrollMotion(0.1)"
              class="inline-block"
            >
              {{ t('landing.metrics.title') }}
            </Motion>
          </template>
          <template #description>
            <Motion
              as="span"
              v-bind="scrollMotion(0.2)"
              class="inline-block"
            >
              {{ t('landing.metrics.description') }}
            </Motion>
          </template>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Motion
              v-for="(metric, index) in metricItems"
              :key="metric.label"
              v-bind="staggerMotion(index)"
            >
              <div class="h-full flex flex-col items-center justify-center text-center rounded-2xl border border-default bg-default px-4 py-8 sm:px-6 sm:py-10 transition-all duration-300 hover:border-primary/40 hover:-translate-y-1">
                <div
                  class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-none whitespace-nowrap"
                  :class="metric.class"
                >
                  {{ metric.value }}
                </div>
                <div class="mt-4 font-mono text-[11px] sm:text-xs uppercase tracking-[0.08em] text-dimmed text-center">
                  {{ metric.label }}
                </div>
              </div>
            </Motion>
          </div>
        </UPageSection>

        <USeparator :ui="{ border: 'border-primary/30' }" />

        <!-- PRICING -->
        <UPageSection
          id="pricing"
          class="mb-32 overflow-hidden"
        >
          <template #title>
            <Motion
              as="span"
              v-bind="scrollMotion()"
              class="inline-block"
            >
              {{ pages.pricing.title }}
            </Motion>
          </template>
          <template #description>
            <Motion
              as="span"
              v-bind="scrollMotion(0.1)"
              class="inline-block"
            >
              {{ pages.pricing.description }}
            </Motion>
          </template>

          <Motion v-bind="scrollMotion(0.2)">
            <UPricingPlans :plans="pages.pricing.plans" />
          </Motion>
        </UPageSection>

        <USeparator :ui="{ border: 'border-primary/30' }" />

        <!-- TESTIMONIALS -->
        <UPageSection id="testimonials">
          <template #title>
            <Motion
              as="span"
              v-bind="scrollMotion()"
              class="inline-block"
            >
              {{ pages.testimonials.title }}
            </Motion>
          </template>
          <template #description>
            <Motion
              as="span"
              v-bind="scrollMotion(0.1)"
              class="inline-block"
            >
              {{ pages.testimonials.description }}
            </Motion>
          </template>

          <div class="w-full px-4 sm:px-6 lg:px-8">
            <UPageColumns class="xl:columns-3">
              <Motion
                v-for="(item, index) in pages.testimonials.items"
                :key="index"
                v-bind="staggerMotion(index)"
              >
                <UPageCard
                  variant="subtle"
                  :description="item.quote"
                  :ui="{
                    description: 'before:content-[open-quote] after:content-[close-quote]'
                  }"
                >
                  <template #footer>
                    <UUser
                      v-bind="item.user"
                      size="xl"
                    />
                  </template>
                </UPageCard>
              </Motion>
            </UPageColumns>
          </div>
        </UPageSection>

        <USeparator />

        <!-- CTA với glow -->
        <UPageCTA
          v-bind="pages.cta"
          class="overflow-hidden relative @container"
        >
          <template #top>
            <GradientGlow class="bottom-0 w-2/3 h-1/2" />
          </template>

          <template #title>
            <Motion
              as="span"
              v-bind="scrollMotion()"
              class="inline-block"
            >
              {{ pages.cta.title }}
            </Motion>
          </template>
          <template #description>
            <Motion
              as="span"
              v-bind="scrollMotion(0.1)"
              class="inline-block"
            >
              {{ pages.cta.description }}
            </Motion>
          </template>
          <template #links>
            <Motion
              class="flex flex-wrap justify-center gap-3"
              v-bind="scrollMotion(0.2)"
            >
              <UButton
                v-for="link in pages.cta.links"
                :key="link.label"
                v-bind="link"
              />
            </Motion>
          </template>
        </UPageCTA>
      </div>
    </UDashboardPanel>

    <!-- FOOTER (giữ nguyên + motion) -->
    <UFooter :ui="{ top: 'border-b border-default' }">
      <template #top>
        <div class="w-full px-4 sm:px-6 lg:px-8">
          <UFooterColumns :columns="pages.footer">
            <template #right>
              <UForm
                :state="{ email }"
                @submit.prevent="onSubmit"
              >
                <UFormField v-bind="pages.form">
                  <UInput
                    v-model="email"
                    v-bind="pages.inputSubmit"
                  >
                    <template #trailing>
                      <UButton v-bind="pages.buttonSubmit" />
                    </template>
                  </UInput>
                </UFormField>
              </UForm>
            </template>
          </UFooterColumns>
        </div>
      </template>

      <template #left>
        <p class="text-sm text-muted">
          Built with HSEC • © {{ new Date().getFullYear() }}
        </p>
      </template>

      <template #right>
        <UButton
          v-for="(btn, index) in pages.button"
          :key="index"
          v-bind="btn"
          :loading="loading"
        />
      </template>
    </UFooter>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({
  layout: 'blank'
})

const toast = useToast()
const email = ref('')
const loading = ref(false)
const { t, locale, locales, setLocale } = useI18n()
const { user, logout } = useAuth()

// User menu dropdown khi đã đăng nhập
const userMenuItems = computed(() => [
  [
    {
      label: t('layout.sidebar.home'),
      icon: 'i-lucide-layout-dashboard',
      to: '/home'
    },
    {
      label: t('layout.sidebar.assets'),
      icon: 'i-lucide-wallet',
      to: '/wallets'
    },
    {
      label: t('common.menu.settings'),
      icon: 'i-lucide-settings',
      to: '/settings'
    }
  ],
  [
    {
      label: t('common.action.sign_out'),
      icon: 'i-lucide-log-out',
      onSelect: () => logout()
    }
  ]
])

const onSubmit = () => {
  loading.value = true
  toast.add({
    title: 'Subscribed',
    description: 'You\'ve been subscribed to our newsletter.'
  })
  setTimeout(() => (loading.value = false), 800)
}

// Terminal demo lines — crypto-themed CLI
const terminalLines = [
  {
    segments: [
      { text: '$ ', style: 'prompt' },
      { text: 'HSEC trade', style: 'cmd' },
      { text: ' --pair BTC/USDT --side buy', style: 'flag' }
    ]
  },
  {
    segments: [
      { text: '→ Connecting to orderbook... ', style: 'dim' },
      { text: '✓', style: 'success' }
    ]
  },
  {
    segments: [
      { text: '→ Spread: ', style: 'dim' },
      { text: '0.02%', style: 'cmd' },
      { text: ' | Best ask: ', style: 'dim' },
      { text: '$98,420.50', style: 'cmd' }
    ]
  },
  {
    segments: [
      { text: '→ Filled @ ', style: 'dim' },
      { text: '$98,420.50', style: 'cmd' },
      { text: ' ', style: 'dim' },
      { text: '(0.25 BTC)', style: 'flag' }
    ]
  },
  {
    segments: [
      { text: '→ Fee: 0.0625 USDT ', style: 'dim' },
      { text: '✓', style: 'success' }
    ]
  },
  {
    segments: [{ text: ' ', style: 'dim' }]
  },
  {
    segments: [
      { text: '✓ PnL today: ', style: 'success' },
      { text: '+$1,247 (+1.27%)', style: 'metric-good' }
    ]
  },
  {
    segments: [
      { text: '✓ Live at ', style: 'success' },
      { text: 'https://HSEC.io/dashboard', style: 'url' }
    ]
  }
]

// Trust logos
const trustLogos = [
  'i-simple-icons-bitcoin',
  'i-simple-icons-ethereum',
  'i-simple-icons-binance',
  'i-simple-icons-coinbase',
  'i-simple-icons-tradingview'
]

// Metrics
const metricItems = computed(() => [
  {
    value: t('landing.metrics.items.0.value'),
    label: t('landing.metrics.items.0.label'),
    class: 'text-success'
  },
  {
    value: t('landing.metrics.items.1.value'),
    label: t('landing.metrics.items.1.label'),
    class: 'text-primary'
  },
  {
    value: t('landing.metrics.items.2.value'),
    label: t('landing.metrics.items.2.label'),
    class: 'text-info'
  },
  {
    value: t('landing.metrics.items.3.value'),
    label: t('landing.metrics.items.3.label'),
    class: 'text-warning'
  }
])

const pages = computed(() => ({
  title: t('landing.title'),
  description: t('landing.description'),
  header: {
    title: t('landing.header.title'),
    link: [
      { label: t('landing.header.market'), to: '#section' },
      { label: t('landing.header.pro_tools'), to: '#features' },
      { label: t('landing.header.start'), to: '#steps' }
    ]
  },
  hero: {
    links: [
      {
        label: t('landing.hero.trade_now'),
        to: user.value ? '/home' : '/auth/login',
        icon: 'i-lucide-rocket',
        size: 'xl' as const
      },
      {
        label: t('landing.hero.register'),
        to: '/auth/register',
        color: 'neutral' as const,
        variant: 'subtle' as const,
        trailingIcon: 'i-lucide-arrow-right',
        size: 'xl' as const
      }
    ]
  },
  section: {
    title: t('landing.section.title'),
    description: t('landing.section.description'),
    images: 'https://media-cdn-v2.laodong.vn/storage/newsportal/2023/9/19/1243426/B9E97A6F-6599-4F19-8.jpg',
    item: [
      {
        title: t('landing.section.items.0.title'),
        description: t('landing.section.items.0.desc'),
        class: 'border-l border-primary pl-4'
      },
      {
        title: t('landing.section.items.1.title'),
        description: t('landing.section.items.1.desc'),
        class: 'border-l border-default pt-4 pl-4'
      },
      {
        title: t('landing.section.items.2.title'),
        description: t('landing.section.items.2.desc'),
        class: 'border-l border-default pt-4 pl-4'
      }
    ]
  },
  features: {
    title: t('landing.features.title'),
    description: t('landing.features.description'),
    features: [
      {
        title: t('landing.features.items.0.title'),
        description: t('landing.features.items.0.desc'),
        icon: 'i-lucide-wand-sparkles',
        ui: { leading: 'bg-primary-50 dark:bg-primary-900/20 p-2 rounded-md border border-gray-200 dark:border-gray-700 border-dashed' }
      },
      {
        title: t('landing.features.items.1.title'),
        description: t('landing.features.items.1.desc'),
        icon: 'i-lucide-users',
        ui: { leading: 'bg-primary-50 dark:bg-primary-900/20 p-2 rounded-md border border-gray-200 dark:border-gray-700 border-dashed' }
      },
      {
        title: t('landing.features.items.2.title'),
        description: t('landing.features.items.2.desc'),
        icon: 'i-lucide-filter',
        ui: { leading: 'bg-primary-50 dark:bg-primary-900/20 p-2 rounded-md border border-gray-200 dark:border-gray-700 border-dashed' }
      },
      {
        title: t('landing.features.items.3.title'),
        description: t('landing.features.items.3.desc'),
        icon: 'i-lucide-moon',
        ui: { leading: 'bg-primary-50 dark:bg-primary-900/20 p-2 rounded-md border border-gray-200 dark:border-gray-700 border-dashed' }
      },
      {
        title: t('landing.features.items.4.title'),
        description: t('landing.features.items.4.desc'),
        icon: 'i-lucide-shield-check',
        ui: { leading: 'bg-primary-50 dark:bg-primary-900/20 p-2 rounded-md border border-gray-200 dark:border-gray-700 border-dashed' }
      },
      {
        title: t('landing.features.items.5.title'),
        description: t('landing.features.items.5.desc'),
        icon: 'i-lucide-chart-pie',
        ui: { leading: 'bg-primary-50 dark:bg-primary-900/20 p-2 rounded-md border border-gray-200 dark:border-gray-700 border-dashed' }
      }
    ]
  },
  steps: {
    title: t('landing.steps.title'),
    description: t('landing.steps.description'),
    items: [
      {
        title: t('landing.steps.items.0.title'),
        description: t('landing.steps.items.0.desc'),
        image: {
          dark: 'https://lacviet.vn/wp-content/uploads/2025/02/ai-phan-tich-du-lieu-1.jpg',
          light: 'https://lacviet.vn/wp-content/uploads/2025/02/ai-phan-tich-du-lieu-1.jpg'
        }
      },
      {
        title: t('landing.steps.items.1.title'),
        description: t('landing.steps.items.1.desc'),
        image: {
          dark: 'https://lacviet.vn/wp-content/uploads/2025/02/ai-phan-tich-du-lieu-1.jpg',
          light: 'https://lacviet.vn/wp-content/uploads/2025/02/ai-phan-tich-du-lieu-1.jpg'
        }
      },
      {
        title: t('landing.steps.items.2.title'),
        description: t('landing.steps.items.2.desc'),
        image: {
          dark: 'https://lacviet.vn/wp-content/uploads/2025/02/ai-phan-tich-du-lieu-1.jpg',
          light: 'https://lacviet.vn/wp-content/uploads/2025/02/ai-phan-tich-du-lieu-1.jpg'
        }
      }
    ]
  },
  pricing: {
    title: t('landing.pricing.title'),
    description: t('landing.pricing.description'),
    plans: [
      {
        title: t('landing.pricing.plans.standard.title'),
        description: t('landing.pricing.plans.standard.desc'),
        price: t('landing.pricing.plans.standard.price'),
        highlight: false,
        features: [
          t('landing.pricing.plans.standard.features.0'),
          t('landing.pricing.plans.standard.features.1'),
          t('landing.pricing.plans.standard.features.2'),
          t('landing.pricing.plans.standard.features.3')
        ],
        button: {
          label: t('landing.pricing.plans.standard.btn'),
          color: 'neutral' as const,
          variant: 'outline' as const,
          to: '/auth/register'
        }
      },
      {
        title: t('landing.pricing.plans.vip.title'),
        description: t('landing.pricing.plans.vip.desc'),
        price: t('landing.pricing.plans.vip.price'),
        highlight: true,
        features: [
          t('landing.pricing.plans.vip.features.0'),
          t('landing.pricing.plans.vip.features.1'),
          t('landing.pricing.plans.vip.features.2'),
          t('landing.pricing.plans.vip.features.3'),
          t('landing.pricing.plans.vip.features.4'),
          t('landing.pricing.plans.vip.features.5')
        ],
        button: {
          label: t('landing.pricing.plans.vip.btn'),
          variant: 'solid' as const,
          color: 'primary' as const,
          to: '/auth/register'
        }
      }
    ]
  },
  testimonials: {
    title: t('landing.testimonials.title'),
    description: t('landing.testimonials.description'),
    items: [
      {
        quote: t('landing.testimonials.items.0.quote'),
        user: {
          name: 'Nguyễn Thu Hà',
          description: t('landing.testimonials.items.0.role'),
          target: '_blank',
          avatar: { src: 'https://ipx.nuxt.com/f_auto,s_192x192/gh_avatar/SarahM19' }
        }
      },
      {
        quote: t('landing.testimonials.items.1.quote'),
        user: {
          name: 'Trần Minh Tuấn',
          description: t('landing.testimonials.items.1.role'),
          target: '_blank',
          avatar: { src: 'https://ipx.nuxt.com/f_auto,s_192x192/gh_avatar/atinux' }
        }
      },
      {
        quote: t('landing.testimonials.items.2.quote'),
        user: {
          name: 'Lê Văn Hùng',
          description: t('landing.testimonials.items.2.role'),
          target: '_blank',
          avatar: { src: 'https://ipx.nuxt.com/f_auto,s_192x192/gh_avatar/benjamincanac' }
        }
      }
    ]
  },
  cta: {
    title: t('landing.cta.title'),
    description: t('landing.cta.description'),
    links: [
      {
        label: t('landing.cta.btn1'),
        to: '/auth/register',
        target: '_self',
        trailingIcon: 'i-lucide-arrow-right',
        size: 'xl' as const
      },
      {
        label: t('landing.cta.btn2'),
        to: '#',
        target: '_self',
        variant: 'subtle' as const,
        icon: 'i-lucide-smartphone',
        size: 'xl' as const
      }
    ]
  },
  footer: [
    {
      label: t('landing.footer.about'),
      children: [
        { label: t('landing.footer.about_links.0'), to: '#' },
        { label: t('landing.footer.about_links.1'), to: '#' },
        { label: t('landing.footer.about_links.2'), to: '#' },
        { label: t('landing.footer.about_links.3'), to: '#' }
      ]
    },
    {
      label: t('landing.footer.trade'),
      children: [
        { label: t('landing.footer.trade_links.0'), to: '#' },
        { label: t('landing.footer.trade_links.1'), to: '#' },
        { label: t('landing.footer.trade_links.2'), to: '#' },
        { label: t('landing.footer.trade_links.3'), to: '#' }
      ]
    },
    {
      label: t('landing.footer.support'),
      children: [
        { label: t('landing.footer.support_links.0'), to: '#' },
        { label: t('landing.footer.support_links.1'), to: '#' },
        { label: t('landing.footer.support_links.2'), to: '#' },
        { label: t('landing.footer.support_links.3'), to: '#' }
      ]
    }
  ],
  button: [
    {
      'to': 'https://go.nuxt.com/discord',
      'target': '_blank',
      'icon': 'i-simple-icons-discord',
      'aria-label': 'HSEC on Discord',
      'color': 'neutral' as const,
      'variant': 'ghost' as const
    },
    {
      'to': 'https://go.nuxt.com/x',
      'target': '_blank',
      'icon': 'i-simple-icons-x',
      'aria-label': 'HSEC on X',
      'color': 'neutral' as const,
      'variant': 'ghost' as const
    },
    {
      'to': 'https://github.com/nuxt-ui-templates/landing',
      'target': '_blank',
      'icon': 'i-simple-icons-github',
      'aria-label': 'HSEC UI on GitHub',
      'color': 'neutral' as const,
      'variant': 'ghost' as const
    }
  ],
  form: {
    name: 'email',
    label: t('landing.form.label'),
    size: 'lg' as const
  },
  inputSubmit: {
    type: 'email',
    class: 'w-full',
    placeholder: t('landing.form.placeholder')
  },
  buttonSubmit: {
    type: 'submit' as const,
    label: t('landing.form.btn'),
    size: 'xs' as const
  }
}))
</script>
