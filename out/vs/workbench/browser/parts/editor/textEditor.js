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
var AbstractTextEditor_1;
import { localize } from '../../../../nls.js';
import { distinct, deepClone } from '../../../../base/common/objects.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { isObject, assertIsDefined } from '../../../../base/common/types.js';
import { MutableDisposable } from '../../../../base/common/lifecycle.js';
import { computeEditorAriaLabel } from '../../editor.js';
import { AbstractEditorWithViewState } from './editorWithViewState.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ITextResourceConfigurationService, } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
/**
 * The base class of editors that leverage any kind of text editor for the editing experience.
 */
let AbstractTextEditor = class AbstractTextEditor extends AbstractEditorWithViewState {
    static { AbstractTextEditor_1 = this; }
    static { this.VIEW_STATE_PREFERENCE_KEY = 'textEditorViewState'; }
    constructor(id, group, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService, fileService) {
        super(id, group, AbstractTextEditor_1.VIEW_STATE_PREFERENCE_KEY, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorService, editorGroupService);
        this.fileService = fileService;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._onDidChangeScroll = this._register(new Emitter());
        this.onDidChangeScroll = this._onDidChangeScroll.event;
        this.inputListener = this._register(new MutableDisposable());
        // Listen to configuration changes
        this._register(this.textResourceConfigurationService.onDidChangeConfiguration((e) => this.handleConfigurationChangeEvent(e)));
        // ARIA: if a group is added or removed, update the editor's ARIA
        // label so that it appears in the label for when there are > 1 groups
        this._register(Event.any(this.editorGroupService.onDidAddGroup, this.editorGroupService.onDidRemoveGroup)(() => {
            const ariaLabel = this.computeAriaLabel();
            this.editorContainer?.setAttribute('aria-label', ariaLabel);
            this.updateEditorControlOptions({ ariaLabel });
        }));
        // Listen to file system provider changes
        this._register(this.fileService.onDidChangeFileSystemProviderCapabilities((e) => this.onDidChangeFileSystemProvider(e.scheme)));
        this._register(this.fileService.onDidChangeFileSystemProviderRegistrations((e) => this.onDidChangeFileSystemProvider(e.scheme)));
    }
    handleConfigurationChangeEvent(e) {
        const resource = this.getActiveResource();
        if (!this.shouldHandleConfigurationChangeEvent(e, resource)) {
            return;
        }
        if (this.isVisible()) {
            this.updateEditorConfiguration(resource);
        }
        else {
            this.hasPendingConfigurationChange = true;
        }
    }
    shouldHandleConfigurationChangeEvent(e, resource) {
        return (e.affectsConfiguration(resource, 'editor') ||
            e.affectsConfiguration(resource, 'problems.visibility'));
    }
    consumePendingConfigurationChangeEvent() {
        if (this.hasPendingConfigurationChange) {
            this.updateEditorConfiguration();
            this.hasPendingConfigurationChange = false;
        }
    }
    computeConfiguration(configuration) {
        // Specific editor options always overwrite user configuration
        const editorConfiguration = isObject(configuration.editor)
            ? deepClone(configuration.editor)
            : Object.create(null);
        Object.assign(editorConfiguration, this.getConfigurationOverrides(configuration));
        // ARIA label
        editorConfiguration.ariaLabel = this.computeAriaLabel();
        return editorConfiguration;
    }
    computeAriaLabel() {
        return this.input
            ? computeEditorAriaLabel(this.input, undefined, this.group, this.editorGroupService.count)
            : localize('editor', 'Editor');
    }
    onDidChangeFileSystemProvider(scheme) {
        if (!this.input) {
            return;
        }
        if (this.getActiveResource()?.scheme === scheme) {
            this.updateReadonly(this.input);
        }
    }
    onDidChangeInputCapabilities(input) {
        if (this.input === input) {
            this.updateReadonly(input);
        }
    }
    updateReadonly(input) {
        this.updateEditorControlOptions({ ...this.getReadonlyConfiguration(input.isReadonly()) });
    }
    getReadonlyConfiguration(isReadonly) {
        return {
            readOnly: !!isReadonly,
            readOnlyMessage: typeof isReadonly !== 'boolean' ? isReadonly : undefined,
        };
    }
    getConfigurationOverrides(configuration) {
        return {
            overviewRulerLanes: 3,
            lineNumbersMinChars: 3,
            fixedOverflowWidgets: true,
            ...this.getReadonlyConfiguration(this.input?.isReadonly()),
            renderValidationDecorations: configuration.problems?.visibility !== false ? 'on' : 'off',
        };
    }
    createEditor(parent) {
        // Create editor control
        this.editorContainer = parent;
        this.createEditorControl(parent, this.computeConfiguration(this.textResourceConfigurationService.getValue(this.getActiveResource())));
        // Listeners
        this.registerCodeEditorListeners();
    }
    registerCodeEditorListeners() {
        const mainControl = this.getMainControl();
        if (mainControl) {
            this._register(mainControl.onDidChangeModelLanguage(() => this.updateEditorConfiguration()));
            this._register(mainControl.onDidChangeModel(() => this.updateEditorConfiguration()));
            this._register(mainControl.onDidChangeCursorPosition((e) => this._onDidChangeSelection.fire({ reason: this.toEditorPaneSelectionChangeReason(e) })));
            this._register(mainControl.onDidChangeModelContent(() => this._onDidChangeSelection.fire({ reason: 3 /* EditorPaneSelectionChangeReason.EDIT */ })));
            this._register(mainControl.onDidScrollChange(() => this._onDidChangeScroll.fire()));
        }
    }
    toEditorPaneSelectionChangeReason(e) {
        switch (e.source) {
            case "api" /* TextEditorSelectionSource.PROGRAMMATIC */:
                return 1 /* EditorPaneSelectionChangeReason.PROGRAMMATIC */;
            case "code.navigation" /* TextEditorSelectionSource.NAVIGATION */:
                return 4 /* EditorPaneSelectionChangeReason.NAVIGATION */;
            case "code.jump" /* TextEditorSelectionSource.JUMP */:
                return 5 /* EditorPaneSelectionChangeReason.JUMP */;
            default:
                return 2 /* EditorPaneSelectionChangeReason.USER */;
        }
    }
    getSelection() {
        const mainControl = this.getMainControl();
        if (mainControl) {
            const selection = mainControl.getSelection();
            if (selection) {
                return new TextEditorPaneSelection(selection);
            }
        }
        return undefined;
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        // Update our listener for input capabilities
        this.inputListener.value = input.onDidChangeCapabilities(() => this.onDidChangeInputCapabilities(input));
        // Update editor options after having set the input. We do this because there can be
        // editor input specific options (e.g. an ARIA label depending on the input showing)
        this.updateEditorConfiguration();
        // Update aria label on editor
        const editorContainer = assertIsDefined(this.editorContainer);
        editorContainer.setAttribute('aria-label', this.computeAriaLabel());
    }
    clearInput() {
        // Clear input listener
        this.inputListener.clear();
        super.clearInput();
    }
    getScrollPosition() {
        const editor = this.getMainControl();
        if (!editor) {
            throw new Error('Control has not yet been initialized');
        }
        return {
            // The top position can vary depending on the view zones (find widget for example)
            scrollTop: editor.getScrollTop() - editor.getTopForLineNumber(1),
            scrollLeft: editor.getScrollLeft(),
        };
    }
    setScrollPosition(scrollPosition) {
        const editor = this.getMainControl();
        if (!editor) {
            throw new Error('Control has not yet been initialized');
        }
        editor.setScrollTop(scrollPosition.scrollTop);
        if (scrollPosition.scrollLeft) {
            editor.setScrollLeft(scrollPosition.scrollLeft);
        }
    }
    setEditorVisible(visible) {
        if (visible) {
            this.consumePendingConfigurationChangeEvent();
        }
        super.setEditorVisible(visible);
    }
    toEditorViewStateResource(input) {
        return input.resource;
    }
    updateEditorConfiguration(resource = this.getActiveResource()) {
        let configuration = undefined;
        if (resource) {
            configuration = this.textResourceConfigurationService.getValue(resource);
        }
        if (!configuration) {
            return;
        }
        const editorConfiguration = this.computeConfiguration(configuration);
        // Try to figure out the actual editor options that changed from the last time we updated the editor.
        // We do this so that we are not overwriting some dynamic editor settings (e.g. word wrap) that might
        // have been applied to the editor directly.
        let editorSettingsToApply = editorConfiguration;
        if (this.lastAppliedEditorOptions) {
            editorSettingsToApply = distinct(this.lastAppliedEditorOptions, editorSettingsToApply);
        }
        if (Object.keys(editorSettingsToApply).length > 0) {
            this.lastAppliedEditorOptions = editorConfiguration;
            this.updateEditorControlOptions(editorSettingsToApply);
        }
    }
    getActiveResource() {
        const mainControl = this.getMainControl();
        if (mainControl) {
            const model = mainControl.getModel();
            if (model) {
                return model.uri;
            }
        }
        if (this.input) {
            return this.input.resource;
        }
        return undefined;
    }
    dispose() {
        this.lastAppliedEditorOptions = undefined;
        super.dispose();
    }
};
AbstractTextEditor = AbstractTextEditor_1 = __decorate([
    __param(2, ITelemetryService),
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, ITextResourceConfigurationService),
    __param(6, IThemeService),
    __param(7, IEditorService),
    __param(8, IEditorGroupsService),
    __param(9, IFileService)
], AbstractTextEditor);
export { AbstractTextEditor };
export class TextEditorPaneSelection {
    static { this.TEXT_EDITOR_SELECTION_THRESHOLD = 10; } // number of lines to move in editor to justify for significant change
    constructor(textSelection) {
        this.textSelection = textSelection;
    }
    compare(other) {
        if (!(other instanceof TextEditorPaneSelection)) {
            return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
        }
        const thisLineNumber = Math.min(this.textSelection.selectionStartLineNumber, this.textSelection.positionLineNumber);
        const otherLineNumber = Math.min(other.textSelection.selectionStartLineNumber, other.textSelection.positionLineNumber);
        if (thisLineNumber === otherLineNumber) {
            return 1 /* EditorPaneSelectionCompareResult.IDENTICAL */;
        }
        if (Math.abs(thisLineNumber - otherLineNumber) <
            TextEditorPaneSelection.TEXT_EDITOR_SELECTION_THRESHOLD) {
            return 2 /* EditorPaneSelectionCompareResult.SIMILAR */; // when in close proximity, treat selection as being similar
        }
        return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
    }
    restore(options) {
        const textEditorOptions = {
            ...options,
            selection: this.textSelection,
            selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
        };
        return textEditorOptions;
    }
    log() {
        return `line: ${this.textSelection.startLineNumber}-${this.textSelection.endLineNumber}, col:  ${this.textSelection.startColumn}-${this.textSelection.endColumn}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci90ZXh0RWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFheEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDeEQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFHdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBRU4saUNBQWlDLEdBQ2pDLE1BQU0saUVBQWlFLENBQUE7QUFFeEUsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLHdEQUF3RCxDQUFBO0FBRS9ELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQVFqRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFn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