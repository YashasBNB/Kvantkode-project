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
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { autorun } from '../../../../../base/common/observable.js';
import { basename } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { isCodeEditor, isDiffEditor, } from '../../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { getNotebookEditorFromEditorPane, } from '../../../notebook/browser/notebookBrowser.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { IChatService } from '../../common/chatService.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { ILanguageModelIgnoredFilesService } from '../../common/ignoredFiles.js';
import { IChatWidgetService } from '../chat.js';
let ChatImplicitContextContribution = class ChatImplicitContextContribution extends Disposable {
    static { this.ID = 'chat.implicitContext'; }
    constructor(codeEditorService, editorService, chatWidgetService, chatService, chatEditingService, configurationService, ignoredFilesService) {
        super();
        this.codeEditorService = codeEditorService;
        this.editorService = editorService;
        this.chatWidgetService = chatWidgetService;
        this.chatService = chatService;
        this.chatEditingService = chatEditingService;
        this.configurationService = configurationService;
        this.ignoredFilesService = ignoredFilesService;
        this._currentCancelTokenSource = this._register(new MutableDisposable());
        this._implicitContextEnablement = this.configurationService.getValue('chat.implicitContext.enabled');
        const activeEditorDisposables = this._register(new DisposableStore());
        this._register(Event.runAndSubscribe(editorService.onDidActiveEditorChange, () => {
            activeEditorDisposables.clear();
            const codeEditor = this.findActiveCodeEditor();
            if (codeEditor) {
                activeEditorDisposables.add(Event.debounce(Event.any(codeEditor.onDidChangeModel, codeEditor.onDidChangeCursorSelection, codeEditor.onDidScrollChange), () => undefined, 500)(() => this.updateImplicitContext()));
            }
            const notebookEditor = this.findActiveNotebookEditor();
            if (notebookEditor) {
                activeEditorDisposables.add(Event.debounce(Event.any(notebookEditor.onDidChangeModel, notebookEditor.onDidChangeActiveCell), () => undefined, 500)(() => this.updateImplicitContext()));
            }
            this.updateImplicitContext();
        }));
        this._register(autorun((reader) => {
            this.chatEditingService.editingSessionsObs.read(reader);
            this.updateImplicitContext();
        }));
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('chat.implicitContext.enabled')) {
                this._implicitContextEnablement = this.configurationService.getValue('chat.implicitContext.enabled');
                this.updateImplicitContext();
            }
        }));
        this._register(this.chatService.onDidSubmitRequest(({ chatSessionId }) => {
            const widget = this.chatWidgetService.getWidgetBySessionId(chatSessionId);
            if (!widget?.input.implicitContext) {
                return;
            }
            if (this._implicitContextEnablement[widget.location] === 'first' &&
                widget.viewModel?.getItems().length !== 0) {
                widget.input.implicitContext.setValue(undefined, false);
            }
        }));
        this._register(this.chatWidgetService.onDidAddWidget(async (widget) => {
            await this.updateImplicitContext(widget);
        }));
    }
    findActiveCodeEditor() {
        const codeEditor = this.codeEditorService.getActiveCodeEditor();
        if (codeEditor) {
            const model = codeEditor.getModel();
            if (model?.uri.scheme === Schemas.vscodeNotebookCell) {
                return undefined;
            }
            if (model) {
                return codeEditor;
            }
        }
        for (const codeOrDiffEditor of this.editorService.getVisibleTextEditorControls(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
            let codeEditor;
            if (isDiffEditor(codeOrDiffEditor)) {
                codeEditor = codeOrDiffEditor.getModifiedEditor();
            }
            else if (isCodeEditor(codeOrDiffEditor)) {
                codeEditor = codeOrDiffEditor;
            }
            else {
                continue;
            }
            const model = codeEditor.getModel();
            if (model) {
                return codeEditor;
            }
        }
        return undefined;
    }
    findActiveNotebookEditor() {
        return getNotebookEditorFromEditorPane(this.editorService.activeEditorPane);
    }
    async updateImplicitContext(updateWidget) {
        const cancelTokenSource = (this._currentCancelTokenSource.value = new CancellationTokenSource());
        const codeEditor = this.findActiveCodeEditor();
        const model = codeEditor?.getModel();
        const selection = codeEditor?.getSelection();
        let newValue;
        let isSelection = false;
        if (model) {
            if (selection && !selection.isEmpty()) {
                newValue = { uri: model.uri, range: selection };
                isSelection = true;
            }
            else {
                const visibleRanges = codeEditor?.getVisibleRanges();
                if (visibleRanges && visibleRanges.length > 0) {
                    // Merge visible ranges. Maybe the reference value could actually be an array of Locations?
                    // Something like a Location with an array of Ranges?
                    let range = visibleRanges[0];
                    visibleRanges.slice(1).forEach((r) => {
                        range = range.plusRange(r);
                    });
                    newValue = { uri: model.uri, range };
                }
                else {
                    newValue = model.uri;
                }
            }
        }
        const notebookEditor = this.findActiveNotebookEditor();
        if (notebookEditor) {
            const activeCell = notebookEditor.getActiveCell();
            if (activeCell) {
                newValue = activeCell.uri;
            }
            else {
                newValue = notebookEditor.textModel?.uri;
            }
        }
        const uri = newValue instanceof URI ? newValue : newValue?.uri;
        if (uri && (await this.ignoredFilesService.fileIsIgnored(uri, cancelTokenSource.token))) {
            newValue = undefined;
        }
        if (cancelTokenSource.token.isCancellationRequested) {
            return;
        }
        const widgets = updateWidget
            ? [updateWidget]
            : [
                ...this.chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Panel),
                ...this.chatWidgetService.getWidgetsByLocations(ChatAgentLocation.EditingSession),
                ...this.chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Editor),
            ];
        for (const widget of widgets) {
            if (!widget.input.implicitContext) {
                continue;
            }
            const setting = this._implicitContextEnablement[widget.location];
            const isFirstInteraction = widget.viewModel?.getItems().length === 0;
            if (setting === 'first' && !isFirstInteraction) {
                widget.input.implicitContext.setValue(undefined, false);
            }
            else if (setting === 'always' || (setting === 'first' && isFirstInteraction)) {
                widget.input.implicitContext.setValue(newValue, isSelection);
            }
            else if (setting === 'never') {
                widget.input.implicitContext.setValue(undefined, false);
            }
        }
    }
};
ChatImplicitContextContribution = __decorate([
    __param(0, ICodeEditorService),
    __param(1, IEditorService),
    __param(2, IChatWidgetService),
    __param(3, IChatService),
    __param(4, IChatEditingService),
    __param(5, IConfigurationService),
    __param(6, ILanguageModelIgnoredFilesService)
], ChatImplicitContextContribution);
export { ChatImplicitContextContribution };
export class ChatImplicitContext extends Disposable {
    get id() {
        if (URI.isUri(this.value)) {
            return 'vscode.implicit.file';
        }
        else if (this.value) {
            if (this._isSelection) {
                return 'vscode.implicit.selection';
            }
            else {
                return 'vscode.implicit.viewport';
            }
        }
        else {
            return 'vscode.implicit';
        }
    }
    get name() {
        if (URI.isUri(this.value)) {
            return `file:${basename(this.value)}`;
        }
        else if (this.value) {
            return `file:${basename(this.value.uri)}`;
        }
        else {
            return 'implicit';
        }
    }
    get modelDescription() {
        if (URI.isUri(this.value)) {
            return `User's active file`;
        }
        else if (this._isSelection) {
            return `User's active selection`;
        }
        else {
            return `User's current visible code`;
        }
    }
    get isSelection() {
        return this._isSelection;
    }
    get value() {
        return this._value;
    }
    get enabled() {
        return this._enabled;
    }
    set enabled(value) {
        this._enabled = value;
        this._onDidChangeValue.fire();
    }
    constructor(value) {
        super();
        this.kind = 'implicit';
        this.isFile = true;
        this._isSelection = false;
        this._onDidChangeValue = new Emitter();
        this.onDidChangeValue = this._onDidChangeValue.event;
        this._enabled = true;
        this._value = value;
    }
    setValue(value, isSelection) {
        this._value = value;
        this._isSelection = isSelection;
        this._onDidChangeValue.fire();
    }
    toBaseEntry() {
        return {
            id: this.id,
            name: this.name,
            value: this.value,
            isFile: true,
            modelDescription: this.modelDescription,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEltcGxpY2l0Q29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jb250cmliL2NoYXRJbXBsaWNpdENvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixpQkFBaUIsR0FDakIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUVOLFlBQVksRUFDWixZQUFZLEdBQ1osTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUdyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDcEYsT0FBTyxFQUNOLCtCQUErQixHQUUvQixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBS3hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVB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