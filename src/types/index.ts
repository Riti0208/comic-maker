export interface Project {
  id: string;
  name: string;
  description: string; // 大枠のストーリー説明
  artStyle: string; // 画風スタイル
  createdAt: Date;
  updatedAt: Date;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  description: string;
  imagePreviewUrl: string;
  imageFile?: File;
  firstPerson?: string; // 一人称（例：「僕」「俺」「私」「わたし」「ボク」）
  personality?: string; // 性格（例：「明るく元気」「クールで冷静」）
  createdAt: Date;
}

export interface Episode {
  id: string;
  projectId: string;
  episodeNumber: number;
  title: string;
  plot: string[]; // 4コマのプロット
  characterIds: string[]; // このエピソードで使用するキャラクターID
  comicImageUrl?: string; // 生成された漫画画像
  createdAt: Date;
  updatedAt: Date;
}

export interface ComicPanel {
  id: string;
  imageUrl: string;
  prompt: string;
}

export interface GenerationRequest {
  topic: string;
  styleReference?: File;
  characters: Character[];
}
