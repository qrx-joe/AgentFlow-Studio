<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock, View, Hide } from '@element-plus/icons-vue';

const router = useRouter();

const loading = ref(false);
const socialLoading = ref('');
const showPassword = ref(false);

const loginForm = reactive({
  username: '',
  password: '',
  remember: false,
});

const handleLogin = async () => {
  if (!loginForm.username.trim()) {
    ElMessage.warning('请输入用户名');
    return;
  }
  if (!loginForm.password) {
    ElMessage.warning('请输入密码');
    return;
  }

  loading.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const token = `mock-token-${Date.now()}-${loginForm.username}`;
    localStorage.setItem('token', token);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('username', loginForm.username);
    ElMessage.success('登录成功');
    router.push('/');
  } catch {
    ElMessage.error('登录失败，请检查用户名和密码');
  } finally {
    loading.value = false;
  }
};

const handleSocialLogin = async (type: 'github' | 'wechat') => {
  socialLoading.value = type;
  try {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const username = type === 'github' ? 'GitHub用户' : '微信用户';
    const token = `mock-token-${Date.now()}-${type}`;
    localStorage.setItem('token', token);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('username', username);
    ElMessage.success(`${type === 'github' ? 'GitHub' : '微信'}登录成功`);
    router.push('/');
  } catch {
    ElMessage.error('登录失败，请稍后重试');
  } finally {
    socialLoading.value = '';
  }
};

const handleRegister = () => {
  // 模拟注册：直接创建账户并登录
  const token = `mock-token-${Date.now()}-newuser`;
  localStorage.setItem('token', token);
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('username', '新用户');
  ElMessage.success('注册成功，已自动登录');
  router.push('/');
};

const handleForgotPassword = () => {
  ElMessage.info('请联系管理员重置密码');
};

const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleLogin();
  }
};
</script>

<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="circle circle-1" />
      <div class="circle circle-2" />
      <div class="circle circle-3" />
    </div>

    <!-- 登录卡片 -->
    <div class="login-card">
      <!-- Logo 和标题 -->
      <div class="login-header">
        <div class="brand">
          <div class="logo-box">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span class="brand-text">AgentFlow</span>
        </div>
        <h1 class="login-title">欢迎回来</h1>
        <p class="login-subtitle">登录您的账户以继续使用</p>
      </div>

      <!-- 登录表单 -->
      <div class="login-form" @keypress="handleKeyPress">
        <div class="form-item">
          <label class="form-label">用户名</label>
          <div class="input-wrapper">
            <el-icon class="input-icon">
              <User />
            </el-icon>
            <input
              v-model="loginForm.username"
              type="text"
              class="form-input"
              placeholder="请输入用户名"
              autocomplete="username"
            />
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">密码</label>
          <div class="input-wrapper">
            <el-icon class="input-icon">
              <Lock />
            </el-icon>
            <input
              v-model="loginForm.password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              placeholder="请输入密码"
              autocomplete="current-password"
            />
            <el-icon class="toggle-password" @click="showPassword = !showPassword">
              <View v-if="!showPassword" />
              <Hide v-else />
            </el-icon>
          </div>
        </div>

        <div class="form-options">
          <label class="remember-me">
            <input v-model="loginForm.remember" type="checkbox" />
            <span class="checkbox-label">记住我</span>
          </label>
          <a href="javascript:void(0)" class="forgot-link" @click="handleForgotPassword"
            >忘记密码？</a
          >
        </div>

        <button class="login-btn" :class="{ loading }" :disabled="loading" @click="handleLogin">
          <span v-if="!loading">登录</span>
          <span v-else class="loading-text">
            <span class="spinner" />
            登录中...
          </span>
        </button>
      </div>

      <!-- 分隔线 -->
      <div class="divider">
        <span>或</span>
      </div>

      <!-- 其他登录方式 -->
      <div class="social-login">
        <button
          class="social-btn"
          :class="{ loading: socialLoading === 'github' }"
          :disabled="!!socialLoading"
          @click="handleSocialLogin('github')"
        >
          <span v-if="socialLoading === 'github'" class="btn-spinner" />
          <svg v-else viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#1677FF"
              d="M12.5 2C6.7 2 2 6.7 2 12.5c0 4.5 2.9 8.4 6.9 9.8.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1 .8-.2 1.6-.3 2.4-.3.8 0 1.6.1 2.4.3 1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5 4-1.4 6.9-5.3 6.9-9.8C23 6.7 18.3 2 12.5 2z"
            />
          </svg>
          <span>GitHub 登录</span>
        </button>
        <button
          class="social-btn"
          :class="{ loading: socialLoading === 'wechat' }"
          :disabled="!!socialLoading"
          @click="handleSocialLogin('wechat')"
        >
          <span v-if="socialLoading === 'wechat'" class="btn-spinner" />
          <svg v-else viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#07C160"
              d="M8.7 17c-2.5 0-4.7-1.3-5.9-3.3l1.7-1c.9 1.4 2.4 2.3 4.2 2.3 1.5 0 2.8-.6 3.8-1.5l1.4 1.2c-1.3 1.4-3.2 2.3-5.2 2.3zm8.6-5c0 2.5-2 4.5-4.5 4.5-1.2 0-2.3-.5-3.1-1.3l1.4-1.2c.5.5 1.1.8 1.7.8 1.4 0 2.5-1.1 2.5-2.5s-1.1-2.5-2.5-2.5c-.8 0-1.5.4-2 1l-1.4-1.2c.8-.9 2-1.5 3.4-1.5 2.5-.1 4.5 1.9 4.5 4.4zm-5.5-6c-3.9 0-7 3.1-7 7s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7zm0-2c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9z"
            />
          </svg>
          <span>微信登录</span>
        </button>
      </div>

      <!-- 注册链接 -->
      <div class="register-link">
        还没有账户？<a href="javascript:void(0)" @click="handleRegister">立即注册</a>
      </div>
    </div>

    <!-- 底部版权 -->
    <div class="footer">
      <p>&copy; 2024 AgentFlow. All rights reserved.</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 40px 20px;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.5;
}

