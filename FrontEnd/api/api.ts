import axios from 'axios';

export const BASE_URL = 'http://13.239.122.86:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
