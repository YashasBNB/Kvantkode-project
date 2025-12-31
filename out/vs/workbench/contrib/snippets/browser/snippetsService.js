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
var SnippetEnablement_1, SnippetUsageTimestamps_1;
import { combinedDisposable, DisposableStore, } from '../../../../base/common/lifecycle.js';
import * as resources from '../../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { setSnippetSuggestSupport } from '../../../../editor/contrib/suggest/browser/suggest.js';
import { localize } from '../../../../nls.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { SnippetFile } from './snippetsFile.js';
import { ExtensionsRegistry, } from '../../../services/extensions/common/extensionsRegistry.js';
import { languagesExtPoint } from '../../../services/language/common/languageService.js';
import { SnippetCompletionProvider } from './snippetCompletionProvider.js';
import { IExtensionResourceLoaderService } from '../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { isStringArray } from '../../../../base/common/types.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { ILanguageConfigurationService } from '../../../../editor/common/languages/languageConfigurationRegistry.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { insertInto } from '../../../../base/common/arrays.js';
var snippetExt;
(function (snippetExt) {
    function toValidSnippet(extension, snippet, languageService) {
        if (isFalsyOrWhitespace(snippet.path)) {
            extension.collector.error(localize('invalid.path.0', 'Expected string in `contributes.{0}.path`. Provided value: {1}', extension.description.name, String(snippet.path)));
            return null;
        }
        if (isFalsyOrWhitespace(snippet.language) && !snippet.path.endsWith('.code-snippets')) {
            extension.collector.error(localize('invalid.language.0', 'When omitting the language, the value of `contributes.{0}.path` must be a `.code-snippets`-file. Provided value: {1}', extension.description.name, String(snippet.path)));
            return null;
        }
        if (!isFalsyOrWhitespace(snippet.language) &&
            !languageService.isRegisteredLanguageId(snippet.language)) {
            extension.collector.error(localize('invalid.language', 'Unknown language in `contributes.{0}.language`. Provided value: {1}', extension.description.name, String(snippet.language)));
            return null;
        }
        const extensionLocation = extension.description.extensionLocation;
        const snippetLocation = resources.joinPath(extensionLocation, snippet.path);
        if (!resources.isEqualOrParent(snippetLocation, extensionLocation)) {
            extension.collector.error(localize('invalid.path.1', "Expected `contributes.{0}.path` ({1}) to be included inside extension's folder ({2}). This might make the extension non-portable.", extension.description.name, snippetLocation.path, extensionLocation.path));
            return null;
        }
        return {
            language: snippet.language,
            location: snippetLocation,
        };
    }
    snippetExt.toValidSnippet = toValidSnippet;
    snippetExt.snippetsContribution = {
        description: localize('vscode.extension.contributes.snippets', 'Contributes snippets.'),
        type: 'array',
        defaultSnippets: [{ body: [{ language: '', path: '' }] }],
        items: {
            type: 'object',
            defaultSnippets: [{ body: { language: '${1:id}', path: './snippets/${2:id}.json.' } }],
            properties: {
                language: {
                    description: localize('vscode.extension.contributes.snippets-language', 'Language identifier for which this snippet is contributed to.'),
                    type: 'string',
                },
                path: {
                    description: localize('vscode.extension.contributes.snippets-path', "Path of the snippets file. The path is relative to the extension folder and typically starts with './snippets/'."),
                    type: 'string',
                },
            },
        },
    };
    snippetExt.point = ExtensionsRegistry.registerExtensionPoint({
        extensionPoint: 'snippets',
        deps: [languagesExtPoint],
        jsonSchema: snippetExt.snippetsContribution,
    });
})(snippetExt || (snippetExt = {}));
function watch(service, resource, callback) {
    return combinedDisposable(service.watch(resource), service.onDidFilesChange((e) => {
        if (e.affects(resource)) {
            callback();
        }
    }));
}
let SnippetEnablement = class SnippetEnablement {
    static { SnippetEnablement_1 = this; }
    static { this._key = 'snippets.ignoredSnippets'; }
    constructor(_storageService) {
        this._storageService = _storageService;
        const raw = _storageService.get(SnippetEnablement_1._key, 0 /* StorageScope.PROFILE */, '');
        let data;
        try {
            data = JSON.parse(raw);
        }
        catch { }
        this._ignored = isStringArray(data) ? new Set(data) : new Set();
    }
    isIgnored(id) {
        return this._ignored.has(id);
    }
    updateIgnored(id, value) {
        let changed = false;
        if (this._ignored.has(id) && !value) {
            this._ignored.delete(id);
            changed = true;
        }
        else if (!this._ignored.has(id) && value) {
            this._ignored.add(id);
            changed = true;
        }
        if (changed) {
            this._storageService.store(SnippetEnablement_1._key, JSON.stringify(Array.from(this._ignored)), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
    }
};
SnippetEnablement = SnippetEnablement_1 = __decorate([
    __param(0, IStorageService)
], SnippetEnablement);
let SnippetUsageTimestamps = class SnippetUsageTimestamps {
    static { SnippetUsageTimestamps_1 = this; }
    static { this._key = 'snippets.usageTimestamps'; }
    constructor(_storageService) {
        this._storageService = _storageService;
        const raw = _storageService.get(SnippetUsageTimestamps_1._key, 0 /* StorageScope.PROFILE */, '');
        let data;
        try {
            data = JSON.parse(raw);
        }
        catch {
            data = [];
        }
        this._usages = Array.isArray(data) ? new Map(data) : new Map();
    }
    getUsageTimestamp(id) {
        return this._usages.get(id);
    }
    updateUsageTimestamp(id) {
        // map uses insertion order, we want most recent at the end
        this._usages.delete(id);
        this._usages.set(id, Date.now());
        // persist last 100 item
        const all = [...this._usages].slice(-100);
        this._storageService.store(SnippetUsageTimestamps_1._key, JSON.stringify(all), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
};
SnippetUsageTimestamps = SnippetUsageTimestamps_1 = __decorate([
    __param(0, IStorageService)
], SnippetUsageTimestamps);
let SnippetsService = class SnippetsService {
    constructor(_environmentService, _userDataProfileService, _contextService, _languageService, _logService, _fileService, _textfileService, _extensionResourceLoaderService, lifecycleService, instantiationService, languageConfigurationService) {
        this._environmentService = _environmentService;
        this._userDataProfileService = _userDataProfileService;
        this._contextService = _contextService;
        this._languageService = _languageService;
        this._logService = _logService;
        this._fileService = _fileService;
        this._textfileService = _textfileService;
        this._extensionResourceLoaderService = _extensionResourceLoaderService;
        this._disposables = new DisposableStore();
        this._pendingWork = [];
        this._files = new ResourceMap();
        this._pendingWork.push(Promise.resolve(lifecycleService.when(3 /* LifecyclePhase.Restored */).then(() => {
            this._initExtensionSnippets();
            this._initUserSnippets();
            this._initWorkspaceSnippets();
        })));
        setSnippetSuggestSupport(new SnippetCompletionProvider(this._languageService, this, languageConfigurationService));
        this._enablement = instantiationService.createInstance(SnippetEnablement);
        this._usageTimestamps = instantiationService.createInstance(SnippetUsageTimestamps);
    }
    dispose() {
        this._disposables.dispose();
    }
    isEnabled(snippet) {
        return !this._enablement.isIgnored(snippet.snippetIdentifier);
    }
    updateEnablement(snippet, enabled) {
        this._enablement.updateIgnored(snippet.snippetIdentifier, !enabled);
    }
    updateUsageTimestamp(snippet) {
        this._usageTimestamps.updateUsageTimestamp(snippet.snippetIdentifier);
    }
    _joinSnippets() {
        const promises = this._pendingWork.slice(0);
        this._pendingWork.length = 0;
        return Promise.all(promises);
    }
    async getSnippetFiles() {
        await this._joinSnippets();
        return this._files.values();
    }
    async getSnippets(languageId, opts) {
        await this._joinSnippets();
        const result = [];
        const promises = [];
        if (languageId) {
            if (this._languageService.isRegisteredLanguageId(languageId)) {
                for (const file of this._files.values()) {
                    promises.push(file
                        .load()
                        .then((file) => file.select(languageId, result))
                        .catch((err) => this._logService.error(err, file.location.toString())));
                }
            }
        }
        else {
            for (const file of this._files.values()) {
                promises.push(file
                    .load()
                    .then((file) => insertInto(result, result.length, file.data))
                    .catch((err) => this._logService.error(err, file.location.toString())));
            }
        }
        await Promise.all(promises);
        return this._filterAndSortSnippets(result, opts);
    }
    getSnippetsSync(languageId, opts) {
        const result = [];
        if (this._languageService.isRegisteredLanguageId(languageId)) {
            for (const file of this._files.values()) {
                // kick off loading (which is a noop in case it's already loaded)
                // and optimistically collect snippets
                file.load().catch((_err) => {
                    /*ignore*/
                });
                file.select(languageId, result);
            }
        }
        return this._filterAndSortSnippets(result, opts);
    }
    _filterAndSortSnippets(snippets, opts) {
        const result = [];
        for (const snippet of snippets) {
            if (!snippet.prefix && !opts?.includeNoPrefixSnippets) {
                // prefix or no-prefix wanted
                continue;
            }
            if (!this.isEnabled(snippet) && !opts?.includeDisabledSnippets) {
                // enabled or disabled wanted
                continue;
            }
            if (typeof opts?.fileTemplateSnippets === 'boolean' &&
                opts.fileTemplateSnippets !== snippet.isFileTemplate) {
                // isTopLevel requested but mismatching
                continue;
            }
            result.push(snippet);
        }
        return result.sort((a, b) => {
            let result = 0;
            if (!opts?.noRecencySort) {
                const val1 = this._usageTimestamps.getUsageTimestamp(a.snippetIdentifier) ?? -1;
                const val2 = this._usageTimestamps.getUsageTimestamp(b.snippetIdentifier) ?? -1;
                result = val2 - val1;
            }
            if (result === 0) {
                result = this._compareSnippet(a, b);
            }
            return result;
        });
    }
    _compareSnippet(a, b) {
        if (a.snippetSource < b.snippetSource) {
            return -1;
        }
        else if (a.snippetSource > b.snippetSource) {
            return 1;
        }
        else if (a.source < b.source) {
            return -1;
        }
        else if (a.source > b.source) {
            return 1;
        }
        else if (a.name > b.name) {
            return 1;
        }
        else if (a.name < b.name) {
            return -1;
        }
        else {
            return 0;
        }
    }
    // --- loading, watching
    _initExtensionSnippets() {
        snippetExt.point.setHandler((extensions) => {
            for (const [key, value] of this._files) {
                if (value.source === 3 /* SnippetSource.Extension */) {
                    this._files.delete(key);
                }
            }
            for (const extension of extensions) {
                for (const contribution of extension.value) {
                    const validContribution = snippetExt.toValidSnippet(extension, contribution, this._languageService);
                    if (!validContribution) {
                        continue;
                    }
                    const file = this._files.get(validContribution.location);
                    if (file) {
                        if (file.defaultScopes) {
                            file.defaultScopes.push(validContribution.language);
                        }
                        else {
                            file.defaultScopes = [];
                        }
                    }
                    else {
                        const file = new SnippetFile(3 /* SnippetSource.Extension */, validContribution.location, validContribution.language ? [validContribution.language] : undefined, extension.description, this._fileService, this._extensionResourceLoaderService);
                        this._files.set(file.location, file);
                        if (this._environmentService.isExtensionDevelopment) {
                            file.load().then((file) => {
                                // warn about bad tabstop/variable usage
                                if (file.data.some((snippet) => snippet.isBogous)) {
                                    extension.collector.warn(localize('badVariableUse', "One or more snippets from the extension '{0}' very likely confuse snippet-variables and snippet-placeholders (see https://code.visualstudio.com/docs/editor/userdefinedsnippets#_snippet-syntax for more details)", extension.description.name));
                                }
                            }, (err) => {
                                // generic error
                                extension.collector.warn(localize('badFile', 'The snippet file "{0}" could not be read.', file.location.toString()));
                            });
                        }
                    }
                }
            }
        });
    }
    _initWorkspaceSnippets() {
        // workspace stuff
        const disposables = new DisposableStore();
        const updateWorkspaceSnippets = () => {
            disposables.clear();
            this._pendingWork.push(this._initWorkspaceFolderSnippets(this._contextService.getWorkspace(), disposables));
        };
        this._disposables.add(disposables);
        this._disposables.add(this._contextService.onDidChangeWorkspaceFolders(updateWorkspaceSnippets));
        this._disposables.add(this._contextService.onDidChangeWorkbenchState(updateWorkspaceSnippets));
        updateWorkspaceSnippets();
    }
    async _initWorkspaceFolderSnippets(workspace, bucket) {
        const promises = workspace.folders.map(async (folder) => {
            const snippetFolder = folder.toResource('.vscode');
            const value = await this._fileService.exists(snippetFolder);
            if (value) {
                this._initFolderSnippets(2 /* SnippetSource.Workspace */, snippetFolder, bucket);
            }
            else {
                // watch
                bucket.add(this._fileService.onDidFilesChange((e) => {
                    if (e.contains(snippetFolder, 1 /* FileChangeType.ADDED */)) {
                        this._initFolderSnippets(2 /* SnippetSource.Workspace */, snippetFolder, bucket);
                    }
                }));
            }
        });
        await Promise.all(promises);
    }
    async _initUserSnippets() {
        const disposables = new DisposableStore();
        const updateUserSnippets = async () => {
            disposables.clear();
            const userSnippetsFolder = this._userDataProfileService.currentProfile.snippetsHome;
            await this._fileService.createFolder(userSnippetsFolder);
            await this._initFolderSnippets(1 /* SnippetSource.User */, userSnippetsFolder, disposables);
        };
        this._disposables.add(disposables);
        this._disposables.add(this._userDataProfileService.onDidChangeCurrentProfile((e) => e.join((async () => {
            this._pendingWork.push(updateUserSnippets());
        })())));
        await updateUserSnippets();
    }
    _initFolderSnippets(source, folder, bucket) {
        const disposables = new DisposableStore();
        const addFolderSnippets = async () => {
            disposables.clear();
            if (!(await this._fileService.exists(folder))) {
                return;
            }
            try {
                const stat = await this._fileService.resolve(folder);
                for (const entry of stat.children || []) {
                    disposables.add(this._addSnippetFile(entry.resource, source));
                }
            }
            catch (err) {
                this._logService.error(`Failed snippets from folder '${folder.toString()}'`, err);
            }
        };
        bucket.add(this._textfileService.files.onDidSave((e) => {
            if (resources.isEqualOrParent(e.model.resource, folder)) {
                addFolderSnippets();
            }
        }));
        bucket.add(watch(this._fileService, folder, addFolderSnippets));
        bucket.add(disposables);
        return addFolderSnippets();
    }
    _addSnippetFile(uri, source) {
        const ext = resources.extname(uri);
        if (source === 1 /* SnippetSource.User */ && ext === '.json') {
            const langName = resources.basename(uri).replace(/\.json/, '');
            this._files.set(uri, new SnippetFile(source, uri, [langName], undefined, this._fileService, this._extensionResourceLoaderService));
        }
        else if (ext === '.code-snippets') {
            this._files.set(uri, new SnippetFile(source, uri, undefined, undefined, this._fileService, this._extensionResourceLoaderService));
        }
        return {
            dispose: () => this._files.delete(uri),
        };
    }
};
SnippetsService = __decorate([
    __param(0, IEnvironmentService),
    __param(1, IUserDataProfileService),
    __param(2, IWorkspaceContextService),
    __param(3, ILanguageService),
    __param(4, ILogService),
    __param(5, IFileService),
    __param(6, ITextFileService),
    __param(7, IExtensionResourceLoaderService),
    __param(8, ILifecycleService),
    __param(9, IInstantiationService),
    __param(10, ILanguageConfigurationService)
], SnippetsService);
export { SnippetsService };
export function getNonWhitespacePrefix(model, position) {
    /**
     * Do not analyze more characters
     */
    const MAX_PREFIX_LENGTH = 100;
    const line = model.getLineContent(position.lineNumber).substr(0, position.column - 1);
    const minChIndex = Math.max(0, line.length - MAX_PREFIX_LENGTH);
    for (let chIndex = line.length - 1; chIndex >= minChIndex; chIndex--) {
        const ch = line.charAt(chIndex);
        if (/\s/.test(ch)) {
            return line.substr(chIndex + 1);
        }
    }
    if (minChIndex === 0) {
        return line;
    }
    return '';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvYnJvd3Nlci9zbmlwcGV0c1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFDTixrQkFBa0IsRUFFbEIsZUFBZSxHQUNmLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUd4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFrQixZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RixPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0saURBQWlELENBQUE7QUFDbkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFFTix3QkFBd0IsR0FDeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUUzRCxPQUFPLEVBQVcsV0FBVyxFQUFpQixNQUFNLG1CQUFtQixDQUFBO0FBQ3ZFLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMx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