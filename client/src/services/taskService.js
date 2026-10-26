import API from "./api";

const taskService = {
  getAll: async (params = {}) => {
    // Accepts either projectId string or query filter object
    const query = typeof params === "string" ? { project: params } : params;
    const response = await API.get("/tasks", { params: query });
    return response.data;
  },

  getById: async (id) => {
    const response = await API.get(`/tasks/${id}`);
    return response.data;
  },

  create: async (taskData) => {
    const response = await API.post("/tasks", taskData);
    return response.data;
  },

  update: async (id, taskData) => {
    const response = await API.patch(`/tasks/${id}`, taskData);
    return response.data;
  },

  delete: async (id) => {
    await API.delete(`/tasks/${id}`);
  },

  bulkCreate: async (tasks, projectId) => {
    const response = await API.post("/tasks/bulk", { tasks, projectId });
    return response.data;
  },

  getComments: async (taskId) => {
    const response = await API.get(`/tasks/${taskId}/comments`);
    return response.data;
  },

  addComment: async (taskId, content) => {
    const response = await API.post(`/tasks/${taskId}/comments`, { content });
    return response.data;
  },

  deleteComment: async (commentId) => {
    await API.delete(`/comments/${commentId}`);
  },

  getActivities: async (taskId) => {
    const response = await API.get(`/tasks/${taskId}/activity`);
    return response.data;
  },
};

export default taskService;
