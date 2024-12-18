export interface ResponseContent {
  type: string;
  text: string;
}

export interface ToolResponse {
  content: ResponseContent[];
}

export interface ToolHandler {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  handler: (args?: unknown) => Promise<ToolResponse>;
}