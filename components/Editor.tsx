
import React, { useEffect } from 'react';
import type { Document, UserProfile, StandardInfo } from '../src/types';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { MenuBar } from './MenuBar';
// Fix: Import completionPluginKey to access the plugin's state.
import { CompletionPlugin, completionPluginKey } from '../tiptap/completion';

interface EditorProps {
  document: Document;
  onDocumentChange: (documentId: string, newContent: string) => void;
  collaborators: UserProfile[];
  rewriteMode: boolean;
  onRewriteModeChange: (enabled: boolean) => void;
  onClose: () => void;
  standardInfo: StandardInfo[];
}

export const Editor: React.FC<EditorProps> = ({ 
  document, 
  onDocumentChange, 
  collaborators, 
  rewriteMode,
  onRewriteModeChange,
  onClose,
  standardInfo
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      CompletionPlugin.configure({
        standardInfo,
        getRewriteMode: () => rewriteMode,
      }),
    ],
    content: document.content,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none w-full h-full p-4 focus:outline-none leading-relaxed text-[#202124] dark:text-gray-100',
      },
    },
    onUpdate: ({ editor }) => {
      // Don't emit updates while a completion is active to avoid weird cursor jumps
      // Fix: Use completionPluginKey to get the plugin state.
      if (!completionPluginKey.getState(editor.state)?.active) {
        onDocumentChange(document.id, editor.getHTML());
      }
    },
  });
  
  // Sync external changes (from collaborators) to the editor
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const isSame = editor.getHTML() === document.content;
      if (!isSame) {
        // Only update if the content is truly different and no completion is active
        // Fix: Use completionPluginKey to get the plugin state.
         if (!completionPluginKey.getState(editor.state)?.active) {
            editor.commands.setContent(document.content, false);
         }
      }
    }
  }, [document.content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      <MenuBar
        editor={editor}
        rewriteMode={rewriteMode}
        onRewriteModeChange={onRewriteModeChange}
        collaborators={collaborators}
        onClose={onClose}
        document={document}
      />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto h-full">
             <EditorContent editor={editor} className="h-full" />
        </div>
      </div>
    </div>
  );
};
