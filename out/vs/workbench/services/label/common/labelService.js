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
import { URI } from '../../../../base/common/uri.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { posix, sep, win32 } from '../../../../base/common/path.js';
import { Emitter } from '../../../../base/common/event.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IWorkspaceContextService, isWorkspace, isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, toWorkspaceIdentifier, WORKSPACE_EXTENSION, isUntitledWorkspace, isTemporaryWorkspace, } from '../../../../platform/workspace/common/workspace.js';
import { basenameOrAuthority, basename, joinPath, dirname, } from '../../../../base/common/resources.js';
import { tildify, getPathLabel } from '../../../../base/common/labels.js';
import { ILabelService, } from '../../../../platform/label/common/label.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { match } from '../../../../base/common/glob.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IPathService } from '../../path/common/pathService.js';
import { isProposedApiEnabled } from '../../extensions/common/extensions.js';
import { OS } from '../../../../base/common/platform.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { Schemas } from '../../../../base/common/network.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Memento } from '../../../common/memento.js';
const resourceLabelFormattersExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'resourceLabelFormatters',
    jsonSchema: {
        description: localize('vscode.extension.contributes.resourceLabelFormatters', 'Contributes resource label formatting rules.'),
        type: 'array',
        items: {
            type: 'object',
            required: ['scheme', 'formatting'],
            properties: {
                scheme: {
                    type: 'string',
                    description: localize('vscode.extension.contributes.resourceLabelFormatters.scheme', 'URI scheme on which to match the formatter on. For example "file". Simple glob patterns are supported.'),
                },
                authority: {
                    type: 'string',
                    description: localize('vscode.extension.contributes.resourceLabelFormatters.authority', 'URI authority on which to match the formatter on. Simple glob patterns are supported.'),
                },
                formatting: {
                    description: localize('vscode.extension.contributes.resourceLabelFormatters.formatting', 'Rules for formatting uri resource labels.'),
                    type: 'object',
                    properties: {
                        label: {
                            type: 'string',
                            description: localize('vscode.extension.contributes.resourceLabelFormatters.label', 'Label rules to display. For example: myLabel:/${path}. ${path}, ${scheme}, ${authority} and ${authoritySuffix} are supported as variables.'),
                        },
                        separator: {
                            type: 'string',
                            description: localize('vscode.extension.contributes.resourceLabelFormatters.separator', "Separator to be used in the uri label display. '/' or '\' as an example."),
                        },
                        stripPathStartingSeparator: {
                            type: 'boolean',
                            description: localize('vscode.extension.contributes.resourceLabelFormatters.stripPathStartingSeparator', 'Controls whether `${path}` substitutions should have starting separator characters stripped.'),
                        },
                        tildify: {
                            type: 'boolean',
                            description: localize('vscode.extension.contributes.resourceLabelFormatters.tildify', 'Controls if the start of the uri label should be tildified when possible.'),
                        },
                        workspaceSuffix: {
                            type: 'string',
                            description: localize('vscode.extension.contributes.resourceLabelFormatters.formatting.workspaceSuffix', 'Suffix appended to the workspace label.'),
                        },
                    },
                },
            },
        },
    },
});
const sepRegexp = /\//g;
const labelMatchingRegexp = /\$\{(scheme|authoritySuffix|authority|path|(query)\.(.+?))\}/g;
function hasDriveLetterIgnorePlatform(path) {
    return !!(path && path[2] === ':');
}
let ResourceLabelFormattersHandler = class ResourceLabelFormattersHandler {
    constructor(labelService) {
        this.formattersDisposables = new Map();
        resourceLabelFormattersExtPoint.setHandler((extensions, delta) => {
            for (const added of delta.added) {
                for (const untrustedFormatter of added.value) {
                    // We cannot trust that the formatter as it comes from an extension
                    // adheres to our interface, so for the required properties we fill
                    // in some defaults if missing.
                    const formatter = { ...untrustedFormatter };
                    if (typeof formatter.formatting.label !== 'string') {
                        formatter.formatting.label = '${authority}${path}';
                    }
                    if (typeof formatter.formatting.separator !== `string`) {
                        formatter.formatting.separator = sep;
                    }
                    if (!isProposedApiEnabled(added.description, 'contribLabelFormatterWorkspaceTooltip') &&
                        formatter.formatting.workspaceTooltip) {
                        formatter.formatting.workspaceTooltip = undefined; // workspaceTooltip is only proposed
                    }
                    this.formattersDisposables.set(formatter, labelService.registerFormatter(formatter));
                }
            }
            for (const removed of delta.removed) {
                for (const formatter of removed.value) {
                    dispose(this.formattersDisposables.get(formatter));
                }
            }
        });
    }
};
ResourceLabelFormattersHandler = __decorate([
    __param(0, ILabelService)
], ResourceLabelFormattersHandler);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(ResourceLabelFormattersHandler, 3 /* LifecyclePhase.Restored */);
const FORMATTER_CACHE_SIZE = 50;
let LabelService = class LabelService extends Disposable {
    constructor(environmentService, contextService, pathService, remoteAgentService, storageService, lifecycleService) {
        super();
        this.environmentService = environmentService;
        this.contextService = contextService;
        this.pathService = pathService;
        this.remoteAgentService = remoteAgentService;
        this._onDidChangeFormatters = this._register(new Emitter({ leakWarningThreshold: 400 }));
        this.onDidChangeFormatters = this._onDidChangeFormatters.event;
        // Find some meaningful defaults until the remote environment
        // is resolved, by taking the current OS we are running in
        // and by taking the local `userHome` if we run on a local
        // file scheme.
        this.os = OS;
        this.userHome =
            pathService.defaultUriScheme === Schemas.file
                ? this.pathService.userHome({ preferLocal: true })
                : undefined;
        const memento = (this.storedFormattersMemento = new Memento('cachedResourceLabelFormatters2', storageService));
        this.storedFormatters = memento.getMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        this.formatters = this.storedFormatters?.formatters?.slice() || [];
        // Remote environment is potentially long running
        this.resolveRemoteEnvironment();
    }
    async resolveRemoteEnvironment() {
        // OS
        const env = await this.remoteAgentService.getEnvironment();
        this.os = env?.os ?? OS;
        // User home
        this.userHome = await this.pathService.userHome();
    }
    findFormatting(resource) {
        let bestResult;
        for (const formatter of this.formatters) {
            if (formatter.scheme === resource.scheme) {
                if (!formatter.authority && (!bestResult || formatter.priority)) {
                    bestResult = formatter;
                    continue;
                }
                if (!formatter.authority) {
                    continue;
                }
                if (match(formatter.authority.toLowerCase(), resource.authority.toLowerCase()) &&
                    (!bestResult ||
                        !bestResult.authority ||
                        formatter.authority.length > bestResult.authority.length ||
                        (formatter.authority.length === bestResult.authority.length && formatter.priority))) {
                    bestResult = formatter;
                }
            }
        }
        return bestResult ? bestResult.formatting : undefined;
    }
    getUriLabel(resource, options = {}) {
        let formatting = this.findFormatting(resource);
        if (formatting && options.separator) {
            // mixin separator if defined from the outside
            formatting = { ...formatting, separator: options.separator };
        }
        let label = this.doGetUriLabel(resource, formatting, options);
        // Without formatting we still need to support the separator
        // as provided in options (https://github.com/microsoft/vscode/issues/130019)
        if (!formatting && options.separator) {
            label = label.replace(sepRegexp, options.separator);
        }
        if (options.appendWorkspaceSuffix && formatting?.workspaceSuffix) {
            label = this.appendWorkspaceSuffix(label, resource);
        }
        return label;
    }
    doGetUriLabel(resource, formatting, options = {}) {
        if (!formatting) {
            return getPathLabel(resource, {
                os: this.os,
                tildify: this.userHome ? { userHome: this.userHome } : undefined,
                relative: options.relative
                    ? {
                        noPrefix: options.noPrefix,
                        getWorkspace: () => this.contextService.getWorkspace(),
                        getWorkspaceFolder: (resource) => this.contextService.getWorkspaceFolder(resource),
                    }
                    : undefined,
            });
        }
        // Relative label
        if (options.relative && this.contextService) {
            let folder = this.contextService.getWorkspaceFolder(resource);
            if (!folder) {
                // It is possible that the resource we want to resolve the
                // workspace folder for is not using the same scheme as
                // the folders in the workspace, so we help by trying again
                // to resolve a workspace folder by trying again with a
                // scheme that is workspace contained.
                const workspace = this.contextService.getWorkspace();
                const firstFolder = workspace.folders.at(0);
                if (firstFolder &&
                    resource.scheme !== firstFolder.uri.scheme &&
                    resource.path.startsWith(posix.sep)) {
                    folder = this.contextService.getWorkspaceFolder(firstFolder.uri.with({ path: resource.path }));
                }
            }
            if (folder) {
                const folderLabel = this.formatUri(folder.uri, formatting, options.noPrefix);
                let relativeLabel = this.formatUri(resource, formatting, options.noPrefix);
                let overlap = 0;
                while (relativeLabel[overlap] && relativeLabel[overlap] === folderLabel[overlap]) {
                    overlap++;
                }
                if (!relativeLabel[overlap] || relativeLabel[overlap] === formatting.separator) {
                    relativeLabel = relativeLabel.substring(1 + overlap);
                }
                else if (overlap === folderLabel.length && folder.uri.path === posix.sep) {
                    relativeLabel = relativeLabel.substring(overlap);
                }
                // always show root basename if there are multiple folders
                const hasMultipleRoots = this.contextService.getWorkspace().folders.length > 1;
                if (hasMultipleRoots && !options.noPrefix) {
                    const rootName = folder?.name ?? basenameOrAuthority(folder.uri);
                    relativeLabel = relativeLabel ? `${rootName} • ${relativeLabel}` : rootName;
                }
                return relativeLabel;
            }
        }
        // Absolute label
        return this.formatUri(resource, formatting, options.noPrefix);
    }
    getUriBasenameLabel(resource) {
        const formatting = this.findFormatting(resource);
        const label = this.doGetUriLabel(resource, formatting);
        let pathLib;
        if (formatting?.separator === win32.sep) {
            pathLib = win32;
        }
        else if (formatting?.separator === posix.sep) {
            pathLib = posix;
        }
        else {
            pathLib = this.os === 1 /* OperatingSystem.Windows */ ? win32 : posix;
        }
        return pathLib.basename(label);
    }
    getWorkspaceLabel(workspace, options) {
        if (isWorkspace(workspace)) {
            const identifier = toWorkspaceIdentifier(workspace);
            if (isSingleFolderWorkspaceIdentifier(identifier) || isWorkspaceIdentifier(identifier)) {
                return this.getWorkspaceLabel(identifier, options);
            }
            return '';
        }
        // Workspace: Single Folder (as URI)
        if (URI.isUri(workspace)) {
            return this.doGetSingleFolderWorkspaceLabel(workspace, options);
        }
        // Workspace: Single Folder (as workspace identifier)
        if (isSingleFolderWorkspaceIdentifier(workspace)) {
            return this.doGetSingleFolderWorkspaceLabel(workspace.uri, options);
        }
        // Workspace: Multi Root
        if (isWorkspaceIdentifier(workspace)) {
            return this.doGetWorkspaceLabel(workspace.configPath, options);
        }
        return '';
    }
    doGetWorkspaceLabel(workspaceUri, options) {
        // Workspace: Untitled
        if (isUntitledWorkspace(workspaceUri, this.environmentService)) {
            return localize('untitledWorkspace', 'Untitled (Workspace)');
        }
        // Workspace: Temporary
        if (isTemporaryWorkspace(workspaceUri)) {
            return localize('temporaryWorkspace', 'Workspace');
        }
        // Workspace: Saved
        let filename = basename(workspaceUri);
        if (filename.endsWith(WORKSPACE_EXTENSION)) {
            filename = filename.substr(0, filename.length - WORKSPACE_EXTENSION.length - 1);
        }
        let label;
        switch (options?.verbose) {
            case 0 /* Verbosity.SHORT */:
                label = filename; // skip suffix for short label
                break;
            case 2 /* Verbosity.LONG */:
                label = localize('workspaceNameVerbose', '{0} (Workspace)', this.getUriLabel(joinPath(dirname(workspaceUri), filename)));
                break;
            case 1 /* Verbosity.MEDIUM */:
            default:
                label = localize('workspaceName', '{0} (Workspace)', filename);
                break;
        }
        if (options?.verbose === 0 /* Verbosity.SHORT */) {
            return label; // skip suffix for short label
        }
        return this.appendWorkspaceSuffix(label, workspaceUri);
    }
    doGetSingleFolderWorkspaceLabel(folderUri, options) {
        let label;
        switch (options?.verbose) {
            case 2 /* Verbosity.LONG */:
                label = this.getUriLabel(folderUri);
                break;
            case 0 /* Verbosity.SHORT */:
            case 1 /* Verbosity.MEDIUM */:
            default:
                label = basename(folderUri) || posix.sep;
                break;
        }
        if (options?.verbose === 0 /* Verbosity.SHORT */) {
            return label; // skip suffix for short label
        }
        return this.appendWorkspaceSuffix(label, folderUri);
    }
    getSeparator(scheme, authority) {
        const formatter = this.findFormatting(URI.from({ scheme, authority }));
        return formatter?.separator || posix.sep;
    }
    getHostLabel(scheme, authority) {
        const formatter = this.findFormatting(URI.from({ scheme, authority }));
        return formatter?.workspaceSuffix || authority || '';
    }
    getHostTooltip(scheme, authority) {
        const formatter = this.findFormatting(URI.from({ scheme, authority }));
        return formatter?.workspaceTooltip;
    }
    registerCachedFormatter(formatter) {
        const list = (this.storedFormatters.formatters ??= []);
        let replace = list.findIndex((f) => f.scheme === formatter.scheme && f.authority === formatter.authority);
        if (replace === -1 && list.length >= FORMATTER_CACHE_SIZE) {
            replace = FORMATTER_CACHE_SIZE - 1; // at max capacity, replace the last element
        }
        if (replace === -1) {
            list.unshift(formatter);
        }
        else {
            for (let i = replace; i > 0; i--) {
                list[i] = list[i - 1];
            }
            list[0] = formatter;
        }
        this.storedFormattersMemento.saveMemento();
        return this.registerFormatter(formatter);
    }
    registerFormatter(formatter) {
        this.formatters.push(formatter);
        this._onDidChangeFormatters.fire({ scheme: formatter.scheme });
        return {
            dispose: () => {
                this.formatters = this.formatters.filter((f) => f !== formatter);
                this._onDidChangeFormatters.fire({ scheme: formatter.scheme });
            },
        };
    }
    formatUri(resource, formatting, forceNoTildify) {
        let label = formatting.label.replace(labelMatchingRegexp, (match, token, qsToken, qsValue) => {
            switch (token) {
                case 'scheme':
                    return resource.scheme;
                case 'authority':
                    return resource.authority;
                case 'authoritySuffix': {
                    const i = resource.authority.indexOf('+');
                    return i === -1 ? resource.authority : resource.authority.slice(i + 1);
                }
                case 'path':
                    return formatting.stripPathStartingSeparator
                        ? resource.path.slice(resource.path[0] === formatting.separator ? 1 : 0)
                        : resource.path;
                default: {
                    if (qsToken === 'query') {
                        const { query } = resource;
                        if (query && query[0] === '{' && query[query.length - 1] === '}') {
                            try {
                                return JSON.parse(query)[qsValue] || '';
                            }
                            catch { }
                        }
                    }
                    return '';
                }
            }
        });
        // convert \c:\something => C:\something
        if (formatting.normalizeDriveLetter && hasDriveLetterIgnorePlatform(label)) {
            label = label.charAt(1).toUpperCase() + label.substr(2);
        }
        if (formatting.tildify && !forceNoTildify) {
            if (this.userHome) {
                label = tildify(label, this.userHome.fsPath, this.os);
            }
        }
        if (formatting.authorityPrefix && resource.authority) {
            label = formatting.authorityPrefix + label;
        }
        return label.replace(sepRegexp, formatting.separator);
    }
    appendWorkspaceSuffix(label, uri) {
        const formatting = this.findFormatting(uri);
        const suffix = formatting && typeof formatting.workspaceSuffix === 'string'
            ? formatting.workspaceSuffix
            : undefined;
        return suffix ? `${label} [${suffix}]` : label;
    }
};
LabelService = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, IWorkspaceContextService),
    __param(2, IPathService),
    __param(3, IRemoteAgentService),
    __param(4, IStorageService),
    __param(5, ILifecycleService)
], LabelService);
export { LabelService };
registerSingleton(ILabelService, LabelService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFiZWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2xhYmVsL2NvbW1vbi9sYWJlbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQWUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sVUFBVSxJQUFJLG1CQUFtQixHQUdqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQ04sd0JBQXdCLEVBRXhCLFdBQVcsRUFFWCxpQ0FBaUMsRUFDakMscUJBQXFCLEVBRXJCLHFCQUFxQixFQUNyQixtQkFBbUIsRUFDbkIsbUJBQW1CLEVBQ25CLG9CQUFvQixHQUNwQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsUUFBUSxFQUNSLFFBQVEsRUFDUixPQUFPLEdBQ1AsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pFLE9BQU8sRUFDTixhQUFhLEdBS2IsTUFBTSw0Q0FBNEMs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