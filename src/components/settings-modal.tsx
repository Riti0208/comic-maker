'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { Notification } from './notification';
import { X, Key, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [textModel, setTextModel] = useState('gemini-3-pro-preview');
  const [imageModel, setImageModel] = useState('gemini-3-pro-image-preview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      await db.init();
      const [key, tModel, iModel] = await Promise.all([
        db.getSetting('gemini_api_key'),
        db.getSetting('text_model'),
        db.getSetting('image_model'),
      ]);

      if (key) setApiKey(key);
      if (tModel) setTextModel(tModel);
      if (iModel) setImageModel(iModel);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setNotification({ type: 'warning', message: 'APIキーを入力してください' });
      return;
    }

    setSaving(true);
    try {
      await db.init();
      await Promise.all([
        db.setSetting('gemini_api_key', apiKey.trim()),
        db.setSetting('text_model', textModel),
        db.setSetting('image_model', imageModel),
      ]);

      setNotification({ type: 'success', message: '設定を保存しました' });
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setNotification({ type: 'error', message: '設定の保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full p-8">
          <p className="text-center text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

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
          if (e.target === e.currentTarget && !saving) {
            onClose();
          }
        }}
      >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="w-6 h-6" />
            設定
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* API Key Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Google Gemini APIキーについて
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                  このアプリは完全にブラウザ内で動作します。入力されたAPIキーはあなたのデバイスにのみ保存され、サーバーには送信されません。
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  → Google AI Studio でAPIキーを取得
                </a>
              </div>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Google Gemini APIキー <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              APIキーはブラウザのIndexedDBに安全に保存されます
            </p>
          </div>

          {/* Text Generation Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              テキスト生成モデル
            </label>
            <select
              value={textModel}
              onChange={(e) => setTextModel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="gemini-3-pro-preview">Gemini 3 Pro Preview（推奨）</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash（高速）</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              ストーリーとキャラクター生成に使用されます
            </p>
          </div>

          {/* Image Generation Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              画像生成モデル
            </label>
            <select
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="gemini-3-pro-image-preview">Gemini 3 Pro Image Preview（推奨・高品質）</option>
              <option value="gemini-2.5-flash-image-preview">Gemini 2.5 Flash Image Preview（高速）</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              キャラクター画像とコミック生成に使用されます
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !apiKey.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
