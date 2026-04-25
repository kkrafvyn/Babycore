import React from 'react';

interface SVGIconProps {
  className?: string;
}

export const MoonStarsSVG: React.FC<SVGIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

export const BottleSVG: React.FC<SVGIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0 0v2.5M7 14h10m4-11H3v15a2 2 0 002 2h14a2 2 0 002-2V3z" />
  </svg>
);

export const DiaperSVG: React.FC<SVGIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="12" cy="12" r="10" strokeWidth={2} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5m0 4h.01" />
  </svg>
);

export const VaccineSVG: React.FC<SVGIconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m0 0h6M12 3a9 9 0 110 18 9 9 0 010-18z" />
  </svg>
);
