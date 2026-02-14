<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  Search,
  MoreFilled,
  Clock,
  User
} from '@element-plus/icons-vue'
import { workflowApi } from '@/api'

interface Workflow {
  id: string
  name: string
  description?: string
  status: string
  icon?: string
  color?: string
  createdAt: string
  updatedAt: string
}

const router = useRouter()
const searchQuery = ref('')
const activeTab = ref('all')
const loading = ref(false)
const workflows = ref<Workflow[]>([])

// 颜色列表用于随机分配
const colors = ['#475569', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6']

// 格式化时间
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return date.toLocaleDateString()
}

// 过滤后的应用列表
const filteredApps = computed(() => {
  let result = workflows.value

  // 按状态过滤
  if (activeTab.value === 'published') {
    result = result.filter(w => w.status === 'published')
  } else if (activeTab.value === 'draft') {
    result = result.filter(w => w.status === 'draft')
  }

  // 按搜索词过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(w =>
      w.name.toLowerCase().includes(query) ||
      w.description?.toLowerCase().includes(query)
    )
  }

  return result
})

// 获取工作流列表
const fetchWorkflows = async () => {
  loading.value = true
  try {
    const res = await workflowApi.list()
    // res 已经是数据数组（响应拦截器返回 response.data）
    workflows.value = (res || []).map((w: any, index: number) => ({
      ...w,
      color: w.color || colors[index % colors.length],
      status: w.status || 'draft'
    }))
  } catch (error) {
    console.error('获取工作流列表失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchWorkflows()
})

const handleCreate = () => {
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
        <h1 class="page-title">工作室</h1>
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

    <div class="apps-grid" v-loading="loading">
        <!-- Empty state -->
        <div v-if="!loading && filteredApps.length === 0" class="empty-state">
            <p>暂无应用，点击"新建应用"开始创建</p>
        </div>

        <div v-for="app in filteredApps" :key="app.id" class="app-card" @click="handleOpen(app.id)">
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
                <p class="app-desc">{{ app.description || '暂无描述' }}</p>
            </div>

            <div class="card-footer">
                <div class="meta-item">
                    <el-icon><User /></el-icon>
                    <span>Admin</span>
                </div>
                <div class="meta-item">
                    <el-icon><Clock /></el-icon>
                    <span>{{ formatTime(app.updatedAt) }}</span>
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
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 40px;
}

.header-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 40px;
}

.page-title {
    font-size: 26px; /* Slightly larger for impact */
    font-weight: 700;
    color: #0f172a; /* Slate-900 */
    margin: 0 0 6px 0;
    letter-spacing: -0.5px;
}

.page-subtitle {
    font-size: 14px;
    color: #64748b; /* Slate-500 */
    margin: 0;
}

.create-btn {
    padding: 10px 20px;
    font-weight: 500;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(71, 85, 105, 0.15); /* Changed from rgba(59, 130, 246, 0.15) to slate-700 */
    transition: all 0.2s;
}

.create-btn:hover {
    box-shadow: 0 4px 6px rgba(71, 85, 105, 0.25); /* Changed from rgba(59, 130, 246, 0.25) to slate-700 */
    transform: translateY(-1px);
}

.filter-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    /* border-bottom: 1px solid #e2e8f0; */
    padding-bottom: 0px; 
}

.tabs {
    display: flex;
    gap: 8px; /* Button style tabs instead of underline */
    background: #f1f5f9;
    padding: 4px;
    border-radius: 8px;
}

.tab-btn {
    border: none;
    background: transparent;
    font-size: 13px;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    padding: 6px 16px;
    border-radius: 6px;
    transition: all 0.2s;
}

.tab-btn:hover {
    color: #0f172a;
}

.tab-btn.active {
    background: #ffffff;
    color: #0f172a;
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* Remove old underline style for cleaner look */
.tab-btn.active::after {
    display: none;
}

.search-input {
    width: 260px;
}

/* Grid */
.apps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); /* Slightly wider cards */
    gap: 24px;
}

.app-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px; /* Doze/Dify style rounded corners */
    padding: 24px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
    display: flex;
    flex-direction: column;
    min-height: 180px;
    position: relative;
    overflow: hidden;
}

.app-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.08);
    border-color: #cbd5e1;
}

.card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 16px;
    position: relative;
}

.app-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 22px;
    transition: transform 0.2s;
}

.app-card:hover .app-icon {
    transform: scale(1.05);
}

.app-status {
    position: absolute;
    right: 36px;
    top: 4px;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #64748b;
    background: #f8fafc;
    padding: 4px 10px;
    border-radius: 100px;
    border: 1px solid #f1f5f9;
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #cbd5e1;
}

.status-dot.published { background: #10b981; }
.status-dot.draft { background: #f59e0b; }

.app-menu {
    color: #94a3b8;
    cursor: pointer;
    padding: 6px;
    margin-right: -10px;
    margin-top: -6px;
    border-radius: 6px;
    transition: all 0.2s;
}

.app-menu:hover {
    color: #475569;
    background: #f1f5f9;
}

.card-body {
    flex: 1;
    margin-bottom: 24px;
}

.app-name {
    font-size: 17px;
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 8px 0;
    line-height: 1.4;
}

.app-desc {
    font-size: 14px;
    color: #64748b;
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px dashed #e2e8f0;
    padding-top: 16px;
    margin-top: auto;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
}

.enter-btn {
    font-size: 13px;
    color: #0f172a;
    background: #f1f5f9;
    padding: 6px 12px;
    border-radius: 6px;
    font-weight: 600;
    opacity: 0;
    transform: translateX(10px);
    transition: all 0.2s;
}

.app-card:hover .enter-btn {
    opacity: 1;
    transform: translateX(0);
}

.enter-btn:hover {
    background: #e2e8f0;
}

.empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    color: #64748b;
    font-size: 14px;
}
</style>
