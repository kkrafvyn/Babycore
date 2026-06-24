import React from 'react';

type SocialIconProps = {
  className?: string;
  size?: number;
};

export const GoogleIcon: React.FC<SocialIconProps> = ({ className, size = 18 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export const AppleIcon: React.FC<SocialIconProps> = ({ className, size = 18 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="currentColor"
      d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.48-.12-1.06.46-2.2 1.085-2.99.74-.89 2.04-1.56 3.08-1.57zM20.88 17.17c-.57 1.3-.85 1.89-1.59 3.04-1.03 1.56-2.48 3.5-4.28 3.51-1.6.01-2.01-1.04-4.18-1.03-2.17.01-2.62 1.05-4.22 1.04-1.8-.01-3.18-1.67-4.21-3.23-2.89-4.22-3.2-9.16-1.41-11.78 1.27-1.77 3.28-2.81 5.17-2.81 2.03 0 3.31 1.04 4.99 1.04 1.61 0 2.59-1.04 4.9-1.04 1.75.01 3.6.95 4.87 2.6-4.28 2.33-3.59 8.4.76 10.2z"
    />
  </svg>
);
