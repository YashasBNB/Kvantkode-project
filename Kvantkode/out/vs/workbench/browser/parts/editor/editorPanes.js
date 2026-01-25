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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFuZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JQYW5lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUNOLGdCQUFnQixFQUloQixpQkFBaUIsR0FDakIsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBQ04sU0FBUyxFQUNULElBQUksRUFDSixJQUFJLEVBRUosVUFBVSxFQUNWLGdCQUFnQixFQUNoQixhQUFhLEVBQ2IsaUJBQWlCLEVBQ2pCLENBQUMsR0FDRCxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUUzRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLG9CQUFvQixHQUNwQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFFTiw2QkFBNkIsRUFDN0IsNkJBQTZCLEdBRTdCLE1BQU0sYUFBYSxDQUFBO0FBQ3BCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtB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