import axios, { AxiosInstance } from 'axios';
import Constants from 'expo-constants';

const host =
  Constants.expoConfig?.hostUri?.split(':').shift() ||
  Constants.manifest?.debuggerHost?.split(':').shift();

const BASE_URL = `http://${host}:5000`;


class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('API Service initialized');
    console.log('🔗 Base URL:', BASE_URL);

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(` ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error(' Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        console.log(
          ` ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`
        );
        return response;
      },
      (error) => {
        console.error(
          ' Response error:',
          error.response?.status,
          error.message
        );
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.api.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.post<T>(url, data);
    return response.data;
  }
}

const api = new ApiService();

export default api;
export { api };
