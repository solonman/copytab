
import { Editor, Extension } from '@tiptap/core';
import { Plugin, PluginKey, Transaction } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { StandardInfo } from '../types';
import { getCompletionStream } from '../services/geminiService';

// Fix: Export CompletionState interface to use it in the PluginKey type.
export interface CompletionState {
  active: boolean;
  suggestion: string;
  position: number;
}

// Fix: Create and export a plugin key to be used across files.
export const completionPluginKey = new PluginKey<CompletionState>('completion');

interface CompletionOptions {
  standardInfo: StandardInfo[];
  getRewriteMode: () => boolean;
}

const acceptSuggestion = (editor: Editor) => {
  // Fix: Use the exported completionPluginKey to get the plugin state.
  const state = completionPluginKey.getState(editor.state);
  if (!state || !state.active || !state.suggestion) {
    return false;
  }

  editor.chain().focus()
    .insertContentAt(state.position, state.suggestion)
    .run();
  
  return true;
};

const clearSuggestion = (tr: Transaction) => {
    // Fix: Use the exported completionPluginKey to set meta.
    return tr.setMeta(completionPluginKey, { active: false, suggestion: null, position: null });
}

let debounceTimer: number | null = null;
let abortController: AbortController | null = null;

export const CompletionPlugin = Extension.create<CompletionOptions>({
  name: 'completion',
  
  addOptions() {
    return {
      standardInfo: [],
      getRewriteMode: () => false,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        // Fix: Use the exported completionPluginKey.
        key: completionPluginKey,
        
        state: {
          init: (): CompletionState => ({ active: false, suggestion: '', position: 0 }),
          apply: (tr, value): CompletionState => {
            // Fix: Use the exported completionPluginKey to get meta.
            const meta = tr.getMeta(completionPluginKey);
            if (meta) {
              return { ...value, ...meta };
            }
            if (tr.docChanged || tr.selectionSet) {
                 return { active: false, suggestion: '', position: 0 };
            }
            return value;
          },
        },
        
        props: {
          decorations: (state) => {
            // Fix: Use the exported completionPluginKey to get the plugin state.
            const pluginState = completionPluginKey.getState(state);
            if (!pluginState || !pluginState.active || !pluginState.suggestion) {
              return DecorationSet.empty;
            }
            
            const decoration = Decoration.inline(
              pluginState.position,
              pluginState.position,
              {
                nodeName: 'span',
                class: 'completion-suggestion',
                'data-suggestion': pluginState.suggestion,
              }
            );
            return DecorationSet.create(state.doc, [decoration]);
          },
          
          handleKeyDown: (view, event) => {
            if (event.key === 'Tab') {
              if (acceptSuggestion(this.editor)) {
                return true; // Prevent default Tab behavior
              }
            }
            if (event.key === 'Escape') {
                const { state, dispatch } = view;
                dispatch(clearSuggestion(state.tr));
                return true;
            }
            return false;
          },
        },

        view: () => ({
          update: (view) => {
            const { state, dispatch } = view;
            const { selection } = state;
            // Fix: Use the exported completionPluginKey to get the plugin state.
            const pluginState = completionPluginKey.getState(state);

            // Correctly determine if the cursor is at the end of a text block.
            // This is the condition to trigger (or not trigger) a completion.
            const isAtEnd = selection.empty && selection.$from.parent.isTextblock && selection.$from.parentOffset === selection.$from.parent.content.size;

            if (!isAtEnd) {
                if (pluginState?.active) {
                    dispatch(clearSuggestion(state.tr));
                }
                return;
            }

            const lastText = selection.$from.parent.textContent;
            
            if (debounceTimer) clearTimeout(debounceTimer);
            if (abortController) abortController.abort();
            
            // It's important to clear any old suggestions immediately
            // before starting a new request.
            if (pluginState?.active) {
               dispatch(clearSuggestion(state.tr));
            }
            
            debounceTimer = window.setTimeout(async () => {
                // 1. Exact Match (Client-side)
                const exactMatch = this.options.standardInfo.find(info =>
                  info.content.toLowerCase().startsWith(lastText.toLowerCase()) && info.content.length > lastText.length
                );

                if (exactMatch) {
                    const suggestion = exactMatch.content.substring(lastText.length);
                    // Check if the view is still valid before dispatching
                    if (!view.isDestroyed) {
                        // Fix: Use the exported completionPluginKey to set meta.
                        dispatch(view.state.tr.setMeta(completionPluginKey, { active: true, suggestion, position: selection.to }));
                    }
                    return;
                }
                
                // 2. AI Suggestion (Rewrite Mode)
                if (this.options.getRewriteMode() && lastText.trim().length > 4) {
                    abortController = new AbortController();
                    const signal = abortController.signal;
                    
                    try {
                        let accumulatedSuggestion = '';
                        const stream = getCompletionStream(lastText, this.options.getRewriteMode());
                        
                        for await (const chunk of stream) {
                           if (signal.aborted) return;
                           accumulatedSuggestion += chunk;
                           if (!view.isDestroyed) {
                                // Fix: Use the exported completionPluginKey to set meta.
                                dispatch(view.state.tr.setMeta(completionPluginKey, { active: true, suggestion: accumulatedSuggestion, position: selection.to }));
                           }
                        }
                    } catch (e) {
                        if (!signal.aborted) console.error("Completion stream error:", e);
                    }
                }

            }, 300);
          },
        }),
      }),
    ];
  },

  addStorage() {
    return {
      css: `
      .completion-suggestion::after {
        content: attr(data-suggestion);
        color: #a0a0a0;
        pointer-events: none;
      }
      .dark .completion-suggestion::after {
        color: #6a6a6a;
      }
      `
    };
  },
  
  onCreate() {
    if (typeof window !== 'undefined' && this.storage.css) {
        const style = document.createElement('style');
        style.textContent = this.storage.css;
        document.head.append(style);
    }
  },
});
