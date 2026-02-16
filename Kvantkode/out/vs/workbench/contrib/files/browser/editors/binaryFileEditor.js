/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BinaryFileEditor_1;
import { localize } from '../../../../../nls.js';
import { BaseBinaryResourceEditor } from '../../../../browser/parts/editor/binaryEditor.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { FileEditorInput } from './fileEditorInput.js';
import { BINARY_FILE_EDITOR_ID, BINARY_TEXT_FILE_MODE } from '../../common/files.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { EditorResolution } from '../../../../../platform/editor/common/editor.js';
import { IEditorResolverService, } from '../../../../services/editor/common/editorResolverService.js';
import { isEditorInputWithOptions } from '../../../../common/editor.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
/**
 * An implementation of editor for binary files that cannot be displayed.
 */
let BinaryFileEditor = class BinaryFileEditor extends BaseBinaryResourceEditor {
    static { BinaryFileEditor_1 = this; }
    static { this.ID = BINARY_FILE_EDITOR_ID; }
    constructor(group, telemetryService, themeService, editorResolverService, storageService) {
        super(BinaryFileEditor_1.ID, group, {
            openInternal: (input, options) => this.openInternal(input, options),
        }, telemetryService, themeService, storageService);
        this.editorResolverService = editorResolverService;
    }
    async openInternal(input, options) {
        if (input instanceof FileEditorInput && this.group.activeEditor) {
            // We operate on the active editor here to support re-opening
            // diff editors where `input` may just be one side of the
            // diff editor.
            // Since `openInternal` can only ever be selected from the
            // active editor of the group, this is a safe assumption.
            // (https://github.com/microsoft/vscode/issues/124222)
            const activeEditor = this.group.activeEditor;
            const untypedActiveEditor = activeEditor?.toUntyped();
            if (!untypedActiveEditor) {
                return; // we need untyped editor support
            }
            // Try to let the user pick an editor
            let resolvedEditor = await this.editorResolverService.resolveEditor({
                ...untypedActiveEditor,
                options: {
                    ...options,
                    override: EditorResolution.PICK,
                },
            }, this.group);
            if (resolvedEditor === 2 /* ResolvedStatus.NONE */) {
                resolvedEditor = undefined;
            }
            else if (resolvedEditor === 1 /* ResolvedStatus.ABORT */) {
                return;
            }
            // If the result if a file editor, the user indicated to open
            // the binary file as text. As such we adjust the input for that.
            if (isEditorInputWithOptions(resolvedEditor)) {
                for (const editor of resolvedEditor.editor instanceof DiffEditorInput
                    ? [resolvedEditor.editor.original, resolvedEditor.editor.modified]
                    : [resolvedEditor.editor]) {
                    if (editor instanceof FileEditorInput) {
                        editor.setForceOpenAsText();
                        editor.setPreferredLanguageId(BINARY_TEXT_FILE_MODE); // https://github.com/microsoft/vscode/issues/131076
                    }
                }
            }
            // Replace the active editor with the picked one
            await this.group.replaceEditors([
                {
                    editor: activeEditor,
                    replacement: resolvedEditor?.editor ?? input,
                    options: {
                        ...(resolvedEditor?.options ?? options),
                    },
                },
            ]);
        }
    }
    getTitle() {
        return this.input ? this.input.getName() : localize('binaryFileEditor', 'Binary File Viewer');
    }
};
BinaryFileEditor = BinaryFileEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IEditorResolverService),
    __param(4, IStorageService)
], BinaryFileEditor);
export { BinaryFileEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5RmlsZUVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9lZGl0b3JzL2JpbmFyeUZpbGVFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZ0JBQWdCLEVBQWtCLE1BQU0saURBQWlELENBQUE7QUFDbEcsT0FBTyxFQUNOLHNCQUFzQixHQUd0QixNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUc5RTs7R0FFRztBQUNJLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEsd0JBQXdCOzthQUM3QyxPQUFFLEdBQUcscUJBQXFCLEFBQXhCLENBQXdCO0lBRTFDLFlBQ0MsS0FBbUIsRUFDQSxnQkFBbUMsRUFDdkMsWUFBMkIsRUFDRCxxQkFBNkMsRUFD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