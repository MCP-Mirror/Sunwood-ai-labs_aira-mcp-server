import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GITFLOW_CONFIG, WorkBranchType } from '../../config/gitflowConfig.js';
import { GitCommandExecutor } from '../git/GitCommandExecutor.js';

export class GitflowBranchManager {
  private gitExecutor: GitCommandExecutor;

  constructor(baseDir: string) {
    this.gitExecutor = new GitCommandExecutor(baseDir);
  }

  /**
   * 作業ディレクトリがクリーンかどうかを確認する
   */
  private async ensureCleanWorkingDirectory(): Promise<void> {
    const status = await this.gitExecutor.execGitWithError('status --porcelain');
    if (status.length > 0) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Working directory has unstaged changes. Please commit or stash your changes.'
      );
    }
  }

  /**
   * 作業ブランチを作成する
   */
  async createWorkBranch(type: WorkBranchType, branchName: string): Promise<string> {
    try {
      await this.ensureCleanWorkingDirectory();

      const config = GITFLOW_CONFIG.workBranches[type];
      const fullBranchName = type === 'custom' ? branchName : `${config.prefix}${branchName}`;

      // ベースブランチを最新化
      await this.gitExecutor.execGitWithError(`checkout ${config.base}`);
      await this.gitExecutor.execGitWithError(`pull origin ${config.base}`);

      // 新しいブランチを作成
      await this.gitExecutor.execGitWithError(`checkout -b ${fullBranchName} ${config.base}`);
      await this.gitExecutor.execGitWithError(`push origin ${fullBranchName}`);

      return fullBranchName;
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create ${type} branch: ${error}`
      );
    }
  }

  /**
   * ブランチ一覧を取得する
   */
  async listBranches(): Promise<{
    main: string;
    develop: string;
    feature: string[];
    release: string[];
    hotfix: string[];
    custom: string[];
  }> {
    try {
      const branchOutput = await this.gitExecutor.execGitWithError('branch');
      const branches = branchOutput.split('\n').map(b => b.trim().replace('* ', ''));

      const result = {
        main: GITFLOW_CONFIG.branches.main.name,
        develop: GITFLOW_CONFIG.branches.develop.name,
        feature: [] as string[],
        release: [] as string[],
        hotfix: [] as string[],
        custom: [] as string[]
      };

      // 作業ブランチを分類
      for (const branch of branches) {
        if (branch.startsWith('feature/')) {
          result.feature.push(branch);
        } else if (branch.startsWith('release/')) {
          result.release.push(branch);
        } else if (branch.startsWith('hotfix/')) {
          result.hotfix.push(branch);
        } else if (branch !== result.main && branch !== result.develop) {
          result.custom.push(branch);
        }
      }

      return result;
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list branches: ${error}`
      );
    }
  }
}
