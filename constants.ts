
import type { Project, Document, StandardInfo, UserProfile } from './src/types';

export const MOCK_PROJECTS: Project[] = [
  { id: 'proj_1', name: '2025夏季新品推广' },
  { id: 'proj_2', name: 'Q4产品发布会' },
  { id: 'proj_3', name: '官方网站改版' },
];

export const MOCK_DOCUMENTS: Document[] = [
  { id: 'doc_1', projectId: 'proj_1', title: '社交媒体广告文案', content: '<p>迎接<strong>全新夏季系列</strong>！</p><p>我们充满活力和舒适的设计，让您准备好迎接阳光灿烂的日子。 #夏日风情</p>', updatedAt: '2024-07-15T10:00:00Z' },
  { id: 'doc_2', projectId: 'proj_1', title: '邮件通讯草稿', content: '<p>订阅者们好，这是我们即将发布的通讯稿初稿。</p>', updatedAt: '2024-07-14T11:00:00Z' },
  { id: 'doc_3', projectId: 'proj_2', title: '新闻稿', content: '<p>即时发布：...</p>', updatedAt: '2024-07-12T09:00:00Z' },
  { id: 'doc_4', projectId: 'proj_3', title: '首页核心文案', content: '<p>欢迎来到全新的我们。</p>', updatedAt: '2024-07-16T14:30:00Z' },
];

export const MOCK_STANDARD_INFO: StandardInfo[] = [
  { id: 'si_1', projectId: 'proj_1', category: '品牌', content: '活出阳光，活出色彩。' },
  { id: 'si_2', projectId: 'proj_1', category: '法律', content: '© 2025 夏日公司 版权所有。' },
  { id: 'si_3', projectId: 'proj_1', category: '联系方式', content: '如需支持，请发送邮件至 support@summerco.com。' },
  { id: 'si_4', projectId: 'proj_2', category: '产品', content: '新款 GadgetPro X 拥有5天超长续航和惊艳的OLED显示屏。' },
  { id: 'si_5', projectId: 'proj_2', category: '公司', content: '科技创新公司，地址：美国科技城创新大道123号' },
  { id: 'si_6', projectId: 'proj_3', category: '品牌', content: '简约，不简单。' },
];

export const MOCK_USERS: UserProfile[] = [
    { id: 'user_1', name: '王小明', avatarColor: 'bg-blue-500', email: 'wang@example.com', username: 'wangxm', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    { id: 'user_2', name: '李静', avatarColor: 'bg-pink-500', email: 'li@example.com', username: 'lijing', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    { id: 'user_3', name: '陈伟', avatarColor: 'bg-green-500', email: 'chen@example.com', username: 'chenwei', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
];