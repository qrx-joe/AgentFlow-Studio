<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  Search,
  MoreFilled,
  Clock,
  User,
  Edit,
  Delete,
  CopyDocument
} from '@element-plus/icons-vue'
import { workflowApi } from '@/api'
import { ElMessage } from 'element-plus'

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

// 颜色列表用于选择
const colors = ['#475569', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6']

// 编辑对话框
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingApp = ref<Workflow | null>(null)
const formData = ref({
  name: '',
  description: '',
  color: '#475569'
})
const formLoading = ref(false)

// 删除确认弹窗
const deleteDialogVisible = ref(false)
const deletingApp = ref<Workflow | null>(null)
const deleteLoading = ref(false)

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

  if (activeTab.value === 'published') {
    result = result.filter(w => w.status === 'published')
  } else if (activeTab.value === 'draft') {
    result = result.filter(w => w.status === 'draft')
  }

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

// 打开新建对话框
const handleShowCreate = () => {
  dialogMode.value = 'create'
  editingApp.value = null
  formData.value = {
    name: '',
    description: '',
    color: colors[Math.floor(Math.random() * colors.length)]
  }
  dialogVisible.value = true
}

// 打开编辑对话框
const handleShowEdit = (app: Workflow) => {
  dialogMode.value = 'edit'
  editingApp.value = app
  formData.value = {
    name: app.name,
    description: app.description || '',
    color: app.color || '#475569'
  }
  dialogVisible.value = true
}

// 提交表单
const handleSubmit = async () => {
  if (!formData.value.name.trim()) {
    ElMessage.warning('请输入应用名称')
    return
  }

  formLoading.value = true
  try {
    if (dialogMode.value === 'create') {
      // 创建新应用
      const res = await workflowApi.create({
        name: formData.value.name,
        description: formData.value.description,
        color: formData.value.color,
        nodes: [],
        edges: []
      })
      ElMessage.success('创建成功')
      dialogVisible.value = false
      // 跳转到编辑页面
      router.push(`/studio/${res.id}`)
    } else if (editingApp.value) {
      // 更新应用
      await workflowApi.update(editingApp.value.id, {
        name: formData.value.name,
        description: formData.value.description,
        color: formData.value.color
      })
      ElMessage.success('更新成功')
      dialogVisible.value = false
      fetchWorkflows()
    }
  } catch (error) {
    ElMessage.error(dialogMode.value === 'create' ? '创建失败' : '更新失败')
  } finally {
    formLoading.value = false
  }
}

// 删除应用
const handleDelete = (app: Workflow) => {
  deletingApp.value = app
  deleteDialogVisible.value = true
}

const confirmDelete = async () => {
  if (!deletingApp.value) return
  deleteLoading.value = true
  try {
    await workflowApi.remove(deletingApp.value.id)
    ElMessage.success('删除成功')
    deleteDialogVisible.value = false
    fetchWorkflows()
  } catch {
    ElMessage.error('删除失败')
  } finally {
    deleteLoading.value = false
    deletingApp.value = null
  }
}

// 复制应用
const handleDuplicate = async (app: Workflow) => {
  try {
    await workflowApi.create({
      name: `${app.name} (副本)`,
      description: app.description,
      color: app.color,
      nodes: [],
      edges: []
    })
    ElMessage.success('复制成功')
    fetchWorkflows()
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const handleOpen = (id: string) => {
  router.push(`/studio/${id}`)
}
</script>

<template>
  <div class="dashboard-container">
    <div class="header-section">
      <div class="welcome-box">
        <h1 class="page-title">
          工作室
        </h1>
        <p class="page-subtitle">
          管理与构建所有的 AI 智能体应用
        </p>
      </div>
      <div class="action-box">
        <el-button
          type="primary"
          size="large"
          :icon="Plus"
          class="create-btn"
          @click="handleShowCreate"
        >
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
        >
          全部应用
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'published' }"
          @click="activeTab = 'published'"
        >
          已发布
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'draft' }"
          @click="activeTab = 'draft'"
        >
          草稿箱
        </button>
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

    <div
      v-loading="loading"
      class="apps-grid"
    >
      <!-- 新建应用卡片 -->
      <div
        class="app-card create-card"
        @click="handleShowCreate"
      >
        <div class="create-icon-box">
          <el-icon :size="32">
            <Plus />
          </el-icon>
        </div>
        <span class="create-text">新建应用</span>
        <span class="create-hint">创建一个新的 AI 智能体</span>
      </div>

      <!-- 应用卡片列表 -->
      <div
        v-for="app in filteredApps"
        :key="app.id"
        class="app-card"
        @click="handleOpen(app.id)"
      >
        <div class="card-header">
          <div
            class="app-icon"
            :style="{ background: app.color + '15', color: app.color }"
          >
            <span class="icon-text">{{ app.name.slice(0,1) }}</span>
          </div>
          <div class="app-status">
            <span
              class="status-dot"
              :class="app.status"
            />
            {{ app.status === 'published' ? '已发布' : '草稿' }}
          </div>
          <el-dropdown
            trigger="click"
            @click.stop
            @command="(cmd: string) => {
              if (cmd === 'edit') handleShowEdit(app)
              else if (cmd === 'delete') handleDelete(app)
              else if (cmd === 'duplicate') handleDuplicate(app)
            }"
          >
            <div
              class="app-menu"
              @click.stop
            >
              <el-icon><MoreFilled /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">
                  <el-icon><Edit /></el-icon>
                  <span>编辑信息</span>
                </el-dropdown-item>
                <el-dropdown-item command="duplicate">
                  <el-icon><CopyDocument /></el-icon>
                  <span>复制应用</span>
                </el-dropdown-item>
                <el-dropdown-item
                  command="delete"
                  divided
                  style="color: #f56c6c"
                >
                  <el-icon><Delete /></el-icon>
                  <span>删除应用</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <div class="card-body">
          <h3 class="app-name">
            {{ app.name }}
          </h3>
          <p class="app-desc">
            {{ app.description || '暂无描述' }}
          </p>
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

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建应用' : '编辑应用'"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="formData"
        label-position="top"
      >
        <el-form-item
          label="应用名称"
          required
        >
          <el-input
            v-model="formData.name"
            placeholder="输入应用名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="应用描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="描述应用的功能和用途（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="主题颜色">
          <div class="color-picker">
            <div
              v-for="color in colors"
              :key="color"
              class="color-option"
              :class="{ active: formData.color === color }"
              :style="{ background: color }"
              @click="formData.color = color"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="formLoading"
          @click="handleSubmit"
        >
          {{ dialogMode === 'create' ? '创建并编辑' : '保存' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 删除确认弹窗 -->
    <el-dialog
      v-model="deleteDialogVisible"
      width="420px"
      align-center
      :show-close="false"
      class="delete-dialog"
    >
      <div class="delete-content">
        <div class="delete-icon">
          <el-icon :size="32">
            <Delete />
          </el-icon>
        </div>
        <h3 class="delete-title">
          确认删除应用？
        </h3>
        <p class="delete-desc">
          删除后，应用「{{ deletingApp?.name }}」及其所有关联数据将不可恢复
        </p>
      </div>
      <template #footer>
        <div class="delete-footer">
          <el-button
            size="large"
            @click="deleteDialogVisible = false"
          >
            取消
          </el-button>
          <el-button
            size="large"
            type="danger"
            :loading="deleteLoading"
            @click="confirmDelete"
          >
            确认删除
          </el-button>
        </div>
      </template>
    </el-dialog>
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

/* 新建应用卡片 */
.create-card {
    border: 2px dashed #e2e8f0;
    background: #fafbfc;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 180px;
}

.create-card:hover {
    border-color: var(--el-color-primary);
    background: #f8fafc;
}

.create-icon-box {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    transition: all 0.2s;
}

.create-card:hover .create-icon-box {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
}

.create-text {
    font-size: 15px;
    font-weight: 600;
    color: #475569;
}

.create-hint {
    font-size: 12px;
    color: #94a3b8;
}

/* 颜色选择器 */
.color-picker {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.color-option {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
}

.color-option:hover {
    transform: scale(1.1);
}

.color-option.active {
    border-color: #0f172a;
    box-shadow: 0 0 0 2px #fff, 0 0 0 4px currentColor;
}

/* 下拉菜单样式 */
:deep(.el-dropdown-menu__item) {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
}

/* 删除确认弹窗样式 */
:deep(.delete-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.delete-dialog .el-dialog__header) {
  display: none;
}

:deep(.delete-dialog .el-dialog__body) {
  padding: 40px 40px 24px;
}

:deep(.delete-dialog .el-dialog__footer) {
  padding: 0 40px 40px;
  border: none;
}

.delete-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.delete-icon {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: #ef4444;
}

.delete-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px;
}

.delete-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.delete-footer {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.delete-footer .el-button {
  min-width: 120px;
  border-radius: 8px;
  font-weight: 500;
}

.delete-footer .el-button--default {
  border-color: #e5e7eb;
  color: #374151;
}

.delete-footer .el-button--default:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}
</style>
