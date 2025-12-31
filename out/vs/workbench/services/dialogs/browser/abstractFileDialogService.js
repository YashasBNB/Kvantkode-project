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
import * as nls from '../../../../nls.js';
import { isWorkspaceToOpen, isFileToOpen, } from '../../../../platform/window/common/window.js';
import { IDialogService, getFileNamesMessage, } from '../../../../platform/dialogs/common/dialogs.js';
import { isSavedWorkspace, isTemporaryWorkspace, IWorkspaceContextService, WORKSPACE_EXTENSION, } from '../../../../platform/workspace/common/workspace.js';
import { IHistoryService } from '../../history/common/history.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import * as resources from '../../../../base/common/resources.js';
import { isAbsolute as localPathIsAbsolute, normalize as localPathNormalize, } from '../../../../base/common/path.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { SimpleFileDialog } from './simpleFileDialog.js';
import { IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IHostService } from '../../host/browser/host.js';
import Severity from '../../../../base/common/severity.js';
import { coalesce, distinct } from '../../../../base/common/arrays.js';
import { trim } from '../../../../base/common/strings.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IPathService } from '../../path/common/pathService.js';
import { Schemas } from '../../../../base/common/network.js';
import { PLAINTEXT_EXTENSION } from '../../../../editor/common/languages/modesRegistry.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { EditorOpenSource } from '../../../../platform/editor/common/editor.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let AbstractFileDialogService = class AbstractFileDialogService {
    constructor(hostService, contextService, historyService, environmentService, instantiationService, configurationService, fileService, openerService, dialogService, languageService, workspacesService, labelService, pathService, commandService, editorService, codeEditorService, logService) {
        this.hostService = hostService;
        this.contextService = contextService;
        this.historyService = historyService;
        this.environmentService = environmentService;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.fileService = fileService;
        this.openerService = openerService;
        this.dialogService = dialogService;
        this.languageService = languageService;
        this.workspacesService = workspacesService;
        this.labelService = labelService;
        this.pathService = pathService;
        this.commandService = commandService;
        this.editorService = editorService;
        this.codeEditorService = codeEditorService;
        this.logService = logService;
    }
    async defaultFilePath(schemeFilter = this.getSchemeFilterForWindow(), authorityFilter = this.getAuthorityFilterForWindow()) {
        // Check for last active file first...
        let candidate = this.historyService.getLastActiveFile(schemeFilter, authorityFilter);
        // ...then for last active file root
        if (!candidate) {
            candidate = this.historyService.getLastActiveWorkspaceRoot(schemeFilter, authorityFilter);
        }
        else {
            candidate = resources.dirname(candidate);
        }
        if (!candidate) {
            candidate = await this.preferredHome(schemeFilter);
        }
        return candidate;
    }
    async defaultFolderPath(schemeFilter = this.getSchemeFilterForWindow(), authorityFilter = this.getAuthorityFilterForWindow()) {
        // Check for last active file root first...
        let candidate = this.historyService.getLastActiveWorkspaceRoot(schemeFilter, authorityFilter);
        // ...then for last active file
        if (!candidate) {
            candidate = this.historyService.getLastActiveFile(schemeFilter, authorityFilter);
        }
        if (!candidate) {
            return this.preferredHome(schemeFilter);
        }
        return resources.dirname(candidate);
    }
    async preferredHome(schemeFilter = this.getSchemeFilterForWindow()) {
        const preferLocal = schemeFilter === Schemas.file;
        const preferredHomeConfig = this.configurationService.inspect('files.dialog.defaultPath');
        const preferredHomeCandidate = preferLocal
            ? preferredHomeConfig.userLocalValue
            : preferredHomeConfig.userRemoteValue;
        if (preferredHomeCandidate) {
            const isPreferredHomeCandidateAbsolute = preferLocal
                ? localPathIsAbsolute(preferredHomeCandidate)
                : (await this.pathService.path).isAbsolute(preferredHomeCandidate);
            if (isPreferredHomeCandidateAbsolute) {
                const preferredHomeNormalized = preferLocal
                    ? localPathNormalize(preferredHomeCandidate)
                    : (await this.pathService.path).normalize(preferredHomeCandidate);
                const preferredHome = resources.toLocalResource(await this.pathService.fileURI(preferredHomeNormalized), this.environmentService.remoteAuthority, this.pathService.defaultUriScheme);
                if (await this.fileService.exists(preferredHome)) {
                    return preferredHome;
                }
            }
        }
        return this.pathService.userHome({ preferLocal });
    }
    async defaultWorkspacePath(schemeFilter = this.getSchemeFilterForWindow()) {
        let defaultWorkspacePath;
        // Check for current workspace config file first...
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            const configuration = this.contextService.getWorkspace().configuration;
            if (configuration?.scheme === schemeFilter &&
                isSavedWorkspace(configuration, this.environmentService) &&
                !isTemporaryWorkspace(configuration)) {
                defaultWorkspacePath = resources.dirname(configuration);
            }
        }
        // ...then fallback to default file path
        if (!defaultWorkspacePath) {
            defaultWorkspacePath = await this.defaultFilePath(schemeFilter);
        }
        return defaultWorkspacePath;
    }
    async showSaveConfirm(fileNamesOrResources) {
        if (this.skipDialogs()) {
            this.logService.trace('FileDialogService: refused to show save confirmation dialog in tests.');
            // no veto when we are in extension dev testing mode because we cannot assume we run interactive
            return 1 /* ConfirmResult.DONT_SAVE */;
        }
        return this.doShowSaveConfirm(fileNamesOrResources);
    }
    skipDialogs() {
        if (this.environmentService.isExtensionDevelopment &&
            this.environmentService.extensionTestsLocationURI) {
            return true; // integration tests
        }
        return !!this.environmentService.enableSmokeTestDriver; // smoke tests
    }
    async doShowSaveConfirm(fileNamesOrResources) {
        if (fileNamesOrResources.length === 0) {
            return 1 /* ConfirmResult.DONT_SAVE */;
        }
        let message;
        let detail = nls.localize('saveChangesDetail', "Your changes will be lost if you don't save them.");
        if (fileNamesOrResources.length === 1) {
            message = nls.localize('saveChangesMessage', 'Do you want to save the changes you made to {0}?', typeof fileNamesOrResources[0] === 'string'
                ? fileNamesOrResources[0]
                : resources.basename(fileNamesOrResources[0]));
        }
        else {
            message = nls.localize('saveChangesMessages', 'Do you want to save the changes to the following {0} files?', fileNamesOrResources.length);
            detail = getFileNamesMessage(fileNamesOrResources) + '\n' + detail;
        }
        const { result } = await this.dialogService.prompt({
            type: Severity.Warning,
            message,
            detail,
            buttons: [
                {
                    label: fileNamesOrResources.length > 1
                        ? nls.localize({ key: 'saveAll', comment: ['&& denotes a mnemonic'] }, '&&Save All')
                        : nls.localize({ key: 'save', comment: ['&& denotes a mnemonic'] }, '&&Save'),
                    run: () => 0 /* ConfirmResult.SAVE */,
                },
                {
                    label: nls.localize({ key: 'dontSave', comment: ['&& denotes a mnemonic'] }, "Do&&n't Save"),
                    run: () => 1 /* ConfirmResult.DONT_SAVE */,
                },
            ],
            cancelButton: {
                run: () => 2 /* ConfirmResult.CANCEL */,
            },
        });
        return result;
    }
    addFileSchemaIfNeeded(schema, _isFolder) {
        return schema === Schemas.untitled
            ? [Schemas.file]
            : schema !== Schemas.file
                ? [schema, Schemas.file]
                : [schema];
    }
    async pickFileFolderAndOpenSimplified(schema, options, preferNewWindow) {
        const title = nls.localize('openFileOrFolder.title', 'Open File or Folder');
        const availableFileSystems = this.addFileSchemaIfNeeded(schema);
        const uri = await this.pickResource({
            canSelectFiles: true,
            canSelectFolders: true,
            canSelectMany: false,
            defaultUri: options.defaultUri,
            title,
            availableFileSystems,
        });
        if (uri) {
            const stat = await this.fileService.stat(uri);
            const toOpen = stat.isDirectory ? { folderUri: uri } : { fileUri: uri };
            if (!isWorkspaceToOpen(toOpen) && isFileToOpen(toOpen)) {
                this.addFileToRecentlyOpened(toOpen.fileUri);
            }
            if (stat.isDirectory || options.forceNewWindow || preferNewWindow) {
                await this.hostService.openWindow([toOpen], {
                    forceNewWindow: options.forceNewWindow,
                    remoteAuthority: options.remoteAuthority,
                });
            }
            else {
                await this.editorService.openEditors([{ resource: uri, options: { source: EditorOpenSource.USER, pinned: true } }], undefined, { validateTrust: true });
            }
        }
    }
    async pickFileAndOpenSimplified(schema, options, preferNewWindow) {
        const title = nls.localize('openFile.title', 'Open File');
        const availableFileSystems = this.addFileSchemaIfNeeded(schema);
        const uri = await this.pickResource({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            defaultUri: options.defaultUri,
            title,
            availableFileSystems,
        });
        if (uri) {
            this.addFileToRecentlyOpened(uri);
            if (options.forceNewWindow || preferNewWindow) {
                await this.hostService.openWindow([{ fileUri: uri }], {
                    forceNewWindow: options.forceNewWindow,
                    remoteAuthority: options.remoteAuthority,
                });
            }
            else {
                await this.editorService.openEditors([{ resource: uri, options: { source: EditorOpenSource.USER, pinned: true } }], undefined, { validateTrust: true });
            }
        }
    }
    addFileToRecentlyOpened(uri) {
        this.workspacesService.addRecentlyOpened([
            { fileUri: uri, label: this.labelService.getUriLabel(uri, { appendWorkspaceSuffix: true }) },
        ]);
    }
    async pickFolderAndOpenSimplified(schema, options) {
        const title = nls.localize('openFolder.title', 'Open Folder');
        const availableFileSystems = this.addFileSchemaIfNeeded(schema, true);
        const uri = await this.pickResource({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            defaultUri: options.defaultUri,
            title,
            availableFileSystems,
        });
        if (uri) {
            return this.hostService.openWindow([{ folderUri: uri }], {
                forceNewWindow: options.forceNewWindow,
                remoteAuthority: options.remoteAuthority,
            });
        }
    }
    async pickWorkspaceAndOpenSimplified(schema, options) {
        const title = nls.localize('openWorkspace.title', 'Open Workspace from File');
        const filters = [
            {
                name: nls.localize('filterName.workspace', 'Workspace'),
                extensions: [WORKSPACE_EXTENSION],
            },
        ];
        const availableFileSystems = this.addFileSchemaIfNeeded(schema, true);
        const uri = await this.pickResource({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            defaultUri: options.defaultUri,
            title,
            filters,
            availableFileSystems,
        });
        if (uri) {
            return this.hostService.openWindow([{ workspaceUri: uri }], {
                forceNewWindow: options.forceNewWindow,
                remoteAuthority: options.remoteAuthority,
            });
        }
    }
    async pickFileToSaveSimplified(schema, options) {
        if (!options.availableFileSystems) {
            options.availableFileSystems = this.addFileSchemaIfNeeded(schema);
        }
        options.title = nls.localize('saveFileAs.title', 'Save As');
        const uri = await this.saveRemoteResource(options);
        if (uri) {
            this.addFileToRecentlyOpened(uri);
        }
        return uri;
    }
    async showSaveDialogSimplified(schema, options) {
        if (!options.availableFileSystems) {
            options.availableFileSystems = this.addFileSchemaIfNeeded(schema);
        }
        return this.saveRemoteResource(options);
    }
    async showOpenDialogSimplified(schema, options) {
        if (!options.availableFileSystems) {
            options.availableFileSystems = this.addFileSchemaIfNeeded(schema, options.canSelectFolders);
        }
        const uri = await this.pickResource(options);
        return uri ? [uri] : undefined;
    }
    getSimpleFileDialog() {
        return this.instantiationService.createInstance(SimpleFileDialog);
    }
    pickResource(options) {
        return this.getSimpleFileDialog().showOpenDialog(options);
    }
    saveRemoteResource(options) {
        return this.getSimpleFileDialog().showSaveDialog(options);
    }
    getSchemeFilterForWindow(defaultUriScheme) {
        return defaultUriScheme ?? this.pathService.defaultUriScheme;
    }
    getAuthorityFilterForWindow() {
        return this.environmentService.remoteAuthority;
    }
    getFileSystemSchema(options) {
        return ((options.availableFileSystems && options.availableFileSystems[0]) ||
            this.getSchemeFilterForWindow(options.defaultUri?.scheme));
    }
    getWorkspaceAvailableFileSystems(options) {
        if (options.availableFileSystems && options.availableFileSystems.length > 0) {
            return options.availableFileSystems;
        }
        const availableFileSystems = [Schemas.file];
        if (this.environmentService.remoteAuthority) {
            availableFileSystems.unshift(Schemas.vscodeRemote);
        }
        return availableFileSystems;
    }
    getPickFileToSaveDialogOptions(defaultUri, availableFileSystems) {
        const options = {
            defaultUri,
            title: nls.localize('saveAsTitle', 'Save As'),
            availableFileSystems,
        };
        // Build the file filter by using our known languages
        const ext = defaultUri ? resources.extname(defaultUri) : undefined;
        let matchingFilter;
        const registeredLanguageNames = this.languageService.getSortedRegisteredLanguageNames();
        const registeredLanguageFilters = coalesce(registeredLanguageNames.map(({ languageName, languageId }) => {
            const extensions = this.languageService.getExtensions(languageId);
            if (!extensions.length) {
                return null;
            }
            const filter = {
                name: languageName,
                extensions: distinct(extensions)
                    .slice(0, 10)
                    .map((e) => trim(e, '.')),
            };
            // https://github.com/microsoft/vscode/issues/115860
            const extOrPlaintext = ext || PLAINTEXT_EXTENSION;
            if (!matchingFilter && extensions.includes(extOrPlaintext)) {
                matchingFilter = filter;
                // The selected extension must be in the set of extensions that are in the filter list that is sent to the save dialog.
                // If it isn't, add it manually. https://github.com/microsoft/vscode/issues/147657
                const trimmedExt = trim(extOrPlaintext, '.');
                if (!filter.extensions.includes(trimmedExt)) {
                    filter.extensions.unshift(trimmedExt);
                }
                return null; // first matching filter will be added to the top
            }
            return filter;
        }));
        // We have no matching filter, e.g. because the language
        // is unknown. We still add the extension to the list of
        // filters though so that it can be picked
        // (https://github.com/microsoft/vscode/issues/96283)
        if (!matchingFilter && ext) {
            matchingFilter = { name: trim(ext, '.').toUpperCase(), extensions: [trim(ext, '.')] };
        }
        // Order of filters is
        // - All Files (we MUST do this to fix macOS issue https://github.com/microsoft/vscode/issues/102713)
        // - File Extension Match (if any)
        // - All Languages
        // - No Extension
        options.filters = coalesce([
            { name: nls.localize('allFiles', 'All Files'), extensions: ['*'] },
            matchingFilter,
            ...registeredLanguageFilters,
            { name: nls.localize('noExt', 'No Extension'), extensions: [''] },
        ]);
        return options;
    }
};
AbstractFileDialogService = __decorate([
    __param(0, IHostService),
    __param(1, IWorkspaceContextService),
    __param(2, IHistoryService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, IInstantiationService),
    __param(5, IConfigurationService),
    __param(6, IFileService),
    __param(7, IOpenerService),
    __param(8, IDialogService),
    __param(9, ILanguageService),
    __param(10, IWorkspacesService),
    __param(11, ILabelService),
    __param(12, IPathService),
    __param(13, ICommandService),
    __param(14, IEditorService),
    __param(15, ICodeEditorService),
    __param(16, ILogService)
], AbstractFileDialogService);
export { AbstractFileDialogService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RGaWxlRGlhbG9nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9kaWFsb2dzL2Jyb3dzZXIvYWJzdHJhY3RGaWxlRGlhbG9nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFFTixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQU1OLGNBQWMsRUFFZCxtQkFBbUIsR0FDbkIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLG9CQUFvQixFQUNwQix3QkFBd0IsRUFFeEIsbUJBQW1CLEdBQ25CLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTdGLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLFVBQVUsSUFBSSxtQkFBbUIsRUFDakMsU0FBUyxJQUFJLGtCQUFrQixHQUMvQixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBcUIsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENB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