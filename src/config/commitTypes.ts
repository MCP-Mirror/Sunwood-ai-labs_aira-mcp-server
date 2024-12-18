interface CommitTypeConfig {
  emojis: string[];  // 複数の絵文字から選択できるように配列に変更
  description: string;
}

export const COMMIT_TYPES: Record<string, CommitTypeConfig> = {
  feat: { 
    emojis: ["✨", "🎉", "🚀", "⭐", "🌟", "🆕", "🔥"],
    description: "新機能" 
  },
  fix: { 
    emojis: ["🐛", "🔧", "🚑", "🩹", "🛠️", "💉", "🔨"],
    description: "バグ修正" 
  },
  docs: { 
    emojis: ["📚", "📝", "📖", "📄", "📑", "✏️", "📔"],
    description: "ドキュメントの変更" 
  },
  style: { 
    emojis: ["💄", "🎨", "✨", "👗", "💅", "🖌️", "🎭"],
    description: "コードスタイルの変更" 
  },
  refactor: { 
    emojis: ["♻️", "🔄", "📦", "🔀", "🔁", "🔃", "🔮"],
    description: "リファクタリング" 
  },
  perf: { 
    emojis: ["⚡", "🚀", "💨", "🔥", "⚡️", "🎯", "💪"],
    description: "パフォーマンス改善" 
  },
  test: { 
    emojis: ["✅", "🧪", "🔍", "🧬", "🔎", "📊", "🧮"],
    description: "テストの追加・修正" 
  },
  chore: { 
    emojis: ["🔧", "🛠️", "⚙️", "🔩", "🔨", "⛏️", "🔪"],
    description: "ビルドプロセスやツールの変更" 
  }
} as const;

export type CommitType = keyof typeof COMMIT_TYPES;