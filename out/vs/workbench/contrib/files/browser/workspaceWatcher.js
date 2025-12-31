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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlV2F0Y2hlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvd29ya3NwYWNlV2F0Y2hlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLFVBQVUsRUFDVixPQUFPLEVBQ1AsZUFBZSxHQUNmLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsWUFBWSxFQUF1QixNQUFNLDRDQUE0QyxDQUFBO0FBQzlGLE9BQU8sRUFDTix3QkFBd0IsR0FHeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixRQUFRLEVBQ1IsbUJBQW1CLEVBQ25CLG9CQUFvQixHQUNwQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRS9FLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEsVUFBVTthQUMvQixP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