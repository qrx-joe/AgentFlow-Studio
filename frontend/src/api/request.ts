import axios, { type AxiosResponse } from 'axios';
import { ElMessage } from 'element-plus';

// 扩展 axios 类型，让拦截器返回 data 而不是 AxiosResponse
declare module 'axios' {
  export interface AxiosInstance {
    get<T = any>(url: string, config?: any): Promise<T>;
    post<T = any>(url: string, data?: any, config?: any): Promise<T>;
    put<T = any>(url: string, data?: any, config?: any): Promise<T>;
    delete<T = any>(url: string, config?: any): Promise<T>;
  }
}

// 统一的请求实例，集中处理错误提示与超时
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
});

// 请求拦截器：添加认证token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器：返回 data，统一错误提示
request.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    let message = '网络请求失败';
    if (error.response) {
      // 服务器返回了错误响应
      message = error.response.data?.message || `服务器错误 (${error.response.status})`;
    } else if (error.request) {
      // 请求已发出但没有收到响应
      message = '服务器无响应，请检查后端服务是否启动';
    } else if (error.code === 'ECONNABORTED') {
      // 请求超时
      message = '请求超时，请稍后重试';
    } else {
      // 其他错误
      message = error.message || '未知网络错误';
    }
    ElMessage.error(message);
    return Promise.reject(error);
  },
);

export default request;
