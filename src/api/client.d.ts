export interface AxiosInstance {
  get<T = any>(url: string, config?: any): Promise<{ data: T }>;
  post<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }>;
  put<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }>;
  delete<T = any>(url: string, config?: any): Promise<{ data: T }>;
  interceptors: {
    request: {
      use(onFulfilled?: (config: any) => any, onRejected?: (error: any) => any): void;
    };
  };
}

declare const api: AxiosInstance;
export { api };
