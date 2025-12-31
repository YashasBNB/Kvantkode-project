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
import { windowOpenNoOpener } from '../../../base/browser/dom.js';
import { Schemas } from '../../../base/common/network.js';
import { AbstractCodeEditorService } from '../../browser/services/abstractCodeEditorService.js';
import { ICodeEditorService } from '../../browser/services/codeEditorService.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { registerSingleton, } from '../../../platform/instantiation/common/extensions.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
let StandaloneCodeEditorService = class StandaloneCodeEditorService extends AbstractCodeEditorService {
    constructor(contextKeyService, themeService) {
        super(themeService);
        this._register(this.onCodeEditorAdd(() => this._checkContextKey()));
        this._register(this.onCodeEditorRemove(() => this._checkContextKey()));
        this._editorIsOpen = contextKeyService.createKey('editorIsOpen', false);
        this._activeCodeEditor = null;
        this._register(this.registerCodeEditorOpenHandler(async (input, source, sideBySide) => {
            if (!source) {
                return null;
            }
            return this.doOpenEditor(source, input);
        }));
    }
    _checkContextKey() {
        let hasCodeEditor = false;
        for (const editor of this.listCodeEditors()) {
            if (!editor.isSimpleWidget) {
                hasCodeEditor = true;
                break;
            }
        }
        this._editorIsOpen.set(hasCodeEditor);
    }
    setActiveCodeEditor(activeCodeEditor) {
        this._activeCodeEditor = activeCodeEditor;
    }
    getActiveCodeEditor() {
        return this._activeCodeEditor;
    }
    doOpenEditor(editor, input) {
        const model = this.findModel(editor, input.resource);
        if (!model) {
            if (input.resource) {
                const schema = input.resource.scheme;
                if (schema === Schemas.http || schema === Schemas.https) {
                    // This is a fully qualified http or https URL
                    windowOpenNoOpener(input.resource.toString());
                    return editor;
                }
            }
            return null;
        }
        const selection = (input.options ? input.options.selection : null);
        if (selection) {
            if (typeof selection.endLineNumber === 'number' && typeof selection.endColumn === 'number') {
                editor.setSelection(selection);
                editor.revealRangeInCenter(selection, 1 /* ScrollType.Immediate */);
            }
            else {
                const pos = {
                    lineNumber: selection.startLineNumber,
                    column: selection.startColumn,
                };
                editor.setPosition(pos);
                editor.revealPositionInCenter(pos, 1 /* ScrollType.Immediate */);
            }
        }
        return editor;
    }
    findModel(editor, resource) {
        const model = editor.getModel();
        if (model && model.uri.toString() !== resource.toString()) {
            return null;
        }
        return model;
    }
};
StandaloneCodeEditorService = __decorate([
    __param(0, IContextKeyService),
    __param(1, IThemeService)
], StandaloneCodeEditorService);
export { StandaloneCodeEditorService };
registerSingleton(ICodeEditorService, StandaloneCodeEditorService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvZGVFZGl0b3JTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9zdGFuZGFsb25lQ29kZUVkaXRvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBR3pELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBSWhGLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRW5HLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFdkUsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSx5QkFBeUI7SUFJekUsWUFDcUIsaUJBQXFDLEVBQzFDLFlBQTJCO1FBRTFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNuQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25FLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0RSxJQUFJLENBQUMsYUFBYSxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FB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