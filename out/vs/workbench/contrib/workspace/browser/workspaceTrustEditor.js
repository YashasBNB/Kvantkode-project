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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVHJ1c3RFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dvcmtzcGFjZS9icm93c2VyL3dvcmtzcGFjZVRydXN0RWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sQ0FBQyxFQUNELHFCQUFxQixFQUNyQiw2QkFBNkIsRUFDN0IsTUFBTSxFQUNOLFNBQVMsRUFFVCxXQUFXLEVBQ1gsU0FBUyxFQUNULHlCQUF5QixHQUN6QixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDeEUsT0FBTyxFQUFZLFFBQVEsRUFBZSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWpHLE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9D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