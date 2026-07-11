const BASE = "http://localhost:8000";

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  getWorkspaces: () => req<any[]>("/workspaces"),
  createWorkspace: (name: string) =>
    req<any>("/workspaces", { method: "POST", body: JSON.stringify({ name }) }),
  getMessages: (workspaceId: string) =>
    req<any[]>(`/workspaces/${workspaceId}/messages`),
  sendMessage: (workspaceId: string, content: string) =>
    req<any>(`/workspaces/${workspaceId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  getTools: () => req<any[]>("/tools"),
  getPrompts: (workspaceId?: string) =>
    req<any[]>(`/prompts${workspaceId ? `?workspace_id=${workspaceId}` : ""}`),
  generatePrompt: (toolId: string, workspaceId: string, platform: string) =>
    req<any>(`/tools/${toolId}/generate-prompt`, {
      method: "POST",
      body: JSON.stringify({ workspace_id: workspaceId, platform }),
    }),
  getApiKeys: () => req<any[]>("/settings/api-keys"),
  saveApiKey: (provider: string, key: string) =>
    req<any>("/settings/api-keys", {
      method: "POST",
      body: JSON.stringify({ provider, api_key: key }),
    }),
};