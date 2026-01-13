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
import { Disposable, dispose, DisposableStore, } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { INotificationService, Severity, NeverShowAgainScope, NotificationPriority, } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { isAbsolute } from '../../../../base/common/path.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
let WorkspaceWatcher = class WorkspaceWatcher extends Disposable {
    static { this.ID = 'workbench.contrib.workspaceWatcher'; }
    constructor(fileService, configurationService, contextService, notificationService, openerService, uriIdentityService, hostService, telemetryService) {
        super();
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.notificationService = notificationService;
        this.openerService = openerService;
        this.uriIdentityService = uriIdentityService;
        this.hostService = hostService;
        this.telemetryService = telemetryService;
        this.watchedWorkspaces = new ResourceMap((resource) => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.registerListeners();
        this.refresh();
    }
    registerListeners() {
        this._register(this.contextService.onDidChangeWorkspaceFolders((e) => this.onDidChangeWorkspaceFolders(e)));
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.onDidChangeWorkbenchState()));
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.onDidChangeConfiguration(e)));
        this._register(this.fileService.onDidWatchError((error) => this.onDidWatchError(error)));
    }
    onDidChangeWorkspaceFolders(e) {
        // Removed workspace: Unwatch
        for (const removed of e.removed) {
            this.unwatchWorkspace(removed);
        }
        // Added workspace: Watch
        for (const added of e.added) {
            this.watchWorkspace(added);
        }
    }
    onDidChangeWorkbenchState() {
        this.refresh();
    }
    onDidChangeConfiguration(e) {
        if (e.affectsConfiguration('files.watcherExclude') ||
            e.affectsConfiguration('files.watcherInclude')) {
            this.refresh();
        }
    }
    onDidWatchError(error) {
        const msg = error.toString();
        let reason = undefined;
        // Detect if we run into ENOSPC issues
        if (msg.indexOf('ENOSPC') >= 0) {
            reason = 'ENOSPC';
            this.notificationService.prompt(Severity.Warning, localize('enospcError', 'Unable to watch for file changes. Please follow the instructions link to resolve this issue.'), [
                {
                    label: localize('learnMore', 'Instructions'),
                    run: () => this.openerService.open(URI.parse('https://go.microsoft.com/fwlink/?linkid=867693')),
                },
            ], {
                sticky: true,
                neverShowAgain: {
                    id: 'ignoreEnospcError',
                    isSecondary: true,
                    scope: NeverShowAgainScope.WORKSPACE,
                },
            });
        }
        // Detect when the watcher throws an error unexpectedly
        else if (msg.indexOf('EUNKNOWN') >= 0) {
            reason = 'EUNKNOWN';
            this.notificationService.prompt(Severity.Warning, localize('eshutdownError', 'File changes watcher stopped unexpectedly. A reload of the window may enable the watcher again unless the workspace cannot be watched for file changes.'), [
                {
                    label: localize('reload', 'Reload'),
                    run: () => this.hostService.reload(),
                },
            ], {
                sticky: true,
                priority: NotificationPriority.SILENT, // reduce potential spam since we don't really know how often this fires
            });
        }
        // Detect unexpected termination
        else if (msg.indexOf('ETERM') >= 0) {
            reason = 'ETERM';
        }
        // Log telemetry if we gathered a reason (logging it from the renderer
        // allows us to investigate this situation in context of experiments)
        if (reason) {
            this.telemetryService.publicLog2('fileWatcherError', { reason });
        }
    }
    watchWorkspace(workspace) {
        // Compute the watcher exclude rules from configuration
        const excludes = [];
        const config = this.configurationService.getValue({
            resource: workspace.uri,
        });
        if (config.files?.watcherExclude) {
            for (const key in config.files.watcherExclude) {
                if (key && config.files.watcherExclude[key] === true) {
                    excludes.push(key);
                }
            }
        }
        const pathsToWatch = new ResourceMap((uri) => this.uriIdentityService.extUri.getComparisonKey(uri));
        // Add the workspace as path to watch
        pathsToWatch.set(workspace.uri, workspace.uri);
        // Compute additional includes from configuration
        if (config.files?.watcherInclude) {
            for (const includePath of config.files.watcherInclude) {
                if (!includePath) {
                    continue;
                }
                // Absolute: verify a child of the workspace
                if (isAbsolute(includePath)) {
                    const candidate = URI.file(includePath).with({ scheme: workspace.uri.scheme });
                    if (this.uriIdentityService.extUri.isEqualOrParent(candidate, workspace.uri)) {
                        pathsToWatch.set(candidate, candidate);
                    }
                }
                // Relative: join against workspace folder
                else {
                    const candidate = workspace.toResource(includePath);
                    pathsToWatch.set(candidate, candidate);
                }
            }
        }
        // Watch all paths as instructed
        const disposables = new DisposableStore();
        for (const [, pathToWatch] of pathsToWatch) {
            disposables.add(this.fileService.watch(pathToWatch, { recursive: true, excludes }));
        }
        this.watchedWorkspaces.set(workspace.uri, disposables);
    }
    unwatchWorkspace(workspace) {
        if (this.watchedWorkspaces.has(workspace.uri)) {
            dispose(this.watchedWorkspaces.get(workspace.uri));
            this.watchedWorkspaces.delete(workspace.uri);
        }
    }
    refresh() {
        // Unwatch all first
        this.unwatchWorkspaces();
        // Watch each workspace folder
        for (const folder of this.contextService.getWorkspace().folders) {
            this.watchWorkspace(folder);
        }
    }
    unwatchWorkspaces() {
        for (const [, disposable] of this.watchedWorkspaces) {
            disposable.dispose();
        }
        this.watchedWorkspaces.clear();
    }
    dispose() {
        super.dispose();
        this.unwatchWorkspaces();
    }
};
WorkspaceWatcher = __decorate([
    __param(0, IFileService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceContextService),
    __param(3, INotificationService),
    __param(4, IOpenerService),
    __param(5, IUriIdentityService),
    __param(6, IHostService),
    __param(7, ITelemetryService)
], WorkspaceWatcher);
export { WorkspaceWatcher };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlV2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci93b3Jrc3BhY2VXYXRjaGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBRU4sVUFBVSxFQUNWLE9BQU8sRUFDUCxlQUFlLEdBQ2YsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxZQUFZLEVBQXVCLE1BQU0sNENBQTRDLENBQUE7QUFDOUYsT0FBTyxFQUNOLHdCQUF3QixHQUd4QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsRUFDUixtQkFBbUIsRUFDbkIsb0JBQW9CLEdBQ3BCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFL0UsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxn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