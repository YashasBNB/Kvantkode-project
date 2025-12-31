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
var LocalHistoryTimeline_1;
import { localize } from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ITimelineService, } from '../../timeline/common/timeline.js';
import { IWorkingCopyHistoryService, } from '../../../services/workingCopy/common/workingCopyHistory.js';
import { URI } from '../../../../base/common/uri.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { API_OPEN_DIFF_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { LocalHistoryFileSystemProvider } from './localHistoryFileSystemProvider.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { COMPARE_WITH_FILE_LABEL, toDiffEditorArguments } from './localHistoryCommands.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { getLocalHistoryDateFormatter, LOCAL_HISTORY_ICON_ENTRY, LOCAL_HISTORY_MENU_CONTEXT_VALUE, } from './localHistory.js';
import { Schemas } from '../../../../base/common/network.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { getVirtualWorkspaceAuthority } from '../../../../platform/workspace/common/virtualWorkspace.js';
let LocalHistoryTimeline = class LocalHistoryTimeline extends Disposable {
    static { LocalHistoryTimeline_1 = this; }
    static { this.ID = 'workbench.contrib.localHistoryTimeline'; }
    static { this.LOCAL_HISTORY_ENABLED_SETTINGS_KEY = 'workbench.localHistory.enabled'; }
    constructor(timelineService, workingCopyHistoryService, pathService, fileService, environmentService, configurationService, contextService) {
        super();
        this.timelineService = timelineService;
        this.workingCopyHistoryService = workingCopyHistoryService;
        this.pathService = pathService;
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.id = 'timeline.localHistory';
        this.label = localize('localHistory', 'Local History');
        this.scheme = '*'; // we try to show local history for all schemes if possible
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.timelineProviderDisposable = this._register(new MutableDisposable());
        this.registerComponents();
        this.registerListeners();
    }
    registerComponents() {
        // Timeline (if enabled)
        this.updateTimelineRegistration();
        // File Service Provider
        this._register(this.fileService.registerProvider(LocalHistoryFileSystemProvider.SCHEMA, new LocalHistoryFileSystemProvider(this.fileService)));
    }
    updateTimelineRegistration() {
        if (this.configurationService.getValue(LocalHistoryTimeline_1.LOCAL_HISTORY_ENABLED_SETTINGS_KEY)) {
            this.timelineProviderDisposable.value = this.timelineService.registerTimelineProvider(this);
        }
        else {
            this.timelineProviderDisposable.clear();
        }
    }
    registerListeners() {
        // History changes
        this._register(this.workingCopyHistoryService.onDidAddEntry((e) => this.onDidChangeWorkingCopyHistoryEntry(e.entry)));
        this._register(this.workingCopyHistoryService.onDidChangeEntry((e) => this.onDidChangeWorkingCopyHistoryEntry(e.entry)));
        this._register(this.workingCopyHistoryService.onDidReplaceEntry((e) => this.onDidChangeWorkingCopyHistoryEntry(e.entry)));
        this._register(this.workingCopyHistoryService.onDidRemoveEntry((e) => this.onDidChangeWorkingCopyHistoryEntry(e.entry)));
        this._register(this.workingCopyHistoryService.onDidRemoveEntries(() => this.onDidChangeWorkingCopyHistoryEntry(undefined /* all entries */)));
        this._register(this.workingCopyHistoryService.onDidMoveEntries(() => this.onDidChangeWorkingCopyHistoryEntry(undefined /* all entries */)));
        // Configuration changes
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(LocalHistoryTimeline_1.LOCAL_HISTORY_ENABLED_SETTINGS_KEY)) {
                this.updateTimelineRegistration();
            }
        }));
    }
    onDidChangeWorkingCopyHistoryEntry(entry) {
        // Re-emit as timeline change event
        this._onDidChange.fire({
            id: this.id,
            uri: entry?.workingCopy.resource,
            reset: true, // there is no other way to indicate that items might have been replaced/removed
        });
    }
    async provideTimeline(uri, options, token) {
        const items = [];
        // Try to convert the provided `uri` into a form that is likely
        // for the provider to find entries for so that we can ensure
        // the timeline is always providing local history entries
        let resource = undefined;
        if (uri.scheme === LocalHistoryFileSystemProvider.SCHEMA) {
            // `vscode-local-history`: convert back to the associated resource
            resource = LocalHistoryFileSystemProvider.fromLocalHistoryFileSystem(uri).associatedResource;
        }
        else if (uri.scheme === this.pathService.defaultUriScheme ||
            uri.scheme === Schemas.vscodeUserData) {
            // default-scheme / settings: keep as is
            resource = uri;
        }
        else if (this.fileService.hasProvider(uri)) {
            // anything that is backed by a file system provider:
            // try best to convert the URI back into a form that is
            // likely to match the workspace URIs. That means:
            // - change to the default URI scheme
            // - change to the remote authority or virtual workspace authority
            // - preserve the path
            resource = URI.from({
                scheme: this.pathService.defaultUriScheme,
                authority: this.environmentService.remoteAuthority ??
                    getVirtualWorkspaceAuthority(this.contextService.getWorkspace()),
                path: uri.path,
            });
        }
        if (resource) {
            // Retrieve from working copy history
            const entries = await this.workingCopyHistoryService.getEntries(resource, token);
            // Convert to timeline items
            for (const entry of entries) {
                items.push(this.toTimelineItem(entry));
            }
        }
        return {
            source: this.id,
            items,
        };
    }
    toTimelineItem(entry) {
        return {
            handle: entry.id,
            label: SaveSourceRegistry.getSourceLabel(entry.source),
            tooltip: new MarkdownString(`$(history) ${getLocalHistoryDateFormatter().format(entry.timestamp)}\n\n${SaveSourceRegistry.getSourceLabel(entry.source)}${entry.sourceDescription ? ` (${entry.sourceDescription})` : ``}`, { supportThemeIcons: true }),
            source: this.id,
            timestamp: entry.timestamp,
            themeIcon: LOCAL_HISTORY_ICON_ENTRY,
            contextValue: LOCAL_HISTORY_MENU_CONTEXT_VALUE,
            command: {
                id: API_OPEN_DIFF_EDITOR_COMMAND_ID,
                title: COMPARE_WITH_FILE_LABEL.value,
                arguments: toDiffEditorArguments(entry, entry.workingCopy.resource),
            },
        };
    }
};
LocalHistoryTimeline = LocalHistoryTimeline_1 = __decorate([
    __param(0, ITimelineService),
    __param(1, IWorkingCopyHistoryService),
    __param(2, IPathService),
    __param(3, IFileService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, IConfigurationService),
    __param(6, IWorkspaceContextService)
], LocalHistoryTimeline);
export { LocalHistoryTimeline };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxIaXN0b3J5VGltZWxpbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sb2NhbEhpc3RvcnkvYnJvd3Nlci9sb2NhbEhpc3RvcnlUaW1lbGluZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFcEYsT0FBTyxFQUNOLGdCQUFnQixHQU1oQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFFTiwwQkFBMEIsR0FDMUIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMxRixPQUFPLEVBQUUsY0FBYyxF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