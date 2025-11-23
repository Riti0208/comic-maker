'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import { db } from '@/lib/db';
import { FolderOpen, Plus, Calendar, Settings } from 'lucide-react';

interface ProjectListProps {
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onOpenSettings: () => void;
}

export function ProjectList({ onSelectProject, onCreateProject, onOpenSettings }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      await db.init();
      const allProjects = await db.getAllProjects();
      // Sort by updatedAt descending
      allProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setProjects(allProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">プロジェクト</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Settings className="w-5 h-5" />
            設定
          </button>
          <button
            onClick={onCreateProject}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            新規プロジェクト
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            プロジェクトがありません
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            新規プロジェクトを作成して、連載漫画を始めましょう
          </p>
          <button
            onClick={onCreateProject}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            最初のプロジェクトを作成
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2">
                  {project.name}
                </h3>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {project.description}
              </p>

              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                  {project.artStyle}
                </span>
                <div className="flex items-center gap-1 ml-auto">
                  <Calendar className="w-3 h-3" />
                  {new Date(project.updatedAt).toLocaleDateString('ja-JP')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
