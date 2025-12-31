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
var EditorPlaceholder_1, WorkspaceTrustRequiredPlaceholderEditor_1, ErrorPlaceholderEditor_1;
import './media/editorplaceholder.css';
import { localize } from '../../../../nls.js';
import { truncate } from '../../../../base/common/strings.js';
import Severity from '../../../../base/common/severity.js';
import { isEditorOpenError } from '../../../common/editor.js';
import { EditorPane } from './editorPane.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { size, clearNode, $, EventHelper } from '../../../../base/browser/dom.js';
import { DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { assertAllDefined } from '../../../../base/common/types.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IWorkspaceContextService, isSingleFolderWorkspaceIdentifier, toWorkspaceIdentifier, } from '../../../../platform/workspace/common/workspace.js';
import { EditorOpenSource } from '../../../../platform/editor/common/editor.js';
import { computeEditorAriaLabel, EditorPaneDescriptor } from '../../editor.js';
import { ButtonBar } from '../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { SimpleIconLabel } from '../../../../base/browser/ui/iconLabel/simpleIconLabel.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
let EditorPlaceholder = class EditorPlaceholder extends EditorPane {
    static { EditorPlaceholder_1 = this; }
    static { this.PLACEHOLDER_LABEL_MAX_LENGTH = 1024; }
    constructor(id, group, telemetryService, themeService, storageService) {
        super(id, group, telemetryService, themeService, storageService);
        this.inputDisposable = this._register(new MutableDisposable());
    }
    createEditor(parent) {
        // Container
        this.container = $('.monaco-editor-pane-placeholder', {
            tabIndex: 0, // enable focus support from the editor part (do not remove)
        });
        this.container.style.outline = 'none';
        // Custom Scrollbars
        this.scrollbar = this._register(new DomScrollableElement(this.container, {
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            vertical: 1 /* ScrollbarVisibility.Auto */,
        }));
        parent.appendChild(this.scrollbar.getDomNode());
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        // Check for cancellation
        if (token.isCancellationRequested) {
            return;
        }
        // Render Input
        this.inputDisposable.value = await this.renderInput(input, options);
    }
    async renderInput(input, options) {
        const [container, scrollbar] = assertAllDefined(this.container, this.scrollbar);
        // Reset any previous contents
        clearNode(container);
        // Delegate to implementation for contents
        const disposables = new DisposableStore();
        const { icon, label, actions } = await this.getContents(input, options, disposables);
        const truncatedLabel = truncate(label, EditorPlaceholder_1.PLACEHOLDER_LABEL_MAX_LENGTH);
        // Icon
        const iconContainer = container.appendChild($('.editor-placeholder-icon-container'));
        const iconWidget = disposables.add(new SimpleIconLabel(iconContainer));
        iconWidget.text = icon;
        // Label
        const labelContainer = container.appendChild($('.editor-placeholder-label-container'));
        const labelWidget = $('span');
        labelWidget.textContent = truncatedLabel;
        labelContainer.appendChild(labelWidget);
        // ARIA label
        container.setAttribute('aria-label', `${computeEditorAriaLabel(input, undefined, this.group, undefined)}, ${truncatedLabel}`);
        // Buttons
        if (actions.length) {
            const actionsContainer = container.appendChild($('.editor-placeholder-buttons-container'));
            const buttons = disposables.add(new ButtonBar(actionsContainer));
            for (let i = 0; i < actions.length; i++) {
                const button = disposables.add(buttons.addButton({
                    ...defaultButtonStyles,
                    secondary: i !== 0,
                }));
                button.label = actions[i].label;
                disposables.add(button.onDidClick((e) => {
                    if (e) {
                        EventHelper.stop(e, true);
                    }
                    actions[i].run();
                }));
            }
        }
        // Adjust scrollbar
        scrollbar.scanDomNode();
        return disposables;
    }
    clearInput() {
        if (this.container) {
            clearNode(this.container);
        }
        this.inputDisposable.clear();
        super.clearInput();
    }
    layout(dimension) {
        const [container, scrollbar] = assertAllDefined(this.container, this.scrollbar);
        // Pass on to Container
        size(container, dimension.width, dimension.height);
        // Adjust scrollbar
        scrollbar.scanDomNode();
        // Toggle responsive class
        container.classList.toggle('max-height-200px', dimension.height <= 200);
    }
    focus() {
        super.focus();
        this.container?.focus();
    }
    dispose() {
        this.container?.remove();
        super.dispose();
    }
};
EditorPlaceholder = EditorPlaceholder_1 = __decorate([
    __param(2, ITelemetryService),
    __param(3, IThemeService),
    __param(4, IStorageService)
], EditorPlaceholder);
export { EditorPlaceholder };
let WorkspaceTrustRequiredPlaceholderEditor = class WorkspaceTrustRequiredPlaceholderEditor extends EditorPlaceholder {
    static { WorkspaceTrustRequiredPlaceholderEditor_1 = this; }
    static { this.ID = 'workbench.editors.workspaceTrustRequiredEditor'; }
    static { this.LABEL = localize('trustRequiredEditor', 'Workspace Trust Required'); }
    static { this.DESCRIPTOR = EditorPaneDescriptor.create(WorkspaceTrustRequiredPlaceholderEditor_1, this.ID, this.LABEL); }
    constructor(group, telemetryService, themeService, commandService, workspaceService, storageService) {
        super(WorkspaceTrustRequiredPlaceholderEditor_1.ID, group, telemetryService, themeService, storageService);
        this.commandService = commandService;
        this.workspaceService = workspaceService;
    }
    getTitle() {
        return WorkspaceTrustRequiredPlaceholderEditor_1.LABEL;
    }
    async getContents() {
        return {
            icon: '$(workspace-untrusted)',
            label: isSingleFolderWorkspaceIdentifier(toWorkspaceIdentifier(this.workspaceService.getWorkspace()))
                ? localize('requiresFolderTrustText', 'The file is not displayed in the editor because trust has not been granted to the folder.')
                : localize('requiresWorkspaceTrustText', 'The file is not displayed in the editor because trust has not been granted to the workspace.'),
            actions: [
                {
                    label: localize('manageTrust', 'Manage Workspace Trust'),
                    run: () => this.commandService.executeCommand('workbench.trust.manage'),
                },
            ],
        };
    }
};
WorkspaceTrustRequiredPlaceholderEditor = WorkspaceTrustRequiredPlaceholderEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, ICommandService),
    __param(4, IWorkspaceContextService),
    __param(5, IStorageService)
], WorkspaceTrustRequiredPlaceholderEditor);
export { WorkspaceTrustRequiredPlaceholderEditor };
let ErrorPlaceholderEditor = class ErrorPlaceholderEditor extends EditorPlaceholder {
    static { ErrorPlaceholderEditor_1 = this; }
    static { this.ID = 'workbench.editors.errorEditor'; }
    static { this.LABEL = localize('errorEditor', 'Error Editor'); }
    static { this.DESCRIPTOR = EditorPaneDescriptor.create(ErrorPlaceholderEditor_1, this.ID, this.LABEL); }
    constructor(group, telemetryService, themeService, storageService, fileService, dialogService) {
        super(ErrorPlaceholderEditor_1.ID, group, telemetryService, themeService, storageService);
        this.fileService = fileService;
        this.dialogService = dialogService;
    }
    async getContents(input, options, disposables) {
        const resource = input.resource;
        const error = options.error;
        const isFileNotFound = error?.fileOperationResult ===
            1 /* FileOperationResult.FILE_NOT_FOUND */;
        // Error Label
        let label;
        if (isFileNotFound) {
            label = localize('unavailableResourceErrorEditorText', 'The editor could not be opened because the file was not found.');
        }
        else if (isEditorOpenError(error) && error.forceMessage) {
            label = error.message;
        }
        else if (error) {
            label = localize('unknownErrorEditorTextWithError', 'The editor could not be opened due to an unexpected error. Please consult the log for more details.');
        }
        else {
            label = localize('unknownErrorEditorTextWithoutError', 'The editor could not be opened due to an unexpected error.');
        }
        // Error Icon
        let icon = '$(error)';
        if (isEditorOpenError(error)) {
            if (error.forceSeverity === Severity.Info) {
                icon = '$(info)';
            }
            else if (error.forceSeverity === Severity.Warning) {
                icon = '$(warning)';
            }
        }
        // Actions
        let actions = undefined;
        if (isEditorOpenError(error) && error.actions.length > 0) {
            actions = error.actions.map((action) => {
                return {
                    label: action.label,
                    run: () => {
                        const result = action.run();
                        if (result instanceof Promise) {
                            result.catch((error) => this.dialogService.error(toErrorMessage(error)));
                        }
                    },
                };
            });
        }
        else {
            actions = [
                {
                    label: localize('retry', 'Try Again'),
                    run: () => this.group.openEditor(input, {
                        ...options,
                        source: EditorOpenSource.USER /* explicit user gesture */,
                    }),
                },
            ];
        }
        // Auto-reload when file is added
        if (isFileNotFound && resource && this.fileService.hasProvider(resource)) {
            disposables.add(this.fileService.onDidFilesChange((e) => {
                if (e.contains(resource, 1 /* FileChangeType.ADDED */, 0 /* FileChangeType.UPDATED */)) {
                    this.group.openEditor(input, options);
                }
            }));
        }
        return { icon, label, actions: actions ?? [] };
    }
};
ErrorPlaceholderEditor = ErrorPlaceholderEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IFileService),
    __param(5, IDialogService)
], ErrorPlaceholderEditor);
export { ErrorPlaceholderEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGxhY2Vob2xkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yUGxhY2Vob2xkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEVBQXNCLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzVDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWpHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQWEsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFNUYsT0FBTyxFQUNOLGVBQWUsRUFFZixpQkFBaUIsR0FDakIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsaUNBQWlDLEVBQ2pDLHFCQUFxQixHQUNyQixN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