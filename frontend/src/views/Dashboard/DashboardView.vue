<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  Search,
  MoreFilled,
  Clock,
  User
} from '@element-plus/icons-vue'

const router = useRouter()
const searchQuery = ref('')
const activeTab = ref('all')

// Mock App Data
const apps = ref([
  {
    id: '1',
    name: '智能客服助手',
    desc: '基于知识库的自动问答机器人，处理常见客户咨询。',
    icon: 'CustomerService',
    color: '#3b82f6',
    status: 'published',
    updatedAt: '10分钟前',
    author: 'Admin'
  },
  {
    id: '2',
    name: '文章摘要生成器',
    desc: '自动提取长文本核心观点，生成简报。',
    icon: 'Document',
    color: '#10b981',
    status: 'draft',
    updatedAt: '2小时前',
    author: 'Admin'
  },
  {
    id: '3',
    name: '代码审计专家',
    desc: '分析代码潜在漏洞并给出修复建议。',
    icon: 'Lock',
    color: '#8b5cf6',
    status: 'published',
    updatedAt: '1天前',
    author: 'User'
  }
])

const handleCreate = () => {
    // Navigate to a new studio instance (mock ID)
    router.push('/studio/new')
}

const handleOpen = (id: string) => {
    router.push(`/studio/${id}`)
}
</script>

<template>
  <div class="dashboard-container">
    <div class="header-section">
      <div class="welcome-box">
        <h1 class="page-title">工作台</h1>
        <p class="page-subtitle">管理与构建所有的 AI 智能体应用</p>
      </div>
      <div class="action-box">
        <el-button type="primary" size="large" :icon="Plus" class="create-btn" @click="handleCreate">
          新建应用
        </el-button>
      </div>
    </div>

    <div class="filter-section">
      <div class="tabs">
        <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'all' }"
            @click="activeTab = 'all'"
        >全部应用</button>
        <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'published' }"
             @click="activeTab = 'published'"
        >已发布</button>
        <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'draft' }"
             @click="activeTab = 'draft'"
        >草稿箱</button>
      </div>
      <div class="search-box">
        <el-input 
            v-model="searchQuery" 
            placeholder="搜索应用..." 
            :prefix-icon="Search"
            clearable
            class="search-input"
        />
      </div>
    </div>

    <div class="apps-grid">
        <!-- Create Card (Optional inline style) -->
        <!-- 
        <div class="app-card create-card" @click="handleCreate">
            <div class="create-icon-box">
                <el-icon><Plus /></el-icon>
            </div>
            <span class="create-text">新建应用</span>
        </div> 
        -->

        <div v-for="app in apps" :key="app.id" class="app-card" @click="handleOpen(app.id)">
            <div class="card-header">
                <div class="app-icon" :style="{ background: app.color + '15', color: app.color }">
                    <span class="icon-text">{{ app.name.slice(0,1) }}</span>
                </div>
                <div class="app-status">
                    <span class="status-dot" :class="app.status"></span>
                    {{ app.status === 'published' ? '已发布' : '草稿' }}
                </div>
                <div class="app-menu" @click.stop>
                     <el-icon><MoreFilled /></el-icon>
                </div>
            </div>
            
            <div class="card-body">
                <h3 class="app-name">{{ app.name }}</h3>
                <p class="app-desc">{{ app.desc }}</p>
            </div>
            
            <div class="card-footer">
                <div class="meta-item">
                    <el-icon><User /></el-icon>
                    <span>{{ app.author }}</span>
                </div>
                <div class="meta-item">
                    <el-icon><Clock /></el-icon>
                    <span>{{ app.updatedAt }}</span>
                </div>
                <div class="enter-btn">
                    打开
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 0;
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 32px;
}

.page-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-neutral-900);
    margin-bottom: 8px;
}

.page-subtitle {
    font-size: 14px;
    color: var(--color-neutral-500);
}

.create-btn {
    padding: 12px 24px;
    font-weight: 600;
    border-radius: 8px;
}

.filter-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--color-neutral-200);
    padding-bottom: 16px;
}

.tabs {
    display: flex;
    gap: 24px;
}

.tab-btn {
    border: none;
    background: transparent;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-neutral-500);
    cursor: pointer;
    padding-bottom: 8px;
    position: relative;
    transition: all 0.2s;
}

.tab-btn.active {
    color: var(--color-primary-600);
    font-weight: 600;
}

.tab-btn.active::after {
    content: '';
    position: absolute;
    bottom: -17px; /* Align with border-bottom */
    left: 0;
    width: 100%;
    height: 2px;
    background: var(--color-primary-600);
}

.search-input {
    width: 240px;
}

/* Grid */
.apps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 24px;
}

.app-card {
    background: #ffffff;
    border: 1px solid var(--color-neutral-200);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
}

.app-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--color-primary-200);
}

.card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
    position: relative;
}

.app-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 20px;
}

.app-status {
    position: absolute;
    right: 40px;
    top: 0;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--color-neutral-500);
    background: var(--color-neutral-50);
    padding: 4px 8px;
    border-radius: 100px;
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-neutral-400);
}

.status-dot.published { background: #10b981; }
.status-dot.draft { background: #f59e0b; }

.app-menu {
    color: var(--color-neutral-400);
    cursor: pointer;
    padding: 4px;
}

.app-menu:hover {
    color: var(--color-neutral-900);
}

.card-body {
    flex: 1;
    margin-bottom: 20px;
}

.app-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-neutral-900);
    margin-bottom: 8px;
}

.app-desc {
    font-size: 13px;
    color: var(--color-neutral-500);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2; /* Standard property */
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--color-neutral-100);
    padding-top: 16px;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--color-neutral-400);
}

.enter-btn {
    font-size: 13px;
    color: var(--color-primary-600);
    font-weight: 500;
    opacity: 0;
    transform: translateX(-10px);
    transition: all 0.2s;
}

.app-card:hover .enter-btn {
    opacity: 1;
    transform: translateX(0);
}
</style>
