import { GitService } from '../services/gitService.js';
import { GitflowService } from '../services/gitflowService.js';
import { ToolHandler } from '../types/handlers.js';
import { createGetStagedFilesHandler } from './tools/getStagedFiles.js';
import { createCreateCommitHandler } from './tools/createCommit.js';
import { createInitGitflowHandler } from './tools/initGitflow.js';
import { createCreateBranchHandler } from './tools/createBranch.js';
import { createMergeBranchHandler } from './tools/mergeBranch.js';
import { createListBranchesHandler } from './tools/listBranches.js';

export class ToolHandlers {
  private handlers: Map<string, ToolHandler>;

  constructor(gitService: GitService, gitflowService: GitflowService) {
    this.handlers = new Map([
      ['get_staged_files', createGetStagedFilesHandler(gitService)],
      ['create_commit', createCreateCommitHandler(gitService)],
      ['init_gitflow', createInitGitflowHandler(gitflowService)],
      ['create_branch', createCreateBranchHandler(gitflowService)],
      ['merge_branch', createMergeBranchHandler(gitflowService)],
      ['list_branches', createListBranchesHandler(gitflowService)]
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

  async handleGetStagedFiles() {
    return this.handlers.get('get_staged_files')!.handler();
  }

  async handleCreateCommit(args: unknown) {
    return this.handlers.get('create_commit')!.handler(args);
  }

  async handleInitGitflow() {
    return this.handlers.get('init_gitflow')!.handler();
  }

  async handleCreateBranch(args: unknown) {
    return this.handlers.get('create_branch')!.handler(args);
  }

  async handleMergeBranch(args: unknown) {
    return this.handlers.get('merge_branch')!.handler(args);
  }

  async handleListBranches() {
    return this.handlers.get('list_branches')!.handler();
  }
}