.circle-1 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
  top: -200px;
  right: -100px;
  opacity: 0.1;
}

.circle-2 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  bottom: -150px;
  left: -100px;
  opacity: 0.1;
}

.circle-3 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  top: 50%;
  left: 10%;
  opacity: 0.05;
}

/* 登录卡片 */
.login-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 40px;
  position: relative;
  z-index: 1;
}

/* 头部 */
.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}

.logo-box {
  width: 44px;
  height: 44px;
  background: #0f172a;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.brand-text {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px;
}

.login-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

/* 表单 */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  color: #9ca3af;
  font-size: 18px;
  z-index: 1;
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 0 44px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  color: #0f172a;
  background: #f8fafc;
  transition: all 0.2s;
  outline: none;
}

.form-input::placeholder {
  color: #9ca3af;
}

.form-input:focus {
  border-color: var(--color-primary-900);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}

.toggle-password {
  position: absolute;
  right: 14px;
  color: #9ca3af;
  font-size: 18px;
  cursor: pointer;
  transition: color 0.2s;
}

.toggle-password:hover {
  color: #64748b;
}

/* 选项行 */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.remember-me input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary-900);
  cursor: pointer;
}

.checkbox-label {
  font-size: 14px;
  color: #64748b;
}

.forgot-link {
  font-size: 14px;
  color: #3b82f6;
  text-decoration: none;
  transition: color 0.2s;
}

.forgot-link:hover {
  color: #2563eb;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.3);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 分隔线 */
.divider {
  display: flex;
  align-items: center;
  margin: 24px 0;
  color: #9ca3af;
  font-size: 13px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.divider span {
  padding: 0 16px;
}

/* 社交登录 */
.social-login {
  display: flex;
  gap: 12px;
}

.social-btn {
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.social-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.social-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.social-btn.loading {
  background: #f1f5f9;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: var(--color-primary-900);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 注册链接 */
.register-link {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: #64748b;
}

.register-link a {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
  margin-left: 4px;
}

.register-link a:hover {
  color: #2563eb;
}

/* 底部 */
.footer {
  position: absolute;
  bottom: 20px;
  text-align: center;
}

.footer p {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
}

/* 响应式 */
@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px;
  }

  .social-login {
    flex-direction: column;
  }
}
</style>
