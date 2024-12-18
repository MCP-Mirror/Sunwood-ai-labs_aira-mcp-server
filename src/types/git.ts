import { CommitType } from '../config/commitTypes.js';

export interface StagedFile {
  path: string;
  type: string;
  isDeleted?: boolean;
}

export interface CreateCommitArgs {
  file: string;  // 単一ファイルのみを受け付ける
  type: CommitType;
  emoji: string;
  title: string;
  body?: string;
  footer?: string;
  language?: 'ja' | 'en';
  branch?: string;
}

export function isCreateCommitArgs(obj: unknown): obj is CreateCommitArgs {
  if (typeof obj !== 'object' || obj === null) return false;
  const args = obj as Record<string, unknown>;
  return (
    typeof args.file === 'string' &&
    typeof args.type === 'string' &&
    typeof args.emoji === 'string' &&
    typeof args.title === 'string' &&
    (args.body === undefined || typeof args.body === 'string') &&
    (args.footer === undefined || typeof args.footer === 'string') &&
    (args.language === undefined || ['ja', 'en'].includes(args.language as string)) &&
    (args.branch === undefined || typeof args.branch === 'string')
  );
}