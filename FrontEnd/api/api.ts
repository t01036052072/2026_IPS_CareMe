import axios from 'axios';

const BASE_URL = 'http://52.63.115.68:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});