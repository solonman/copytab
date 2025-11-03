
import React, { useState } from 'react';
import type { Project, Document, StandardInfo } from '../types';
import { KnowledgeBase } from './KnowledgeBase';
import { PlusIcon, DocumentIcon } from './icons/Icons';

interface ProjectDetailProps {
    project: Project;
    documents: Document[];
    standardInfo: StandardInfo[];
    onSelectDocument: (id: string) => void;
    onCreateDocument: () => void;
}

enum ProjectTab {
  DOCUMENTS,
  KNOWLEDGE
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, documents, standardInfo, onSelectDocument, onCreateDocument }) => {
    const [activeTab, setActiveTab] = useState<ProjectTab>(ProjectTab.DOCUMENTS);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[#202124] dark:text-white">{project.name}</h1>
                    <p className="text-md text-[#5F6368] dark:text-gray-400">管理您的文档和知识库。</p>
                </div>
                <button 
                    onClick={onCreateDocument}
                    className="flex items-center gap-2 bg-[#1A73E8] text-white px-5 py-2.5 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                    <PlusIcon className="w-5 h-5"/>
                    开始创作
                </button>
            </div>

            <div className="flex border-b border-[#DADCE0] dark:border-gray-700 mb-6">
                <button 
                onClick={() => setActiveTab(ProjectTab.DOCUMENTS)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === ProjectTab.DOCUMENTS ? 'text-[#1A73E8] dark:text-blue-400 border-b-2 border-[#1A73E8] dark:border-blue-400' : 'text-[#5F6368] dark:text-gray-400 hover:bg-[#F1F3F4] dark:hover:bg-gray-800'}`}
                >
                文档
                </button>
                <button 
                onClick={() => setActiveTab(ProjectTab.KNOWLEDGE)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === ProjectTab.KNOWLEDGE ? 'text-[#1A73E8] dark:text-blue-400 border-b-2 border-[#1A73E8] dark:border-blue-400' : 'text-[#5F6368] dark:text-gray-400 hover:bg-[#F1F3F4] dark:hover:bg-gray-800'}`}
                >
                知识
                </button>
            </div>

            {activeTab === ProjectTab.DOCUMENTS && (
                 <div className="space-y-3">
                    {documents.length > 0 ? documents.map(doc => (
                      <div 
                        key={doc.id} 
                        onClick={() => onSelectDocument(doc.id)}
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-[#DADCE0] dark:border-gray-700 flex justify-between items-center cursor-pointer hover:border-[#1A73E8] dark:hover:border-blue-500 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-4">
                            <DocumentIcon className="w-6 h-6 text-[#5F6368] dark:text-gray-400" />
                            <div>
                                <p className="font-medium text-[#202124] dark:text-gray-100">{doc.title}</p>
                                <p className="text-xs text-[#5F6368] dark:text-gray-400">最后更新于 {new Date(doc.updatedAt || (doc as any).updated_at).toLocaleDateString('zh-CN')}</p>
                            </div>
                        </div>
                        <button className="text-xs text-[#5F6368] dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">删除</button>
                      </div>
                    )) : (
                        <div className="text-center py-12">
                            <p className="text-[#5F6368] dark:text-gray-400">该项目还没有任何文档。</p>
                            <p className="text-[#5F6368] dark:text-gray-400">点击“开始创作”来新建一个吧！</p>
                        </div>
                    )}
                  </div>
            )}

            {activeTab === ProjectTab.KNOWLEDGE && (
                <KnowledgeBase standardInfo={standardInfo} />
            )}
        </div>
    );
};
