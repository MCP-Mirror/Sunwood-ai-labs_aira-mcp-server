import { WorkBranchType } from '../config/gitflowConfig.js';
import { GitflowInitializer } from './gitflow/GitflowInitializer.js';
import { GitflowBranchManager } from './gitflow/GitflowBranchManager.js';
import { GitflowMergeManager } from './gitflow/GitflowMergeManager.js';

export class GitflowService {
  private initializer: GitflowInitializer;
  private branchManager: GitflowBranchManager;
  private mergeManager: GitflowMergeManager;

  constructor(baseDir: string) {
    this.initializer = new GitflowInitializer(baseDir);
    this.branchManager = new GitflowBranchManager(baseDir);
    this.mergeManager = new GitflowMergeManager(baseDir);
  }

  /**
   * Gitflowの初期化を行う
   */
  async initializeGitflow() {
    return this.initializer.initializeGitflow();
  }

  /**
   * 作業ブランチを作成する
   */
  async createWorkBranch(type: WorkBranchType, branchName: string) {
    return this.branchManager.createWorkBranch(type, branchName);
  }

  /**
   * 作業ブランチをマージする
   */
  async mergeWorkBranch(type: WorkBranchType, branchName: string) {
    return this.mergeManager.mergeWorkBranch(type, branchName);
  }

  /**
   * ブランチ一覧を取得する
   */
  async listBranches() {
    return this.branchManager.listBranches();
  }
}
