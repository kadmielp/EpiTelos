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
  isCollapsed: boolean;
  onToggle: () => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, isCollapsed, onClick }) => (
  <button
    onClick={onClick}
    title={isCollapsed ? label : undefined}
    className={`group flex items-center w-full ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-3 text-[11px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 relative overflow-hidden ${isActive
      ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(59,130,246,0.15)] border border-white/10'
      : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent'
      }`}
  >
    {/* Active indicator bar - vertical glow */}
    {isActive && (
      <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
    )}

    {/* Icon with refined styling */}
    <div className={`transition-all duration-300 flex-shrink-0 ${isActive ? 'scale-110 text-blue-400' : 'group-hover:scale-110 group-hover:text-slate-300'}`}>
      {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
    </div>

    {!isCollapsed && (
      <span className="ml-3 font-bold transition-all duration-300 opacity-100 whitespace-nowrap overflow-hidden">
        {label}
      </span>
    )}

    {/* Right side arrow indicator - only for active tab and not collapsed */}
    {!isCollapsed && (
      <div className={`ml-auto transition-all duration-300 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
        <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]" />
      </div>
    )}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isCollapsed, onToggle }) => {
  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-72'} bg-slate-950 flex flex-col h-full border-r border-white/5 relative overflow-hidden transition-all duration-300 ease-in-out shrink-0`}>
      {/* Immersive Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-600/10 via-purple-600/5 to-transparent pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-full h-[200px] bg-gradient-to-t from-slate-900 to-transparent pointer-events-none opacity-40"></div>

      {/* Content wrapper */}
      <div className={`relative z-10 flex flex-col h-full ${isCollapsed ? 'p-3' : 'p-6'} transition-all duration-300`}>
        {/* Header Section */}
        <div className="mb-10 relative">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-4 pl-2'}`}>
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-lg opacity-25 group-hover:opacity-50 transition-all duration-500" />
              <div className="relative p-2.5 bg-slate-900 border border-white/10 rounded-xl shadow-2xl">
                <MLIcon className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="transition-all duration-300 opacity-100 whitespace-nowrap">
                <h1 className="text-lg font-black tracking-tighter text-white uppercase italic">
                  {APP_NAME}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">AI assisted reflection</span>
                </div>
              </div>
            )}
          </div>

          {/* Collapse Toggle Button - Subtle floating button */}
          <button
            onClick={onToggle}
            className={`absolute -right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-800 border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-xl z-20 ${isCollapsed ? 'translate-x-[6px]' : 'translate-x-3'}`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
            >
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Navigation Section */}
        <div className="space-y-2 flex-grow">
          <nav className="space-y-2">
            <NavItem
              icon={<BrainIcon />}
              label="Run AI"
              isCollapsed={isCollapsed}
              isActive={currentView === View.Runner}
              onClick={() => setCurrentView(View.Runner)}
            />
            <NavItem
              icon={<PencilIcon />}
              label="Functions"
              isCollapsed={isCollapsed}
              isActive={currentView === View.FunctionManager}
              onClick={() => setCurrentView(View.FunctionManager)}
            />
            <NavItem
              icon={<FolderIcon />}
              label="Context"
              isCollapsed={isCollapsed}
              isActive={currentView === View.Context}
              onClick={() => setCurrentView(View.Context)}
            />
            <NavItem
              icon={<CogIcon />}
              label="System Settings"
              isCollapsed={isCollapsed}
              isActive={currentView === View.Settings}
              onClick={() => setCurrentView(View.Settings)}
            />
          </nav>
        </div>

        <div className={`mt-auto pt-6 text-center ${isCollapsed ? 'opacity-0 h-0 p-0 overflow-hidden' : 'opacity-100'} transition-all duration-300`}>
          <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.2em] mb-1">v1.6.0</p>
          <p className="text-[8px] text-slate-700 font-black uppercase tracking-[0.2em] opacity-50">&copy; 2025 EpiTelos</p>
        </div>
      </div>
    </div>
  );
};
