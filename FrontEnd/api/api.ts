import axios from 'axios';

const BASE_URL = 'http://3.27.45.51:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});