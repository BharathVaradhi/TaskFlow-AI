import API from "./api";

const aiService = {
  generate: async (tool, prompt, projectId) => {
    const response = await API.post("/ai/generate", { tool, prompt, projectId });
    return response.data;
  }
};

export default aiService;
