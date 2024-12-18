import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GITFLOW_CONFIG } from '../../config/gitflowConfig.js';
import { GitCommandExecutor } from '../git/GitCommandExecutor.js';

export class GitflowInitializer {
  private gitExecutor: GitCommandExecutor;

  constructor(baseDir: string) {
    this.gitExecutor = new GitCommandExecutor(baseDir);
  }

  /**
   * Gitflowの初期化を行う
   */
  async initializeGitflow(): Promise<void> {
    try {
      const mainBranch = GITFLOW_CONFIG.branches.main.name;
      const developBranch = GITFLOW_CONFIG.branches.develop.name;

      // 現在のブランチ状態を確認
      const status = await this.gitExecutor.execGitWithError('status --porcelain');
      const branches = await this.gitExecutor.execGitWithError('branch');

      // mainブランチの作成（存在しない場合）
      if (!branches.includes(mainBranch)) {
        // 初期コミットがない場合は作成
        if (status.length === 0) {
          await this.gitExecutor.execGitWithError('commit --allow-empty -m "🎉 Initial commit"');
        }
        await this.gitExecutor.execGitWithError(`checkout -b ${mainBranch}`);
        await this.gitExecutor.execGitWithError(`push origin ${mainBranch}`);
        console.log(`Created and pushed ${mainBranch} branch`);
      }

      // developブランチの作成（存在しない場合）
      if (!branches.includes(developBranch)) {
        await this.gitExecutor.execGitWithError(`checkout ${mainBranch}`); // 一旦mainに切り替え
        await this.gitExecutor.execGitWithError(`checkout -b ${developBranch} ${mainBranch}`);
        await this.gitExecutor.execGitWithError(`push origin ${developBranch}`);
        console.log(`Created and pushed ${developBranch} branch`);
      }

      // developをデフォルトブランチとして設定
      await this.gitExecutor.execGitWithError(`checkout ${developBranch}`);
      console.log(`Switched to ${developBranch} branch`);
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to initialize gitflow: ${error}`
      );
    }
  }
}
