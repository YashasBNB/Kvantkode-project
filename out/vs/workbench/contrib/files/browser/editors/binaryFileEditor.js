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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5RmlsZUVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvZWRpdG9ycy9iaW5hcnlGaWxlRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXBGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN0RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFrQixNQUFNLGlEQUFpRCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixzQkFBc0IsR0FHdEIsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFHOUU7O0dBRUc7QUFDSSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLHdCQUF3Qjs7YUFDN0MsT0FBRSxHQUFHLHFCQUFxQixBQUF4QixDQUF3QjtJQUUxQyxZQUNDLEtBQW1CLEVBQ0EsZ0JBQW1DLEVBQ3ZDLFlBQTJCLEVBQ0QscUJBQTZDLEVBQ3JFLGNBQStCO1FBRWhELEtBQUssQ0FDSixrQkFBZ0IsQ0FBQyxFQUFFLEVBQ25CLEtBQUssRUFDTDtZQUNDLFlBQVksRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQztTQUNuRSxFQUNELGdCQUFnQixFQUNoQixZQUFZLEVBQ1osY0FBYyxDQUNkLENBQUE7UUFad0MsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtJQWF2RixDQUFDO0lBRU8sS0FBSyxDQUFDLFlBQVksQ0FDekIsS0FBa0IsRUFDbEIsT0FBbUM7UUFFbkMsSUFBSSxLQUFLLFlBQVksZUFBZSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDakUsNkRBQTZEO1lBQzdELHlEQUF5RDtZQUN6RCxlQUFlO1lBQ2YsMERBQTBEO1lBQzFELHlEQUF5RDtZQUN6RCxzREFBc0Q7WUFDdEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUE7WUFDNUMsTUFBTSxtQkFBbUIsR0FBRyxZQUFZLEVBQUUsU0FBUyxFQUFFLENBQUE7WUFDckQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQzFCLE9BQU0sQ0FBQyxpQ0FBaUM7WUFDekMsQ0FBQztZQUVELHFDQUFxQztZQUNyQyxJQUFJLGNBQWMsR0FDakIsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUM3QztnQkFDQyxHQUFHLG1CQUFtQjtnQkFDdEIsT0FBTyxFQUFFO29CQUNSLEdBQUcsT0FBTztvQkFDVixRQUFRLEVBQUUsZ0JBQWdCLENBQUMsSUFBSTtpQkFDL0I7YUFDRCxFQUNELElBQUksQ0FBQyxLQUFLLENBQ1YsQ0FBQTtZQUVGLElBQUksY0FBYyxnQ0FBd0IsRUFBRSxDQUFDO2dCQUM1QyxjQUFjLEdBQUcsU0FBUyxDQUFBO1lBQzNCLENBQUM7aUJBQU0sSUFBSSxjQUFjLGlDQUF5QixFQUFFLENBQUM7Z0JBQ3BELE9BQU07WUFDUCxDQUFDO1lBRUQsNkRBQTZEO1lBQzdELGlFQUFpRTtZQUNqRSxJQUFJLHdCQUF3QixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7Z0JBQzlDLEtBQUssTUFBTSxNQUFNLElBQUksY0FBYyxDQUFDLE1BQU0sWUFBWSxlQUFlO29CQUNwRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztvQkFDbEUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQzVCLElBQUksTUFBTSxZQUFZLGVBQWUsRUFBRSxDQUFDO3dCQUN2QyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTt3QkFDM0IsTUFBTSxDQUFDLHNCQUFzQixDQUFDLHFCQUFxQixDQUFDLENBQUEsQ0FBQyxvREFBb0Q7b0JBQzFHLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxnREFBZ0Q7WUFDaEQsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQztnQkFDL0I7b0JBQ0MsTUFBTSxFQUFFLFlBQVk7b0JBQ3BCLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSxJQUFJLEtBQUs7b0JBQzVDLE9BQU8sRUFBRTt3QkFDUixHQUFHLENBQUMsY0FBYyxFQUFFLE9BQU8sSUFBSSxPQUFPLENBQUM7cUJBQ3ZDO2lCQUNEO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFUSxRQUFRO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLG9CQUFvQixDQUFDLENBQUE7SUFDOUYsQ0FBQzs7QUF0RlcsZ0JBQWdCO0lBSzFCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEsZUFBZSxDQUFBO0dBUkwsZ0JBQWdCLENBdUY1QiJ9