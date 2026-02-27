import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/v1';

// Create a configured Axios instance
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Required to send and receive HttpOnly Cookies
  headers: {
    'bypass-tunnel-reminder': 'true',
    'ngrok-skip-browser-warning': 'true'
  }
});

let currentAccessToken = '';
let currentCsrfToken = '';

// Getter for the current access token (used by SSE EventSource which can't send headers)
export const getAccessToken = (): string => currentAccessToken;

// Function to update tokens in memory when logging in or refreshing
export const setTokens = (accessToken: string, csrfToken: string) => {
  currentAccessToken = accessToken;
  currentCsrfToken = csrfToken;
};

// Request Interceptor: Attach Access Token and CSRF Token dynamically
apiClient.interceptors.request.use((config) => {
  if (currentAccessToken) {
    config.headers['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  if (currentCsrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method || '')) {
    config.headers['X-CSRF-Token'] = currentCsrfToken;
  }

  return config;
});

// Response Interceptor: Handle 401 Unauthorized via transparent Token Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If it's a 401 and it's NOT the refresh endpoint itself, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/tokens/refresh')) {
      originalRequest._retry = true;

      try {
        const res = await axios.post(
          `${API_URL}/tokens/refresh`,
          {},
          { withCredentials: true }
        );

        setTokens(res.data.authentication.access_token, res.data.authentication.csrf_token);

        // Update the original request's headers and retry
        originalRequest.headers['Authorization'] = `Bearer ${currentAccessToken}`;
        if (['post', 'put', 'delete', 'patch'].includes(originalRequest.method || '')) {
          originalRequest.headers['X-CSRF-Token'] = currentCsrfToken;
        }

        return apiClient(originalRequest);

      } catch (refreshError) {
        // If refresh fails (cookie expired after 7 days or deleted), log out completely
        setTokens('', '');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
