import React from 'react';
import type { AppScreen } from '@/types/types';

interface ReturnButtonProps {
  onClick: () => void;
  label?: string;
}

export default function ReturnButton({ onClick, label = '返回绿洲' }: ReturnButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute top-4 left-4 z-50 flex items-center group"
    >
      <div
        className="flex items-center justify-center transition-all"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(20,46,42,0.5)',
          border: '1px solid rgba(78,205,196,0.3)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 0 0 rgba(46,204,113,0)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 15px rgba(46,204,113,0.5)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(46,204,113,0.7)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 rgba(46,204,113,0)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(78,205,196,0.3)';
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 4L6 9L11 14" stroke="#A8E6CF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span
        className="ml-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ color: 'rgba(168,230,207,0.7)', letterSpacing: '0.1em', fontSize: '0.65rem' }}
      >
        {label}
      </span>
    </button>
  );
}
