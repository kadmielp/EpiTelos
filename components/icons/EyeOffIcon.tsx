
import React from 'react';

export const EyeOffIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a10.05 10.05 0 013.55-5.225m5.992-1.393A3.01 3.01 0 0112 5.5c-1.657 0-3 1.343-3 3a3 3 0 00.525 1.666m-1.134 3.996a3.001 3.001 0 01-4.242-4.242m5.933 5.933L18 18m-1.393-5.992a3 3 0 004.242-4.242m-5.933 5.933l-1.286-1.287" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l22 22" />
    </svg>
);
