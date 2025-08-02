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
    className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`}
  >
    {icon}
    <span className="ml-3">{label}</span>
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  return (
    <div className="w-64 bg-slate-800 p-4 flex flex-col h-full border-r border-slate-700">
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2">
          <MLIcon className="w-8 h-8" />
          <h1 className="text-2xl font-bold text-white">{APP_NAME}</h1>
        </div>
        <p className="text-xs text-slate-400 text-center">Your Personal AI</p>
      </div>
      <nav className="flex-grow space-y-2">
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
      <div className="text-center text-xs text-slate-500 mt-4">
        <p>&copy; 2025 EpiTelos</p>
      </div>
    </div>
  );
};
