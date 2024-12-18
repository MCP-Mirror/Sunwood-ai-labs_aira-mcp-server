import { CreateCommitArgs } from '../types/git.js';
import { GitStatusManager } from './git/GitStatusManager.js';
import { GitCommitManager } from './git/GitCommitManager.js';

export class GitService {
  private statusManager: GitStatusManager;
  private commitManager: GitCommitManager;

  constructor(baseDir: string) {
    this.statusManager = new GitStatusManager(baseDir);
    this.commitManager = new GitCommitManager(baseDir);
  }

  /**
   * Gitのステータス情報を取得する
   */
  async getStatus(path?: string) {
    return this.statusManager.getStatus(path);
  }

  /**
   * ファイルをステージングエリアに追加する
   */
  async stageFile(file: string, path?: string) {
    return this.statusManager.stageFile(file, path);
  }

  /**
   * コミットを作成する
   */
  async createCommit(args: CreateCommitArgs & { path?: string }) {
    return this.commitManager.createCommit(args);
  }
}
