import { GitService } from '../services/gitService.js';
import { ToolHandler } from '../types/handlers.js';
import { createGetStatusHandler } from './tools/getStatus.js';
import { createCreateCommitHandler } from './tools/createCommit.js';

export class ToolHandlers {
  private handlers: Map<string, ToolHandler>;

  constructor(gitService: GitService) {
    this.handlers = new Map([
      ['get_status', createGetStatusHandler(gitService)],
      ['create_commit', createCreateCommitHandler(gitService)]
    ]);
  }

  getToolsList() {
    return {
      tools: Array.from(this.handlers.values()).map(handler => ({
        name: handler.name,
        description: handler.description,
        inputSchema: handler.inputSchema
      }))
    };
  }

  async handleGetStatus(args: unknown) {
    return this.handlers.get('get_status')!.handler(args);
  }

  async handleCreateCommit(args: unknown) {
    return this.handlers.get('create_commit')!.handler(args);
  }
}
