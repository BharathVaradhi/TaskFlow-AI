import API from "./api";

const projectService = {
  getAll: async () => {
    const response = await API.get("/projects");
    return response.data;
  },

  getById: async (id) => {
    const response = await API.get(`/projects/${id}`);
    return response.data;
  },

  create: async (projectData) => {
    const response = await API.post("/projects", projectData);
    return response.data;
  },

  update: async (id, projectData) => {
    const response = await API.patch(`/projects/${id}`, projectData);
    return response.data;
  },

  delete: async (id) => {
    await API.delete(`/projects/${id}`);
  }
};

export default projectService;
