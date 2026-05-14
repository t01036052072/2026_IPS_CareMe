import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000/docs';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});