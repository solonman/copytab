import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { ProjectDetail } from './components/ProjectDetail';
import { AuthTabs } from './src/components/Auth/AuthForm';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { useDocumentCache } from './src/hooks/useDocumentCache';
import { useOfflineSync } from './src/hooks/useOfflineSync';
import { OfflineStatus, OfflineIndicator } from './src/components/Offline/OfflineStatus';
import { projectService, standardInfoService, documentService } from './src/services/databaseService';
import type { Project, StandardInfo, UserProfile } from './src/types';
import { MOCK_USERS } from './constants';
import { collaborationService, MockRealtimeChannel } from './services/collaborationService';

type Theme = 'light' | 'dark';

// 主应用组件，包含认证逻辑
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <AuthTabs />
      </div>
    );
  }

  return <MainApp />;
};

// 主应用功能组件
const MainApp: React.FC = () => {
  const { user } = useAuth();
  const currentUser: UserProfile = user ? {
    id: user.id,
    email: user.email || '',
    username: user.user_metadata?.username || null,
    avatar_url: user.user_metadata?.avatar_url || null,
    created_at: user.created_at,
    updated_at: user.updated_at,
    name: user.user_metadata?.name || user.email?.split('@')[0] || '用户',
    avatarColor: user.user_metadata?.avatar_color || '#3B82F6'
  } : MOCK_USERS[0];
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [rewriteMode, setRewriteMode] = useState<boolean>(false);
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);
  const [standardInfo, setStandardInfo] = useState<StandardInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 使用离线同步
  useOfflineSync();
  
  // 使用文档缓存
  const {
    documents,
    loadDocuments,
    saveDocument: saveDocumentToCache
  } = useDocumentCache(activeProjectId || undefined);
  
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme') as Theme;
      if (storedTheme) return storedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // 加载项目数据
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const data = await projectService.getUserProjects(currentUser.id);
        setProjects(data || []);
        if (data && data.length > 0 && !activeProjectId) {
          setActiveProjectId(data[0].id);
        }
      } catch (error) {
        console.error('加载项目失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [currentUser.id]);

  // 加载标准信息
  useEffect(() => {
    const loadStandardInfo = async () => {
      if (!activeProjectId) return;
      
      try {
        const data = await standardInfoService.getUserStandardInfo(currentUser.id);
        setStandardInfo(data || []);
      } catch (error) {
        console.error('加载标准信息失败:', error);
      }
    };

    loadStandardInfo();
  }, [activeProjectId, currentUser.id]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Real-time collaboration logic
  useEffect(() => {
    let channel: MockRealtimeChannel | null = null;

    if (activeDocumentId) {
      channel = collaborationService.getChannel(`doc:${activeDocumentId}`);
      
      const onPresenceChange = (presentUsers: UserProfile[]) => {
        setCollaborators(presentUsers.filter(u => u.id !== currentUser.id));
      };

      const onContentUpdate = () => {
        // 由于useDocumentCache返回的是状态对象，我们需要重新加载文档
        loadDocuments();
      };
      
      channel.on('presence', onPresenceChange);
      channel.on('broadcast', onContentUpdate);
      
      channel.subscribe(currentUser);
    }
  
    return () => {
      if (channel) {
        channel.unsubscribe(currentUser);
      }
      setCollaborators([]);
    };
  }, [activeDocumentId]);

  const handleDocumentUpdate = useCallback(async (docId: string, newContent: string) => {
    // 保存到离线缓存和数据库
    try {
      await saveDocumentToCache({
        id: docId,
        content: newContent,
        updatedAt: new Date().toISOString()
      } as any);
      
      // Broadcast change to other clients
      const channel = collaborationService.getChannel(`doc:${docId}`);
      channel.send({
        type: 'broadcast',
        event: 'contentUpdate',
        payload: { content: newContent }
      });
    } catch (error) {
      console.error('保存文档失败:', error);
    }
  }, [saveDocumentToCache]);

  const handleSelectProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    setActiveDocumentId(null); 
  }, []);

  const handleSelectDocument = useCallback((documentId: string) => {
    setActiveDocumentId(documentId);
  }, []);
  
  const handleCloseDocument = useCallback(() => {
      setActiveDocumentId(null);
  }, []);
  
  const handleCreateDocument = useCallback(async () => {
    if (!activeProjectId) return;
    
    try {
      const data = await documentService.createDocument({
        project_id: activeProjectId,
        title: '未命名文档',
        content: '<p>在这里开始你的创作...</p>',
        user_id: currentUser.id,
        is_public: false,
        tags: [],
        metadata: {}
      } as any);
      
      if (data) {
        setActiveDocumentId(data.id);
        // 重新加载文档列表
        await loadDocuments();
      }
    } catch (error) {
      console.error('创建文档失败:', error);
    }
  }, [activeProjectId, loadDocuments]);


  const activeProject = useMemo(() => 
    projects.find(p => p.id === activeProjectId), 
    [projects, activeProjectId]
  );

  const activeDocument = useMemo(() => 
    documents.find(d => d.id === activeDocumentId),
    [documents, activeDocumentId]
  );
  
  const recentDocuments = useMemo(() => 
    [...documents].sort((a, b) => new Date((b as any).updatedAt).getTime() - new Date((a as any).updatedAt).getTime()).slice(0, 5),
    [documents]
  );

  const projectDocuments = useMemo(() => 
    documents.filter(d => (d as any).project_id === activeProjectId).map(d => ({
      ...d,
      projectId: (d as any).project_id,
      updatedAt: (d as any).updated_at
    })),
    [documents, activeProjectId]
  );
  
  const projectStandardInfo = useMemo(()=>
    standardInfo,
    [standardInfo]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载数据中...</p>
        </div>
      </div>
    );
  }

  if (activeDocument) {
    return (
      <div className="h-screen w-screen bg-white dark:bg-gray-800 text-[#202124] dark:text-gray-100">
        <Editor
          key={activeDocument.id}
          document={activeDocument}
          onDocumentChange={handleDocumentUpdate}
          collaborators={collaborators}
          rewriteMode={rewriteMode}
          onRewriteModeChange={setRewriteMode}
          onClose={handleCloseDocument}
          standardInfo={projectStandardInfo}
        />
        <OfflineIndicator />
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen bg-[#F8F9FA] dark:bg-gray-900 text-[#202124] dark:text-gray-100">
      <Sidebar 
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        recentDocuments={recentDocuments}
        activeDocumentId={activeDocumentId}
        onSelectDocument={handleSelectDocument}
        theme={theme}
        onThemeChange={setTheme}
        currentUser={currentUser}
      />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <OfflineStatus />
        </div>
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
            {!activeProjectId && (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p>选择一个项目以开始。</p>
              </div>
            )}
            {activeProject && (
              <ProjectDetail 
                project={activeProject}
                documents={projectDocuments}
                standardInfo={projectStandardInfo}
                onSelectDocument={handleSelectDocument}
                onCreateDocument={handleCreateDocument}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// 根应用组件，提供认证上下文
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;