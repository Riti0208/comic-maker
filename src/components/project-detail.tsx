'use client';

import { useState, useEffect } from 'react';
import { Project, Character, Episode } from '@/types';
import { db } from '@/lib/db';
import { ClientGeminiAPI } from '@/lib/client-gemini';
import { Notification, ConfirmDialog } from './notification';
import { ArrowLeft, Plus, User, BookOpen, Calendar, Image as ImageIcon, Edit, X, Sparkles } from 'lucide-react';
import { ImageModal } from './image-modal';

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
  onCreateEpisode: (projectId: string) => void;
  onEditEpisode: (episodeId: string) => void;
}

export function ProjectDetail({ projectId, onBack, onCreateEpisode, onEditEpisode }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCharacterForm, setShowCharacterForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [showAICharacterModal, setShowAICharacterModal] = useState(false);
  const [episodeSortOrder, setEpisodeSortOrder] = useState<'number-asc' | 'number-desc' | 'date-asc' | 'date-desc'>('number-asc');

  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      await db.init();
      const [proj, chars, eps] = await Promise.all([
        db.getProject(projectId),
        db.getCharactersByProject(projectId),
        db.getEpisodesByProject(projectId),
      ]);

      setProject(proj || null);
      setCharacters(chars);
      setEpisodes(eps);
    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCharacter = () => {
    setEditingCharacter(null);
    setShowCharacterForm(true);
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setShowCharacterForm(true);
  };

  const handleCharacterSaved = async () => {
    setShowCharacterForm(false);
    setEditingCharacter(null);
    await loadProjectData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">プロジェクトが見つかりません</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          プロジェクト一覧へ戻る
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {project.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {project.description}
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              {project.artStyle}
            </span>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              更新: {new Date(project.updatedAt).toLocaleDateString('ja-JP')}
            </div>
          </div>
        </div>
      </div>

      {/* Characters Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-6 h-6" />
            キャラクター ({characters.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAICharacterModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Sparkles className="w-5 h-5" />
              AI作成
            </button>
            <button
              onClick={handleCreateCharacter}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              手動追加
            </button>
          </div>
        </div>

        {characters.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              まだキャラクターがいません
            </p>
            <button
              onClick={handleCreateCharacter}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              最初のキャラクターを作成
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {characters.map((char) => (
              <div
                key={char.id}
                onClick={() => handleEditCharacter(char)}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="aspect-square bg-gray-100 dark:bg-gray-900 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                  {char.imagePreviewUrl ? (
                    <img
                      src={char.imagePreviewUrl}
                      alt={char.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                  {char.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {char.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Episodes Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            エピソード ({episodes.length})
          </h2>
          <button
            onClick={() => onCreateEpisode(projectId)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            エピソード作成
          </button>
        </div>

        {episodes.length > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">並び順:</label>
            <select
              value={episodeSortOrder}
              onChange={(e) => setEpisodeSortOrder(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
            >
              <option value="number-asc">話数 昇順</option>
              <option value="number-desc">話数 降順</option>
              <option value="date-asc">作成日 古い順</option>
              <option value="date-desc">作成日 新しい順</option>
            </select>
          </div>
        )}

        {episodes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              まだエピソードがありません
            </p>
            <button
              onClick={() => onCreateEpisode(projectId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              最初のエピソードを作成
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...episodes].sort((a, b) => {
              switch (episodeSortOrder) {
                case 'number-asc':
                  return a.episodeNumber - b.episodeNumber;
                case 'number-desc':
                  return b.episodeNumber - a.episodeNumber;
                case 'date-asc':
                  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'date-desc':
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                default:
                  return 0;
              }
            }).map((episode) => (
              <div
                key={episode.id}
                onClick={() => onEditEpisode(episode.id)}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="aspect-[9/16] bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                  {episode.comicImageUrl ? (
                    <img
                      src={episode.comicImageUrl}
                      alt={episode.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <div className="p-4">
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">
                    第{episode.episodeNumber}話
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                    {episode.title}
                  </h3>
                  <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(episode.createdAt).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI Character Creation Modal */}
      {showAICharacterModal && project && (
        <AICharacterCreationModal
          projectId={projectId}
          project={project}
          onClose={() => setShowAICharacterModal(false)}
          onCreated={handleCharacterSaved}
        />
      )}

      {/* Character Form Modal */}
      {showCharacterForm && project && (
        <CharacterFormModal
          projectId={projectId}
          project={project}
          character={editingCharacter}
          projectCharacters={characters}
          onClose={() => {
            setShowCharacterForm(false);
            setEditingCharacter(null);
          }}
          onSaved={handleCharacterSaved}
        />
      )}
    </div>
  );
}

// AI Character Creation Modal
function AICharacterCreationModal({
  projectId,
  project,
  onClose,
  onCreated,
}: {
  projectId: string;
  project: Project;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Disable scroll when generating
  useEffect(() => {
    if (generating) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [generating]);

  const handleCreate = async () => {
    if (!description.trim()) {
      setNotification({ type: 'warning', message: 'キャラクターの説明を入力してください' });
      return;
    }

    setGenerating(true);
    try {
      const client = new ClientGeminiAPI();

      // Step 1: Generate character details using AI
      const data = await client.generateAICharacter(description.trim());
      const { name, appearance, firstPerson, personality } = data;

      // Step 2: Generate character image
      const imageUrl = await client.generateCharacterImage(
        { name, description: appearance },
        project ? { artStyle: project.artStyle, description: project.description } : undefined
      );

      // Step 3: Save character to DB
      const characterData: Character = {
        id: `char-${Date.now()}`,
        projectId,
        name,
        description: appearance,
        imagePreviewUrl: imageUrl,
        firstPerson,
        personality,
        createdAt: new Date(),
      };

      await db.saveCharacter(characterData);
      onCreated();
      onClose(); // モーダルを閉じる
    } catch (error) {
      console.error('Failed to create AI character:', error);
      setNotification({ type: 'error', message: 'AIキャラクター作成に失敗しました' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            AIキャラクター作成
          </h3>
          <button
            onClick={onClose}
            disabled={generating}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              どんなキャラクターを追加しますか？
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 resize-none"
              rows={6}
              placeholder="例: 明るく元気な高校生の女の子。長い黒髪でポニーテール。運動部所属で活発な性格。一人称は「私」。"
              disabled={generating}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              キャラクターの性格、外見、一人称などを自由に記載してください。AIが自動的に詳細を生成します。
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={generating}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={generating || !description.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            作成
          </button>
        </div>

        {/* AI Generation Loading Modal */}
        {generating && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 flex flex-col items-center">
              <div className="w-20 h-20 border-8 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">AIキャラクター生成中...</h3>
              <p className="text-gray-600 dark:text-gray-400">しばらくお待ちください</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Character form modal (create or edit)
function CharacterFormModal({
  projectId,
  project,
  character,
  projectCharacters,
  onClose,
  onSaved
}: {
  projectId: string;
  project: Project;
  character: Character | null;
  projectCharacters: Character[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(character?.name || '');
  const [description, setDescription] = useState(character?.description || '');
  const [imagePreview, setImagePreview] = useState<string>(character?.imagePreviewUrl || '');
  const [firstPerson, setFirstPerson] = useState(character?.firstPerson || '');
  const [personality, setPersonality] = useState(character?.personality || '');
  const [generating, setGenerating] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const isEditing = !!character;

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateImage = async () => {
    if (!name.trim() || !description.trim()) {
      setNotification({ type: 'warning', message: '名前と説明を入力してから画像を生成してください' });
      return;
    }

    setGenerating(true);
    try {
      const client = new ClientGeminiAPI();
      const imageUrl = await client.generateCharacterImage(
        {
          name: name.trim(),
          description: description.trim()
        },
        project ? { artStyle: project.artStyle, description: project.description } : undefined
      );
      setImagePreview(imageUrl);
    } catch (error) {
      console.error('Failed to generate character image:', error);
      setNotification({ type: 'error', message: '画像の生成に失敗しました' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !description.trim()) {
      setNotification({ type: 'warning', message: '名前と説明を入力してください' });
      return;
    }

    if (!imagePreview) {
      setNotification({ type: 'warning', message: '画像を生成またはアップロードしてください' });
      return;
    }

    try {
      // Save character to DB
      const characterData: Character = {
        id: isEditing ? character.id : `char-${Date.now()}`,
        projectId,
        name: name.trim(),
        description: description.trim(),
        imagePreviewUrl: imagePreview,
        firstPerson: firstPerson.trim() || undefined,
        personality: personality.trim() || undefined,
        createdAt: isEditing ? character.createdAt : new Date(),
      };

      await db.saveCharacter(characterData);
      onSaved();
    } catch (error) {
      console.error('Failed to save character:', error);
      setNotification({ type: 'error', message: 'キャラクターの保存に失敗しました' });
    }
  };

  const handleDelete = async () => {
    if (!isEditing) return;

    setConfirmDialog({
      message: `「${character.name}」を削除してもよろしいですか？`,
      onConfirm: async () => {
        try {
          await db.deleteCharacter(character.id);
          onSaved();
        } catch (error) {
          console.error('Failed to delete character:', error);
          setNotification({ type: 'error', message: 'キャラクターの削除に失敗しました' });
        }
      }
    });
  };

  return (
    <>
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
      <div
        className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto"
      >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 my-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'キャラクター編集' : '新規キャラクター作成'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              名前
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
              placeholder="例: 佐藤花子"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              外見の説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 resize-none"
              rows={4}
              placeholder="例: 長い黒髪、茶色の瞳、高校の制服"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                一人称 <span className="text-xs text-gray-500">(任意)</span>
              </label>
              <input
                type="text"
                value={firstPerson}
                onChange={(e) => setFirstPerson(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                placeholder="例: 僕、俺、私"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                性格 <span className="text-xs text-gray-500">(任意)</span>
              </label>
              <input
                type="text"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                placeholder="例: 明るく元気"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              キャラクター画像
            </label>
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg mb-3 overflow-hidden">
              {generating ? (
                <div className="aspect-square flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">生成中...</p>
                  </div>
                </div>
              ) : imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setShowImageModal(true)}
                />
              ) : (
                <div className="aspect-square flex items-center justify-center">
                  <ImageIcon className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGenerateImage}
                disabled={generating || !name.trim() || !description.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                AI生成
              </button>
              <label className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-center cursor-pointer">
                アップロード
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3">
          {isEditing && (
            <button
              onClick={handleDelete}
              disabled={generating}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              削除
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              disabled={generating}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={generating || !name.trim() || !description.trim() || !imagePreview}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isEditing ? '保存' : '作成'}
            </button>
          </div>
        </div>
      </div>

      {showImageModal && imagePreview && (
        <ImageModal
          imageUrl={imagePreview}
          onClose={() => setShowImageModal(false)}
        />
      )}
      </div>
    </>
  );
}
