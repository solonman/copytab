
import React from 'react';
import type { Project, Document, UserProfile } from '../src/types';
import { FolderIcon, DocumentIcon, PlusIcon, SunIcon, MoonIcon } from './icons/Icons';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  recentDocuments: Document[];
  activeDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  currentUser: UserProfile;
}

const NavItem: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  isActive: boolean;
}> = ({ children, onClick, isActive }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 rounded-md transition-colors duration-150 ${
        isActive ? 'bg-[#E8EAED] dark:bg-gray-700 text-[#202124] dark:text-white' : 'text-[#5F6368] dark:text-gray-400 hover:bg-[#F1F3F4] dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  recentDocuments,
  activeDocumentId,
  onSelectDocument,
  theme,
  onThemeChange,
  currentUser,
}) => {
  const toggleTheme = () => {
    onThemeChange(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <nav className="w-64 bg-[#F1F3F4] dark:bg-gray-800 h-full flex flex-col p-3 border-r border-[#DADCE0] dark:border-gray-700">
      <div className="flex items-center mb-6 px-2">
        <h1 className="text-xl font-medium text-[#202124] dark:text-white">CopyTab</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="mb-4">
          <div className="flex justify-between items-center px-2 mb-2">
            <h2 className="text-xs font-bold uppercase text-[#5F6368] dark:text-gray-400">项目</h2>
            <button className="text-[#5F6368] dark:text-gray-400 hover:text-[#1A73E8] dark:hover:text-blue-400 transition-colors"><PlusIcon className="w-5 h-5" /></button>
          </div>
          <ul className="space-y-1">
            {projects.map(project => (
              <li key={project.id}>
                <NavItem onClick={() => onSelectProject(project.id)} isActive={project.id === activeProjectId}>
                  <FolderIcon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{project.name}</span>
                </NavItem>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-[#DADCE0] dark:border-gray-700 pt-4 mt-4">
             <div className="flex justify-between items-center px-2 mb-2">
                <h2 className="text-xs font-bold uppercase text-[#5F6368] dark:text-gray-400">最近文档</h2>
             </div>
            <ul className="space-y-1">
              {recentDocuments.map(doc => (
                <li key={doc.id}>
                  <NavItem onClick={() => { onSelectProject(doc.projectId); onSelectDocument(doc.id); }} isActive={doc.id === activeDocumentId}>
                    <DocumentIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{doc.title}</span>
                  </NavItem>
                </li>
              ))}
            </ul>
          </div>
      </div>

      <div className="border-t border-[#DADCE0] dark:border-gray-700 pt-3 mt-3">
        <div className="flex items-center justify-between p-2 rounded-md">
           <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${currentUser.avatarColor} flex items-center justify-center font-bold text-white`}>
                    {currentUser.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-[#202124] dark:text-white">{currentUser.name}</span>
           </div>
           <button onClick={toggleTheme} className="p-2 rounded-full text-[#5F6368] dark:text-gray-400 hover:bg-[#E8EAED] dark:hover:bg-gray-700 transition-colors">
                {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
           </button>
        </div>
      </div>
    </nav>
  );
};
