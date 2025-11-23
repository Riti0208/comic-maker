'use client';

import { useState, useRef } from 'react';
import { Character } from '@/types';
// import { Button } from '@/components/ui/button'; // Removed unused import
import { X, Upload, Plus } from 'lucide-react';

// Simple Button component if shadcn is not installed yet
const SimpleButton = ({ children, onClick, variant = 'primary', className = '', ...props }: any) => {
    const baseStyle = "px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
        outline: "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500",
        ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    };
    return (
        <button
            className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
};

interface CharacterFormProps {
    onAddCharacter: (character: Character) => void;
}

export function CharacterForm({ onAddCharacter }: CharacterFormProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !description || !imageFile || !previewUrl) return;

        const newCharacter: Character = {
            id: crypto.randomUUID(),
            name,
            description,
            imagePreviewUrl: previewUrl,
            imageFile,
        };

        onAddCharacter(newCharacter);

        // Reset form
        setName('');
        setDescription('');
        setImageFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Add Character</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                        placeholder="e.g., Hero, Villain"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description / Personality</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                        placeholder="Describe appearance and personality..."
                        rows={3}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference Image</label>
                    <div className="flex items-center gap-4">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors relative overflow-hidden bg-gray-50 dark:bg-gray-700/50"
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <Upload className="w-6 h-6 text-gray-400" />
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <div className="text-sm text-gray-500">
                            Upload a clear image of the character.
                        </div>
                    </div>
                </div>

                <SimpleButton type="submit" className="w-full flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Character
                </SimpleButton>
            </form>
        </div>
    );
}
