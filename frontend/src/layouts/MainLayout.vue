<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Files, ChatLineRound, Monitor, ArrowDown, User, SwitchButton } from '@element-plus/icons-vue'

// 主布局：现代化侧边栏与内容区
const route = useRoute()
const router = useRouter()

const menus = [
  { name: '工作室', path: '/', icon: Monitor },
  { name: '知识库', path: '/knowledge', icon: Files },
  { name: '智能对话', path: '/chat', icon: ChatLineRound },
]

const handleSelect = (path: string) => {
  if (route.path !== path) {
    router.push(path)
  }
}

const username = localStorage.getItem('username') || 'User'

// 退出确认弹窗
const logoutDialogVisible = ref(false)

const showLogoutConfirm = () => {
  logoutDialogVisible.value = true
}

const handleLogout = () => {
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('username')
  localStorage.removeItem('token')
  logoutDialogVisible.value = false
  router.push('/login')
}
</script>

<template>
  <div class="layout">
    <!-- Top Navigation Bar -->
    <header class="navbar">
      <div class="navbar-left">
        <div class="brand">
          <div class="logo-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span class="brand-text">AgentFlow</span>
        </div>
      </div>

      <nav class="nav-menu">
        <button
          v-for="item in menus"
          :key="item.path"
          class="nav-item"
          :class="{ active: route.path === item.path || (item.path !== '/' && route.path.startsWith(item.path)) }"
          @click="handleSelect(item.path)"
        >
          <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
          <span class="nav-text">{{ item.name }}</span>
        </button>
      </nav>

      <div class="navbar-right">
        <el-dropdown trigger="click">
          <div class="user-profile">
            <div class="avatar">{{ username.charAt(0).toUpperCase() }}</div>
            <span class="username">{{ username }}</span>
            <el-icon class="dropdown-arrow"><arrow-down /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>
                <el-icon><user /></el-icon>
                <span>{{ username }}</span>
              </el-dropdown-item>
              <el-dropdown-item divided @click="showLogoutConfirm">
                <el-icon><switch-button /></el-icon>
                <span>退出登录</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="content-wrapper">
      <div class="page-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
             <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- 退出登录确认弹窗 -->
    <el-dialog
      v-model="logoutDialogVisible"
      width="420px"
      align-center
      :show-close="false"
      class="logout-dialog"
    >
      <div class="logout-content">
        <div class="logout-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </div>
        <h3 class="logout-title">确认退出登录？</h3>
        <p class="logout-desc">退出后将需要重新登录才能访问您的数据</p>
      </div>
      <template #footer>
        <div class="logout-footer">
          <el-button size="large" @click="logoutDialogVisible = false">取消</el-button>
          <el-button size="large" type="primary" @click="handleLogout">确认退出</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: #f8fafc; /* Lighter background */
  font-family: var(--font-family-base);
  color: #0f172a;
}

/* Navbar */
.navbar {
  height: 72px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  flex-shrink: 0;
  z-index: 50;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 40px;
}

/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.logo-box {
  width: 40px;
  height: 40px;
  background: #0f172a; /* Solid dark brand color */
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.brand-text {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.5px;
}

/* Navigation - Centered */
.nav-menu {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.nav-item.active {
  background: #f1f5f9;
  color: #0f172a;
  font-weight: 600;
}

.nav-icon {
  font-size: 18px;
}

/* Navbar Right */
.navbar-right {
  display: flex;
  align-items: center;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 6px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-profile:hover {
  background: #f1f5f9;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.username {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-arrow {
  font-size: 12px;
  color: #9ca3af;
  transition: transform 0.2s;
}

/* Content */
.content-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  padding-top: 72px;
}

.page-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 退出登录弹窗样式 */
:deep(.logout-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.logout-dialog .el-dialog__header) {
  display: none;
}

:deep(.logout-dialog .el-dialog__body) {
  padding: 40px 40px 24px;
}

:deep(.logout-dialog .el-dialog__footer) {
  padding: 0 40px 40px;
  border: none;
}

.logout-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.logout-icon {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.logout-icon svg {
  width: 32px;
  height: 32px;
  color: #f59e0b;
}

.logout-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px;
}

.logout-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.logout-footer {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.logout-footer .el-button {
  min-width: 120px;
  border-radius: 8px;
  font-weight: 500;
}

.logout-footer .el-button--default {
  border-color: #e5e7eb;
  color: #374151;
}

.logout-footer .el-button--default:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.logout-footer .el-button--primary {
  background: #0f172a;
  border-color: #0f172a;
}

.logout-footer .el-button--primary:hover {
  background: #1f2937;
  border-color: #1f2937;
}
</style>
