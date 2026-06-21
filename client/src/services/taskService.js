import API from "./api";

const taskService = {
  getAll: async (projectId) => {
    const params = projectId ? { project: projectId } : {};
    const response = await API.get("/tasks", { params });
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
  }
};

export default taskService;
