import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { message } from 'antd'

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error) => {
    const errMsg = error.response?.data?.message || error.message || '请求失败'
    const err = new Error(errMsg) as any
    err.responseData = error.response?.data
    // 全局错误提示（跳过静默场景：GET 请求，避免页面初始化时弹出）
    if (error.config?.method !== 'get' || error.response?.status >= 500) {
      message.error(errMsg)
    }
    return Promise.reject(err)
  }
)

export const request = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.get(url, config),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.post(url, data, config),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.put(url, data, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    apiClient.delete(url, config),
}

export default apiClient
