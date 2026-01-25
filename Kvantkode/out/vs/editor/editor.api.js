/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorOptions, } from './common/config/editorOptions.js';
import { createMonacoBaseAPI } from './common/services/editorBaseApi.js';
import { createMonacoEditorAPI } from './standalone/browser/standaloneEditor.js';
import { createMonacoLanguagesAPI } from './standalone/browser/standaloneLanguages.js';
import { FormattingConflicts } from './contrib/format/browser/format.js';
// Set defaults for standalone editor
EditorOptions.wrappingIndent.defaultValue = 0 /* WrappingIndent.None */;
EditorOptions.glyphMargin.defaultValue = false;
EditorOptions.autoIndent.defaultValue = 3 /* EditorAutoIndentStrategy.Advanced */;
EditorOptions.overviewRulerLanes.defaultValue = 2;
// We need to register a formatter selector which simply picks the first available formatter.
// See https://github.com/microsoft/monaco-editor/issues/2327
FormattingConflicts.setFormatterSelector((formatter, document, mode) => Promise.resolve(formatter[0]));
const api = createMonacoBaseAPI();
api.editor = createMonacoEditorAPI();
api.languages = createMonacoLanguagesAPI();
export const CancellationTokenSource = api.CancellationTokenSource;
export const Emitter = api.Emitter;
export const KeyCode = api.KeyCode;
export const KeyMod = api.KeyMod;
export const Position = api.Position;
export const Range = api.Range;
export const Selection = api.Selection;
export const SelectionDirection = api.SelectionDirection;
export const MarkerSeverity = api.MarkerSeverity;
export const MarkerTag = api.MarkerTag;
export const Uri = api.Uri;
export const Token = api.Token;
export const editor = api.editor;
export const languages = api.languages;
const monacoEnvironment = globalThis.MonacoEnvironment;
if (monacoEnvironment?.globalAPI ||
    (typeof globalThis.define === 'function' && globalThis.define.amd)) {
    globalThis.monaco = api;
}
if (typeof globalThis.require !== 'undefined' &&
    typeof globalThis.require.config === 'function') {
    ;
    globalThis.require.config({
        ignoreDuplicateModules: [
            'vscode-languageserver-types',
            'vscode-languageserver-types/main',
            'vscode-languageserver-textdocument',
            'vscode-languageserver-textdocument/main',
            'vscode-nls',
            'vscode-nls/vscode-nls',
            'jsonc-parser',
            'jsonc-parser/main',
            'vscode-uri',
            'vscode-uri/index',
            'vs/basic-languages/typescript/typescript',
        ],
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmFwaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2VkaXRvci5hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLGFBQWEsR0FHYixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXhFLHFDQUFxQztBQUNyQyxhQUFhLENBQUMsY0FBYyxDQUFDLFlBQVksOEJBQXNCLENBQUE7QUFDL0QsYUFBYSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFBO0FBQzlDLGFBQWEsQ0FBQyxVQUFVLENBQUMsWUFBWSw0Q0FBb0MsQ0FBQTtBQUN6RSxhQUFhLENBQUMsa0JBQWtCLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQTtBQUVqRCw2RkFBNkY7QUFDN0YsNkRBQTZEO0FBQzdELG1CQUFtQixDQUFDLG9CQUFvQixDQUFDLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUN0RSxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUM3QixDQUFBO0FBRUQsTUFBTSxHQUFHLEdBQUcsbUJBQW1CLEVBQUUsQ0FBQTtBQUNqQyxHQUFHLENBQUMsTUFBTSxHQUFHLHFCQUFxQixFQUFFLENBQUE7QUFDcEMsR0FBRyxDQUFDLFNBQVMsR0FBRyx3QkFBd0IsRUFBRSxDQUFBO0FBQzFDLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQTtBQUNsRSxNQUFNLENBQUMsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQTtBQUNsQyxNQUFNLENBQUMsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQTtBQUNsQyxNQUFNLENBQUMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQTtBQUNoQyxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQTtBQUNwQyxNQUFNLENBQUMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQTtBQUM5QixNQUFNLENBQUMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQTtBQUN0QyxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsa0JBQWtCLENBQUE7QUFDeEQsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxjQUFjLENBQUE7QUFDaEQsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUE7QUFDdEMsTUFBTSxDQUFDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUE7QUFDMUIsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUE7QUFDOUIsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUE7QUFDaEMsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUE7QUFNdEMsTUFBTSxpQkFBaUIsR0FBb0MsVUFBa0IsQ0FBQyxpQkFBaUIsQ0FBQTtBQUMvRixJQUNDLGlCQUFpQixFQUFFLFNBQVM7SUFDNUIsQ0FBQyxPQUFRLFVBQWtCLENBQUMsTUFBTSxLQUFLLFVBQVUsSUFBSyxVQUFrQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFDbkYsQ0FBQztJQUNGLFVBQVUsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFBO0FBQ3hCLENBQUM7QUFFRCxJQUNDLE9BQVEsVUFBa0IsQ0FBQyxPQUFPLEtBQUssV0FBVztJQUNsRCxPQUFRLFVBQWtCLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQ3ZELENBQUM7SUFDRixDQUFDO0lBQUMsVUFBa0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQ25DLHNCQUFzQixFQUFFO1lBQ3ZCLDZCQUE2QjtZQUM3QixrQ0FBa0M7WUFDbEMsb0NBQW9DO1lBQ3BDLHlDQUF5QztZQUN6QyxZQUFZO1lBQ1osdUJBQXVCO1lBQ3ZCLGNBQWM7WUFDZCxtQkFBbUI7WUFDbkIsWUFBWTtZQUNaLGtCQUFrQjtZQUNsQiwwQ0FBMEM7U0FDMUM7S0FDRCxDQUFDLENBQUE7QUFDSCxDQUFDIn0=