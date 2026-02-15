import React from 'react';

export const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 6m-4.77 0L9.34 9m8.43-4.71-.58 11.21c-.04.66-.55 1.17-1.21 1.17H8.02c-.66 0-1.17-.51-1.21-1.17L6.23 4.29M11.16 3a2.25 2.25 0 0 1 4.407 0m-4.407 0a2.25 2.25 0 0 0-4.407 0m4.407 0H9" />
  </svg>
);
