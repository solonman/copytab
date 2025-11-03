
import React, { useState } from 'react';
import type { StandardInfo } from '../types';
import { PlusIcon, UploadIcon } from './icons/Icons';

interface KnowledgeBaseProps {
  standardInfo: StandardInfo[];
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ standardInfo }) => {
  const [newEntryContent, setNewEntryContent] = useState('');
  const [newEntryCategory, setNewEntryCategory] = useState('');
  
  const handleAddEntry = () => {
      if(newEntryContent.trim()) {
        console.log("Adding new entry:", { content: newEntryContent, category: newEntryCategory });
        // In a real app, this would call an API to add to the database
        setNewEntryContent('');
        setNewEntryCategory('');
      }
  }

  return (
    <div className="mt-8">
        <p className="text-sm text-[#5F6368] dark:text-gray-400 mb-4">添加精确信息，如品牌口号、公司地址或法律声明，用于逐字补全。</p>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-[#DADCE0] dark:border-gray-700 p-4 mb-6">
            <textarea 
            value={newEntryContent}
            onChange={(e) => setNewEntryContent(e.target.value)}
            placeholder="输入需要精确匹配的内容..." 
            className="w-full p-2 border border-[#DADCE0] dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A73E8] mb-2 bg-transparent text-[#202124] dark:text-gray-100"
            rows={3}
            />
            <div className="flex items-center gap-4">
                <input 
                type="text"
                value={newEntryCategory}
                onChange={(e) => setNewEntryCategory(e.target.value)}
                placeholder="分类 (可选, 例如 '品牌')"
                className="flex-1 p-2 border border-[#DADCE0] dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1A73E8] bg-transparent text-[#202124] dark:text-gray-100"
                />
                <button onClick={handleAddEntry} className="flex items-center gap-2 bg-[#1A73E8] text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600" disabled={!newEntryContent.trim()}>
                <PlusIcon className="w-5 h-5"/>
                添加条目
                </button>
            </div>
        </div>
        
        <h3 className="text-sm font-bold text-[#202124] dark:text-gray-100 mb-3">标准条目</h3>
        <div className="space-y-3">
        {standardInfo.map(info => (
            <div key={info.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-[#DADCE0] dark:border-gray-700 flex justify-between items-start">
            <div>
                <p className="text-[#202124] dark:text-gray-100">{info.content}</p>
                {info.category && <span className="text-xs bg-[#E8EAED] dark:bg-gray-700 text-[#5F6368] dark:text-gray-300 px-2 py-1 rounded-full mt-2 inline-block">{info.category}</span>}
            </div>
            <button className="text-xs text-[#5F6368] dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">删除</button>
            </div>
        ))}
        </div>

        <h3 className="text-sm font-bold text-[#202124] dark:text-gray-100 mt-8 mb-3">知识文档</h3>
        <p className="text-sm text-[#5F6368] dark:text-gray-400 mb-4">上传包含品牌故事、产品描述或市场研究的文档。这些内容将用于语义搜索和创造性的改写建议。</p>
        <div className="border-2 border-dashed border-[#DADCE0] dark:border-gray-600 rounded-lg p-12 text-center bg-white dark:bg-gray-800 hover:border-[#1A73E8] dark:hover:border-blue-500 cursor-pointer">
            <UploadIcon className="w-12 h-12 mx-auto text-[#5F6368] dark:text-gray-400 mb-4"/>
            <p className="font-medium text-[#1A73E8] dark:text-blue-400">点击上传文件</p>
            <p className="text-sm text-[#5F6368] dark:text-gray-400">或拖拽文件到此处 (.txt, .md)</p>
            <input type="file" className="hidden" />
        </div>
    </div>
  );
};
