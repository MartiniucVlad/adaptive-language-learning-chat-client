// src/api/axiosClient.ts
import axios from 'axios';

const baseURL = "http://127.0.0.1:8000";


export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('username');

  // We use window.location because we can't use useNavigate here.
  // This also ensures a clean slate by reloading the app.
  window.location.href = '/login';
};

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Add Access Token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Handle 401 Errors
api.interceptors.response.use(
  (response) => response, // Return success responses directly
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url.includes("/login")) {
        return Promise.reject(error);
    }

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark as retried to prevent infinite loops

      try {
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
            throw new Error("No refresh token");
        }

        // Call the backend to get a new access token
        const response = await axios.post(`${baseURL}/users/refresh`, {
            refresh_token: refreshToken
        });

        const { access_token } = response.data;

        // Save new token
        localStorage.setItem('access_token', access_token);

        // Update the header of the failed request with the new token
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
        // Retry the original request
        // Retry the original request
        return api(originalRequest);

      } catch (refreshError) {
        // If refresh fails (token expired completely), logout user
        console.error("Session expired", refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('username');
        window.location.href = '/login'; // Redirect to login
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export const BASE_URL = "http://127.0.0.1:8000";