import API from "./api";

const authService = {
  login: async (email, password) => {
    const response = await API.post("/auth/login", { email, password });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }
    return response.data;
  },

  register: async (name, email, password) => {
    const response = await API.post("/auth/register", { name, email, password });
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
    }
    return response.data;
  },

  getMe: async () => {
    const response = await API.get("/auth/me");
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("token");
  }
};

export default authService;
