'use client'

import { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Upload, X, User } from 'lucide-react';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageChange: (file: File | null) => void;
  onImageUrlChange: (url: string) => void;
}

export function ImageUpload({ currentImageUrl, onImageChange, onImageUrlChange }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file: File | null) => {
    if (file) {
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onImageChange(file);
      onImageUrlChange(url);
    } else {
      setPreviewUrl(null);
      onImageChange(null);
      onImageUrlChange('');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removeImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    handleFileSelect(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        {/* Image Preview */}
        <div className="relative mb-4">
          <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Profile preview" 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-16 w-16 text-gray-400" />
            )}
          </div>
          
          {previewUrl && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={removeImage}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Upload Area */}
        <div
          className={`w-full max-w-xs p-6 border-2 border-dashed rounded-lg text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            Drag and drop an image here, or click to select
          </p>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload">
            <Button type="button" variant="outline" size="sm" className="cursor-pointer">
              Choose Image
            </Button>
          </label>
          <p className="text-xs text-gray-500 mt-2">
            PNG, JPG, GIF up to 10MB
          </p>
        </div>
      </div>
    </div>
  );
}