import { Project, Character, Episode } from '@/types';

const DB_NAME = 'ComicMakerDB';
const DB_VERSION = 2; // 設定ストア追加のためバージョンアップ

const STORES = {
  PROJECTS: 'projects',      // プロジェクトストア
  CHARACTERS: 'characters',  // キャラクターストア
  EPISODES: 'episodes',      // エピソードストア
  SETTINGS: 'settings',      // 設定ストア（APIキー等）
} as const;

/**
 * IndexedDBラッパークラス
 * プロジェクト、キャラクター、エピソード、設定をブラウザに保存
 */
class ComicMakerDB {
  private db: IDBDatabase | null = null;

  /** IndexedDBを初期化（ストアが存在しない場合は作成） */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // プロジェクトストアの作成
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        }

        // キャラクターストアの作成（projectIdでインデックス付き）
        if (!db.objectStoreNames.contains(STORES.CHARACTERS)) {
          const charStore = db.createObjectStore(STORES.CHARACTERS, { keyPath: 'id' });
          charStore.createIndex('projectId', 'projectId', { unique: false });
        }

        // エピソードストアの作成（projectIdでインデックス付き）
        if (!db.objectStoreNames.contains(STORES.EPISODES)) {
          const episodeStore = db.createObjectStore(STORES.EPISODES, { keyPath: 'id' });
          episodeStore.createIndex('projectId', 'projectId', { unique: false });
        }

        // 設定ストアの作成
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
      };
    });
  }

  /** DBが初期化済みか確認し、未初期化なら初期化 */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // ============================================
  // プロジェクト操作
  // ============================================

  async getAllProjects(): Promise<Project[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PROJECTS, 'readonly');
      const store = tx.objectStore(STORES.PROJECTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getProject(id: string): Promise<Project | undefined> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PROJECTS, 'readonly');
      const store = tx.objectStore(STORES.PROJECTS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveProject(project: Project): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PROJECTS, 'readwrite');
      const store = tx.objectStore(STORES.PROJECTS);
      const request = store.put(project);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProject(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.PROJECTS, STORES.CHARACTERS, STORES.EPISODES], 'readwrite');

      // Delete project
      tx.objectStore(STORES.PROJECTS).delete(id);

      // Delete related characters
      const charIndex = tx.objectStore(STORES.CHARACTERS).index('projectId');
      const charRequest = charIndex.openCursor(IDBKeyRange.only(id));
      charRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Delete related episodes
      const episodeIndex = tx.objectStore(STORES.EPISODES).index('projectId');
      const episodeRequest = episodeIndex.openCursor(IDBKeyRange.only(id));
      episodeRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ============================================
  // キャラクター操作
  // ============================================

  async getCharactersByProject(projectId: string): Promise<Character[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CHARACTERS, 'readonly');
      const store = tx.objectStore(STORES.CHARACTERS);
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCharacter(id: string): Promise<Character | undefined> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CHARACTERS, 'readonly');
      const store = tx.objectStore(STORES.CHARACTERS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveCharacter(character: Character): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CHARACTERS, 'readwrite');
      const store = tx.objectStore(STORES.CHARACTERS);
      const request = store.put(character);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCharacter(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CHARACTERS, 'readwrite');
      const store = tx.objectStore(STORES.CHARACTERS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // エピソード操作
  // ============================================

  async getEpisodesByProject(projectId: string): Promise<Episode[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.EPISODES, 'readonly');
      const store = tx.objectStore(STORES.EPISODES);
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => {
        // Sort by episode number
        const episodes = request.result.sort((a, b) => a.episodeNumber - b.episodeNumber);
        resolve(episodes);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getEpisode(id: string): Promise<Episode | undefined> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.EPISODES, 'readonly');
      const store = tx.objectStore(STORES.EPISODES);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveEpisode(episode: Episode): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.EPISODES, 'readwrite');
      const store = tx.objectStore(STORES.EPISODES);
      const request = store.put(episode);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteEpisode(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.EPISODES, 'readwrite');
      const store = tx.objectStore(STORES.EPISODES);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // 設定操作（APIキー、モデル選択等）
  // ============================================

  async getSetting(key: string): Promise<string | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SETTINGS, 'readonly');
      const store = tx.objectStore(STORES.SETTINGS);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  async setSetting(key: string, value: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SETTINGS, 'readwrite');
      const store = tx.objectStore(STORES.SETTINGS);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const db = new ComicMakerDB();
