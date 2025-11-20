import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/**
 * Function to handle successful responses
 */
const handleRes = (res: AxiosResponse) => res;

/**
 * Function to handle errors
 */
const handleErr = (err: AxiosError) => {
  // eslint-disable-next-line no-console
  console.log(err);
  return Promise.reject(err);
};

const api = axios.create({ withCredentials: true });

// Store for current username to be used in request headers
let currentUsername: string | null = null;

/**
 * Set the current username for API requests
 */
export const setApiUsername = (username: string | null) => {
  currentUsername = username;
};

/**
 * Add a request interceptor to the Axios instance.
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add username header if available
    if (currentUsername) {
      config.headers.username = currentUsername;
    }
    return config;
  },
  (error: AxiosError) => handleErr(error),
);

/**
 * Add a response interceptor to the Axios instance.
 */
api.interceptors.response.use(
  (response: AxiosResponse) => handleRes(response),
  (error: AxiosError) => handleErr(error),
);

export default api;
