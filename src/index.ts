import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { GitService } from './services/gitService.js';
import { GitflowService } from './services/gitflowService.js';
import { ToolHandlers } from './handlers/toolHandlers.js';

/**
 * MCPサーバーのインスタンスを作成
 */
const server = new Server(
  {
    name: "aira-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// サービスとハンドラーの初期化
const gitService = new GitService(process.cwd());
const gitflowService = new GitflowService(process.cwd());
const toolHandlers = new ToolHandlers(gitService, gitflowService);

/**
 * 利用可能なツールの一覧を返すハンドラー
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return toolHandlers.getToolsList();
});

/**
 * ツールの実行を処理するハンドラー
 */
server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  try {
    let response;
    switch (request.params.name) {
      case "get_status":
        response = await toolHandlers.handleGetStatus(request.params.arguments);
        break;

      case "create_commit":
        response = await toolHandlers.handleCreateCommit(request.params.arguments);
        break;

      case "init_gitflow":
        response = await toolHandlers.handleInitGitflow();
        break;

      case "create_branch":
        response = await toolHandlers.handleCreateBranch(request.params.arguments);
        break;

      case "merge_branch":
        response = await toolHandlers.handleMergeBranch(request.params.arguments);
        break;

      case "list_branches":
        response = await toolHandlers.handleListBranches();
        break;

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
    }

    return {
      tools: toolHandlers.getToolsList().tools,
      ...response
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    throw new McpError(ErrorCode.InternalError, String(error));
  }
});

/**
 * サーバーの起動
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Aira MCP server running on stdio');
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
