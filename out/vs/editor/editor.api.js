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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmFwaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9lZGl0b3IuYXBpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixhQUFhLEdBR2IsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV4RSxxQ0FBcUM7QUFDckMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxZQUFZLDhCQUFzQixDQUFBO0FBQy9ELGFBQWEsQ0FBQyxXQUFXLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQTtBQUM5QyxhQUFhLENBQUMsVUFBVSxDQUFDLFlBQVksNENBQW9DLENBQUE7QUFDekUsYUFBYSxDQUFDLGtCQUFrQixDQUFDLFlBQVksR0FBRyxDQUFDLENBQUE7QUFFakQsNkZBQTZGO0FBQzdGLDZEQUE2RDtBQUM3RCxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FDdEUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDN0IsQ0FBQTtBQUVELE1BQU0sR0FBRyxHQUFHLG1CQUFtQixFQUFFLENBQUE7QUFDakMsR0FBRyxDQUFDLE1BQU0sR0FBRyxxQkFBcUIsRUFBRSxDQUFBO0FBQ3BDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsd0JBQXdCLEVBQUUsQ0FBQTtBQUMxQyxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxHQUFHLENBQUMsdUJBQXVCLENBQUE7QUFDbEUsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUE7QUFDbEMsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUE7QUFDbEMsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUE7QUFDaEMsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUE7QUFDcEMsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUE7QUFDOUIsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUE7QUFDdEMsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLGtCQUFrQixDQUFBO0FBQ3hELE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsY0FBYyxDQUFBO0FBQ2hELE1BQU0sQ0FBQyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFBO0FBQ3RDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFBO0FBQzFCLE1BQU0sQ0FBQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFBO0FBQzlCLE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFBO0FBQ2hDLE1BQU0sQ0FBQyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFBO0FBTXRDLE1BQU0saUJBQWlCLEdBQW9DLFVBQWtCLENBQUMsaUJBQWlCLENBQUE7QUFDL0YsSUFDQyxpQkFBaUIsRUFBRSxTQUFTO0lBQzVCLENBQUMsT0FBUSxVQUFrQixDQUFDLE1BQU0sS0FBSyxVQUFVLElBQUssVUFBa0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQ25GLENBQUM7SUFDRixVQUFVLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQTtBQUN4QixDQUFDO0FBRUQsSUFDQyxPQUFRLFVBQWtCLENBQUMsT0FBTyxLQUFLLFdBQVc7SUFDbEQsT0FBUSxVQUFrQixDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssVUFBVSxFQUN2RCxDQUFDO0lBQ0YsQ0FBQztJQUFDLFVBQWtCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUNuQyxzQkFBc0IsRUFBRTtZQUN2Qiw2QkFBNkI7WUFDN0Isa0NBQWtDO1lBQ2xDLG9DQUFvQztZQUNwQyx5Q0FBeUM7WUFDekMsWUFBWTtZQUNaLHVCQUF1QjtZQUN2QixjQUFjO1lBQ2QsbUJBQW1CO1lBQ25CLFlBQVk7WUFDWixrQkFBa0I7WUFDbEIsMENBQTBDO1NBQzFDO0tBQ0QsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyJ9