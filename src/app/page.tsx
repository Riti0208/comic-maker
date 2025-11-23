'use client';

import { useState } from 'react';
import { ComicGenerator } from '@/components/comic-generator';
import { ProjectList } from '@/components/project-list';
import { ProjectCreateModal } from '@/components/project-create-modal';
import { ProjectDetail } from '@/components/project-detail';
import { EpisodeCreator } from '@/components/episode-creator';
import { SettingsModal } from '@/components/settings-modal';

type View =
  | { type: 'projects' }
  | { type: 'project-detail'; projectId: string }
  | { type: 'episode-create'; projectId: string }
  | { type: 'episode-edit'; projectId: string; episodeId: string }
  | { type: 'standalone-comic' };

export default function Home() {
  const [view, setView] = useState<View>({ type: 'projects' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleSelectProject = (projectId: string) => {
    setView({ type: 'project-detail', projectId });
  };

  const handleCreateProject = () => {
    setShowCreateModal(true);
  };

  const handleProjectCreated = (projectId: string) => {
    setShowCreateModal(false);
    setView({ type: 'project-detail', projectId });
  };

  const handleCreateEpisode = (projectId: string) => {
    setView({ type: 'episode-create', projectId });
  };

  const handleEditEpisode = (episodeId: string) => {
    if (view.type === 'project-detail') {
      setView({ type: 'episode-edit', projectId: view.projectId, episodeId });
    }
  };

  const handleBackToProjects = () => {
    setView({ type: 'projects' });
  };

  const handleBackToProjectDetail = () => {
    if (view.type === 'episode-create' || view.type === 'episode-edit') {
      setView({ type: 'project-detail', projectId: view.projectId });
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {view.type === 'projects' && (
        <ProjectList
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {view.type === 'project-detail' && (
        <ProjectDetail
          projectId={view.projectId}
          onBack={handleBackToProjects}
          onCreateEpisode={handleCreateEpisode}
          onEditEpisode={handleEditEpisode}
        />
      )}

      {view.type === 'episode-create' && (
        <EpisodeCreator
          projectId={view.projectId}
          onBack={handleBackToProjectDetail}
        />
      )}

      {view.type === 'episode-edit' && (
        <EpisodeCreator
          projectId={view.projectId}
          episodeId={view.episodeId}
          onBack={handleBackToProjectDetail}
        />
      )}

      {view.type === 'standalone-comic' && (
        <div className="py-12">
          <ComicGenerator />
        </div>
      )}

      {showCreateModal && (
        <ProjectCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleProjectCreated}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
        />
      )}
    </main>
  );
}
