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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL3RleHRFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQWF4RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUd0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFFTixpQ0FBaUMsR0FDakMsTUFBTSxpRUFBaUUsQ0FBQTtBQUV4RSxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sd0RBQXdELENBQUE7QUFFL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBUWpGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FB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