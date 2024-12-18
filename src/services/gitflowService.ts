import { simpleGit, SimpleGit } from 'simple-git';
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GITFLOW_CONFIG, WorkBranchType } from '../config/gitflowConfig.js';

export class GitflowService {
  private git: SimpleGit;

  constructor(baseDir: string) {
    try {
      this.git = simpleGit({
        baseDir,
        binary: 'git',
        maxConcurrentProcesses: 1,
      });
    } catch (error) {
      console.error('Failed to initialize git:', error);
      throw error;
    }
  }

  async initializeGitflow(): Promise<void> {
    try {
      const mainBranch = GITFLOW_CONFIG.branches.main.name;
      const developBranch = GITFLOW_CONFIG.branches.develop.name;

      // 現在のブランチ状態を確認
      let status = await this.git.status();
      const branches = await this.git.branch();

      // mainブランチの作成（存在しない場合）
      if (!branches.all.includes(mainBranch)) {
        // 初期コミットがない場合は作成
        if (status.files.length === 0) {
          await this.git.raw(['commit', '--allow-empty', '-m', '🎉 Initial commit']);
        }
        await this.git.checkout(['-b', mainBranch]);
        await this.git.push('origin', mainBranch);
        console.log(`Created and pushed ${mainBranch} branch`);
      }

      // developブランチの作成（存在しない場合）
      if (!branches.all.includes(developBranch)) {
        await this.git.checkout(mainBranch); // 一旦mainに切り替え
        await this.git.checkoutBranch(developBranch, mainBranch);
        await this.git.push('origin', developBranch);
        console.log(`Created and pushed ${developBranch} branch`);
      }

      // developをデフォルトブランチとして設定
      await this.git.checkout(developBranch);
      console.log(`Switched to ${developBranch} branch`);
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to initialize gitflow: ${error}`
      );
    }
  }

  private async ensureCleanWorkingDirectory(): Promise<void> {
    const status = await this.git.status();
    if (status.files.length > 0 && status.files.some(file => !status.staged.includes(file.path))) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Working directory has unstaged changes. Please commit or stash your changes.'
      );
    }
  }

  async createWorkBranch(type: WorkBranchType, branchName: string): Promise<string> {
    try {
      await this.ensureCleanWorkingDirectory();

      const config = GITFLOW_CONFIG.workBranches[type];
      const fullBranchName = type === 'custom' ? branchName : `${config.prefix}${branchName}`;

      // ベースブランチを最新化
      await this.git.checkout(config.base);
      await this.git.pull('origin', config.base);

      // 新しいブランチを作成
      await this.git.checkoutBranch(fullBranchName, config.base);
      await this.git.push('origin', fullBranchName);

      return fullBranchName;
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create ${type} branch: ${error}`
      );
    }
  }

  async mergeWorkBranch(type: WorkBranchType, branchName: string): Promise<string[]> {
    try {
      await this.ensureCleanWorkingDirectory();

      const config = GITFLOW_CONFIG.workBranches[type];
      const fullBranchName = type === 'custom' ? branchName : `${config.prefix}${branchName}`;
      const mergeResults: string[] = [];

      // 対象ブランチの存在確認
      const branches = await this.git.branch();
      if (!branches.all.includes(fullBranchName)) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Branch ${fullBranchName} does not exist.`
        );
      }

      // 作業ブランチを最新化
      await this.git.checkout(fullBranchName);
      await this.git.pull('origin', fullBranchName);

      // 各ターゲットブランチに対してマージを実行
      for (const targetBranch of config.mergeTo) {
        await this.git.checkout(targetBranch);
        await this.git.pull('origin', targetBranch);
        
        try {
          await this.git.merge([fullBranchName]);
          await this.git.push('origin', targetBranch);
          mergeResults.push(`Successfully merged ${fullBranchName} into ${targetBranch}`);
        } catch (mergeError) {
          await this.git.merge(['--abort']);
          mergeResults.push(`Failed to merge ${fullBranchName} into ${targetBranch}: ${mergeError}`);
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Merge conflict occurred while merging into ${targetBranch}. Please resolve conflicts manually.`
          );
        }
      }

      // developブランチに戻る
      await this.git.checkout(GITFLOW_CONFIG.branches.develop.name);

      // ブランチの削除（設定されている場合）
      if (config.deleteAfterMerge) {
        await this.git.deleteLocalBranch(fullBranchName, true);  // forceDelete オプションを true に設定
        await this.git.push(['origin', '--delete', fullBranchName]);
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

  async listBranches(): Promise<{
    main: string;
    develop: string;
    feature: string[];
    release: string[];
    hotfix: string[];
    custom: string[];
  }> {
    try {
      const branches = await this.git.branch();
      const result = {
        main: GITFLOW_CONFIG.branches.main.name,
        develop: GITFLOW_CONFIG.branches.develop.name,
        feature: [] as string[],
        release: [] as string[],
        hotfix: [] as string[],
        custom: [] as string[]
      };

      // 作業ブランチを分類
      for (const branch of branches.all) {
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