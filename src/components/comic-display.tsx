'use client';

import { ComicPanel } from '@/types';
import { Download, Share2 } from 'lucide-react';

interface ComicDisplayProps {
    panels: ComicPanel[];
    isLoading: boolean;
}

export function ComicDisplay({ panels, isLoading }: ComicDisplayProps) {
    if (isLoading) {
        return (
            <div className="w-full h-96 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4 animate-bounce"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Generating your comic...</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">This might take a few moments.</p>
                </div>
            </div>
        );
    }

    if (panels.length === 0) {
        return (
            <div className="w-full flex justify-center">
                <div className="relative max-w-2xl w-full bg-gray-100 dark:bg-gray-900 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img
                        src="/reference.jpg"
                        alt="Comic Template"
                        className="w-full h-auto object-contain max-h-[80vh] mx-auto"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 max-w-2xl mx-auto bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                {panels.map((panel, index) => (
                    <div key={panel.id}>
                        <div className="relative bg-gray-100 dark:bg-gray-900 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 group">
                            <img
                                src={panel.imageUrl}
                                alt={`Panel ${index + 1}`}
                                className="w-full h-auto object-contain max-h-[80vh] mx-auto"
                            />
                            {/* <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-bold">
                                #{index + 1}
                            </div> */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                        </div>
                        <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                            <p className="whitespace-pre-wrap">{panel.prompt}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-3">
                <button className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Share2 className="w-4 h-4" /> Share
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                    <Download className="w-4 h-4" /> Download All
                </button>
            </div>
        </div>
    );
}
