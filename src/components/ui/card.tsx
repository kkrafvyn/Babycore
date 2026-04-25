import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950 ${className}`}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col space-y-1.5 p-6 ${className}`}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardFooter = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center p-6 pt-0 ${className}`}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h2
      ref={ref}
      className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`p-6 pt-0 ${className}`}
      {...props}
    />
  )
);
CardContent.displayName = 'CardContent';
