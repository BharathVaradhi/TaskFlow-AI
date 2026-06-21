import API from "./api";

const aiService = {
  generate: async (tool, prompt) => {
    const response = await API.post("/ai/generate", { tool, prompt });
    return response.data;
  }
};

export default aiService;
