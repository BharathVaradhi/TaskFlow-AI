import API from "./api";

const notificationService = {
  getAll: async () => {
    const response = await API.get("/notifications");
    return response.data; // { notifications: [], unreadCount: 0 }
  },

  markAsRead: async (id) => {
    const response = await API.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await API.post("/notifications/read-all");
    return response.data;
  },
};

export default notificationService;
