import API from "./api";

const userService = {
  getAll: async () => {
    const response = await API.get("/users");
    return response.data;
  },

  getUserTasks: async (id) => {
    const response = await API.get(`/users/${id}/tasks`);
    return response.data;
  },

  update: async (id, data) => {
    const response = await API.patch(`/users/${id}`, data);
    return response.data;
  },
};

export default userService;
