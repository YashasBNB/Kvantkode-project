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
var TrustedUriActionsColumnRenderer_1, TrustedUriPathColumnRenderer_1, TrustedUriHostColumnRenderer_1, WorkspaceTrustEditor_1;
import { $, addDisposableListener, addStandardDisposableListener, append, clearNode, EventHelper, EventType, isAncestorOfActiveElement, } from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { ButtonBar } from '../../../../base/browser/ui/button/button.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Action } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { debounce } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { normalizeDriveLetter } from '../../../../base/common/labels.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchTable } from '../../../../platform/list/browser/listService.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { isVirtualResource, isVirtualWorkspace, } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { asCssVariable, buttonBackground, buttonSecondaryBackground, editorErrorForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { IWorkspaceContextService, toWorkspaceIdentifier, } from '../../../../platform/workspace/common/workspace.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { debugIconStartForeground } from '../../debug/browser/debugColors.js';
import { IExtensionsWorkbenchService, LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID, } from '../../extensions/common/extensions.js';
import { APPLICATION_SCOPES, IWorkbenchConfigurationService, } from '../../../services/configuration/common/configuration.js';
import { IExtensionManifestPropertiesService } from '../../../services/extensions/common/extensionManifestPropertiesService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { getExtensionDependencies } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IWorkbenchExtensionEnablementService, } from '../../../services/extensionManagement/common/extensionManagement.js';
import { posix, win32 } from '../../../../base/common/path.js';
import { hasDriveLetter, toSlashes } from '../../../../base/common/extpath.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { defaultButtonStyles, defaultInputBoxStyles, } from '../../../../platform/theme/browser/defaultStyles.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { basename, dirname } from '../../../../base/common/resources.js';
export const shieldIcon = registerIcon('workspace-trust-banner', Codicon.shield, localize('shieldIcon', 'Icon for workspace trust ion the banner.'));
const checkListIcon = registerIcon('workspace-trust-editor-check', Codicon.check, localize('checkListIcon', 'Icon for the checkmark in the workspace trust editor.'));
const xListIcon = registerIcon('workspace-trust-editor-cross', Codicon.x, localize('xListIcon', 'Icon for the cross in the workspace trust editor.'));
const folderPickerIcon = registerIcon('workspace-trust-editor-folder-picker', Codicon.folder, localize('folderPickerIcon', 'Icon for the pick folder icon in the workspace trust editor.'));
const editIcon = registerIcon('workspace-trust-editor-edit-folder', Codicon.edit, localize('editIcon', 'Icon for the edit folder icon in the workspace trust editor.'));
const removeIcon = registerIcon('workspace-trust-editor-remove-folder', Codicon.close, localize('removeIcon', 'Icon for the remove folder icon in the workspace trust editor.'));
let WorkspaceTrustedUrisTable = class WorkspaceTrustedUrisTable extends Disposable {
    constructor(container, instantiationService, workspaceService, workspaceTrustManagementService, uriService, labelService, fileDialogService) {
        super();
        this.container = container;
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.uriService = uriService;
        this.labelService = labelService;
        this.fileDialogService = fileDialogService;
        this._onDidAcceptEdit = this._register(new Emitter());
        this.onDidAcceptEdit = this._onDidAcceptEdit.event;
        this._onDidRejectEdit = this._register(new Emitter());
        this.onDidRejectEdit = this._onDidRejectEdit.event;
        this._onEdit = this._register(new Emitter());
        this.onEdit = this._onEdit.event;
        this._onDelete = this._register(new Emitter());
        this.onDelete = this._onDelete.event;
        this.descriptionElement = container.appendChild($('.workspace-trusted-folders-description'));
        const tableElement = container.appendChild($('.trusted-uris-table'));
        const addButtonBarElement = container.appendChild($('.trusted-uris-button-bar'));
        this.table = this.instantiationService.createInstance(WorkbenchTable, 'WorkspaceTrust', tableElement, new TrustedUriTableVirtualDelegate(), [
            {
                label: localize('hostColumnLabel', 'Host'),
                tooltip: '',
                weight: 1,
                templateId: TrustedUriHostColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: localize('pathColumnLabel', 'Path'),
                tooltip: '',
                weight: 8,
                templateId: TrustedUriPathColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: '',
                tooltip: '',
                weight: 1,
                minimumWidth: 75,
                maximumWidth: 75,
                templateId: TrustedUriActionsColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
        ], [
            this.instantiationService.createInstance(TrustedUriHostColumnRenderer),
            this.instantiationService.createInstance(TrustedUriPathColumnRenderer, this),
            this.instantiationService.createInstance(TrustedUriActionsColumnRenderer, this, this.currentWorkspaceUri),
        ], {
            horizontalScrolling: false,
            alwaysConsumeMouseWheel: false,
            openOnSingleClick: false,
            multipleSelectionSupport: false,
            accessibilityProvider: {
                getAriaLabel: (item) => {
                    const hostLabel = getHostLabel(this.labelService, item);
                    if (hostLabel === undefined || hostLabel.length === 0) {
                        return localize('trustedFolderAriaLabel', '{0}, trusted', this.labelService.getUriLabel(item.uri));
                    }
                    return localize('trustedFolderWithHostAriaLabel', '{0} on {1}, trusted', this.labelService.getUriLabel(item.uri), hostLabel);
                },
                getWidgetAriaLabel: () => localize('trustedFoldersAndWorkspaces', 'Trusted Folders & Workspaces'),
            },
            identityProvider: {
                getId(element) {
                    return element.uri.toString();
                },
            },
        });
        this._register(this.table.onDidOpen((item) => {
            // default prevented when input box is double clicked #125052
            if (item && item.element && !item.browserEvent?.defaultPrevented) {
                this.edit(item.element, true);
            }
        }));
        const buttonBar = this._register(new ButtonBar(addButtonBarElement));
        const addButton = this._register(buttonBar.addButton({ title: localize('addButton', 'Add Folder'), ...defaultButtonStyles }));
        addButton.label = localize('addButton', 'Add Folder');
        this._register(addButton.onDidClick(async () => {
            const uri = await this.fileDialogService.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: this.currentWorkspaceUri,
                openLabel: localize('trustUri', 'Trust Folder'),
                title: localize('selectTrustedUri', 'Select Folder To Trust'),
            });
            if (uri) {
                this.workspaceTrustManagementService.setUrisTrust(uri, true);
            }
        }));
        this._register(this.workspaceTrustManagementService.onDidChangeTrustedFolders(() => {
            this.updateTable();
        }));
    }
    getIndexOfTrustedUriEntry(item) {
        const index = this.trustedUriEntries.indexOf(item);
        if (index === -1) {
            for (let i = 0; i < this.trustedUriEntries.length; i++) {
                if (this.trustedUriEntries[i].uri === item.uri) {
                    return i;
                }
            }
        }
        return index;
    }
    selectTrustedUriEntry(item, focus = true) {
        const index = this.getIndexOfTrustedUriEntry(item);
        if (index !== -1) {
            if (focus) {
                this.table.domFocus();
                this.table.setFocus([index]);
            }
            this.table.setSelection([index]);
        }
    }
    get currentWorkspaceUri() {
        return this.workspaceService.getWorkspace().folders[0]?.uri || URI.file('/');
    }
    get trustedUriEntries() {
        const currentWorkspace = this.workspaceService.getWorkspace();
        const currentWorkspaceUris = currentWorkspace.folders.map((folder) => folder.uri);
        if (currentWorkspace.configuration) {
            currentWorkspaceUris.push(currentWorkspace.configuration);
        }
        const entries = this.workspaceTrustManagementService.getTrustedUris().map((uri) => {
            let relatedToCurrentWorkspace = false;
            for (const workspaceUri of currentWorkspaceUris) {
                relatedToCurrentWorkspace =
                    relatedToCurrentWorkspace || this.uriService.extUri.isEqualOrParent(workspaceUri, uri);
            }
            return {
                uri,
                parentOfWorkspaceItem: relatedToCurrentWorkspace,
            };
        });
        // Sort entries
        const sortedEntries = entries.sort((a, b) => {
            if (a.uri.scheme !== b.uri.scheme) {
                if (a.uri.scheme === Schemas.file) {
                    return -1;
                }
                if (b.uri.scheme === Schemas.file) {
                    return 1;
                }
            }
            const aIsWorkspace = a.uri.path.endsWith('.code-workspace');
            const bIsWorkspace = b.uri.path.endsWith('.code-workspace');
            if (aIsWorkspace !== bIsWorkspace) {
                if (aIsWorkspace) {
                    return 1;
                }
                if (bIsWorkspace) {
                    return -1;
                }
            }
            return a.uri.fsPath.localeCompare(b.uri.fsPath);
        });
        return sortedEntries;
    }
    layout() {
        this.table.layout(this.trustedUriEntries.length * TrustedUriTableVirtualDelegate.ROW_HEIGHT +
            TrustedUriTableVirtualDelegate.HEADER_ROW_HEIGHT, undefined);
    }
    updateTable() {
        const entries = this.trustedUriEntries;
        this.container.classList.toggle('empty', entries.length === 0);
        this.descriptionElement.innerText = entries.length
            ? localize('trustedFoldersDescription', 'You trust the following folders, their subfolders, and workspace files.')
            : localize('noTrustedFoldersDescriptions', "You haven't trusted any folders or workspace files yet.");
        this.table.splice(0, Number.POSITIVE_INFINITY, this.trustedUriEntries);
        this.layout();
    }
    validateUri(path, item) {
        if (!item) {
            return null;
        }
        if (item.uri.scheme === 'vscode-vfs') {
            const segments = path.split(posix.sep).filter((s) => s.length);
            if (segments.length === 0 && path.startsWith(posix.sep)) {
                return {
                    type: 2 /* MessageType.WARNING */,
                    content: localize({
                        key: 'trustAll',
                        comment: ['The {0} will be a host name where repositories are hosted.'],
                    }, 'You will trust all repositories on {0}.', getHostLabel(this.labelService, item)),
                };
            }
            if (segments.length === 1) {
                return {
                    type: 2 /* MessageType.WARNING */,
                    content: localize({
                        key: 'trustOrg',
                        comment: [
                            'The {0} will be an organization or user name.',
                            'The {1} will be a host name where repositories are hosted.',
                        ],
                    }, "You will trust all repositories and forks under '{0}' on {1}.", segments[0], getHostLabel(this.labelService, item)),
                };
            }
            if (segments.length > 2) {
                return {
                    type: 3 /* MessageType.ERROR */,
                    content: localize('invalidTrust', 'You cannot trust individual folders within a repository.', path),
                };
            }
        }
        return null;
    }
    acceptEdit(item, uri) {
        const trustedFolders = this.workspaceTrustManagementService.getTrustedUris();
        const index = trustedFolders.findIndex((u) => this.uriService.extUri.isEqual(u, item.uri));
        if (index >= trustedFolders.length || index === -1) {
            trustedFolders.push(uri);
        }
        else {
            trustedFolders[index] = uri;
        }
        this.workspaceTrustManagementService.setTrustedUris(trustedFolders);
        this._onDidAcceptEdit.fire(item);
    }
    rejectEdit(item) {
        this._onDidRejectEdit.fire(item);
    }
    async delete(item) {
        this.table.focusNext();
        await this.workspaceTrustManagementService.setUrisTrust([item.uri], false);
        if (this.table.getFocus().length === 0) {
            this.table.focusLast();
        }
        this._onDelete.fire(item);
        this.table.domFocus();
    }
    async edit(item, usePickerIfPossible) {
        const canUseOpenDialog = item.uri.scheme === Schemas.file ||
            (item.uri.scheme === this.currentWorkspaceUri.scheme &&
                this.uriService.extUri.isEqualAuthority(this.currentWorkspaceUri.authority, item.uri.authority) &&
                !isVirtualResource(item.uri));
        if (canUseOpenDialog && usePickerIfPossible) {
            const uri = await this.fileDialogService.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: item.uri,
                openLabel: localize('trustUri', 'Trust Folder'),
                title: localize('selectTrustedUri', 'Select Folder To Trust'),
            });
            if (uri) {
                this.acceptEdit(item, uri[0]);
            }
            else {
                this.rejectEdit(item);
            }
        }
        else {
            this.selectTrustedUriEntry(item);
            this._onEdit.fire(item);
        }
    }
};
WorkspaceTrustedUrisTable = __decorate([
    __param(1, IInstantiationService),
    __param(2, IWorkspaceContextService),
    __param(3, IWorkspaceTrustManagementService),
    __param(4, IUriIdentityService),
    __param(5, ILabelService),
    __param(6, IFileDialogService)
], WorkspaceTrustedUrisTable);
class TrustedUriTableVirtualDelegate {
    constructor() {
        this.headerRowHeight = TrustedUriTableVirtualDelegate.HEADER_ROW_HEIGHT;
    }
    static { this.HEADER_ROW_HEIGHT = 30; }
    static { this.ROW_HEIGHT = 24; }
    getHeight(item) {
        return TrustedUriTableVirtualDelegate.ROW_HEIGHT;
    }
}
let TrustedUriActionsColumnRenderer = class TrustedUriActionsColumnRenderer {
    static { TrustedUriActionsColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'actions'; }
    constructor(table, currentWorkspaceUri, uriService) {
        this.table = table;
        this.currentWorkspaceUri = currentWorkspaceUri;
        this.uriService = uriService;
        this.templateId = TrustedUriActionsColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const element = container.appendChild($('.actions'));
        const actionBar = new ActionBar(element);
        return { actionBar };
    }
    renderElement(item, index, templateData, height) {
        templateData.actionBar.clear();
        const canUseOpenDialog = item.uri.scheme === Schemas.file ||
            (item.uri.scheme === this.currentWorkspaceUri.scheme &&
                this.uriService.extUri.isEqualAuthority(this.currentWorkspaceUri.authority, item.uri.authority) &&
                !isVirtualResource(item.uri));
        const actions = [];
        if (canUseOpenDialog) {
            actions.push(this.createPickerAction(item));
        }
        actions.push(this.createEditAction(item));
        actions.push(this.createDeleteAction(item));
        templateData.actionBar.push(actions, { icon: true });
    }
    createEditAction(item) {
        return {
            label: '',
            class: ThemeIcon.asClassName(editIcon),
            enabled: true,
            id: 'editTrustedUri',
            tooltip: localize('editTrustedUri', 'Edit Path'),
            run: () => {
                this.table.edit(item, false);
            },
        };
    }
    createPickerAction(item) {
        return {
            label: '',
            class: ThemeIcon.asClassName(folderPickerIcon),
            enabled: true,
            id: 'pickerTrustedUri',
            tooltip: localize('pickerTrustedUri', 'Open File Picker'),
            run: () => {
                this.table.edit(item, true);
            },
        };
    }
    createDeleteAction(item) {
        return {
            label: '',
            class: ThemeIcon.asClassName(removeIcon),
            enabled: true,
            id: 'deleteTrustedUri',
            tooltip: localize('deleteTrustedUri', 'Delete Path'),
            run: async () => {
                await this.table.delete(item);
            },
        };
    }
    disposeTemplate(templateData) {
        templateData.actionBar.dispose();
    }
};
TrustedUriActionsColumnRenderer = TrustedUriActionsColumnRenderer_1 = __decorate([
    __param(2, IUriIdentityService)
], TrustedUriActionsColumnRenderer);
let TrustedUriPathColumnRenderer = class TrustedUriPathColumnRenderer {
    static { TrustedUriPathColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'path'; }
    constructor(table, contextViewService) {
        this.table = table;
        this.contextViewService = contextViewService;
        this.templateId = TrustedUriPathColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const element = container.appendChild($('.path'));
        const pathLabel = element.appendChild($('div.path-label'));
        const pathInput = new InputBox(element, this.contextViewService, {
            validationOptions: {
                validation: (value) => this.table.validateUri(value, this.currentItem),
            },
            inputBoxStyles: defaultInputBoxStyles,
        });
        const disposables = new DisposableStore();
        const renderDisposables = disposables.add(new DisposableStore());
        return {
            element,
            pathLabel,
            pathInput,
            disposables,
            renderDisposables,
        };
    }
    renderElement(item, index, templateData, height) {
        templateData.renderDisposables.clear();
        this.currentItem = item;
        templateData.renderDisposables.add(this.table.onEdit(async (e) => {
            if (item === e) {
                templateData.element.classList.add('input-mode');
                templateData.pathInput.focus();
                templateData.pathInput.select();
                templateData.element.parentElement.style.paddingLeft = '0px';
            }
        }));
        // stop double click action from re-rendering the element on the table #125052
        templateData.renderDisposables.add(addDisposableListener(templateData.pathInput.element, EventType.DBLCLICK, (e) => {
            EventHelper.stop(e);
        }));
        const hideInputBox = () => {
            templateData.element.classList.remove('input-mode');
            templateData.element.parentElement.style.paddingLeft = '5px';
        };
        const accept = () => {
            hideInputBox();
            const pathToUse = templateData.pathInput.value;
            const uri = hasDriveLetter(pathToUse)
                ? item.uri.with({ path: posix.sep + toSlashes(pathToUse) })
                : item.uri.with({ path: pathToUse });
            templateData.pathLabel.innerText = this.formatPath(uri);
            if (uri) {
                this.table.acceptEdit(item, uri);
            }
        };
        const reject = () => {
            hideInputBox();
            templateData.pathInput.value = stringValue;
            this.table.rejectEdit(item);
        };
        templateData.renderDisposables.add(addStandardDisposableListener(templateData.pathInput.inputElement, EventType.KEY_DOWN, (e) => {
            let handled = false;
            if (e.equals(3 /* KeyCode.Enter */)) {
                accept();
                handled = true;
            }
            else if (e.equals(9 /* KeyCode.Escape */)) {
                reject();
                handled = true;
            }
            if (handled) {
                e.preventDefault();
                e.stopPropagation();
            }
        }));
        templateData.renderDisposables.add(addDisposableListener(templateData.pathInput.inputElement, EventType.BLUR, () => {
            reject();
        }));
        const stringValue = this.formatPath(item.uri);
        templateData.pathInput.value = stringValue;
        templateData.pathLabel.innerText = stringValue;
        templateData.element.classList.toggle('current-workspace-parent', item.parentOfWorkspaceItem);
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
        templateData.renderDisposables.dispose();
    }
    formatPath(uri) {
        if (uri.scheme === Schemas.file) {
            return normalizeDriveLetter(uri.fsPath);
        }
        // If the path is not a file uri, but points to a windows remote, we should create windows fs path
        // e.g. /c:/user/directory => C:\user\directory
        if (uri.path.startsWith(posix.sep)) {
            const pathWithoutLeadingSeparator = uri.path.substring(1);
            const isWindowsPath = hasDriveLetter(pathWithoutLeadingSeparator, true);
            if (isWindowsPath) {
                return normalizeDriveLetter(win32.normalize(pathWithoutLeadingSeparator), true);
            }
        }
        return uri.path;
    }
};
TrustedUriPathColumnRenderer = TrustedUriPathColumnRenderer_1 = __decorate([
    __param(1, IContextViewService)
], TrustedUriPathColumnRenderer);
function getHostLabel(labelService, item) {
    return item.uri.authority
        ? labelService.getHostLabel(item.uri.scheme, item.uri.authority)
        : localize('localAuthority', 'Local');
}
let TrustedUriHostColumnRenderer = class TrustedUriHostColumnRenderer {
    static { TrustedUriHostColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'host'; }
    constructor(labelService) {
        this.labelService = labelService;
        this.templateId = TrustedUriHostColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const renderDisposables = disposables.add(new DisposableStore());
        const element = container.appendChild($('.host'));
        const hostContainer = element.appendChild($('div.host-label'));
        const buttonBarContainer = element.appendChild($('div.button-bar'));
        return {
            element,
            hostContainer,
            buttonBarContainer,
            disposables,
            renderDisposables,
        };
    }
    renderElement(item, index, templateData, height) {
        templateData.renderDisposables.clear();
        templateData.renderDisposables.add({
            dispose: () => {
                clearNode(templateData.buttonBarContainer);
            },
        });
        templateData.hostContainer.innerText = getHostLabel(this.labelService, item);
        templateData.element.classList.toggle('current-workspace-parent', item.parentOfWorkspaceItem);
        templateData.hostContainer.style.display = '';
        templateData.buttonBarContainer.style.display = 'none';
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
TrustedUriHostColumnRenderer = TrustedUriHostColumnRenderer_1 = __decorate([
    __param(0, ILabelService)
], TrustedUriHostColumnRenderer);
let WorkspaceTrustEditor = class WorkspaceTrustEditor extends EditorPane {
    static { WorkspaceTrustEditor_1 = this; }
    static { this.ID = 'workbench.editor.workspaceTrust'; }
    constructor(group, telemetryService, themeService, storageService, workspaceService, extensionWorkbenchService, extensionManifestPropertiesService, instantiationService, workspaceTrustManagementService, configurationService, extensionEnablementService, productService, keybindingService) {
        super(WorkspaceTrustEditor_1.ID, group, telemetryService, themeService, storageService);
        this.workspaceService = workspaceService;
        this.extensionWorkbenchService = extensionWorkbenchService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.instantiationService = instantiationService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.configurationService = configurationService;
        this.extensionEnablementService = extensionEnablementService;
        this.productService = productService;
        this.keybindingService = keybindingService;
        this.rendering = false;
        this.rerenderDisposables = this._register(new DisposableStore());
        this.layoutParticipants = [];
    }
    createEditor(parent) {
        this.rootElement = append(parent, $('.workspace-trust-editor', { tabindex: '0' }));
        this.createHeaderElement(this.rootElement);
        const scrollableContent = $('.workspace-trust-editor-body');
        this.bodyScrollBar = this._register(new DomScrollableElement(scrollableContent, {
            horizontal: 2 /* ScrollbarVisibility.Hidden */,
            vertical: 1 /* ScrollbarVisibility.Auto */,
        }));
        append(this.rootElement, this.bodyScrollBar.getDomNode());
        this.createAffectedFeaturesElement(scrollableContent);
        this.createConfigurationElement(scrollableContent);
        this.rootElement.style.setProperty('--workspace-trust-selected-color', asCssVariable(buttonBackground));
        this.rootElement.style.setProperty('--workspace-trust-unselected-color', asCssVariable(buttonSecondaryBackground));
        this.rootElement.style.setProperty('--workspace-trust-check-color', asCssVariable(debugIconStartForeground));
        this.rootElement.style.setProperty('--workspace-trust-x-color', asCssVariable(editorErrorForeground));
        // Navigate page with keyboard
        this._register(addDisposableListener(this.rootElement, EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(16 /* KeyCode.UpArrow */) || event.equals(18 /* KeyCode.DownArrow */)) {
                const navOrder = [
                    this.headerContainer,
                    this.trustedContainer,
                    this.untrustedContainer,
                    this.configurationContainer,
                ];
                const currentIndex = navOrder.findIndex((element) => {
                    return isAncestorOfActiveElement(element);
                });
                let newIndex = currentIndex;
                if (event.equals(18 /* KeyCode.DownArrow */)) {
                    newIndex++;
                }
                else if (event.equals(16 /* KeyCode.UpArrow */)) {
                    newIndex = Math.max(0, newIndex);
                    newIndex--;
                }
                newIndex += navOrder.length;
                newIndex %= navOrder.length;
                navOrder[newIndex].focus();
            }
            else if (event.equals(9 /* KeyCode.Escape */)) {
                this.rootElement.focus();
            }
            else if (event.equals(2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */)) {
                if (this.workspaceTrustManagementService.canSetWorkspaceTrust()) {
                    this.workspaceTrustManagementService.setWorkspaceTrust(!this.workspaceTrustManagementService.isWorkspaceTrusted());
                }
            }
            else if (event.equals(2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */)) {
                if (this.workspaceTrustManagementService.canSetParentFolderTrust()) {
                    this.workspaceTrustManagementService.setParentFolderTrust(true);
                }
            }
        }));
    }
    focus() {
        super.focus();
        this.rootElement.focus();
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        if (token.isCancellationRequested) {
            return;
        }
        await this.workspaceTrustManagementService.workspaceTrustInitialized;
        this.registerListeners();
        await this.render();
    }
    registerListeners() {
        this._register(this.extensionWorkbenchService.onChange(() => this.render()));
        this._register(this.configurationService.onDidChangeRestrictedSettings(() => this.render()));
        this._register(this.workspaceTrustManagementService.onDidChangeTrust(() => this.render()));
        this._register(this.workspaceTrustManagementService.onDidChangeTrustedFolders(() => this.render()));
    }
    getHeaderContainerClass(trusted) {
        if (trusted) {
            return 'workspace-trust-header workspace-trust-trusted';
        }
        return 'workspace-trust-header workspace-trust-untrusted';
    }
    getHeaderTitleText(trusted) {
        if (trusted) {
            if (this.workspaceTrustManagementService.isWorkspaceTrustForced()) {
                return localize('trustedUnsettableWindow', 'This window is trusted');
            }
            switch (this.workspaceService.getWorkbenchState()) {
                case 1 /* WorkbenchState.EMPTY */:
                    return localize('trustedHeaderWindow', 'You trust this window');
                case 2 /* WorkbenchState.FOLDER */:
                    return localize('trustedHeaderFolder', 'You trust this folder');
                case 3 /* WorkbenchState.WORKSPACE */:
                    return localize('trustedHeaderWorkspace', 'You trust this workspace');
            }
        }
        return localize('untrustedHeader', 'You are in Restricted Mode');
    }
    getHeaderTitleIconClassNames(trusted) {
        return ThemeIcon.asClassNameArray(shieldIcon);
    }
    getFeaturesHeaderText(trusted) {
        let title = '';
        let subTitle = '';
        switch (this.workspaceService.getWorkbenchState()) {
            case 1 /* WorkbenchState.EMPTY */: {
                title = trusted
                    ? localize('trustedWindow', 'In a Trusted Window')
                    : localize('untrustedWorkspace', 'In Restricted Mode');
                subTitle = trusted
                    ? localize('trustedWindowSubtitle', 'You trust the authors of the files in the current window. All features are enabled:')
                    : localize('untrustedWindowSubtitle', 'You do not trust the authors of the files in the current window. The following features are disabled:');
                break;
            }
            case 2 /* WorkbenchState.FOLDER */: {
                title = trusted
                    ? localize('trustedFolder', 'In a Trusted Folder')
                    : localize('untrustedWorkspace', 'In Restricted Mode');
                subTitle = trusted
                    ? localize('trustedFolderSubtitle', 'You trust the authors of the files in the current folder. All features are enabled:')
                    : localize('untrustedFolderSubtitle', 'You do not trust the authors of the files in the current folder. The following features are disabled:');
                break;
            }
            case 3 /* WorkbenchState.WORKSPACE */: {
                title = trusted
                    ? localize('trustedWorkspace', 'In a Trusted Workspace')
                    : localize('untrustedWorkspace', 'In Restricted Mode');
                subTitle = trusted
                    ? localize('trustedWorkspaceSubtitle', 'You trust the authors of the files in the current workspace. All features are enabled:')
                    : localize('untrustedWorkspaceSubtitle', 'You do not trust the authors of the files in the current workspace. The following features are disabled:');
                break;
            }
        }
        return [title, subTitle];
    }
    async render() {
        if (this.rendering) {
            return;
        }
        this.rendering = true;
        this.rerenderDisposables.clear();
        const isWorkspaceTrusted = this.workspaceTrustManagementService.isWorkspaceTrusted();
        this.rootElement.classList.toggle('trusted', isWorkspaceTrusted);
        this.rootElement.classList.toggle('untrusted', !isWorkspaceTrusted);
        // Header Section
        this.headerTitleText.innerText = this.getHeaderTitleText(isWorkspaceTrusted);
        this.headerTitleIcon.className = 'workspace-trust-title-icon';
        this.headerTitleIcon.classList.add(...this.getHeaderTitleIconClassNames(isWorkspaceTrusted));
        this.headerDescription.innerText = '';
        const headerDescriptionText = append(this.headerDescription, $('div'));
        headerDescriptionText.innerText = isWorkspaceTrusted
            ? localize('trustedDescription', 'All features are enabled because trust has been granted to the workspace.')
            : localize('untrustedDescription', '{0} is in a restricted mode intended for safe code browsing.', this.productService.nameShort);
        const headerDescriptionActions = append(this.headerDescription, $('div'));
        const headerDescriptionActionsText = localize({
            key: 'workspaceTrustEditorHeaderActions',
            comment: [
                'Please ensure the markdown link syntax is not broken up with whitespace [text block](link block)',
            ],
        }, '[Configure your settings]({0}) or [learn more](https://aka.ms/vscode-workspace-trust).', `command:workbench.trust.configure`);
        for (const node of parseLinkedText(headerDescriptionActionsText).nodes) {
            if (typeof node === 'string') {
                append(headerDescriptionActions, document.createTextNode(node));
            }
            else {
                this.rerenderDisposables.add(this.instantiationService.createInstance(Link, headerDescriptionActions, { ...node, tabIndex: -1 }, {}));
            }
        }
        this.headerContainer.className = this.getHeaderContainerClass(isWorkspaceTrusted);
        this.rootElement.setAttribute('aria-label', `${localize('root element label', 'Manage Workspace Trust')}:  ${this.headerContainer.innerText}`);
        // Settings
        const restrictedSettings = this.configurationService.restrictedSettings;
        const configurationRegistry = Registry.as(Extensions.Configuration);
        const settingsRequiringTrustedWorkspaceCount = restrictedSettings.default.filter((key) => {
            const property = configurationRegistry.getConfigurationProperties()[key];
            // cannot be configured in workspace
            if (property.scope &&
                (APPLICATION_SCOPES.includes(property.scope) ||
                    property.scope === 2 /* ConfigurationScope.MACHINE */)) {
                return false;
            }
            // If deprecated include only those configured in the workspace
            if (property.deprecationMessage || property.markdownDeprecationMessage) {
                if (restrictedSettings.workspace?.includes(key)) {
                    return true;
                }
                if (restrictedSettings.workspaceFolder) {
                    for (const workspaceFolderSettings of restrictedSettings.workspaceFolder.values()) {
                        if (workspaceFolderSettings.includes(key)) {
                            return true;
                        }
                    }
                }
                return false;
            }
            return true;
        }).length;
        // Features List
        this.renderAffectedFeatures(settingsRequiringTrustedWorkspaceCount, this.getExtensionCount());
        // Configuration Tree
        this.workspaceTrustedUrisTable.updateTable();
        this.bodyScrollBar.getDomNode().style.height = `calc(100% - ${this.headerContainer.clientHeight}px)`;
        this.bodyScrollBar.scanDomNode();
        this.rendering = false;
    }
    getExtensionCount() {
        const set = new Set();
        const inVirtualWorkspace = isVirtualWorkspace(this.workspaceService.getWorkspace());
        const localExtensions = this.extensionWorkbenchService.local
            .filter((ext) => ext.local)
            .map((ext) => ext.local);
        for (const extension of localExtensions) {
            const enablementState = this.extensionEnablementService.getEnablementState(extension);
            if (enablementState !== 11 /* EnablementState.EnabledGlobally */ &&
                enablementState !== 12 /* EnablementState.EnabledWorkspace */ &&
                enablementState !== 0 /* EnablementState.DisabledByTrustRequirement */ &&
                enablementState !== 8 /* EnablementState.DisabledByExtensionDependency */) {
                continue;
            }
            if (inVirtualWorkspace &&
                this.extensionManifestPropertiesService.getExtensionVirtualWorkspaceSupportType(extension.manifest) === false) {
                continue;
            }
            if (this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(extension.manifest) !== true) {
                set.add(extension.identifier.id);
                continue;
            }
            const dependencies = getExtensionDependencies(localExtensions, extension);
            if (dependencies.some((ext) => this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(ext.manifest) === false)) {
                set.add(extension.identifier.id);
            }
        }
        return set.size;
    }
    createHeaderElement(parent) {
        this.headerContainer = append(parent, $('.workspace-trust-header', { tabIndex: '0' }));
        this.headerTitleContainer = append(this.headerContainer, $('.workspace-trust-title'));
        this.headerTitleIcon = append(this.headerTitleContainer, $('.workspace-trust-title-icon'));
        this.headerTitleText = append(this.headerTitleContainer, $('.workspace-trust-title-text'));
        this.headerDescription = append(this.headerContainer, $('.workspace-trust-description'));
    }
    createConfigurationElement(parent) {
        this.configurationContainer = append(parent, $('.workspace-trust-settings', { tabIndex: '0' }));
        const configurationTitle = append(this.configurationContainer, $('.workspace-trusted-folders-title'));
        configurationTitle.innerText = localize('trustedFoldersAndWorkspaces', 'Trusted Folders & Workspaces');
        this.workspaceTrustedUrisTable = this._register(this.instantiationService.createInstance(WorkspaceTrustedUrisTable, this.configurationContainer));
    }
    createAffectedFeaturesElement(parent) {
        this.affectedFeaturesContainer = append(parent, $('.workspace-trust-features'));
        this.trustedContainer = append(this.affectedFeaturesContainer, $('.workspace-trust-limitations.trusted', { tabIndex: '0' }));
        this.untrustedContainer = append(this.affectedFeaturesContainer, $('.workspace-trust-limitations.untrusted', { tabIndex: '0' }));
    }
    async renderAffectedFeatures(numSettings, numExtensions) {
        clearNode(this.trustedContainer);
        clearNode(this.untrustedContainer);
        // Trusted features
        const [trustedTitle, trustedSubTitle] = this.getFeaturesHeaderText(true);
        this.renderLimitationsHeaderElement(this.trustedContainer, trustedTitle, trustedSubTitle);
        const trustedContainerItems = this.workspaceService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */
            ? [
                localize('trustedTasks', 'Tasks are allowed to run'),
                localize('trustedDebugging', 'Debugging is enabled'),
                localize('trustedExtensions', 'All enabled extensions are activated'),
            ]
            : [
                localize('trustedTasks', 'Tasks are allowed to run'),
                localize('trustedDebugging', 'Debugging is enabled'),
                localize('trustedSettings', 'All workspace settings are applied'),
                localize('trustedExtensions', 'All enabled extensions are activated'),
            ];
        this.renderLimitationsListElement(this.trustedContainer, trustedContainerItems, ThemeIcon.asClassNameArray(checkListIcon));
        // Restricted Mode features
        const [untrustedTitle, untrustedSubTitle] = this.getFeaturesHeaderText(false);
        this.renderLimitationsHeaderElement(this.untrustedContainer, untrustedTitle, untrustedSubTitle);
        const untrustedContainerItems = this.workspaceService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */
            ? [
                localize('untrustedTasks', 'Tasks are not allowed to run'),
                localize('untrustedDebugging', 'Debugging is disabled'),
                fixBadLocalizedLinks(localize({
                    key: 'untrustedExtensions',
                    comment: [
                        'Please ensure the markdown link syntax is not broken up with whitespace [text block](link block)',
                    ],
                }, '[{0} extensions]({1}) are disabled or have limited functionality', numExtensions, `command:${LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID}`)),
            ]
            : [
                localize('untrustedTasks', 'Tasks are not allowed to run'),
                localize('untrustedDebugging', 'Debugging is disabled'),
                fixBadLocalizedLinks(numSettings
                    ? localize({
                        key: 'untrustedSettings',
                        comment: [
                            'Please ensure the markdown link syntax is not broken up with whitespace [text block](link block)',
                        ],
                    }, '[{0} workspace settings]({1}) are not applied', numSettings, 'command:settings.filterUntrusted')
                    : localize('no untrustedSettings', 'Workspace settings requiring trust are not applied')),
                fixBadLocalizedLinks(localize({
                    key: 'untrustedExtensions',
                    comment: [
                        'Please ensure the markdown link syntax is not broken up with whitespace [text block](link block)',
                    ],
                }, '[{0} extensions]({1}) are disabled or have limited functionality', numExtensions, `command:${LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID}`)),
            ];
        this.renderLimitationsListElement(this.untrustedContainer, untrustedContainerItems, ThemeIcon.asClassNameArray(xListIcon));
        if (this.workspaceTrustManagementService.isWorkspaceTrusted()) {
            if (this.workspaceTrustManagementService.canSetWorkspaceTrust()) {
                this.addDontTrustButtonToElement(this.untrustedContainer);
            }
            else {
                this.addTrustedTextToElement(this.untrustedContainer);
            }
        }
        else {
            if (this.workspaceTrustManagementService.canSetWorkspaceTrust()) {
                this.addTrustButtonToElement(this.trustedContainer);
            }
        }
    }
    createButtonRow(parent, buttonInfo, enabled) {
        const buttonRow = append(parent, $('.workspace-trust-buttons-row'));
        const buttonContainer = append(buttonRow, $('.workspace-trust-buttons'));
        const buttonBar = this.rerenderDisposables.add(new ButtonBar(buttonContainer));
        for (const { action, keybinding } of buttonInfo) {
            const button = buttonBar.addButtonWithDescription(defaultButtonStyles);
            button.label = action.label;
            button.enabled = enabled !== undefined ? enabled : action.enabled;
            button.description = keybinding.getLabel();
            button.element.ariaLabel =
                action.label +
                    ', ' +
                    localize('keyboardShortcut', 'Keyboard Shortcut: {0}', keybinding.getAriaLabel());
            this.rerenderDisposables.add(button.onDidClick((e) => {
                if (e) {
                    EventHelper.stop(e, true);
                }
                action.run();
            }));
        }
    }
    addTrustButtonToElement(parent) {
        const trustAction = this.rerenderDisposables.add(new Action('workspace.trust.button.action.grant', localize('trustButton', 'Trust'), undefined, true, async () => {
            await this.workspaceTrustManagementService.setWorkspaceTrust(true);
        }));
        const trustActions = [
            {
                action: trustAction,
                keybinding: this.keybindingService.resolveUserBinding(isMacintosh ? 'Cmd+Enter' : 'Ctrl+Enter')[0],
            },
        ];
        if (this.workspaceTrustManagementService.canSetParentFolderTrust()) {
            const workspaceIdentifier = toWorkspaceIdentifier(this.workspaceService.getWorkspace());
            const name = basename(dirname(workspaceIdentifier.uri));
            const trustMessageElement = append(parent, $('.trust-message-box'));
            trustMessageElement.innerText = localize('trustMessage', "Trust the authors of all files in the current folder or its parent '{0}'.", name);
            const trustParentAction = this.rerenderDisposables.add(new Action('workspace.trust.button.action.grantParent', localize('trustParentButton', 'Trust Parent'), undefined, true, async () => {
                await this.workspaceTrustManagementService.setParentFolderTrust(true);
            }));
            trustActions.push({
                action: trustParentAction,
                keybinding: this.keybindingService.resolveUserBinding(isMacintosh ? 'Cmd+Shift+Enter' : 'Ctrl+Shift+Enter')[0],
            });
        }
        this.createButtonRow(parent, trustActions);
    }
    addDontTrustButtonToElement(parent) {
        this.createButtonRow(parent, [
            {
                action: this.rerenderDisposables.add(new Action('workspace.trust.button.action.deny', localize('dontTrustButton', "Don't Trust"), undefined, true, async () => {
                    await this.workspaceTrustManagementService.setWorkspaceTrust(false);
                })),
                keybinding: this.keybindingService.resolveUserBinding(isMacintosh ? 'Cmd+Enter' : 'Ctrl+Enter')[0],
            },
        ]);
    }
    addTrustedTextToElement(parent) {
        if (this.workspaceService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */) {
            return;
        }
        const textElement = append(parent, $('.workspace-trust-untrusted-description'));
        if (!this.workspaceTrustManagementService.isWorkspaceTrustForced()) {
            textElement.innerText =
                this.workspaceService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */
                    ? localize('untrustedWorkspaceReason', 'This workspace is trusted via the bolded entries in the trusted folders below.')
                    : localize('untrustedFolderReason', 'This folder is trusted via the bolded entries in the trusted folders below.');
        }
        else {
            textElement.innerText = localize('trustedForcedReason', 'This window is trusted by nature of the workspace that is opened.');
        }
    }
    renderLimitationsHeaderElement(parent, headerText, subtitleText) {
        const limitationsHeaderContainer = append(parent, $('.workspace-trust-limitations-header'));
        const titleElement = append(limitationsHeaderContainer, $('.workspace-trust-limitations-title'));
        const textElement = append(titleElement, $('.workspace-trust-limitations-title-text'));
        const subtitleElement = append(limitationsHeaderContainer, $('.workspace-trust-limitations-subtitle'));
        textElement.innerText = headerText;
        subtitleElement.innerText = subtitleText;
    }
    renderLimitationsListElement(parent, limitations, iconClassNames) {
        const listContainer = append(parent, $('.workspace-trust-limitations-list-container'));
        const limitationsList = append(listContainer, $('ul'));
        for (const limitation of limitations) {
            const limitationListItem = append(limitationsList, $('li'));
            const icon = append(limitationListItem, $('.list-item-icon'));
            const text = append(limitationListItem, $('.list-item-text'));
            icon.classList.add(...iconClassNames);
            const linkedText = parseLinkedText(limitation);
            for (const node of linkedText.nodes) {
                if (typeof node === 'string') {
                    append(text, document.createTextNode(node));
                }
                else {
                    this.rerenderDisposables.add(this.instantiationService.createInstance(Link, text, { ...node, tabIndex: -1 }, {}));
                }
            }
        }
    }
    layout(dimension) {
        if (!this.isVisible()) {
            return;
        }
        this.workspaceTrustedUrisTable.layout();
        this.layoutParticipants.forEach((participant) => {
            participant.layout();
        });
        this.bodyScrollBar.scanDomNode();
    }
};
__decorate([
    debounce(100)
], WorkspaceTrustEditor.prototype, "render", null);
WorkspaceTrustEditor = WorkspaceTrustEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IWorkspaceContextService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IExtensionManifestPropertiesService),
    __param(7, IInstantiationService),
    __param(8, IWorkspaceTrustManagementService),
    __param(9, IWorkbenchConfigurationService),
    __param(10, IWorkbenchExtensionEnablementService),
    __param(11, IProductService),
    __param(12, IKeybindingService)
], WorkspaceTrustEditor);
export { WorkspaceTrustEditor };
// Highly scoped fix for #126614
function fixBadLocalizedLinks(badString) {
    const regex = /(.*)\[(.+)\]\s*\((.+)\)(.*)/; // markdown link match with spaces
    return badString.replace(regex, '$1[$2]($3)$4');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVHJ1c3RFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93b3Jrc3BhY2UvYnJvd3Nlci93b3Jrc3BhY2VUcnVzdEVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLENBQUMsRUFDRCxxQkFBcUIsRUFDckIsNkJBQTZCLEVBQzdCLE1BQU0sRUFDTixTQUFTLEVBRVQsV0FBVyxFQUNYLFNBQVMsRUFDVCx5QkFBeUIsR0FDekIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3hFLE9BQU8sRUFBWSxRQUFRLEVBQWUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVqRyxPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sb0NBQW9DLENBQUE7QUFFcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFFakUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLFVBQVUsR0FFVixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLGtCQUFrQixHQUNsQixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQ04sYUFBYSxFQUNiLGdCQUFnQixFQUNoQix5QkFBeUIsRUFDekIscUJBQXFCLEdBQ3JCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUVOLHdCQUF3QixFQUN4QixxQkFBcUIsR0FFckIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzFHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLGdEQUFnRCxHQUNoRCxNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsOEJBQThCLEdBQzlCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sMkVBQTJFLENBQUE7QUFDL0gsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFHNUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDckgsT0FBTyxFQUVOLG9DQUFvQyxHQUNwQyxNQUFNLHFFQUFxRSxDQUFBO0FBQzVFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2hGLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIscUJBQXFCLEdBQ3JCLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXpGLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHeEUsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FDckMsd0JBQXdCLEVBQ3hCLE9BQU8sQ0FBQyxNQUFNLEVBQ2QsUUFBUSxDQUFDLFlBQVksRUFBRSwwQ0FBMEMsQ0FBQyxDQUNsRSxDQUFBO0FBRUQsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUNqQyw4QkFBOEIsRUFDOUIsT0FBTyxDQUFDLEtBQUssRUFDYixRQUFRLENBQUMsZUFBZSxFQUFFLHVEQUF1RCxDQUFDLENBQ2xGLENBQUE7QUFDRCxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQzdCLDhCQUE4QixFQUM5QixPQUFPLENBQUMsQ0FBQyxFQUNULFFBQVEsQ0FBQyxXQUFXLEVBQUUsbURBQW1ELENBQUMsQ0FDMUUsQ0FBQTtBQUNELE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUNwQyxzQ0FBc0MsRUFDdEMsT0FBTyxDQUFDLE1BQU0sRUFDZCxRQUFRLENBQUMsa0JBQWtCLEVBQUUsOERBQThELENBQUMsQ0FDNUYsQ0FBQTtBQUNELE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FDNUIsb0NBQW9DLEVBQ3BDLE9BQU8sQ0FBQyxJQUFJLEVBQ1osUUFBUSxDQUFDLFVBQVUsRUFBRSw4REFBOEQsQ0FBQyxDQUNwRixDQUFBO0FBQ0QsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUM5QixzQ0FBc0MsRUFDdEMsT0FBTyxDQUFDLEtBQUssRUFDYixRQUFRLENBQUMsWUFBWSxFQUFFLGdFQUFnRSxDQUFDLENBQ3hGLENBQUE7QUFPRCxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFVBQVU7SUFxQmpELFlBQ2tCLFNBQXNCLEVBQ2hCLG9CQUE0RCxFQUN6RCxnQkFBMkQsRUFFckYsK0JBQWtGLEVBQzdELFVBQWdELEVBQ3RELFlBQTRDLEVBQ3ZDLGlCQUFzRDtRQUUxRSxLQUFLLEVBQUUsQ0FBQTtRQVRVLGNBQVMsR0FBVCxTQUFTLENBQWE7UUFDQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ3hDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBMEI7UUFFcEUsb0NBQStCLEdBQS9CLCtCQUErQixDQUFrQztRQUM1QyxlQUFVLEdBQVYsVUFBVSxDQUFxQjtRQUNyQyxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUN0QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBNUIxRCxxQkFBZ0IsR0FBNkIsSUFBSSxDQUFDLFNBQVMsQ0FDM0UsSUFBSSxPQUFPLEVBQW1CLENBQzlCLENBQUE7UUFDUSxvQkFBZSxHQUEyQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFBO1FBRTdELHFCQUFnQixHQUE2QixJQUFJLENBQUMsU0FBUyxDQUMzRSxJQUFJLE9BQU8sRUFBbUIsQ0FDOUIsQ0FBQTtRQUNRLG9CQUFlLEdBQTJCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUE7UUFFdEUsWUFBTyxHQUE2QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFtQixDQUFDLENBQUE7UUFDakYsV0FBTSxHQUEyQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQTtRQUVwRCxjQUFTLEdBQTZCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQW1CLENBQUMsQ0FBQTtRQUNuRixhQUFRLEdBQTJCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFBO1FBa0IvRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsd0NBQXdDLENBQUMsQ0FBQyxDQUFBO1FBQzVGLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQTtRQUVoRixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3BELGNBQWMsRUFDZCxnQkFBZ0IsRUFDaEIsWUFBWSxFQUNaLElBQUksOEJBQThCLEVBQUUsRUFDcEM7WUFDQztnQkFDQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQztnQkFDMUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsTUFBTSxFQUFFLENBQUM7Z0JBQ1QsVUFBVSxFQUFFLDRCQUE0QixDQUFDLFdBQVc7Z0JBQ3BELE9BQU8sQ0FBQyxHQUFvQjtvQkFDM0IsT0FBTyxHQUFHLENBQUE7Z0JBQ1gsQ0FBQzthQUNEO1lBQ0Q7Z0JBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxNQUFNLENBQUM7Z0JBQzFDLE9BQU8sRUFBRSxFQUFFO2dCQUNYLE1BQU0sRUFBRSxDQUFDO2dCQUNULFVBQVUsRUFBRSw0QkFBNEIsQ0FBQyxXQUFXO2dCQUNwRCxPQUFPLENBQUMsR0FBb0I7b0JBQzNCLE9BQU8sR0FBRyxDQUFBO2dCQUNYLENBQUM7YUFDRDtZQUNEO2dCQUNDLEtBQUssRUFBRSxFQUFFO2dCQUNULE9BQU8sRUFBRSxFQUFFO2dCQUNYLE1BQU0sRUFBRSxDQUFDO2dCQUNULFlBQVksRUFBRSxFQUFFO2dCQUNoQixZQUFZLEVBQUUsRUFBRTtnQkFDaEIsVUFBVSxFQUFFLCtCQUErQixDQUFDLFdBQVc7Z0JBQ3ZELE9BQU8sQ0FBQyxHQUFvQjtvQkFDM0IsT0FBTyxHQUFHLENBQUE7Z0JBQ1gsQ0FBQzthQUNEO1NBQ0QsRUFDRDtZQUNDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQUM7WUFDdEUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLENBQUM7WUFDNUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDdkMsK0JBQStCLEVBQy9CLElBQUksRUFDSixJQUFJLENBQUMsbUJBQW1CLENBQ3hCO1NBQ0QsRUFDRDtZQUNDLG1CQUFtQixFQUFFLEtBQUs7WUFDMUIsdUJBQXVCLEVBQUUsS0FBSztZQUM5QixpQkFBaUIsRUFBRSxLQUFLO1lBQ3hCLHdCQUF3QixFQUFFLEtBQUs7WUFDL0IscUJBQXFCLEVBQUU7Z0JBQ3RCLFlBQVksRUFBRSxDQUFDLElBQXFCLEVBQUUsRUFBRTtvQkFDdkMsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUE7b0JBQ3ZELElBQUksU0FBUyxLQUFLLFNBQVMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO3dCQUN2RCxPQUFPLFFBQVEsQ0FDZCx3QkFBd0IsRUFDeEIsY0FBYyxFQUNkLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FDdkMsQ0FBQTtvQkFDRixDQUFDO29CQUVELE9BQU8sUUFBUSxDQUNkLGdDQUFnQyxFQUNoQyxxQkFBcUIsRUFDckIsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUN2QyxTQUFTLENBQ1QsQ0FBQTtnQkFDRixDQUFDO2dCQUNELGtCQUFrQixFQUFFLEdBQUcsRUFBRSxDQUN4QixRQUFRLENBQUMsNkJBQTZCLEVBQUUsOEJBQThCLENBQUM7YUFDeEU7WUFDRCxnQkFBZ0IsRUFBRTtnQkFDakIsS0FBSyxDQUFDLE9BQXdCO29CQUM3QixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQzlCLENBQUM7YUFDRDtTQUNELENBQ2tDLENBQUE7UUFFcEMsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQzdCLDZEQUE2RDtZQUM3RCxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNsRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDOUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQTtRQUNwRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMvQixTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLEVBQUUsR0FBRyxtQkFBbUIsRUFBRSxDQUFDLENBQzNGLENBQUE7UUFDRCxTQUFTLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFFckQsSUFBSSxDQUFDLFNBQVMsQ0FDYixTQUFTLENBQUMsVUFBVSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQy9CLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQztnQkFDdkQsY0FBYyxFQUFFLEtBQUs7Z0JBQ3JCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGFBQWEsRUFBRSxLQUFLO2dCQUNwQixVQUFVLEVBQUUsSUFBSSxDQUFDLG1CQUFtQjtnQkFDcEMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDO2dCQUMvQyxLQUFLLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHdCQUF3QixDQUFDO2FBQzdELENBQUMsQ0FBQTtZQUVGLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ1QsSUFBSSxDQUFDLCtCQUErQixDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDN0QsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQywrQkFBK0IsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLEVBQUU7WUFDbkUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ25CLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8seUJBQXlCLENBQUMsSUFBcUI7UUFDdEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNsRCxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2xCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3hELElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7b0JBQ2hELE9BQU8sQ0FBQyxDQUFBO2dCQUNULENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLHFCQUFxQixDQUFDLElBQXFCLEVBQUUsUUFBaUIsSUFBSTtRQUN6RSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbEQsSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNsQixJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUM3QixDQUFDO1lBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBWSxtQkFBbUI7UUFDOUIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzdFLENBQUM7SUFFRCxJQUFZLGlCQUFpQjtRQUM1QixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUM3RCxNQUFNLG9CQUFvQixHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNqRixJQUFJLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUMxRCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ2pGLElBQUkseUJBQXlCLEdBQUcsS0FBSyxDQUFBO1lBQ3JDLEtBQUssTUFBTSxZQUFZLElBQUksb0JBQW9CLEVBQUUsQ0FBQztnQkFDakQseUJBQXlCO29CQUN4Qix5QkFBeUIsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ3hGLENBQUM7WUFFRCxPQUFPO2dCQUNOLEdBQUc7Z0JBQ0gscUJBQXFCLEVBQUUseUJBQXlCO2FBQ2hELENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLGVBQWU7UUFDZixNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzNDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ25DLE9BQU8sQ0FBQyxDQUFDLENBQUE7Z0JBQ1YsQ0FBQztnQkFFRCxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDbkMsT0FBTyxDQUFDLENBQUE7Z0JBQ1QsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUMzRCxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUUzRCxJQUFJLFlBQVksS0FBSyxZQUFZLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxZQUFZLEVBQUUsQ0FBQztvQkFDbEIsT0FBTyxDQUFDLENBQUE7Z0JBQ1QsQ0FBQztnQkFFRCxJQUFJLFlBQVksRUFBRSxDQUFDO29CQUNsQixPQUFPLENBQUMsQ0FBQyxDQUFBO2dCQUNWLENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNoRCxDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sYUFBYSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxNQUFNO1FBQ0wsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQ2hCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEdBQUcsOEJBQThCLENBQUMsVUFBVTtZQUN4RSw4QkFBOEIsQ0FBQyxpQkFBaUIsRUFDakQsU0FBUyxDQUNULENBQUE7SUFDRixDQUFDO0lBRUQsV0FBVztRQUNWLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtRQUN0QyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFFOUQsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsTUFBTTtZQUNqRCxDQUFDLENBQUMsUUFBUSxDQUNSLDJCQUEyQixFQUMzQix5RUFBeUUsQ0FDekU7WUFDRixDQUFDLENBQUMsUUFBUSxDQUNSLDhCQUE4QixFQUM5Qix5REFBeUQsQ0FDekQsQ0FBQTtRQUVILElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDdEUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ2QsQ0FBQztJQUVELFdBQVcsQ0FBQyxJQUFZLEVBQUUsSUFBc0I7UUFDL0MsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUN0QyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM5RCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pELE9BQU87b0JBQ04sSUFBSSw2QkFBcUI7b0JBQ3pCLE9BQU8sRUFBRSxRQUFRLENBQ2hCO3dCQUNDLEdBQUcsRUFBRSxVQUFVO3dCQUNmLE9BQU8sRUFBRSxDQUFDLDREQUE0RCxDQUFDO3FCQUN2RSxFQUNELHlDQUF5QyxFQUN6QyxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FDckM7aUJBQ0QsQ0FBQTtZQUNGLENBQUM7WUFFRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLE9BQU87b0JBQ04sSUFBSSw2QkFBcUI7b0JBQ3pCLE9BQU8sRUFBRSxRQUFRLENBQ2hCO3dCQUNDLEdBQUcsRUFBRSxVQUFVO3dCQUNmLE9BQU8sRUFBRTs0QkFDUiwrQ0FBK0M7NEJBQy9DLDREQUE0RDt5QkFDNUQ7cUJBQ0QsRUFDRCwrREFBK0QsRUFDL0QsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUNYLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUNyQztpQkFDRCxDQUFBO1lBQ0YsQ0FBQztZQUVELElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsT0FBTztvQkFDTixJQUFJLDJCQUFtQjtvQkFDdkIsT0FBTyxFQUFFLFFBQVEsQ0FDaEIsY0FBYyxFQUNkLDBEQUEwRCxFQUMxRCxJQUFJLENBQ0o7aUJBQ0QsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsVUFBVSxDQUFDLElBQXFCLEVBQUUsR0FBUTtRQUN6QyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDNUUsTUFBTSxLQUFLLEdBQUcsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUUxRixJQUFJLEtBQUssSUFBSSxjQUFjLENBQUMsTUFBTSxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3BELGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDekIsQ0FBQzthQUFNLENBQUM7WUFDUCxjQUFjLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFBO1FBQzVCLENBQUM7UUFFRCxJQUFJLENBQUMsK0JBQStCLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ25FLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVELFVBQVUsQ0FBQyxJQUFxQjtRQUMvQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLElBQXFCO1FBQ2pDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDdEIsTUFBTSxJQUFJLENBQUMsK0JBQStCLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTFFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDeEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUN2QixDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDekIsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFxQixFQUFFLG1CQUE2QjtRQUM5RCxNQUFNLGdCQUFnQixHQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSTtZQUNoQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNO2dCQUNuRCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDdEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFDbEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQ2xCO2dCQUNELENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDL0IsSUFBSSxnQkFBZ0IsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQzdDLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQztnQkFDdkQsY0FBYyxFQUFFLEtBQUs7Z0JBQ3JCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGFBQWEsRUFBRSxLQUFLO2dCQUNwQixVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUc7Z0JBQ3BCLFNBQVMsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQztnQkFDL0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSx3QkFBd0IsQ0FBQzthQUM3RCxDQUFDLENBQUE7WUFFRixJQUFJLEdBQUcsRUFBRSxDQUFDO2dCQUNULElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzlCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3RCLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNoQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFwWEsseUJBQXlCO0lBdUI1QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxnQ0FBZ0MsQ0FBQTtJQUVoQyxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxrQkFBa0IsQ0FBQTtHQTdCZix5QkFBeUIsQ0FvWDlCO0FBRUQsTUFBTSw4QkFBOEI7SUFBcEM7UUFHVSxvQkFBZSxHQUFHLDhCQUE4QixDQUFDLGlCQUFpQixDQUFBO0lBSTVFLENBQUM7YUFOZ0Isc0JBQWlCLEdBQUcsRUFBRSxBQUFMLENBQUs7YUFDdEIsZUFBVSxHQUFHLEVBQUUsQUFBTCxDQUFLO0lBRS9CLFNBQVMsQ0FBQyxJQUFxQjtRQUM5QixPQUFPLDhCQUE4QixDQUFDLFVBQVUsQ0FBQTtJQUNqRCxDQUFDOztBQU9GLElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQStCOzthQUdwQixnQkFBVyxHQUFHLFNBQVMsQUFBWixDQUFZO0lBSXZDLFlBQ2tCLEtBQWdDLEVBQ2hDLG1CQUF3QixFQUNwQixVQUFnRDtRQUZwRCxVQUFLLEdBQUwsS0FBSyxDQUEyQjtRQUNoQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQUs7UUFDSCxlQUFVLEdBQVYsVUFBVSxDQUFxQjtRQUw3RCxlQUFVLEdBQVcsaUNBQStCLENBQUMsV0FBVyxDQUFBO0lBTXRFLENBQUM7SUFFSixjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUNwRCxNQUFNLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN4QyxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVELGFBQWEsQ0FDWixJQUFxQixFQUNyQixLQUFhLEVBQ2IsWUFBd0MsRUFDeEMsTUFBMEI7UUFFMUIsWUFBWSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUU5QixNQUFNLGdCQUFnQixHQUNyQixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSTtZQUNoQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNO2dCQUNuRCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDdEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFDbEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQ2xCO2dCQUNELENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFL0IsTUFBTSxPQUFPLEdBQWMsRUFBRSxDQUFBO1FBQzdCLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzVDLENBQUM7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDM0MsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVPLGdCQUFnQixDQUFDLElBQXFCO1FBQzdDLE9BQU87WUFDTixLQUFLLEVBQUUsRUFBRTtZQUNULEtBQUssRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQztZQUN0QyxPQUFPLEVBQUUsSUFBSTtZQUNiLEVBQUUsRUFBRSxnQkFBZ0I7WUFDcEIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLENBQUM7WUFDaEQsR0FBRyxFQUFFLEdBQUcsRUFBRTtnQkFDVCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDN0IsQ0FBQztTQUNELENBQUE7SUFDRixDQUFDO0lBRU8sa0JBQWtCLENBQUMsSUFBcUI7UUFDL0MsT0FBTztZQUNOLEtBQUssRUFBRSxFQUFFO1lBQ1QsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUM7WUFDOUMsT0FBTyxFQUFFLElBQUk7WUFDYixFQUFFLEVBQUUsa0JBQWtCO1lBQ3RCLE9BQU8sRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsa0JBQWtCLENBQUM7WUFDekQsR0FBRyxFQUFFLEdBQUcsRUFBRTtnQkFDVCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDNUIsQ0FBQztTQUNELENBQUE7SUFDRixDQUFDO0lBRU8sa0JBQWtCLENBQUMsSUFBcUI7UUFDL0MsT0FBTztZQUNOLEtBQUssRUFBRSxFQUFFO1lBQ1QsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDO1lBQ3hDLE9BQU8sRUFBRSxJQUFJO1lBQ2IsRUFBRSxFQUFFLGtCQUFrQjtZQUN0QixPQUFPLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLGFBQWEsQ0FBQztZQUNwRCxHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2YsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM5QixDQUFDO1NBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBd0M7UUFDdkQsWUFBWSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNqQyxDQUFDOztBQXRGSSwrQkFBK0I7SUFVbEMsV0FBQSxtQkFBbUIsQ0FBQTtHQVZoQiwrQkFBK0IsQ0F1RnBDO0FBVUQsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNEI7O2FBR2pCLGdCQUFXLEdBQUcsTUFBTSxBQUFULENBQVM7SUFLcEMsWUFDa0IsS0FBZ0MsRUFDNUIsa0JBQXdEO1FBRDVELFVBQUssR0FBTCxLQUFLLENBQTJCO1FBQ1gsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUxyRSxlQUFVLEdBQVcsOEJBQTRCLENBQUMsV0FBVyxDQUFBO0lBTW5FLENBQUM7SUFFSixjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNqRCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7UUFFMUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtZQUNoRSxpQkFBaUIsRUFBRTtnQkFDbEIsVUFBVSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQzthQUN0RTtZQUNELGNBQWMsRUFBRSxxQkFBcUI7U0FDckMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBRWhFLE9BQU87WUFDTixPQUFPO1lBQ1AsU0FBUztZQUNULFNBQVM7WUFDVCxXQUFXO1lBQ1gsaUJBQWlCO1NBQ2pCLENBQUE7SUFDRixDQUFDO0lBRUQsYUFBYSxDQUNaLElBQXFCLEVBQ3JCLEtBQWEsRUFDYixZQUErQyxFQUMvQyxNQUEwQjtRQUUxQixZQUFZLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFdEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7UUFDdkIsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FDakMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzdCLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNoQixZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBQ2hELFlBQVksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUE7Z0JBQzlCLFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUE7Z0JBQy9CLFlBQVksQ0FBQyxPQUFPLENBQUMsYUFBYyxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO1lBQzlELENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsOEVBQThFO1FBQzlFLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQ2pDLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMvRSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLFlBQVksR0FBRyxHQUFHLEVBQUU7WUFDekIsWUFBWSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ25ELFlBQVksQ0FBQyxPQUFPLENBQUMsYUFBYyxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBQzlELENBQUMsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFHLEdBQUcsRUFBRTtZQUNuQixZQUFZLEVBQUUsQ0FBQTtZQUVkLE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFBO1lBQzlDLE1BQU0sR0FBRyxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUM7Z0JBQ3BDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUMzRCxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtZQUNyQyxZQUFZLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBRXZELElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ1QsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ2pDLENBQUM7UUFDRixDQUFDLENBQUE7UUFFRCxNQUFNLE1BQU0sR0FBRyxHQUFHLEVBQUU7WUFDbkIsWUFBWSxFQUFFLENBQUE7WUFDZCxZQUFZLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUE7WUFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUIsQ0FBQyxDQUFBO1FBRUQsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FDakMsNkJBQTZCLENBQzVCLFlBQVksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUNuQyxTQUFTLENBQUMsUUFBUSxFQUNsQixDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ0wsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFBO1lBQ25CLElBQUksQ0FBQyxDQUFDLE1BQU0sdUJBQWUsRUFBRSxDQUFDO2dCQUM3QixNQUFNLEVBQUUsQ0FBQTtnQkFDUixPQUFPLEdBQUcsSUFBSSxDQUFBO1lBQ2YsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLHdCQUFnQixFQUFFLENBQUM7Z0JBQ3JDLE1BQU0sRUFBRSxDQUFBO2dCQUNSLE9BQU8sR0FBRyxJQUFJLENBQUE7WUFDZixDQUFDO1lBRUQsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUE7Z0JBQ2xCLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtZQUNwQixDQUFDO1FBQ0YsQ0FBQyxDQUNELENBQ0QsQ0FBQTtRQUNELFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQ2pDLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO1lBQy9FLE1BQU0sRUFBRSxDQUFBO1FBQ1QsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzdDLFlBQVksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQTtRQUMxQyxZQUFZLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxXQUFXLENBQUE7UUFDOUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQzlGLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBK0M7UUFDOUQsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNsQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDekMsQ0FBQztJQUVPLFVBQVUsQ0FBQyxHQUFRO1FBQzFCLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakMsT0FBTyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDeEMsQ0FBQztRQUVELGtHQUFrRztRQUNsRywrQ0FBK0M7UUFDL0MsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxNQUFNLDJCQUEyQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pELE1BQU0sYUFBYSxHQUFHLGNBQWMsQ0FBQywyQkFBMkIsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN2RSxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNuQixPQUFPLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNoRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQTtJQUNoQixDQUFDOztBQTlJSSw0QkFBNEI7SUFVL0IsV0FBQSxtQkFBbUIsQ0FBQTtHQVZoQiw0QkFBNEIsQ0ErSWpDO0FBVUQsU0FBUyxZQUFZLENBQUMsWUFBMkIsRUFBRSxJQUFxQjtJQUN2RSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUztRQUN4QixDQUFDLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQztRQUNoRSxDQUFDLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxDQUFBO0FBQ3ZDLENBQUM7QUFFRCxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE0Qjs7YUFHakIsZ0JBQVcsR0FBRyxNQUFNLEFBQVQsQ0FBUztJQUlwQyxZQUEyQixZQUE0QztRQUEzQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUY5RCxlQUFVLEdBQVcsOEJBQTRCLENBQUMsV0FBVyxDQUFBO0lBRUksQ0FBQztJQUUzRSxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBRWhFLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDakQsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBQzlELE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFBO1FBRW5FLE9BQU87WUFDTixPQUFPO1lBQ1AsYUFBYTtZQUNiLGtCQUFrQjtZQUNsQixXQUFXO1lBQ1gsaUJBQWlCO1NBQ2pCLENBQUE7SUFDRixDQUFDO0lBRUQsYUFBYSxDQUNaLElBQXFCLEVBQ3JCLEtBQWEsRUFDYixZQUErQyxFQUMvQyxNQUEwQjtRQUUxQixZQUFZLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDdEMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQztZQUNsQyxPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNiLFNBQVMsQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUMzQyxDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsWUFBWSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDNUUsWUFBWSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBRTdGLFlBQVksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUE7UUFDN0MsWUFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO0lBQ3ZELENBQUM7SUFFRCxlQUFlLENBQUMsWUFBK0M7UUFDOUQsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNuQyxDQUFDOztBQWhESSw0QkFBNEI7SUFPcEIsV0FBQSxhQUFhLENBQUE7R0FQckIsNEJBQTRCLENBaURqQztBQUVNLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTs7YUFDbkMsT0FBRSxHQUFXLGlDQUFpQyxBQUE1QyxDQUE0QztJQXFCOUQsWUFDQyxLQUFtQixFQUNBLGdCQUFtQyxFQUN2QyxZQUEyQixFQUN6QixjQUErQixFQUN0QixnQkFBMkQsRUFFckYseUJBQXVFLEVBRXZFLGtDQUF3RixFQUNqRSxvQkFBNEQsRUFFbkYsK0JBQWtGLEVBRWxGLG9CQUFxRSxFQUVyRSwwQkFBaUYsRUFDaEUsY0FBZ0QsRUFDN0MsaUJBQXNEO1FBRTFFLEtBQUssQ0FBQyxzQkFBb0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQWYxQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQTBCO1FBRXBFLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBNkI7UUFFdEQsdUNBQWtDLEdBQWxDLGtDQUFrQyxDQUFxQztRQUNoRCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBRWxFLG9DQUErQixHQUEvQiwrQkFBK0IsQ0FBa0M7UUFFakUseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFnQztRQUVwRCwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQXNDO1FBQy9DLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUM1QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBME1uRSxjQUFTLEdBQUcsS0FBSyxDQUFBO1FBQ1Isd0JBQW1CLEdBQW9CLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBb2VyRix1QkFBa0IsR0FBNkIsRUFBRSxDQUFBO0lBNXFCekQsQ0FBQztJQUVTLFlBQVksQ0FBQyxNQUFtQjtRQUN6QyxJQUFJLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLHlCQUF5QixFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVsRixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBRTFDLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFDLDhCQUE4QixDQUFDLENBQUE7UUFDM0QsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNsQyxJQUFJLG9CQUFvQixDQUFDLGlCQUFpQixFQUFFO1lBQzNDLFVBQVUsb0NBQTRCO1lBQ3RDLFFBQVEsa0NBQTBCO1NBQ2xDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBRXpELElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3JELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRWxELElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FDakMsa0NBQWtDLEVBQ2xDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUMvQixDQUFBO1FBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUNqQyxvQ0FBb0MsRUFDcEMsYUFBYSxDQUFDLHlCQUF5QixDQUFDLENBQ3hDLENBQUE7UUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQ2pDLCtCQUErQixFQUMvQixhQUFhLENBQUMsd0JBQXdCLENBQUMsQ0FDdkMsQ0FBQTtRQUNELElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FDakMsMkJBQTJCLEVBQzNCLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUNwQyxDQUFBO1FBRUQsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDakUsTUFBTSxLQUFLLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUUxQyxJQUFJLEtBQUssQ0FBQyxNQUFNLDBCQUFpQixJQUFJLEtBQUssQ0FBQyxNQUFNLDRCQUFtQixFQUFFLENBQUM7Z0JBQ3RFLE1BQU0sUUFBUSxHQUFHO29CQUNoQixJQUFJLENBQUMsZUFBZTtvQkFDcEIsSUFBSSxDQUFDLGdCQUFnQjtvQkFDckIsSUFBSSxDQUFDLGtCQUFrQjtvQkFDdkIsSUFBSSxDQUFDLHNCQUFzQjtpQkFDM0IsQ0FBQTtnQkFDRCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7b0JBQ25ELE9BQU8seUJBQXlCLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBQzFDLENBQUMsQ0FBQyxDQUFBO2dCQUVGLElBQUksUUFBUSxHQUFHLFlBQVksQ0FBQTtnQkFDM0IsSUFBSSxLQUFLLENBQUMsTUFBTSw0QkFBbUIsRUFBRSxDQUFDO29CQUNyQyxRQUFRLEVBQUUsQ0FBQTtnQkFDWCxDQUFDO3FCQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sMEJBQWlCLEVBQUUsQ0FBQztvQkFDMUMsUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO29CQUNoQyxRQUFRLEVBQUUsQ0FBQTtnQkFDWCxDQUFDO2dCQUVELFFBQVEsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFBO2dCQUMzQixRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQTtnQkFFM0IsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQzNCLENBQUM7aUJBQU0sSUFBSSxLQUFLLENBQUMsTUFBTSx3QkFBZ0IsRUFBRSxDQUFDO2dCQUN6QyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ3pCLENBQUM7aUJBQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLGlEQUE4QixDQUFDLEVBQUUsQ0FBQztnQkFDekQsSUFBSSxJQUFJLENBQUMsK0JBQStCLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDO29CQUNqRSxJQUFJLENBQUMsK0JBQStCLENBQUMsaUJBQWlCLENBQ3JELENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLGtCQUFrQixFQUFFLENBQzFELENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7aUJBQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLG1EQUE2Qix3QkFBZ0IsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hFLElBQUksSUFBSSxDQUFDLCtCQUErQixDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQztvQkFDcEUsSUFBSSxDQUFDLCtCQUErQixDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNoRSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRVEsS0FBSztRQUNiLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUViLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVRLEtBQUssQ0FBQyxRQUFRLENBQ3RCLEtBQWdDLEVBQ2hDLE9BQW1DLEVBQ25DLE9BQTJCLEVBQzNCLEtBQXdCO1FBRXhCLE1BQU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwRCxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ25DLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsK0JBQStCLENBQUMseUJBQXlCLENBQUE7UUFDcEUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDeEIsTUFBTSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDcEIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUYsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsK0JBQStCLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQ25GLENBQUE7SUFDRixDQUFDO0lBRU8sdUJBQXVCLENBQUMsT0FBZ0I7UUFDL0MsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sZ0RBQWdELENBQUE7UUFDeEQsQ0FBQztRQUVELE9BQU8sa0RBQWtELENBQUE7SUFDMUQsQ0FBQztJQUVPLGtCQUFrQixDQUFDLE9BQWdCO1FBQzFDLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixJQUFJLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLENBQUM7Z0JBQ25FLE9BQU8sUUFBUSxDQUFDLHlCQUF5QixFQUFFLHdCQUF3QixDQUFDLENBQUE7WUFDckUsQ0FBQztZQUVELFFBQVEsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQztnQkFDbkQ7b0JBQ0MsT0FBTyxRQUFRLENBQUMscUJBQXFCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtnQkFDaEU7b0JBQ0MsT0FBTyxRQUFRLENBQUMscUJBQXFCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtnQkFDaEU7b0JBQ0MsT0FBTyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtZQUN2RSxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sUUFBUSxDQUFDLGlCQUFpQixFQUFFLDRCQUE0QixDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVPLDRCQUE0QixDQUFDLE9BQWdCO1FBQ3BELE9BQU8sU0FBUyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxPQUFnQjtRQUM3QyxJQUFJLEtBQUssR0FBVyxFQUFFLENBQUE7UUFDdEIsSUFBSSxRQUFRLEdBQVcsRUFBRSxDQUFBO1FBRXpCLFFBQVEsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQztZQUNuRCxpQ0FBeUIsQ0FBQyxDQUFDLENBQUM7Z0JBQzNCLEtBQUssR0FBRyxPQUFPO29CQUNkLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLHFCQUFxQixDQUFDO29CQUNsRCxDQUFDLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLENBQUE7Z0JBQ3ZELFFBQVEsR0FBRyxPQUFPO29CQUNqQixDQUFDLENBQUMsUUFBUSxDQUNSLHVCQUF1QixFQUN2QixxRkFBcUYsQ0FDckY7b0JBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FDUix5QkFBeUIsRUFDekIsdUdBQXVHLENBQ3ZHLENBQUE7Z0JBQ0gsTUFBSztZQUNOLENBQUM7WUFDRCxrQ0FBMEIsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLEtBQUssR0FBRyxPQUFPO29CQUNkLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLHFCQUFxQixDQUFDO29CQUNsRCxDQUFDLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLENBQUE7Z0JBQ3ZELFFBQVEsR0FBRyxPQUFPO29CQUNqQixDQUFDLENBQUMsUUFBUSxDQUNSLHVCQUF1QixFQUN2QixxRkFBcUYsQ0FDckY7b0JBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FDUix5QkFBeUIsRUFDekIsdUdBQXVHLENBQ3ZHLENBQUE7Z0JBQ0gsTUFBSztZQUNOLENBQUM7WUFDRCxxQ0FBNkIsQ0FBQyxDQUFDLENBQUM7Z0JBQy9CLEtBQUssR0FBRyxPQUFPO29CQUNkLENBQUMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsd0JBQXdCLENBQUM7b0JBQ3hELENBQUMsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtnQkFDdkQsUUFBUSxHQUFHLE9BQU87b0JBQ2pCLENBQUMsQ0FBQyxRQUFRLENBQ1IsMEJBQTBCLEVBQzFCLHdGQUF3RixDQUN4RjtvQkFDRixDQUFDLENBQUMsUUFBUSxDQUNSLDRCQUE0QixFQUM1QiwwR0FBMEcsQ0FDMUcsQ0FBQTtnQkFDSCxNQUFLO1lBQ04sQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFLYSxBQUFOLEtBQUssQ0FBQyxNQUFNO1FBQ25CLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7UUFDckIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBRWhDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFDcEYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBQ2hFLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRW5FLGlCQUFpQjtRQUNqQixJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsR0FBRyw0QkFBNEIsQ0FBQTtRQUM3RCxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1FBQzVGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBO1FBRXJDLE1BQU0scUJBQXFCLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN0RSxxQkFBcUIsQ0FBQyxTQUFTLEdBQUcsa0JBQWtCO1lBQ25ELENBQUMsQ0FBQyxRQUFRLENBQ1Isb0JBQW9CLEVBQ3BCLDJFQUEyRSxDQUMzRTtZQUNGLENBQUMsQ0FBQyxRQUFRLENBQ1Isc0JBQXNCLEVBQ3RCLDhEQUE4RCxFQUM5RCxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FDN0IsQ0FBQTtRQUVILE1BQU0sd0JBQXdCLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUN6RSxNQUFNLDRCQUE0QixHQUFHLFFBQVEsQ0FDNUM7WUFDQyxHQUFHLEVBQUUsbUNBQW1DO1lBQ3hDLE9BQU8sRUFBRTtnQkFDUixrR0FBa0c7YUFDbEc7U0FDRCxFQUNELHdGQUF3RixFQUN4RixtQ0FBbUMsQ0FDbkMsQ0FBQTtRQUNELEtBQUssTUFBTSxJQUFJLElBQUksZUFBZSxDQUFDLDRCQUE0QixDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDeEUsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDOUIsTUFBTSxDQUFDLHdCQUF3QixFQUFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUNoRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FDM0IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDdkMsSUFBSSxFQUNKLHdCQUF3QixFQUN4QixFQUFFLEdBQUcsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUN6QixFQUFFLENBQ0YsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNqRixJQUFJLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FDNUIsWUFBWSxFQUNaLEdBQUcsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHdCQUF3QixDQUFDLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsQ0FDakcsQ0FBQTtRQUVELFdBQVc7UUFDWCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQTtRQUN2RSxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUMzRixNQUFNLHNDQUFzQyxHQUFHLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUN4RixNQUFNLFFBQVEsR0FBRyxxQkFBcUIsQ0FBQywwQkFBMEIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBRXhFLG9DQUFvQztZQUNwQyxJQUNDLFFBQVEsQ0FBQyxLQUFLO2dCQUNkLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7b0JBQzNDLFFBQVEsQ0FBQyxLQUFLLHVDQUErQixDQUFDLEVBQzlDLENBQUM7Z0JBQ0YsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBRUQsK0RBQStEO1lBQy9ELElBQUksUUFBUSxDQUFDLGtCQUFrQixJQUFJLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxDQUFDO2dCQUN4RSxJQUFJLGtCQUFrQixDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDakQsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztnQkFDRCxJQUFJLGtCQUFrQixDQUFDLGVBQWUsRUFBRSxDQUFDO29CQUN4QyxLQUFLLE1BQU0sdUJBQXVCLElBQUksa0JBQWtCLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7d0JBQ25GLElBQUksdUJBQXVCLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7NEJBQzNDLE9BQU8sSUFBSSxDQUFBO3dCQUNaLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO2dCQUNELE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUVELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1FBRVQsZ0JBQWdCO1FBQ2hCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxzQ0FBc0MsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1FBRTdGLHFCQUFxQjtRQUNyQixJQUFJLENBQUMseUJBQXlCLENBQUMsV0FBVyxFQUFFLENBQUE7UUFFNUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLGVBQWUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEtBQUssQ0FBQTtRQUNwRyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFBO0lBQ3ZCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtRQUU3QixNQUFNLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFBO1FBQ25GLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLO2FBQzFELE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQzthQUMxQixHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFNLENBQUMsQ0FBQTtRQUUxQixLQUFLLE1BQU0sU0FBUyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNyRixJQUNDLGVBQWUsNkNBQW9DO2dCQUNuRCxlQUFlLDhDQUFxQztnQkFDcEQsZUFBZSx1REFBK0M7Z0JBQzlELGVBQWUsMERBQWtELEVBQ2hFLENBQUM7Z0JBQ0YsU0FBUTtZQUNULENBQUM7WUFFRCxJQUNDLGtCQUFrQjtnQkFDbEIsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLHVDQUF1QyxDQUM5RSxTQUFTLENBQUMsUUFBUSxDQUNsQixLQUFLLEtBQUssRUFDVixDQUFDO2dCQUNGLFNBQVE7WUFDVCxDQUFDO1lBRUQsSUFDQyxJQUFJLENBQUMsa0NBQWtDLENBQUMseUNBQXlDLENBQ2hGLFNBQVMsQ0FBQyxRQUFRLENBQ2xCLEtBQUssSUFBSSxFQUNULENBQUM7Z0JBQ0YsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNoQyxTQUFRO1lBQ1QsQ0FBQztZQUVELE1BQU0sWUFBWSxHQUFHLHdCQUF3QixDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUN6RSxJQUNDLFlBQVksQ0FBQyxJQUFJLENBQ2hCLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDUCxJQUFJLENBQUMsa0NBQWtDLENBQUMseUNBQXlDLENBQ2hGLEdBQUcsQ0FBQyxRQUFRLENBQ1osS0FBSyxLQUFLLENBQ1osRUFDQSxDQUFDO2dCQUNGLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNqQyxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQTtJQUNoQixDQUFDO0lBRU8sbUJBQW1CLENBQUMsTUFBbUI7UUFDOUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdEYsSUFBSSxDQUFDLG9CQUFvQixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUE7UUFDckYsSUFBSSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUE7UUFDMUYsSUFBSSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUE7UUFDMUYsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUE7SUFDekYsQ0FBQztJQUVPLDBCQUEwQixDQUFDLE1BQW1CO1FBQ3JELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQywyQkFBMkIsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0YsTUFBTSxrQkFBa0IsR0FBRyxNQUFNLENBQ2hDLElBQUksQ0FBQyxzQkFBc0IsRUFDM0IsQ0FBQyxDQUFDLGtDQUFrQyxDQUFDLENBQ3JDLENBQUE7UUFDRCxrQkFBa0IsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUN0Qyw2QkFBNkIsRUFDN0IsOEJBQThCLENBQzlCLENBQUE7UUFFRCxJQUFJLENBQUMseUJBQXlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDOUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDdkMseUJBQXlCLEVBQ3pCLElBQUksQ0FBQyxzQkFBc0IsQ0FDM0IsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLDZCQUE2QixDQUFDLE1BQW1CO1FBQ3hELElBQUksQ0FBQyx5QkFBeUIsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUE7UUFDL0UsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE1BQU0sQ0FDN0IsSUFBSSxDQUFDLHlCQUF5QixFQUM5QixDQUFDLENBQUMsc0NBQXNDLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FDNUQsQ0FBQTtRQUNELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxNQUFNLENBQy9CLElBQUksQ0FBQyx5QkFBeUIsRUFDOUIsQ0FBQyxDQUFDLHdDQUF3QyxFQUFFLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQzlELENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLHNCQUFzQixDQUFDLFdBQW1CLEVBQUUsYUFBcUI7UUFDOUUsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ2hDLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUVsQyxtQkFBbUI7UUFDbkIsTUFBTSxDQUFDLFlBQVksRUFBRSxlQUFlLENBQUMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFeEUsSUFBSSxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDekYsTUFBTSxxQkFBcUIsR0FDMUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLGlDQUF5QjtZQUNqRSxDQUFDLENBQUM7Z0JBQ0EsUUFBUSxDQUFDLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQztnQkFDcEQsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHNCQUFzQixDQUFDO2dCQUNwRCxRQUFRLENBQUMsbUJBQW1CLEVBQUUsc0NBQXNDLENBQUM7YUFDckU7WUFDRixDQUFDLENBQUM7Z0JBQ0EsUUFBUSxDQUFDLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQztnQkFDcEQsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHNCQUFzQixDQUFDO2dCQUNwRCxRQUFRLENBQUMsaUJBQWlCLEVBQUUsb0NBQW9DLENBQUM7Z0JBQ2pFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxzQ0FBc0MsQ0FBQzthQUNyRSxDQUFBO1FBQ0osSUFBSSxDQUFDLDRCQUE0QixDQUNoQyxJQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLHFCQUFxQixFQUNyQixTQUFTLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQ3pDLENBQUE7UUFFRCwyQkFBMkI7UUFDM0IsTUFBTSxDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUU3RSxJQUFJLENBQUMsOEJBQThCLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQy9GLE1BQU0sdUJBQXVCLEdBQzVCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsRUFBRSxpQ0FBeUI7WUFDakUsQ0FBQyxDQUFDO2dCQUNBLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSw4QkFBOEIsQ0FBQztnQkFDMUQsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHVCQUF1QixDQUFDO2dCQUN2RCxvQkFBb0IsQ0FDbkIsUUFBUSxDQUNQO29CQUNDLEdBQUcsRUFBRSxxQkFBcUI7b0JBQzFCLE9BQU8sRUFBRTt3QkFDUixrR0FBa0c7cUJBQ2xHO2lCQUNELEVBQ0Qsa0VBQWtFLEVBQ2xFLGFBQWEsRUFDYixXQUFXLGdEQUFnRCxFQUFFLENBQzdELENBQ0Q7YUFDRDtZQUNGLENBQUMsQ0FBQztnQkFDQSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsOEJBQThCLENBQUM7Z0JBQzFELFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSx1QkFBdUIsQ0FBQztnQkFDdkQsb0JBQW9CLENBQ25CLFdBQVc7b0JBQ1YsQ0FBQyxDQUFDLFFBQVEsQ0FDUjt3QkFDQyxHQUFHLEVBQUUsbUJBQW1CO3dCQUN4QixPQUFPLEVBQUU7NEJBQ1Isa0dBQWtHO3lCQUNsRztxQkFDRCxFQUNELCtDQUErQyxFQUMvQyxXQUFXLEVBQ1gsa0NBQWtDLENBQ2xDO29CQUNGLENBQUMsQ0FBQyxRQUFRLENBQ1Isc0JBQXNCLEVBQ3RCLG9EQUFvRCxDQUNwRCxDQUNIO2dCQUNELG9CQUFvQixDQUNuQixRQUFRLENBQ1A7b0JBQ0MsR0FBRyxFQUFFLHFCQUFxQjtvQkFDMUIsT0FBTyxFQUFFO3dCQUNSLGtHQUFrRztxQkFDbEc7aUJBQ0QsRUFDRCxrRUFBa0UsRUFDbEUsYUFBYSxFQUNiLFdBQVcsZ0RBQWdELEVBQUUsQ0FDN0QsQ0FDRDthQUNELENBQUE7UUFDSixJQUFJLENBQUMsNEJBQTRCLENBQ2hDLElBQUksQ0FBQyxrQkFBa0IsRUFDdkIsdUJBQXVCLEVBQ3ZCLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FDckMsQ0FBQTtRQUVELElBQUksSUFBSSxDQUFDLCtCQUErQixDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQztZQUMvRCxJQUFJLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLENBQUM7Z0JBQ2pFLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtZQUMxRCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBQ3RELENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksSUFBSSxDQUFDLCtCQUErQixDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQztnQkFDakUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ3BELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGVBQWUsQ0FDdEIsTUFBbUIsRUFDbkIsVUFBZ0UsRUFDaEUsT0FBaUI7UUFFakIsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFBO1FBQ25FLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQTtRQUN4RSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUE7UUFFOUUsS0FBSyxNQUFNLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2pELE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1lBRXRFLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQTtZQUMzQixNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQTtZQUNqRSxNQUFNLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEVBQUcsQ0FBQTtZQUMzQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVM7Z0JBQ3ZCLE1BQU0sQ0FBQyxLQUFLO29CQUNaLElBQUk7b0JBQ0osUUFBUSxDQUFDLGtCQUFrQixFQUFFLHdCQUF3QixFQUFFLFVBQVUsQ0FBQyxZQUFZLEVBQUcsQ0FBQyxDQUFBO1lBRW5GLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQzNCLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDdkIsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDUCxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDMUIsQ0FBQztnQkFFRCxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDYixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxNQUFtQjtRQUNsRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUMvQyxJQUFJLE1BQU0sQ0FDVCxxQ0FBcUMsRUFDckMsUUFBUSxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsRUFDaEMsU0FBUyxFQUNULElBQUksRUFDSixLQUFLLElBQUksRUFBRTtZQUNWLE1BQU0sSUFBSSxDQUFDLCtCQUErQixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25FLENBQUMsQ0FDRCxDQUNELENBQUE7UUFFRCxNQUFNLFlBQVksR0FBRztZQUNwQjtnQkFDQyxNQUFNLEVBQUUsV0FBVztnQkFDbkIsVUFBVSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FDcEQsV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FDeEMsQ0FBQyxDQUFDLENBQUM7YUFDSjtTQUNELENBQUE7UUFFRCxJQUFJLElBQUksQ0FBQywrQkFBK0IsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLENBQUM7WUFDcEUsTUFBTSxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FDaEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksRUFBRSxDQUNBLENBQUE7WUFDckMsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBRXZELE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFBO1lBQ25FLG1CQUFtQixDQUFDLFNBQVMsR0FBRyxRQUFRLENBQ3ZDLGNBQWMsRUFDZCwyRUFBMkUsRUFDM0UsSUFBSSxDQUNKLENBQUE7WUFFRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQ3JELElBQUksTUFBTSxDQUNULDJDQUEyQyxFQUMzQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsY0FBYyxDQUFDLEVBQzdDLFNBQVMsRUFDVCxJQUFJLEVBQ0osS0FBSyxJQUFJLEVBQUU7Z0JBQ1YsTUFBTSxJQUFJLENBQUMsK0JBQStCLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDdEUsQ0FBQyxDQUNELENBQ0QsQ0FBQTtZQUVELFlBQVksQ0FBQyxJQUFJLENBQUM7Z0JBQ2pCLE1BQU0sRUFBRSxpQkFBaUI7Z0JBQ3pCLFVBQVUsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQ3BELFdBQVcsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUNwRCxDQUFDLENBQUMsQ0FBQzthQUNKLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRU8sMkJBQTJCLENBQUMsTUFBbUI7UUFDdEQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUU7WUFDNUI7Z0JBQ0MsTUFBTSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQ25DLElBQUksTUFBTSxDQUNULG9DQUFvQyxFQUNwQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsYUFBYSxDQUFDLEVBQzFDLFNBQVMsRUFDVCxJQUFJLEVBQ0osS0FBSyxJQUFJLEVBQUU7b0JBQ1YsTUFBTSxJQUFJLENBQUMsK0JBQStCLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3BFLENBQUMsQ0FDRCxDQUNEO2dCQUNELFVBQVUsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLENBQ3BELFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQ3hDLENBQUMsQ0FBQyxDQUFDO2FBQ0o7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sdUJBQXVCLENBQUMsTUFBbUI7UUFDbEQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLEVBQUUsaUNBQXlCLEVBQUUsQ0FBQztZQUN4RSxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLHdDQUF3QyxDQUFDLENBQUMsQ0FBQTtRQUMvRSxJQUFJLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLHNCQUFzQixFQUFFLEVBQUUsQ0FBQztZQUNwRSxXQUFXLENBQUMsU0FBUztnQkFDcEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLHFDQUE2QjtvQkFDckUsQ0FBQyxDQUFDLFFBQVEsQ0FDUiwwQkFBMEIsRUFDMUIsZ0ZBQWdGLENBQ2hGO29CQUNGLENBQUMsQ0FBQyxRQUFRLENBQ1IsdUJBQXVCLEVBQ3ZCLDZFQUE2RSxDQUM3RSxDQUFBO1FBQ0wsQ0FBQzthQUFNLENBQUM7WUFDUCxXQUFXLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FDL0IscUJBQXFCLEVBQ3JCLG1FQUFtRSxDQUNuRSxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyw4QkFBOEIsQ0FDckMsTUFBbUIsRUFDbkIsVUFBa0IsRUFDbEIsWUFBb0I7UUFFcEIsTUFBTSwwQkFBMEIsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUE7UUFDM0YsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUE7UUFDaEcsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMseUNBQXlDLENBQUMsQ0FBQyxDQUFBO1FBQ3RGLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FDN0IsMEJBQTBCLEVBQzFCLENBQUMsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUMxQyxDQUFBO1FBRUQsV0FBVyxDQUFDLFNBQVMsR0FBRyxVQUFVLENBQUE7UUFDbEMsZUFBZSxDQUFDLFNBQVMsR0FBRyxZQUFZLENBQUE7SUFDekMsQ0FBQztJQUVPLDRCQUE0QixDQUNuQyxNQUFtQixFQUNuQixXQUFxQixFQUNyQixjQUF3QjtRQUV4QixNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDLENBQUE7UUFDdEYsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUN0RCxLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUMzRCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtZQUM3RCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtZQUU3RCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxDQUFBO1lBRXJDLE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM5QyxLQUFLLE1BQU0sSUFBSSxJQUFJLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztvQkFDOUIsTUFBTSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7Z0JBQzVDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUMzQixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFHLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FDbkYsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBR0QsTUFBTSxDQUFDLFNBQW9CO1FBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztZQUN2QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUV2QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7WUFDL0MsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ3JCLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtJQUNqQyxDQUFDOztBQS9lYTtJQURiLFFBQVEsQ0FBQyxHQUFHLENBQUM7a0RBeUdiO0FBN1ZXLG9CQUFvQjtJQXdCOUIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLDJCQUEyQixDQUFBO0lBRTNCLFdBQUEsbUNBQW1DLENBQUE7SUFFbkMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGdDQUFnQyxDQUFBO0lBRWhDLFdBQUEsOEJBQThCLENBQUE7SUFFOUIsWUFBQSxvQ0FBb0MsQ0FBQTtJQUVwQyxZQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsa0JBQWtCLENBQUE7R0F4Q1Isb0JBQW9CLENBcXVCaEM7O0FBRUQsZ0NBQWdDO0FBQ2hDLFNBQVMsb0JBQW9CLENBQUMsU0FBaUI7SUFDOUMsTUFBTSxLQUFLLEdBQUcsNkJBQTZCLENBQUEsQ0FBQyxrQ0FBa0M7SUFDOUUsT0FBTyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQTtBQUNoRCxDQUFDIn0=