'use client';

import { useState } from 'react';
import { Project } from '@/types';
import { db } from '@/lib/db';
import { Notification } from './notification';
import { X } from 'lucide-react';

interface ProjectCreateModalProps {
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

export function ProjectCreateModal({ onClose, onCreated }: ProjectCreateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [artStyle, setArtStyle] = useState('日本の漫画');
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  const styles = ['日本の漫画', 'アメコミ', 'ウェブトゥーン', 'ちびキャラ', 'ノワール/ダーク'];

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) {
      setNotification({ type: 'warning', message: 'プロジェクト名とストーリー説明を入力してください' });
      return;
    }

    setCreating(true);
    try {
      const now = new Date();
      const project: Project = {
        id: `project-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        artStyle,
        createdAt: now,
        updatedAt: now,
      };

      await db.init();
      await db.saveProject(project);
      onCreated(project.id);
    } catch (error) {
      console.error('Failed to create project:', error);
      setNotification({ type: 'error', message: 'プロジェクトの作成に失敗しました' });
    } finally {
      setCreating(false);
    }
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
      <div
        className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !creating) {
            onClose();
          }
        }}
      >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            新規プロジェクト作成
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              プロジェクト名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 魔法少女マミの日常"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ストーリー説明 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 現代の高校を舞台に、魔法の力に目覚めた少女たちの日常と冒険を描く"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {description.length}/500文字
            </p>
          </div>

          {/* Art Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              画風スタイル
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {styles.map((style) => (
                <button
                  key={style}
                  onClick={() => setArtStyle(style)}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    artStyle === style
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !description.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? '作成中...' : 'プロジェクトを作成'}
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
