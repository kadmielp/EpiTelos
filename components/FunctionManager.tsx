
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
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Function Manager</h2>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          Create New Function
        </button>
      </div>

      {/* Custom Functions */}
      <div className="bg-slate-800 p-4 rounded-lg mb-6">
        <h3 className="text-xl font-semibold text-white mb-3">Custom Functions</h3>
        <p className="text-sm text-slate-400 mb-4">These are functions you have created. They are stored in your browser.</p>
        <div className="space-y-3">
          {customFunctions.length > 0 ? customFunctions.map(func => (
            <div key={func.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-md">
              <div>
                <p className="font-medium text-white">{func.name}</p>
                <p className="text-sm text-slate-400 truncate max-w-lg">{func.systemPrompt}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => openModal(func)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded-md transition-colors"
                  title="Edit Function"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDeleteFunction(func.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-900/50 rounded-md transition-colors"
                  title="Delete Function"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )) : <p className="text-slate-500">You haven't created any custom functions yet.</p>}
        </div>
      </div>
      
      {/* Built-in Functions */}
      <div className="bg-slate-800 p-4 rounded-lg flex-grow overflow-y-auto">
        <h3 className="text-xl font-semibold text-white mb-3">Built-in Functions</h3>
        <p className="text-sm text-slate-400 mb-4">These functions are part of the application and cannot be modified.</p>
        <div className="space-y-3">
          {builtInFunctions.map(func => (
            <div key={func.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-md">
              <div>
                <p className="font-medium text-white">{func.name}</p>
                <p className="text-sm text-slate-500 truncate max-w-lg">{func.systemPrompt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingFunction?.id ? 'Edit Function' : 'Create Function'}>
        <div className="space-y-4">
          <div>
            <label htmlFor="func-name" className="block text-sm font-medium text-slate-300 mb-1">Function Name</label>
            <input
              id="func-name"
              type="text"
              value={editingFunction?.name || ''}
              onChange={e => setEditingFunction(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 'Brainstorm Ideas'"
            />
          </div>
          <div>
            <label htmlFor="func-prompt" className="block text-sm font-medium text-slate-300 mb-1">System Prompt</label>
            <textarea
              id="func-prompt"
              rows={10}
              value={editingFunction?.systemPrompt || ''}
              onChange={e => setEditingFunction(prev => ({ ...prev, systemPrompt: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the AI's role, context, and desired output format..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="px-4 py-2 rounded-md bg-slate-600 hover:bg-slate-700 text-white font-semibold transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">Save Function</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
