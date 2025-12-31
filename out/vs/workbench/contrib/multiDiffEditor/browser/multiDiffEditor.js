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
var MultiDiffEditor_1;
import { MultiDiffEditorWidget } from '../../../../editor/browser/widget/multiDiffEditor/multiDiffEditorWidget.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ResourceLabel } from '../../../browser/labels.js';
import { AbstractEditorWithViewState } from '../../../browser/parts/editor/editorWithViewState.js';
import { MultiDiffEditorInput, } from './multiDiffEditorInput.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
let MultiDiffEditor = class MultiDiffEditor extends AbstractEditorWithViewState {
    static { MultiDiffEditor_1 = this; }
    static { this.ID = 'multiDiffEditor'; }
    get viewModel() {
        return this._viewModel;
    }
    constructor(group, instantiationService, telemetryService, themeService, storageService, editorService, editorGroupService, textResourceConfigurationService, editorProgressService) {
        super(MultiDiffEditor_1.ID, group, 'multiDiffEditor', telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService);
        this.editorProgressService = editorProgressService;
        this._multiDiffEditorWidget = undefined;
    }
    createEditor(parent) {
        this._multiDiffEditorWidget = this._register(this.instantiationService.createInstance(MultiDiffEditorWidget, parent, this.instantiationService.createInstance(WorkbenchUIElementFactory)));
        this._register(this._multiDiffEditorWidget.onDidChangeActiveControl(() => {
            this._onDidChangeControl.fire();
        }));
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        this._viewModel = await input.getViewModel();
        this._multiDiffEditorWidget.setViewModel(this._viewModel);
        const viewState = this.loadEditorViewState(input, context);
        if (viewState) {
            this._multiDiffEditorWidget.setViewState(viewState);
        }
        this._applyOptions(options);
    }
    setOptions(options) {
        this._applyOptions(options);
    }
    _applyOptions(options) {
        const viewState = options?.viewState;
        if (!viewState || !viewState.revealData) {
            return;
        }
        this._multiDiffEditorWidget?.reveal(viewState.revealData.resource, {
            range: viewState.revealData.range ? Range.lift(viewState.revealData.range) : undefined,
            highlight: true,
        });
    }
    async clearInput() {
        await super.clearInput();
        this._multiDiffEditorWidget.setViewModel(undefined);
    }
    layout(dimension) {
        this._multiDiffEditorWidget.layout(dimension);
    }
    getControl() {
        return this._multiDiffEditorWidget.getActiveControl();
    }
    focus() {
        super.focus();
        this._multiDiffEditorWidget?.getActiveControl()?.focus();
    }
    hasFocus() {
        return this._multiDiffEditorWidget?.getActiveControl()?.hasTextFocus() || super.hasFocus();
    }
    computeEditorViewState(resource) {
        return this._multiDiffEditorWidget.getViewState();
    }
    tracksEditorViewState(input) {
        return input instanceof MultiDiffEditorInput;
    }
    toEditorViewStateResource(input) {
        return input.resource;
    }
    tryGetCodeEditor(resource) {
        return this._multiDiffEditorWidget.tryGetCodeEditor(resource);
    }
    findDocumentDiffItem(resource) {
        const i = this._multiDiffEditorWidget.findDocumentDiffItem(resource);
        if (!i) {
            return undefined;
        }
        const i2 = i;
        return i2.multiDiffEditorItem;
    }
    async showWhile(promise) {
        return this.editorProgressService.showWhile(promise);
    }
};
MultiDiffEditor = MultiDiffEditor_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITelemetryService),
    __param(3, IThemeService),
    __param(4, IStorageService),
    __param(5, IEditorService),
    __param(6, IEditorGroupsService),
    __param(7, ITextResourceConfigurationService),
    __param(8, IEditorProgressService)
], MultiDiffEditor);
export { MultiDiffEditor };
let WorkbenchUIElementFactory = class WorkbenchUIElementFactory {
    constructor(_instantiationService) {
        this._instantiationService = _instantiationService;
    }
    createResourceLabel(element) {
        const label = this._instantiationService.createInstance(ResourceLabel, element, {});
        return {
            setUri(uri, options = {}) {
                if (!uri) {
                    label.element.clear();
                }
                else {
                    label.element.setFile(uri, { strikethrough: options.strikethrough });
                }
            },
            dispose() {
                label.dispose();
            },
        };
    }
};
WorkbenchUIElementFactory = __decorate([
    __param(0, IInstantiationService)
], WorkbenchUIElementFactory);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbXVsdGlEaWZmRWRpdG9yL2Jyb3dzZXIvbXVsdGlEaWZmRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUtsSCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNuSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUlsRyxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQVNqRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFL0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFbEYsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSwyQkFBc0Q7O2FBQzFFLE9BQUUsR0FBRyxpQkFBaUIsQUFBcEIsQ0FBb0I7SUFLdEMsSUFBVyxTQUFT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