import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const getGroups = async () => {
  const response = await api.get('/api/groups');
  return response.data;
};

export const createGroup = async (groupData) => {
  const response = await api.post('/api/groups', groupData);
  return response.data;
};

export const getCandidates = async (groupid) => {
  const response = await api.get(`/api/candidates?groupid=${groupid}`);
  return response.data;
};

export const getAllCandidates = async () => {
  const response = await api.get('/api/candidates/all');
  return response.data;
};

export default api;