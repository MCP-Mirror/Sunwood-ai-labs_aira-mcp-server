import { simpleGit, SimpleGit } from 'simple-git';
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { CreateCommitArgs, StagedFile } from '../types/git.js';
import { GITFLOW_CONFIG } from '../config/gitflowConfig.js';

export class GitService {
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

  generateCommitMessage(args: CreateCommitArgs): string {
    const { type, emoji, title, body, footer, language } = args;

    // 新しいフォーマットでタイトルを生成
    const titleTemplate = language === 'en'
      ? `${emoji} [${type}] ${title}`
      : `${emoji} [${type}] ${title}`;

    let message = titleTemplate;
    
    // 本文がある場合は、2行の改行を入れてから追加
    if (body) {
      message += `\n\n${body}`;
    }
    
    // フッターがある場合は、2行の改行を入れてから追加
    if (footer) {
      message += `\n\n${footer}`;
    }

    return message;
  }

  async getStagedFiles(): Promise<StagedFile[]> {
    try {
      const status = await this.git.status();
      const stagedFiles: StagedFile[] = [];
      
      // 変更されたファイルと削除されたファイルの両方を処理
      for (const file of status.files) {
        // インデックスの状態をチェック
        // 'D' = deleted, 'A' = added, 'M' = modified
        if (status.staged.includes(file.path) || file.index === 'D') {
          stagedFiles.push({
            path: file.path,
            type: file.index || '?',
            isDeleted: file.index === 'D'
          });
        }
      }

      return stagedFiles;
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get staged files: ${error}`
      );
    }
  }

  async createCommit(args: CreateCommitArgs): Promise<string> {
    try {
      // 指定されたブランチに切り替え（指定がない場合はdevelopを使用）
      const targetBranch = args.branch || GITFLOW_CONFIG.branches.develop.name;
      
      // ブランチの存在確認
      const branches = await this.git.branch();
      if (!branches.all.includes(targetBranch)) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Branch ${targetBranch} does not exist.`
        );
      }

      // ブランチの切り替えと最新化
      await this.git.checkout(targetBranch);
      await this.git.pull('origin', targetBranch);

      // ステージングされているファイルの確認
      const status = await this.git.status();
      const isFileStaged = status.files.some(file => 
        file.path === args.file && (status.staged.includes(file.path) || file.index === 'D')
      );

      if (!isFileStaged) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `File ${args.file} is not staged. Please stage the file using 'git add' or 'git rm' first.`
        );
      }

      // コミットメッセージの生成とコミット実行
      const commitMessage = this.generateCommitMessage(args);
      
      // 指定されたファイルのみをコミット
      await this.git.commit(commitMessage, ['--', args.file]);

      // リモートにプッシュ
      await this.git.push('origin', targetBranch);

      return `[${targetBranch}] ${commitMessage}`;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create commit: ${error}`
      );
    }
  }
}