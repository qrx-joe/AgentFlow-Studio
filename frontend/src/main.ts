import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'

import './styles/variables.css' // 全局 Design Tokens
import './styles/index.css' // 全局样式 (可能会被逐渐移除或重构)

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

// 开发环境默认启用 Mock（如果后端未连接，可在此切换）
// 也可以通过 .env 配置：VITE_USE_MOCK=true
if (import.meta.env.DEV || import.meta.env.VITE_USE_MOCK === 'true') {
  import('./api/mock').then(({ setupMock }) => {
    setupMock()
  })
}

app.mount('#app')
