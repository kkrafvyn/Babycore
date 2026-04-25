import React, { useState } from 'react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  fallback?: string;
  className?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  fallback = '📸',
  className = '',
}) => {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-3xl">{fallback}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className={className}
    />
  );
};
