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
import { localize } from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
import Severity from '../../../../base/common/severity.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorExtensions, isEditorOpenError, } from '../../../common/editor.js';
import { Dimension, show, hide, isAncestor, getActiveElement, getWindowById, isEditableElement, $, } from '../../../../base/browser/dom.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorProgressService, LongRunningOperation, } from '../../../../platform/progress/common/progress.js';
import { DEFAULT_EDITOR_MIN_DIMENSIONS, DEFAULT_EDITOR_MAX_DIMENSIONS, } from './editor.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { ErrorPlaceholderEditor, WorkspaceTrustRequiredPlaceholderEditor, } from './editorPlaceholder.js';
import { EditorOpenSource } from '../../../../platform/editor/common/editor.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IDialogService, } from '../../../../platform/dialogs/common/dialogs.js';
import { IHostService } from '../../../services/host/browser/host.js';
let EditorPanes = class EditorPanes extends Disposable {
    //#endregion
    get minimumWidth() {
        return this._activeEditorPane?.minimumWidth ?? DEFAULT_EDITOR_MIN_DIMENSIONS.width;
    }
    get minimumHeight() {
        return this._activeEditorPane?.minimumHeight ?? DEFAULT_EDITOR_MIN_DIMENSIONS.height;
    }
    get maximumWidth() {
        return this._activeEditorPane?.maximumWidth ?? DEFAULT_EDITOR_MAX_DIMENSIONS.width;
    }
    get maximumHeight() {
        return this._activeEditorPane?.maximumHeight ?? DEFAULT_EDITOR_MAX_DIMENSIONS.height;
    }
    get activeEditorPane() {
        return this._activeEditorPane;
    }
    constructor(editorGroupParent, editorPanesParent, groupView, layoutService, instantiationService, editorProgressService, workspaceTrustService, logService, dialogService, hostService) {
        super();
        this.editorGroupParent = editorGroupParent;
        this.editorPanesParent = editorPanesParent;
        this.groupView = groupView;
        this.layoutService = layoutService;
        this.instantiationService = instantiationService;
        this.workspaceTrustService = workspaceTrustService;
        this.logService = logService;
        this.dialogService = dialogService;
        this.hostService = hostService;
        //#region Events
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidChangeSizeConstraints = this._register(new Emitter());
        this.onDidChangeSizeConstraints = this._onDidChangeSizeConstraints.event;
        this._activeEditorPane = null;
        this.editorPanes = [];
        this.mapEditorPaneToPendingSetInput = new Map();
        this.activeEditorPaneDisposables = this._register(new DisposableStore());
        this.editorPanesRegistry = Registry.as(EditorExtensions.EditorPane);
        this.editorOperation = this._register(new LongRunningOperation(editorProgressService));
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.workspaceTrustService.onDidChangeTrust(() => this.onDidChangeWorkspaceTrust()));
    }
    onDidChangeWorkspaceTrust() {
        // If the active editor pane requires workspace trust
        // we need to re-open it anytime trust changes to
        // account for it.
        // For that we explicitly call into the group-view
        // to handle errors properly.
        const editor = this._activeEditorPane?.input;
        const options = this._activeEditorPane?.options;
        if (editor?.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */)) {
            this.groupView.openEditor(editor, options);
        }
    }
    async openEditor(editor, options, internalOptions, context = Object.create(null)) {
        try {
            return await this.doOpenEditor(this.getEditorPaneDescriptor(editor), editor, options, internalOptions, context);
        }
        catch (error) {
            // First check if caller instructed us to ignore error handling
            if (options?.ignoreError) {
                return { error };
            }
            // In case of an error when opening an editor, we still want to show
            // an editor in the desired location to preserve the user intent and
            // view state (e.g. when restoring).
            //
            // For that reason we have place holder editors that can convey a
            // message with actions the user can click on.
            return this.doShowError(error, editor, options, internalOptions, context);
        }
    }
    async doShowError(error, editor, options, internalOptions, context) {
        // Always log the error to figure out what is going on
        this.logService.error(error);
        // Show as modal dialog when explicit user action unless disabled
        let errorHandled = false;
        if (options?.source === EditorOpenSource.USER &&
            (!isEditorOpenError(error) || error.allowDialog)) {
            errorHandled = await this.doShowErrorDialog(error, editor);
        }
        // Return early if the user dealt with the error already
        if (errorHandled) {
            return { error };
        }
        // Show as editor placeholder: pass over the error to display
        const editorPlaceholderOptions = { ...options };
        if (!isCancellationError(error)) {
            editorPlaceholderOptions.error = error;
        }
        return {
            ...(await this.doOpenEditor(ErrorPlaceholderEditor.DESCRIPTOR, editor, editorPlaceholderOptions, internalOptions, context)),
            error,
        };
    }
    async doShowErrorDialog(error, editor) {
        let severity = Severity.Error;
        let message = undefined;
        let detail = toErrorMessage(error);
        let errorActions = undefined;
        if (isEditorOpenError(error)) {
            errorActions = error.actions;
            severity = error.forceSeverity ?? Severity.Error;
            if (error.forceMessage) {
                message = error.message;
                detail = undefined;
            }
        }
        if (!message) {
            message = localize('editorOpenErrorDialog', "Unable to open '{0}'", editor.getName());
        }
        const buttons = [];
        if (errorActions && errorActions.length > 0) {
            for (const errorAction of errorActions) {
                buttons.push({
                    label: errorAction.label,
                    run: () => errorAction,
                });
            }
        }
        else {
            buttons.push({
                label: localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, '&&OK'),
                run: () => undefined,
            });
        }
        let cancelButton = undefined;
        if (buttons.length === 1) {
            cancelButton = {
                run: () => {
                    errorHandled = true; // treat cancel as handled and do not show placeholder
                    return undefined;
                },
            };
        }
        let errorHandled = false; // by default, show placeholder
        const { result } = await this.dialogService.prompt({
            type: severity,
            message,
            detail,
            buttons,
            cancelButton,
        });
        if (result) {
            const errorActionResult = result.run();
            if (errorActionResult instanceof Promise) {
                errorActionResult.catch((error) => this.dialogService.error(toErrorMessage(error)));
            }
            errorHandled = true; // treat custom error action as handled and do not show placeholder
        }
        return errorHandled;
    }
    async doOpenEditor(descriptor, editor, options, internalOptions, context = Object.create(null)) {
        // Editor pane
        const pane = this.doShowEditorPane(descriptor);
        // Remember current active element for deciding to restore focus later
        const activeElement = getActiveElement();
        // Apply input to pane
        const { changed, cancelled } = await this.doSetInput(pane, editor, options, context);
        // Make sure to pass focus to the pane or otherwise
        // make sure that the pane window is visible unless
        // this has been explicitly disabled.
        if (!cancelled) {
            const focus = !options || !options.preserveFocus;
            if (focus && this.shouldRestoreFocus(activeElement)) {
                pane.focus();
            }
            else if (!internalOptions?.preserveWindowOrder) {
                this.hostService.moveTop(getWindowById(this.groupView.windowId, true).window);
            }
        }
        return { pane, changed, cancelled };
    }
    shouldRestoreFocus(expectedActiveElement) {
        if (!this.layoutService.isRestored()) {
            return true; // restore focus if we are not restored yet on startup
        }
        if (!expectedActiveElement) {
            return true; // restore focus if nothing was focused
        }
        const activeElement = getActiveElement();
        if (!activeElement || activeElement === expectedActiveElement.ownerDocument.body) {
            return true; // restore focus if nothing is focused currently
        }
        const same = expectedActiveElement === activeElement;
        if (same) {
            return true; // restore focus if same element is still active
        }
        if (!isEditableElement(activeElement)) {
            // This is to avoid regressions from not restoring focus as we used to:
            // Only allow a different input element (or textarea) to remain focused
            // but not other elements that do not accept text input.
            return true;
        }
        if (isAncestor(activeElement, this.editorGroupParent)) {
            return true; // restore focus if active element is still inside our editor group
        }
        return false; // do not restore focus
    }
    getEditorPaneDescriptor(editor) {
        if (editor.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */) &&
            !this.workspaceTrustService.isWorkspaceTrusted()) {
            // Workspace trust: if an editor signals it needs workspace trust
            // but the current workspace is untrusted, we fallback to a generic
            // editor descriptor to indicate this an do NOT load the registered
            // editor.
            return WorkspaceTrustRequiredPlaceholderEditor.DESCRIPTOR;
        }
        return assertIsDefined(this.editorPanesRegistry.getEditorPane(editor));
    }
    doShowEditorPane(descriptor) {
        // Return early if the currently active editor pane can handle the input
        if (this._activeEditorPane && descriptor.describes(this._activeEditorPane)) {
            return this._activeEditorPane;
        }
        // Hide active one first
        this.doHideActiveEditorPane();
        // Create editor pane
        const editorPane = this.doCreateEditorPane(descriptor);
        // Set editor as active
        this.doSetActiveEditorPane(editorPane);
        // Show editor
        const container = assertIsDefined(editorPane.getContainer());
        this.editorPanesParent.appendChild(container);
        show(container);
        // Indicate to editor that it is now visible
        editorPane.setVisible(true);
        // Layout
        if (this.pagePosition) {
            editorPane.layout(new Dimension(this.pagePosition.width, this.pagePosition.height), {
                top: this.pagePosition.top,
                left: this.pagePosition.left,
            });
        }
        // Boundary sashes
        if (this.boundarySashes) {
            editorPane.setBoundarySashes(this.boundarySashes);
        }
        return editorPane;
    }
    doCreateEditorPane(descriptor) {
        // Instantiate editor
        const editorPane = this.doInstantiateEditorPane(descriptor);
        // Create editor container as needed
        if (!editorPane.getContainer()) {
            const editorPaneContainer = $('.editor-instance');
            // It is cruicial to append the container to its parent before
            // passing on to the create() method of the pane so that the
            // right `window` can be determined in floating window cases.
            this.editorPanesParent.appendChild(editorPaneContainer);
            try {
                editorPane.create(editorPaneContainer);
            }
            catch (error) {
                // At this point the editor pane container is not healthy
                // and as such, we remove it from the pane parent and hide
                // it so that we have a chance to show an error placeholder.
                // Not doing so would result in multiple `.editor-instance`
                // lingering around in the DOM.
                editorPaneContainer.remove();
                hide(editorPaneContainer);
                throw error;
            }
        }
        return editorPane;
    }
    doInstantiateEditorPane(descriptor) {
        // Return early if already instantiated
        const existingEditorPane = this.editorPanes.find((editorPane) => descriptor.describes(editorPane));
        if (existingEditorPane) {
            return existingEditorPane;
        }
        // Otherwise instantiate new
        const editorPane = this._register(descriptor.instantiate(this.instantiationService, this.groupView));
        this.editorPanes.push(editorPane);
        return editorPane;
    }
    doSetActiveEditorPane(editorPane) {
        this._activeEditorPane = editorPane;
        // Clear out previous active editor pane listeners
        this.activeEditorPaneDisposables.clear();
        // Listen to editor pane changes
        if (editorPane) {
            this.activeEditorPaneDisposables.add(editorPane.onDidChangeSizeConstraints((e) => this._onDidChangeSizeConstraints.fire(e)));
            this.activeEditorPaneDisposables.add(editorPane.onDidFocus(() => this._onDidFocus.fire()));
        }
        // Indicate that size constraints could have changed due to new editor
        this._onDidChangeSizeConstraints.fire(undefined);
    }
    async doSetInput(editorPane, editor, options, context) {
        // If the input did not change, return early and only
        // apply the options unless the options instruct us to
        // force open it even if it is the same
        let inputMatches = editorPane.input?.matches(editor);
        if (inputMatches && !options?.forceReload) {
            // We have to await a pending `setInput()` call for this
            // pane before we can call into `setOptions()`, otherwise
            // we risk calling when the input is not yet fully applied.
            if (this.mapEditorPaneToPendingSetInput.has(editorPane)) {
                await this.mapEditorPaneToPendingSetInput.get(editorPane);
            }
            // At this point, the input might have changed, so we check again
            inputMatches = editorPane.input?.matches(editor);
            if (inputMatches) {
                editorPane.setOptions(options);
            }
            return { changed: false, cancelled: !inputMatches };
        }
        // Start a new editor input operation to report progress
        // and to support cancellation. Any new operation that is
        // started will cancel the previous one.
        const operation = this.editorOperation.start(this.layoutService.isRestored() ? 800 : 3200);
        let cancelled = false;
        try {
            // Clear the current input before setting new input
            // This ensures that a slow loading input will not
            // be visible for the duration of the new input to
            // load (https://github.com/microsoft/vscode/issues/34697)
            editorPane.clearInput();
            // Set the input to the editor pane and keep track of it
            const pendingSetInput = editorPane.setInput(editor, options, context, operation.token);
            this.mapEditorPaneToPendingSetInput.set(editorPane, pendingSetInput);
            await pendingSetInput;
            if (!operation.isCurrent()) {
                cancelled = true;
            }
        }
        catch (error) {
            if (!operation.isCurrent()) {
                cancelled = true;
            }
            else {
                throw error;
            }
        }
        finally {
            if (operation.isCurrent()) {
                this.mapEditorPaneToPendingSetInput.delete(editorPane);
            }
            operation.stop();
        }
        return { changed: !inputMatches, cancelled };
    }
    doHideActiveEditorPane() {
        if (!this._activeEditorPane) {
            return;
        }
        // Stop any running operation
        this.editorOperation.stop();
        // Indicate to editor pane before removing the editor from
        // the DOM to give a chance to persist certain state that
        // might depend on still being the active DOM element.
        this.safeRun(() => this._activeEditorPane?.clearInput());
        this.safeRun(() => this._activeEditorPane?.setVisible(false));
        // Clear any pending setInput promise
        this.mapEditorPaneToPendingSetInput.delete(this._activeEditorPane);
        // Remove editor pane from parent
        const editorPaneContainer = this._activeEditorPane.getContainer();
        if (editorPaneContainer) {
            editorPaneContainer.remove();
            hide(editorPaneContainer);
        }
        // Clear active editor pane
        this.doSetActiveEditorPane(null);
    }
    closeEditor(editor) {
        if (this._activeEditorPane?.input && editor.matches(this._activeEditorPane.input)) {
            this.doHideActiveEditorPane();
        }
    }
    setVisible(visible) {
        this.safeRun(() => this._activeEditorPane?.setVisible(visible));
    }
    layout(pagePosition) {
        this.pagePosition = pagePosition;
        this.safeRun(() => this._activeEditorPane?.layout(new Dimension(pagePosition.width, pagePosition.height), pagePosition));
    }
    setBoundarySashes(sashes) {
        this.boundarySashes = sashes;
        this.safeRun(() => this._activeEditorPane?.setBoundarySashes(sashes));
    }
    safeRun(fn) {
        // We delegate many calls to the active editor pane which
        // can be any kind of editor. We must ensure that our calls
        // do not throw, for example in `layout()` because that can
        // mess with the grid layout.
        try {
            fn();
        }
        catch (error) {
            this.logService.error(error);
        }
    }
};
EditorPanes = __decorate([
    __param(3, IWorkbenchLayoutService),
    __param(4, IInstantiationService),
    __param(5, IEditorProgressService),
    __param(6, IWorkspaceTrustManagementService),
    __param(7, ILogService),
    __param(8, IDialogService),
    __param(9, IHostService)
], EditorPanes);
export { EditorPanes };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFuZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yUGFuZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFDTixnQkFBZ0IsRUFJaEIsaUJBQWlCLEdBQ2pCLE1BQU0sMkJBQTJCLENBQUE7QUFFbEMsT0FBTyxFQUNOLFNBQVMsRUFDVCxJQUFJLEVBQ0osSUFBSSxFQUVKLFVBQVUsRUFDVixnQkFBZ0IsRUFDaEIsYUFBYSxFQUNiLGlCQUFpQixFQUNqQixDQUFDLEdBQ0QsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFM0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixvQkFBb0IsR0FDcEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBRU4sNkJBQTZCLEVBQzdCLDZCQUE2QixHQUU3QixNQUFNLGFBQWEsQ0FBQTtBQUNwQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDMUcs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