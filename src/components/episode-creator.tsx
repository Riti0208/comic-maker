'use client';

import { useState, useEffect } from 'react';
import { Project, Character, Episode } from '@/types';
import { db } from '@/lib/db';
import { ClientGeminiAPI } from '@/lib/client-gemini';
import { ComicDisplay } from './comic-display';
import { Notification, ConfirmDialog } from './notification';
import { ImageModal } from './image-modal';
import { Sparkles, Image as ImageIcon, BookOpen, ArrowLeft, AlertTriangle } from 'lucide-react';

interface EpisodeCreatorProps {
  projectId: string;
  episodeId?: string; // undefined = create new, string = edit existing
  onBack: () => void;
}

export function EpisodeCreator({ projectId, episodeId, onBack }: EpisodeCreatorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [project, setProject] = useState<Project | null>(null);
  const [projectCharacters, setProjectCharacters] = useState<Character[]>([]);

  // Step 1: Topic & Settings
  const [topic, setTopic] = useState('');
  const [allowNewCharacters, setAllowNewCharacters] = useState(false);
  const [maxNewCharacters, setMaxNewCharacters] = useState<number>(2);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);

  // Step 2: Plot
  const [title, setTitle] = useState('');
  const [panels, setPanels] = useState<string[]>(['', '', '', '']);
  const [episodeCharacters, setEpisodeCharacters] = useState<Character[]>([]);

  // Step 3: Character images (for new characters only)
  const [generatingCharIds, setGeneratingCharIds] = useState<string[]>([]);

  // Step 4: Final Comic
  const [comicImage, setComicImage] = useState<string | null>(null);
  const [editInstructions, setEditInstructions] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  // Episode number editing
  const [showEpisodeNumberModal, setShowEpisodeNumberModal] = useState(false);
  const [newEpisodeNumber, setNewEpisodeNumber] = useState<number>(1);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);

  // Image modal for character preview
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');

  // Character selection modal
  const [showCharacterSelectionModal, setShowCharacterSelectionModal] = useState(false);

  // Loading state
  const [isGenerating, setIsGenerating] = useState(false);

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

  // Disable scroll when generating
  useEffect(() => {
    if (isGenerating) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isGenerating]);

  const loadProjectData = async () => {
    try {
      await db.init();
      const [proj, chars] = await Promise.all([
        db.getProject(projectId),
        db.getCharactersByProject(projectId),
      ]);

      setProject(proj || null);
      setProjectCharacters(chars);

      // If editing existing episode, load it
      if (episodeId) {
        const episode = await db.getEpisode(episodeId);
        if (episode) {
          setCurrentEpisode(episode);
          setTitle(episode.title);
          setPanels(episode.plot);
          setComicImage(episode.comicImageUrl || null);
          setNewEpisodeNumber(episode.episodeNumber);

          // Load episode characters
          const epChars = await Promise.all(
            episode.characterIds.map(id => db.getCharacter(id))
          );
          setEpisodeCharacters(epChars.filter(c => c !== undefined) as Character[]);
          setCurrentStep(4); // Go straight to view mode
        }
      }
    } catch (error) {
      console.error('Failed to load project data:', error);
    }
  };

  // Step 1 -> 2
  const handleMoveToStep2 = () => {
    if (!topic) return;
    setCurrentStep(2);
  };

  // Generate/Regenerate Story in Step 2
  const handleGenerateStory = async () => {
    if (!topic || !project) return;
    setIsGenerating(true);
    try {
      const client = new ClientGeminiAPI();

      // Filter characters based on selection
      const availableCharacters = selectedCharacterIds.length > 0
        ? projectCharacters.filter(c => selectedCharacterIds.includes(c.id))
        : projectCharacters;

      const data = await client.generateEpisodeStory(topic, {
        description: project.description,
        artStyle: project.artStyle,
        existingCharacters: availableCharacters.map(c => ({ name: c.name, description: c.description })),
        allowNewCharacters,
        maxNewCharacters: allowNewCharacters ? maxNewCharacters : 0,
      });

      setTitle(data.title);
      setPanels(data.panels);

      // Map characters: existing ones from project, new ones to be created
      const chars: Character[] = [];
      for (const charDef of data.characterDefinitions) {
        // Check if character already exists in project
        const existing = projectCharacters.find(pc => pc.name === charDef.name);
        if (existing) {
          chars.push(existing);
        } else {
          // New character (no image yet)
          chars.push({
            id: `char-${Date.now()}-${Math.random()}`,
            projectId,
            name: charDef.name,
            description: charDef.description,
            imagePreviewUrl: '',
            firstPerson: charDef.firstPerson,
            personality: charDef.personality,
            createdAt: new Date(),
          });
        }
      }
      setEpisodeCharacters(chars);
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', message: 'ストーリーの生成に失敗しました' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 2 -> 3
  const handleConfirmPlot = () => setCurrentStep(3);

  // Step 3: Generate Character Image
  const handleGenerateCharacterImage = async (charId: string) => {
    const charIndex = episodeCharacters.findIndex(c => c.id === charId);
    if (charIndex === -1) return;

    const char = episodeCharacters[charIndex];
    setGeneratingCharIds(prev => [...prev, charId]);

    try {
      const client = new ClientGeminiAPI();
      const imageUrl = await client.generateCharacterImage(
        char,
        project ? {
          artStyle: project.artStyle,
          description: project.description,
          existingCharacters: projectCharacters.map(c => ({
            name: c.name,
            description: c.description,
            personality: c.personality,
            firstPerson: c.firstPerson
          }))
        } : undefined
      );

      const newChars = [...episodeCharacters];
      newChars[charIndex] = { ...char, imagePreviewUrl: imageUrl };
      setEpisodeCharacters(newChars);
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', message: 'キャラクター画像の生成に失敗しました' });
    } finally {
      setGeneratingCharIds(prev => prev.filter(id => id !== charId));
    }
  };

  // Generate all characters simultaneously
  const handleGenerateAllCharacters = async () => {
    const charsToGenerate = episodeCharacters.filter(c => !c.imagePreviewUrl);
    if (charsToGenerate.length === 0) return;

    await Promise.all(charsToGenerate.map(char => handleGenerateCharacterImage(char.id)));
  };

  // Handle image upload
  const handleImageUpload = (charId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const charIndex = episodeCharacters.findIndex(c => c.id === charId);
      if (charIndex !== -1) {
        const newChars = [...episodeCharacters];
        newChars[charIndex] = {
          ...newChars[charIndex],
          imagePreviewUrl: e.target?.result as string,
          imageFile: file
        };
        setEpisodeCharacters(newChars);
      }
    };
    reader.readAsDataURL(file);
  };

  // Update character name
  const handleUpdateCharacterName = (charId: string, name: string) => {
    const charIndex = episodeCharacters.findIndex(c => c.id === charId);
    if (charIndex !== -1) {
      const newChars = [...episodeCharacters];
      newChars[charIndex] = { ...newChars[charIndex], name };
      setEpisodeCharacters(newChars);
    }
  };

  // Update character description
  const handleUpdateCharacterDescription = (charId: string, description: string) => {
    const charIndex = episodeCharacters.findIndex(c => c.id === charId);
    if (charIndex !== -1) {
      const newChars = [...episodeCharacters];
      newChars[charIndex] = { ...newChars[charIndex], description };
      setEpisodeCharacters(newChars);
    }
  };

  // Assign existing character to a role
  const handleAssignExistingCharacter = (charId: string, existingCharId: string) => {
    const existingChar = projectCharacters.find(pc => pc.id === existingCharId);
    if (!existingChar) return;

    const charIndex = episodeCharacters.findIndex(c => c.id === charId);
    if (charIndex !== -1) {
      const newChars = [...episodeCharacters];
      newChars[charIndex] = existingChar;
      setEpisodeCharacters(newChars);
    }
  };

  // Save new characters to project
  const handleSaveCharactersToProject = async () => {
    const newChars = episodeCharacters.filter(c => !projectCharacters.find(pc => pc.id === c.id));
    for (const char of newChars) {
      if (char.imagePreviewUrl) {
        await db.saveCharacter(char);
      }
    }
    // Reload project characters
    const updatedChars = await db.getCharactersByProject(projectId);
    setProjectCharacters(updatedChars);
  };

  // Step 3 -> 4 and generate comic
  const handleProceedToComicGeneration = async () => {
    // Save new characters to project (if any)
    await handleSaveCharactersToProject();
    setCurrentStep(4);

    // Automatically start comic generation
    await handleGenerateComic();
  };

  // Generate Comic (full regeneration)
  const handleGenerateComic = async () => {
    if (!project) return;

    setIsGenerating(true);
    try {
      const client = new ClientGeminiAPI();
      const imageUrl = await client.generateFullComic(
        `${topic} (Style: ${project.artStyle})`,
        title,
        panels,
        episodeCharacters
      );

      setComicImage(imageUrl);

      // Save episode to DB
      if (episodeId) {
        // Update existing episode
        const existingEpisode = await db.getEpisode(episodeId);
        if (existingEpisode) {
          await db.saveEpisode({
            ...existingEpisode,
            title,
            plot: panels,
            characterIds: episodeCharacters.map(c => c.id),
            comicImageUrl: imageUrl,
            updatedAt: new Date(),
          });
        }
      } else {
        // Create new episode
        const episodes = await db.getEpisodesByProject(projectId);
        const episodeNumber = episodes.length > 0
          ? Math.max(...episodes.map(e => e.episodeNumber)) + 1
          : 1;

        const episode: Episode = {
          id: `episode-${Date.now()}`,
          projectId,
          episodeNumber,
          title,
          plot: panels,
          characterIds: episodeCharacters.map(c => c.id),
          comicImageUrl: imageUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.saveEpisode(episode);
      }

      // Update project's updatedAt
      if (project) {
        await db.saveProject({ ...project, updatedAt: new Date() });
      }
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', message: 'コミックの生成に失敗しました' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Edit existing comic with instructions
  const handleEditComic = async () => {
    if (!project || !comicImage || !editInstructions.trim()) return;

    setIsGenerating(true);
    setShowEditModal(false);
    try {
      const client = new ClientGeminiAPI();
      const imageUrl = await client.editComicImage(
        comicImage,
        editInstructions.trim(),
        episodeCharacters.map(c => c.imagePreviewUrl).filter(url => url)
      );

      setComicImage(imageUrl);

      // Update episode in DB
      if (episodeId) {
        const episode = await db.getEpisode(episodeId);
        if (episode) {
          await db.saveEpisode({
            ...episode,
            comicImageUrl: imageUrl,
            updatedAt: new Date(),
          });
        }
      }

      // Clear edit instructions
      setEditInstructions('');
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', message: 'コミックの修正に失敗しました' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete Episode
  const handleDeleteEpisode = () => {
    if (!episodeId) return;

    setConfirmDialog({
      message: 'このエピソードを削除してもよろしいですか？',
      onConfirm: async () => {
        try {
          await db.deleteEpisode(episodeId);
          setConfirmDialog(null);
          onBack();
        } catch (error) {
          console.error('Failed to delete episode:', error);
          setNotification({ type: 'error', message: 'エピソードの削除に失敗しました' });
          setConfirmDialog(null);
        }
      },
    });
  };

  // Update Episode Number
  const handleUpdateEpisodeNumber = async () => {
    if (!currentEpisode || !episodeId) return;

    try {
      const updatedEpisode = {
        ...currentEpisode,
        episodeNumber: newEpisodeNumber,
        updatedAt: new Date(),
      };

      await db.saveEpisode(updatedEpisode);
      setCurrentEpisode(updatedEpisode);
      setShowEpisodeNumberModal(false);
      setNotification({ type: 'success', message: '話数を更新しました' });
    } catch (error) {
      console.error('Failed to update episode number:', error);
      setNotification({ type: 'error', message: '話数の更新に失敗しました' });
    }
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">プロジェクトが見つかりません</p>
          <button onClick={onBack} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            戻る
          </button>
        </div>
      </div>
    );
  }

  // Render functions for each step
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          エピソードのトピック
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={4}
          placeholder="例: 主人公が学校で友達と遊ぶ話"
        />
      </div>

      {projectCharacters.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            登場人物を指定（任意）
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            このエピソードに登場させたいキャラクターを選択できます。未選択の場合は全てのキャラクターが対象になります。
          </p>
          <button
            onClick={() => setShowCharacterSelectionModal(true)}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors flex items-center justify-center gap-2"
          >
            <ImageIcon className="w-5 h-5 text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">
              {selectedCharacterIds.length > 0
                ? `${selectedCharacterIds.length}人のキャラクターを選択中`
                : 'キャラクターを選択'}
            </span>
          </button>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="allowNewChars"
            checked={allowNewCharacters}
            onChange={(e) => setAllowNewCharacters(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <label htmlFor="allowNewChars" className="text-sm text-gray-700 dark:text-gray-300">
            新しいキャラクターの作成を許可する
          </label>
        </div>

        {allowNewCharacters && (
          <div className="flex items-center gap-3 ml-7">
            <label htmlFor="maxNewChars" className="text-sm text-gray-600 dark:text-gray-400">
              最大人数:
            </label>
            <select
              id="maxNewChars"
              value={maxNewCharacters}
              onChange={(e) => setMaxNewCharacters(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value={1}>1人</option>
              <option value={2}>2人</option>
              <option value={3}>3人</option>
              <option value={4}>4人</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleMoveToStep2}
          disabled={!topic}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          次へ
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => {
    if (panels.length === 0) {
      setPanels(['', '', '', '']);
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">プロット生成</h3>
          <button
            onClick={handleGenerateStory}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? '生成中...' : 'プロット生成'}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            タイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
            placeholder="漫画のタイトル"
          />
        </div>

        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              パネル {i + 1}
            </label>
            <textarea
              value={panels[i] || ''}
              onChange={(e) => {
                const newPanels = [...panels];
                newPanels[i] = e.target.value;
                setPanels(newPanels);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 resize-none"
              rows={3}
              placeholder={`パネル${i + 1}の説明`}
            />
          </div>
        ))}

        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setCurrentStep(1)}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            戻る
          </button>
          <button
            onClick={handleConfirmPlot}
            disabled={!title || panels.some(p => !p.trim())}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            確定
          </button>
        </div>

        {/* Plot Generation Loading Modal */}
        {isGenerating && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 flex flex-col items-center">
              <div className="w-20 h-20 border-8 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">プロット生成中...</h3>
              <p className="text-gray-600 dark:text-gray-400">しばらくお待ちください</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStep3 = () => {
    const newCharacters = episodeCharacters.filter(c => !projectCharacters.find(pc => pc.id === c.id));
    const allReady = episodeCharacters.every(c => c.imagePreviewUrl);

    return (
      <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            キャラクター準備
          </h3>
          {newCharacters.some(c => !c.imagePreviewUrl) && (
            <button
              onClick={handleGenerateAllCharacters}
              disabled={generatingCharIds.length > 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              全て生成
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {episodeCharacters.map((char) => {
            const isExisting = projectCharacters.find(pc => pc.id === char.id);
            const isGenerating = generatingCharIds.includes(char.id);

            return (
              <div key={char.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={char.name}
                    onChange={(e) => handleUpdateCharacterName(char.id, e.target.value)}
                    className="font-bold text-lg bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none"
                    disabled={!!isExisting}
                  />
                  {isExisting && (
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                      既存
                    </span>
                  )}
                </div>

                <textarea
                  value={char.description}
                  onChange={(e) => handleUpdateCharacterDescription(char.id, e.target.value)}
                  className="w-full text-sm mb-3 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 resize-none"
                  rows={2}
                  disabled={!!isExisting}
                />

                <div className="aspect-square bg-gray-100 dark:bg-gray-900 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                  {isGenerating ? (
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">生成中...</p>
                    </div>
                  ) : char.imagePreviewUrl ? (
                    <img
                      src={char.imagePreviewUrl}
                      alt={char.name}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        setSelectedImageUrl(char.imagePreviewUrl || '');
                        setShowImageModal(true);
                      }}
                    />
                  ) : (
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  )}
                </div>

                {!isExisting && !char.imagePreviewUrl && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGenerateCharacterImage(char.id)}
                        disabled={isGenerating}
                        className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        生成
                      </button>
                      <label className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 text-center cursor-pointer">
                        アップロード
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(char.id, e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {projectCharacters.filter(pc => pc.imagePreviewUrl).length > 0 && (
                      <div>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignExistingCharacter(char.id, e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
                        >
                          <option value="">既存キャラクターから割り当て</option>
                          {projectCharacters.filter(pc => pc.imagePreviewUrl).map(pc => (
                            <option key={pc.id} value={pc.id}>{pc.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setCurrentStep(2)}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            戻る
          </button>
          <button
            onClick={handleProceedToComicGeneration}
            disabled={!allReady}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            コミック生成へ
          </button>
        </div>
      </div>

      {showImageModal && selectedImageUrl && (
        <ImageModal
          imageUrl={selectedImageUrl}
          onClose={() => setShowImageModal(false)}
        />
      )}
      </>
    );
  };

  const handleDownloadComic = async () => {
    if (!comicImage) return;

    try {
      // base64データURLをBlobに変換
      const response = await fetch(comicImage);
      const blob = await response.blob();

      // File System Access API（新しいブラウザ）をサポートしている場合
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `${title || 'comic'}.png`,
            types: [{
              description: 'PNG画像',
              accept: { 'image/png': ['.png'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          setNotification({ type: 'success', message: 'ダウンロードしました' });
          return;
        } catch (e) {
          // ユーザーがキャンセルした場合は何もしない
          if ((e as Error).name === 'AbortError') {
            return;
          }
          throw e;
        }
      }

      // フォールバック: 従来の方法（Safari等）
      const link = document.createElement('a');
      link.href = comicImage;
      link.download = `${title || 'comic'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setNotification({ type: 'success', message: 'ダウンロードしました' });
    } catch (error) {
      console.error('Download failed:', error);
      setNotification({ type: 'error', message: 'ダウンロードに失敗しました' });
    }
  };

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
            {comicImage ? (
              <img src={comicImage} alt="Generated Comic" className="w-full h-full object-contain" />
            ) : (
              <img src="/reference.jpg" alt="レイアウト参考" className="w-full h-full object-contain" />
            )}
          </div>
        </div>

        <div className="flex justify-end items-center border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex gap-3">
            {episodeId && comicImage && (
              <>
                <button
                  onClick={handleDownloadComic}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ダウンロード
                </button>
                <button
                  onClick={() => setShowEpisodeNumberModal(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  話数変更
                </button>
                <button
                  onClick={handleDeleteEpisode}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  削除
                </button>
              </>
            )}
            {comicImage && !episodeId && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  disabled={isGenerating}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  画像を修正
                </button>
                <button
                  onClick={handleGenerateComic}
                  disabled={isGenerating}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  完全再生成
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Episode Number Modal */}
      {showEpisodeNumberModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEpisodeNumberModal(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              話数変更
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              エピソードの話数を変更します
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                話数
              </label>
              <input
                type="number"
                min="1"
                value={newEpisodeNumber}
                onChange={(e) => setNewEpisodeNumber(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEpisodeNumberModal(false);
                  setNewEpisodeNumber(currentEpisode?.episodeNumber || 1);
                }}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateEpisodeNumber}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Instructions Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              画像修正指示
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              既存の画像に対してどのような修正を行うか指示してください
            </p>
            <textarea
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={6}
              placeholder="例: キャラクターの表情をもっと笑顔にしてください&#10;例: 背景を明るくしてください&#10;例: 2コマ目のセリフの位置を調整してください"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditInstructions('');
                }}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleEditComic}
                disabled={!editInstructions.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                修正を実行
              </button>
            </div>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 flex flex-col items-center">
            <div className="w-20 h-20 border-8 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">コミック生成中...</h3>
            <p className="text-gray-600 dark:text-gray-400">しばらくお待ちください</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Character Selection Modal */}
      {showCharacterSelectionModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCharacterSelectionModal(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                登場人物を選択
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                このエピソードに登場させたいキャラクターを選択してください
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projectCharacters.map((char) => {
                  const isSelected = selectedCharacterIds.includes(char.id);
                  return (
                    <button
                      key={char.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCharacterIds(selectedCharacterIds.filter(id => id !== char.id));
                        } else {
                          setSelectedCharacterIds([...selectedCharacterIds, char.id]);
                        }
                      }}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      {char.imagePreviewUrl ? (
                        <img
                          src={char.imagePreviewUrl}
                          alt={char.name}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {char.name}
                          </p>
                          {!char.imagePreviewUrl && (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                          {char.description}
                        </p>
                        {!char.imagePreviewUrl && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            ※ コミック生成前に画像が必要です
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedCharacterIds.length > 0 ? (
                  <span>{selectedCharacterIds.length}人選択中</span>
                ) : (
                  <span>未選択（全てのキャラクターが対象）</span>
                )}
              </div>
              <div className="flex gap-3">
                {selectedCharacterIds.length > 0 && (
                  <button
                    onClick={() => setSelectedCharacterIds([])}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    クリア
                  </button>
                )}
                <button
                  onClick={() => setShowCharacterSelectionModal(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  完了
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          プロジェクトへ戻る
        </button>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            {episodeId ? 'エピソード詳細' : 'エピソード作成'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{project.name}</p>
        </div>

        {/* Step Indicator (only for new episodes) */}
        {!episodeId && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              {['トピック', 'プロット', 'キャラクター', 'コミック'].map((label, index) => (
                <div
                  key={index}
                  className={`flex-1 py-4 text-center transition-colors ${
                    currentStep === index + 1
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <div className="text-xs mb-1">ステップ {index + 1}</div>
                  <div className="text-sm">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>
      </div>
      </div>
    </>
  );
}
