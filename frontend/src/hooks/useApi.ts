import axios from 'axios';
// Same-origin /api/v1 in production (Vercel) and local Vite proxy.
// Override only when VITE_API_BASE_URL is set to a different API origin.
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL ?? '';
export const setupAxiosInterceptors = (logoutUser: () => void) => {
  // Request interceptor: inject token automatically
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
  // Response interceptor: automatically refresh access token on 401
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            const resp = await axios.post(`/api/v1/auth/refresh?refresh_token=${refreshToken}`);
            const { access_token, refresh_token } = resp.data;
            
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
            
            // Set header and retry original query
            axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
            originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
            return axios(originalRequest);
          } catch (refreshErr) {
            console.error("Credentials refresh loop failed:", refreshErr);
            logoutUser();
          }
        } else {
          logoutUser();
        }
      }
      return Promise.reject(error);
    }
  );
};
