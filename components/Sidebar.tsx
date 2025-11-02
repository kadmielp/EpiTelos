import React from 'react';
import { View } from '../types';
import { APP_NAME } from '../constants';
import { BrainIcon } from './icons/BrainIcon';
import { FolderIcon } from './icons/FolderIcon';
import { CogIcon } from './icons/CogIcon';
import { PencilIcon } from './icons/PencilIcon';
import { MLIcon } from './icons/MLIcon';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`group flex items-center w-full px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 relative overflow-hidden ${
      isActive
        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
        : 'text-slate-300 hover:text-white hover:bg-slate-700/60 backdrop-blur-sm'
    }`}
  >
    {/* Active indicator bar */}
    {isActive && (
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 via-purple-400 to-pink-400 rounded-r-full"></div>
    )}
    
    {/* Icon with smooth transition */}
    <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    
    <span className="ml-2.5">{label}</span>
    
    {/* Subtle hover glow effect */}
    {!isActive && (
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 rounded-lg transition-all duration-300"></div>
    )}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  return (
    <div className="w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-4 flex flex-col h-full border-r border-slate-700/50 shadow-2xl relative overflow-hidden">
      {/* Subtle animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-50"></div>
      
      {/* Content wrapper with relative positioning */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header with modern styling */}
        <div className="mb-8 pb-4 border-b border-slate-700/50">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <div className="p-1.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30 shadow-lg backdrop-blur-sm">
              <MLIcon className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {APP_NAME}
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 text-center font-medium tracking-wide">
            Your Personal AI Assistant
          </p>
        </div>

        {/* Navigation with enhanced spacing */}
        <nav className="flex-grow space-y-1.5">
          <NavItem
            icon={<BrainIcon className="w-5 h-5" />}
            label="Run AI"
            isActive={currentView === View.Runner}
            onClick={() => setCurrentView(View.Runner)}
          />
          <NavItem
            icon={<PencilIcon className="w-5 h-5" />}
            label="Function Manager"
            isActive={currentView === View.FunctionManager}
            onClick={() => setCurrentView(View.FunctionManager)}
          />
          <NavItem
            icon={<FolderIcon className="w-5 h-5" />}
            label="Context Manager"
            isActive={currentView === View.Context}
            onClick={() => setCurrentView(View.Context)}
          />
          <NavItem
            icon={<CogIcon className="w-5 h-5" />}
            label="Settings"
            isActive={currentView === View.Settings}
            onClick={() => setCurrentView(View.Settings)}
          />
        </nav>

        {/* Footer with refined styling */}
        <div className="mt-4 pt-3 border-t border-slate-700/50">
          <div className="text-center text-[10px] text-slate-500 font-medium">
            <p className="text-[9px] text-slate-600">&copy; 2025 All rights reserved</p>
          </div>
        </div>
      </div>

      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-3xl rounded-full"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 blur-3xl rounded-full"></div>
    </div>
  );
};
