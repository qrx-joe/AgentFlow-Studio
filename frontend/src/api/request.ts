import axios, { type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

// 扩展 axios 类型，让拦截器返回 data 而不是 AxiosResponse
declare module 'axios' {
  export interface AxiosInstance {
    get<T = any>(url: string, config?: any): Promise<T>
    post<T = any>(url: string, data?: any, config?: any): Promise<T>
    put<T = any>(url: string, data?: any, config?: any): Promise<T>
    delete<T = any>(url: string, config?: any): Promise<T>
  }
}

// 统一的请求实例，集中处理错误提示与超时
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
})

// 响应拦截器：返回 data，统一错误提示
request.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error) => {
    const message = error.response?.data?.message || '网络请求失败'
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default request
