import React, { useState } from 'react';
import { IAIFunction } from '../types';
import { Modal } from './Modal';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';

interface FunctionManagerProps {
  functions: IAIFunction[];
  onSaveFunction: (func: Partial<IAIFunction>) => void;
  onDeleteFunction: (id: string) => void;
}

export const FunctionManager: React.FC<FunctionManagerProps> = ({ functions, onSaveFunction, onDeleteFunction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFunction, setEditingFunction] = useState<Partial<IAIFunction> | null>(null);

  const openModal = (func?: IAIFunction) => {
    setEditingFunction(func || { name: '', systemPrompt: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingFunction(null);
  };

  const handleSave = () => {
    if (editingFunction && editingFunction.name && editingFunction.systemPrompt) {
      onSaveFunction(editingFunction);
      closeModal();
    }
  };

  const builtInFunctions = functions.filter(f => !f.isCustom);
  const customFunctions = functions.filter(f => f.isCustom);

  return (
    <div className="p-6 h-full flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Modern Header with Gradient */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-1.5">
            Function Manager
          </h2>
          <div className="h-0.5 w-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"></div>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-2.5 px-5 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center gap-2 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
        >
          <span className="text-xl leading-none">+</span>
          Create New Function
        </button>
      </div>

      <div className="flex-grow overflow-y-auto space-y-4 custom-scrollbar">
        {/* Custom Functions Section */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-4 rounded-xl border border-slate-700/50 shadow-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 rounded-full"></div>
            <div>
              <h3 className="text-lg font-bold text-white">Custom Functions</h3>
              <p className="text-xs text-slate-400">Functions you've created • Stored locally</p>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {customFunctions.length > 0 ? customFunctions.map(func => (
              <div
                key={func.id}
                className="group flex justify-between items-start bg-gradient-to-br from-slate-700/60 to-slate-800/60 backdrop-blur-sm p-3 rounded-lg border border-slate-600/30 hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="flex-grow min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    <p className="font-semibold text-white">{func.name}</p>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed pl-3.5">
                    {func.systemPrompt}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button
                    onClick={() => openModal(func)}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-all duration-200 border border-transparent hover:border-blue-500/30"
                    title="Edit Function"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteFunction(func.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all duration-200 border border-transparent hover:border-red-500/30"
                    title="Delete Function"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-700/50 rounded-full mb-3">
                  <span className="text-2xl">✨</span>
                </div>
                <p className="text-sm text-slate-400 font-medium mb-1">No custom functions yet</p>
                <p className="text-xs text-slate-500">Create your first function to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Built-in Functions Section */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl p-4 rounded-xl border border-slate-700/50 shadow-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 via-teal-500 to-cyan-500 rounded-full"></div>
            <div>
              <h3 className="text-lg font-bold text-white">Built-in Functions</h3>
              <p className="text-xs text-slate-400">Pre-configured functions • Read-only</p>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {builtInFunctions.map(func => (
              <div
                key={func.id}
                className="flex justify-between items-start bg-gradient-to-br from-slate-900/60 to-slate-950/60 backdrop-blur-sm p-3 rounded-lg border border-slate-700/30 hover:border-emerald-500/20 transition-all duration-300"
              >
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1.5 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                    <p className="font-semibold text-white">{func.name}</p>
                    <span className="ml-1 text-[9px] font-semibold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded uppercase tracking-wider border border-emerald-500/30">
                      System
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed pl-3.5">
                    {func.systemPrompt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingFunction?.id ? 'Edit Function' : 'Create Function'}>
        <div className="space-y-4">
          {/* Function Name Input */}
          <div>
            <label htmlFor="func-name" className="block text-xs font-semibold text-slate-200 mb-1.5 uppercase tracking-wide">
              Function Name
            </label>
            <input
              id="func-name"
              type="text"
              value={editingFunction?.name || ''}
              onChange={e => setEditingFunction(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-slate-800 backdrop-blur-sm placeholder:text-slate-500"
              placeholder="e.g., 'Brainstorm Ideas'"
            />
          </div>

          {/* System Prompt Textarea */}
          <div>
            <label htmlFor="func-prompt" className="block text-xs font-semibold text-slate-200 mb-1.5 uppercase tracking-wide">
              System Prompt
            </label>
            <textarea
              id="func-prompt"
              rows={10}
              value={editingFunction?.systemPrompt || ''}
              onChange={e => setEditingFunction(prev => ({ ...prev, systemPrompt: e.target.value }))}
              className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-slate-800 resize-none backdrop-blur-sm custom-scrollbar placeholder:text-slate-500"
              placeholder="Describe the AI's role, context, and desired output format..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/50">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-sm rounded-lg bg-slate-700/60 hover:bg-slate-600/60 text-white font-semibold transition-all duration-300 border border-slate-600/50 hover:border-slate-500/50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!editingFunction?.name || !editingFunction?.systemPrompt}
              className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              Save Function
            </button>
          </div>
        </div>
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgb(71, 85, 105), rgb(51, 65, 85));
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgb(59, 130, 246), rgb(147, 51, 234));
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};