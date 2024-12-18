import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GITFLOW_CONFIG, WorkBranchType } from '../../config/gitflowConfig.js';
import { GitCommandExecutor } from '../git/GitCommandExecutor.js';

export class GitflowMergeManager {
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
   * 作業ブランチをマージする
   */
  async mergeWorkBranch(type: WorkBranchType, branchName: string): Promise<string[]> {
    try {
      await this.ensureCleanWorkingDirectory();

      const config = GITFLOW_CONFIG.workBranches[type];
      const fullBranchName = type === 'custom' ? branchName : `${config.prefix}${branchName}`;
      const mergeResults: string[] = [];

      // 対象ブランチの存在確認
      const branches = await this.gitExecutor.execGitWithError('branch');
      if (!branches.includes(fullBranchName)) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Branch ${fullBranchName} does not exist.`
        );
      }

      // 作業ブランチを最新化
      await this.gitExecutor.execGitWithError(`checkout ${fullBranchName}`);
      await this.gitExecutor.execGitWithError(`pull origin ${fullBranchName}`);

      // 各ターゲットブランチに対してマージを実行
      for (const targetBranch of config.mergeTo) {
        await this.gitExecutor.execGitWithError(`checkout ${targetBranch}`);
        await this.gitExecutor.execGitWithError(`pull origin ${targetBranch}`);
        
        try {
          await this.gitExecutor.execGitWithError(`merge ${fullBranchName}`);
          await this.gitExecutor.execGitWithError(`push origin ${targetBranch}`);
          mergeResults.push(`Successfully merged ${fullBranchName} into ${targetBranch}`);
        } catch (mergeError) {
          await this.gitExecutor.execGitWithError('merge --abort');
          mergeResults.push(`Failed to merge ${fullBranchName} into ${targetBranch}: ${mergeError}`);
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Merge conflict occurred while merging into ${targetBranch}. Please resolve conflicts manually.`
          );
        }
      }

      // developブランチに戻る
      await this.gitExecutor.execGitWithError(`checkout ${GITFLOW_CONFIG.branches.develop.name}`);

      // ブランチの削除（設定されている場合）
      if (config.deleteAfterMerge) {
        await this.gitExecutor.execGitWithError(`branch -D ${fullBranchName}`);
        await this.gitExecutor.execGitWithError(`push origin --delete ${fullBranchName}`);
        mergeResults.push(`Deleted branch ${fullBranchName}`);
      }

      return mergeResults;
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to merge ${type} branch: ${error}`
      );
    }
  }
}
