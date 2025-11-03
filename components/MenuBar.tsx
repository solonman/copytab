
import React from 'react';
import type { Editor as TipTapEditor } from '@tiptap/core';
import type { UserProfile, Document } from '../src/types';
import { BackArrowIcon, BoldIcon, ItalicIcon, StrikeIcon, ShareIcon, DownloadIcon } from './icons/Icons';

interface MenuBarProps {
  editor: TipTapEditor;
  rewriteMode: boolean;
  onRewriteModeChange: (enabled: boolean) => void;
  collaborators: UserProfile[];
  onClose: () => void;
  document: Document;
}

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ checked, onChange }) => {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`${
        checked ? 'bg-[#1A73E8]' : 'bg-[#BDC1C6] dark:bg-gray-600'
      } relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none`}
    >
      <span
        className={`${
          checked ? 'translate-x-6' : 'translate-x-1'
        } inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out`}
      />
    </button>
  );
};

const CollaboratorAvatars: React.FC<{ users: UserProfile[] }> = ({ users }) => {
  return (
    <div className="flex items-center -space-x-2">
      {users.map(user => (
        <div 
          key={user.id} 
          title={user.name}
          className={`w-8 h-8 rounded-full ${user.avatarColor} flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-gray-800`}
        >
          {user.name.charAt(0)}
        </div>
      ))}
    </div>
  );
};

const MenuButton: React.FC<{ onClick: () => void; isActive?: boolean; children: React.ReactNode; }> = ({ onClick, isActive, children }) => (
    <button
        onClick={onClick}
        className={`p-2 rounded-md transition-colors ${isActive ? 'bg-[#E8EAED] dark:bg-gray-700 text-[#202124] dark:text-white' : 'hover:bg-[#F1F3F4] dark:hover:bg-gray-700 text-[#5F6368] dark:text-gray-400'}`}
    >
        {children}
    </button>
);


export const MenuBar: React.FC<MenuBarProps> = ({ editor, rewriteMode, onRewriteModeChange, collaborators, onClose, document }) => {
  return (
    <div className="flex items-center justify-between p-2 border-b border-[#DADCE0] dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F1F3F4] dark:hover:bg-gray-700 transition-colors">
            <BackArrowIcon className="w-6 h-6 text-[#5F6368] dark:text-gray-400"/>
        </button>
        <span className="text-lg font-medium text-[#202124] dark:text-white truncate max-w-xs">{document.title}</span>
        <div className="w-px h-6 bg-[#DADCE0] dark:bg-gray-600 mx-2"></div>
        {/* Fix: Use toggleMark for toggling text styles to fix typing errors. */}
        <MenuButton onClick={() => editor.chain().focus().toggleMark('bold').run()} isActive={editor.isActive('bold')}><BoldIcon className="w-5 h-5" /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleMark('italic').run()} isActive={editor.isActive('italic')}><ItalicIcon className="w-5 h-5" /></MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleMark('strike').run()} isActive={editor.isActive('strike')}><StrikeIcon className="w-5 h-5" /></MenuButton>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-[#5F6368] dark:text-gray-400">改写模式</label>
            <ToggleSwitch checked={rewriteMode} onChange={onRewriteModeChange} />
        </div>
        <div className="w-px h-6 bg-[#DADCE0] dark:bg-gray-600"></div>
        <CollaboratorAvatars users={collaborators} />
        <button className="flex items-center gap-2 border border-[#DADCE0] dark:border-gray-600 text-[#1A73E8] dark:text-blue-400 px-3 py-1.5 text-sm rounded-md hover:bg-[#F1F3F4] dark:hover:bg-gray-700 transition-colors">
            <DownloadIcon className="w-4 h-4"/>
            导出
        </button>
        <button className="flex items-center gap-2 bg-[#1A73E8] text-white px-3 py-1.5 text-sm rounded-md hover:bg-blue-700 transition-colors">
            <ShareIcon className="w-4 h-4"/>
            分享
        </button>
      </div>
    </div>
  );
};
