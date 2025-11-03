
export interface Project {
  id: string;
  name: string;
}

export interface StandardInfo {
  id:string;
  projectId: string;
  category: string;
  content: string;
}

export interface Document {
  id: string;
  projectId: string;
  title: string;
  content: string; // This would be JSONB in a real app, but string for our mock.
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  avatarColor: string;
}
