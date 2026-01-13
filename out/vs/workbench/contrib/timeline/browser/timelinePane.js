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
import './media/timelinePane.css';
import { localize, localize2 } from '../../../../nls.js';
import * as DOM from '../../../../base/browser/dom.js';
import * as css from '../../../../base/browser/cssValue.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { fromNow } from '../../../../base/common/date.js';
import { debounce } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { createMatches } from '../../../../base/common/filters.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore, Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { WorkbenchObjectTree } from '../../../../platform/list/browser/listService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ITimelineService, } from '../common/timeline.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { SideBySideEditor, EditorResourceAccessor } from '../../../common/editor.js';
import { ICommandService, CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ActionBar, } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { getContextMenuActions, createActionViewItem, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, registerAction2, Action2, MenuRegistry, } from '../../../../platform/actions/common/actions.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { API_OPEN_DIFF_EDITOR_COMMAND_ID, API_OPEN_EDITOR_COMMAND_ID, } from '../../../browser/parts/editor/editorCommands.js';
import { isString } from '../../../../base/common/types.js';
import { renderMarkdownAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../../../platform/hover/browser/hover.js';
const ItemHeight = 22;
function isLoadMoreCommand(item) {
    return item instanceof LoadMoreCommand;
}
function isTimelineItem(item) {
    return !!item && !item.handle.startsWith('vscode-command:');
}
function updateRelativeTime(item, lastRelativeTime) {
    item.relativeTime = isTimelineItem(item) ? fromNow(item.timestamp) : undefined;
    item.relativeTimeFullWord = isTimelineItem(item)
        ? fromNow(item.timestamp, false, true)
        : undefined;
    if (lastRelativeTime === undefined || item.relativeTime !== lastRelativeTime) {
        lastRelativeTime = item.relativeTime;
        item.hideRelativeTime = false;
    }
    else {
        item.hideRelativeTime = true;
    }
    return lastRelativeTime;
}
class TimelineAggregate {
    constructor(timeline) {
        this._stale = false;
        this._requiresReset = false;
        this.source = timeline.source;
        this.items = timeline.items;
        this._cursor = timeline.paging?.cursor;
        this.lastRenderedIndex = -1;
    }
    get cursor() {
        return this._cursor;
    }
    get more() {
        return this._cursor !== undefined;
    }
    get newest() {
        return this.items[0];
    }
    get oldest() {
        return this.items[this.items.length - 1];
    }
    add(timeline, options) {
        let updated = false;
        if (timeline.items.length !== 0 && this.items.length !== 0) {
            updated = true;
            const ids = new Set();
            const timestamps = new Set();
            for (const item of timeline.items) {
                if (item.id === undefined) {
                    timestamps.add(item.timestamp);
                }
                else {
                    ids.add(item.id);
                }
            }
            // Remove any duplicate items
            let i = this.items.length;
            let item;
            while (i--) {
                item = this.items[i];
                if ((item.id !== undefined && ids.has(item.id)) || timestamps.has(item.timestamp)) {
                    this.items.splice(i, 1);
                }
            }
            if ((timeline.items[timeline.items.length - 1]?.timestamp ?? 0) >= (this.newest?.timestamp ?? 0)) {
                this.items.splice(0, 0, ...timeline.items);
            }
            else {
                this.items.push(...timeline.items);
            }
        }
        else if (timeline.items.length !== 0) {
            updated = true;
            this.items.push(...timeline.items);
        }
        // If we are not requesting more recent items than we have, then update the cursor
        if (options.cursor !== undefined || typeof options.limit !== 'object') {
            this._cursor = timeline.paging?.cursor;
        }
        if (updated) {
            this.items.sort((a, b) => b.timestamp - a.timestamp ||
                (a.source === undefined
                    ? b.source === undefined
                        ? 0
                        : 1
                    : b.source === undefined
                        ? -1
                        : b.source.localeCompare(a.source, undefined, {
                            numeric: true,
                            sensitivity: 'base',
                        })));
        }
        return updated;
    }
    get stale() {
        return this._stale;
    }
    get requiresReset() {
        return this._requiresReset;
    }
    invalidate(requiresReset) {
        this._stale = true;
        this._requiresReset = requiresReset;
    }
}
class LoadMoreCommand {
    constructor(loading) {
        this.handle = 'vscode-command:loadMore';
        this.timestamp = 0;
        this.description = undefined;
        this.tooltip = undefined;
        this.contextValue = undefined;
        // Make things easier for duck typing
        this.id = undefined;
        this.icon = undefined;
        this.iconDark = undefined;
        this.source = undefined;
        this.relativeTime = undefined;
        this.relativeTimeFullWord = undefined;
        this.hideRelativeTime = undefined;
        this._loading = false;
        this._loading = loading;
    }
    get loading() {
        return this._loading;
    }
    set loading(value) {
        this._loading = value;
    }
    get ariaLabel() {
        return this.label;
    }
    get label() {
        return this.loading
            ? localize('timeline.loadingMore', 'Loading...')
            : localize('timeline.loadMore', 'Load more');
    }
    get themeIcon() {
        return undefined;
    }
}
export const TimelineFollowActiveEditorContext = new RawContextKey('timelineFollowActiveEditor', true, true);
export const TimelineExcludeSources = new RawContextKey('timelineExcludeSources', '[]', true);
export const TimelineViewFocusedContext = new RawContextKey('timelineFocused', true);
let TimelinePane = class TimelinePane extends ViewPane {
    static { this.TITLE = localize2('timeline', 'Timeline'); }
    constructor(options, keybindingService, contextMenuService, contextKeyService, configurationService, storageService, viewDescriptorService, instantiationService, editorService, commandService, progressService, timelineService, openerService, themeService, hoverService, labelService, uriIdentityService, extensionService) {
        super({ ...options, titleMenuId: MenuId.TimelineTitle }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.storageService = storageService;
        this.editorService = editorService;
        this.commandService = commandService;
        this.progressService = progressService;
        this.timelineService = timelineService;
        this.labelService = labelService;
        this.uriIdentityService = uriIdentityService;
        this.extensionService = extensionService;
        this.pendingRequests = new Map();
        this.timelinesBySource = new Map();
        this._followActiveEditor = true;
        this._isEmpty = true;
        this._maxItemCount = 0;
        this._visibleItemCount = 0;
        this._pendingRefresh = false;
        this.commands = this._register(this.instantiationService.createInstance(TimelinePaneCommands, this));
        this.followActiveEditorContext = TimelineFollowActiveEditorContext.bindTo(this.contextKeyService);
        this.timelineExcludeSourcesContext = TimelineExcludeSources.bindTo(this.contextKeyService);
        const excludedSourcesString = storageService.get('timeline.excludeSources', 0 /* StorageScope.PROFILE */, '[]');
        this.timelineExcludeSourcesContext.set(excludedSourcesString);
        this.excludedSources = new Set(JSON.parse(excludedSourcesString));
        this._register(storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, 'timeline.excludeSources', this._store)(this.onStorageServiceChanged, this));
        this._register(configurationService.onDidChangeConfiguration(this.onConfigurationChanged, this));
        this._register(timelineService.onDidChangeProviders(this.onProvidersChanged, this));
        this._register(timelineService.onDidChangeTimeline(this.onTimelineChanged, this));
        this._register(timelineService.onDidChangeUri((uri) => this.setUri(uri), this));
    }
    get followActiveEditor() {
        return this._followActiveEditor;
    }
    set followActiveEditor(value) {
        if (this._followActiveEditor === value) {
            return;
        }
        this._followActiveEditor = value;
        this.followActiveEditorContext.set(value);
        this.updateFilename(this._filename);
        if (value) {
            this.onActiveEditorChanged();
        }
    }
    get pageOnScroll() {
        if (this._pageOnScroll === undefined) {
            this._pageOnScroll =
                this.configurationService.getValue('timeline.pageOnScroll') ??
                    false;
        }
        return this._pageOnScroll;
    }
    get pageSize() {
        let pageSize = this.configurationService.getValue('timeline.pageSize');
        if (pageSize === undefined || pageSize === null) {
            // If we are paging when scrolling, then add an extra item to the end to make sure the "Load more" item is out of view
            pageSize = Math.max(20, Math.floor((this.tree?.renderHeight ?? 0 / ItemHeight) + (this.pageOnScroll ? 1 : -1)));
        }
        return pageSize;
    }
    reset() {
        this.loadTimeline(true);
    }
    setUri(uri) {
        this.setUriCore(uri, true);
    }
    setUriCore(uri, disableFollowing) {
        if (disableFollowing) {
            this.followActiveEditor = false;
        }
        this.uri = uri;
        this.updateFilename(uri ? this.labelService.getUriBasenameLabel(uri) : undefined);
        this.treeRenderer?.setUri(uri);
        this.loadTimeline(true);
    }
    onStorageServiceChanged() {
        const excludedSourcesString = this.storageService.get('timeline.excludeSources', 0 /* StorageScope.PROFILE */, '[]');
        this.timelineExcludeSourcesContext.set(excludedSourcesString);
        this.excludedSources = new Set(JSON.parse(excludedSourcesString));
        const missing = this.timelineService
            .getSources()
            .filter(({ id }) => !this.excludedSources.has(id) && !this.timelinesBySource.has(id));
        if (missing.length !== 0) {
            this.loadTimeline(true, missing.map(({ id }) => id));
        }
        else {
            this.refresh();
        }
    }
    onConfigurationChanged(e) {
        if (e.affectsConfiguration('timeline.pageOnScroll')) {
            this._pageOnScroll = undefined;
        }
    }
    onActiveEditorChanged() {
        if (!this.followActiveEditor || !this.isExpanded()) {
            return;
        }
        const uri = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        if ((this.uriIdentityService.extUri.isEqual(uri, this.uri) && uri !== undefined) ||
            // Fallback to match on fsPath if we are dealing with files or git schemes
            (uri?.fsPath === this.uri?.fsPath &&
                (uri?.scheme === Schemas.file || uri?.scheme === 'git') &&
                (this.uri?.scheme === Schemas.file || this.uri?.scheme === 'git'))) {
            // If the uri hasn't changed, make sure we have valid caches
            for (const source of this.timelineService.getSources()) {
                if (this.excludedSources.has(source.id)) {
                    continue;
                }
                const timeline = this.timelinesBySource.get(source.id);
                if (timeline !== undefined && !timeline.stale) {
                    continue;
                }
                if (timeline !== undefined) {
                    this.updateTimeline(timeline, timeline.requiresReset);
                }
                else {
                    this.loadTimelineForSource(source.id, uri, true);
                }
            }
            return;
        }
        this.setUriCore(uri, false);
    }
    onProvidersChanged(e) {
        if (e.removed) {
            for (const source of e.removed) {
                this.timelinesBySource.delete(source);
            }
            this.refresh();
        }
        if (e.added) {
            this.loadTimeline(true, e.added);
        }
    }
    onTimelineChanged(e) {
        if (e?.uri === undefined ||
            this.uriIdentityService.extUri.isEqual(URI.revive(e.uri), this.uri)) {
            const timeline = this.timelinesBySource.get(e.id);
            if (timeline === undefined) {
                return;
            }
            if (this.isBodyVisible()) {
                this.updateTimeline(timeline, e.reset);
            }
            else {
                timeline.invalidate(e.reset);
            }
        }
    }
    updateFilename(filename) {
        this._filename = filename;
        if (this.followActiveEditor || !filename) {
            this.updateTitleDescription(filename);
        }
        else {
            this.updateTitleDescription(`${filename} (pinned)`);
        }
    }
    get message() {
        return this._message;
    }
    set message(message) {
        this._message = message;
        this.updateMessage();
    }
    updateMessage() {
        if (this._message !== undefined) {
            this.showMessage(this._message);
        }
        else {
            this.hideMessage();
        }
    }
    showMessage(message) {
        if (!this.$message) {
            return;
        }
        this.$message.classList.remove('hide');
        this.resetMessageElement();
        this.$message.textContent = message;
    }
    hideMessage() {
        this.resetMessageElement();
        this.$message.classList.add('hide');
    }
    resetMessageElement() {
        DOM.clearNode(this.$message);
    }
    get hasVisibleItems() {
        return this._visibleItemCount > 0;
    }
    clear(cancelPending) {
        this._visibleItemCount = 0;
        this._maxItemCount = this.pageSize;
        this.timelinesBySource.clear();
        if (cancelPending) {
            for (const pendingRequest of this.pendingRequests.values()) {
                pendingRequest.request.tokenSource.cancel();
                pendingRequest.dispose();
            }
            this.pendingRequests.clear();
            if (!this.isBodyVisible() && this.tree) {
                this.tree.setChildren(null, undefined);
                this._isEmpty = true;
            }
        }
    }
    async loadTimeline(reset, sources) {
        // If we have no source, we are resetting all sources, so cancel everything in flight and reset caches
        if (sources === undefined) {
            if (reset) {
                this.clear(true);
            }
            // TODO@eamodio: Are these the right the list of schemes to exclude? Is there a better way?
            if (this.uri?.scheme === Schemas.vscodeSettings ||
                this.uri?.scheme === Schemas.webviewPanel ||
                this.uri?.scheme === Schemas.walkThrough) {
                this.uri = undefined;
                this.clear(false);
                this.refresh();
                return;
            }
            if (this._isEmpty && this.uri !== undefined) {
                this.setLoadingUriMessage();
            }
        }
        if (this.uri === undefined) {
            this.clear(false);
            this.refresh();
            return;
        }
        if (!this.isBodyVisible()) {
            return;
        }
        let hasPendingRequests = false;
        for (const source of sources ?? this.timelineService.getSources().map((s) => s.id)) {
            const requested = this.loadTimelineForSource(source, this.uri, reset);
            if (requested) {
                hasPendingRequests = true;
            }
        }
        if (!hasPendingRequests) {
            this.refresh();
        }
        else if (this._isEmpty) {
            this.setLoadingUriMessage();
        }
    }
    loadTimelineForSource(source, uri, reset, options) {
        if (this.excludedSources.has(source)) {
            return false;
        }
        const timeline = this.timelinesBySource.get(source);
        // If we are paging, and there are no more items or we have enough cached items to cover the next page,
        // don't bother querying for more
        if (!reset &&
            options?.cursor !== undefined &&
            timeline !== undefined &&
            (!timeline?.more || timeline.items.length > timeline.lastRenderedIndex + this.pageSize)) {
            return false;
        }
        if (options === undefined) {
            if (!reset && timeline !== undefined && timeline.items.length > 0 && !timeline.more) {
                // If we are not resetting, have item(s), and already know there are no more to fetch, we're done here
                return false;
            }
            options = { cursor: reset ? undefined : timeline?.cursor, limit: this.pageSize };
        }
        const pendingRequest = this.pendingRequests.get(source);
        if (pendingRequest !== undefined) {
            options.cursor = pendingRequest.request.options.cursor;
            // TODO@eamodio deal with concurrent requests better
            if (typeof options.limit === 'number') {
                if (typeof pendingRequest.request.options.limit === 'number') {
                    options.limit += pendingRequest.request.options.limit;
                }
                else {
                    options.limit = pendingRequest.request.options.limit;
                }
            }
        }
        pendingRequest?.request?.tokenSource.cancel();
        pendingRequest?.dispose();
        options.cacheResults = true;
        options.resetCache = reset;
        const tokenSource = new CancellationTokenSource();
        const newRequest = this.timelineService.getTimeline(source, uri, options, tokenSource);
        if (newRequest === undefined) {
            tokenSource.dispose();
            return false;
        }
        const disposables = new DisposableStore();
        this.pendingRequests.set(source, { request: newRequest, dispose: () => disposables.dispose() });
        disposables.add(tokenSource);
        disposables.add(tokenSource.token.onCancellationRequested(() => this.pendingRequests.delete(source)));
        this.handleRequest(newRequest);
        return true;
    }
    updateTimeline(timeline, reset) {
        if (reset) {
            this.timelinesBySource.delete(timeline.source);
            // Override the limit, to re-query for all our existing cached (possibly visible) items to keep visual continuity
            const { oldest } = timeline;
            this.loadTimelineForSource(timeline.source, this.uri, true, oldest !== undefined
                ? { limit: { timestamp: oldest.timestamp, id: oldest.id } }
                : undefined);
        }
        else {
            // Override the limit, to query for any newer items
            const { newest } = timeline;
            this.loadTimelineForSource(timeline.source, this.uri, false, newest !== undefined
                ? { limit: { timestamp: newest.timestamp, id: newest.id } }
                : { limit: this.pageSize });
        }
    }
    async handleRequest(request) {
        let response;
        try {
            response = await this.progressService.withProgress({ location: this.id }, () => request.result);
        }
        finally {
            this.pendingRequests.get(request.source)?.dispose();
            this.pendingRequests.delete(request.source);
        }
        if (response === undefined ||
            request.tokenSource.token.isCancellationRequested ||
            request.uri !== this.uri) {
            if (this.pendingRequests.size === 0 && this._pendingRefresh) {
                this.refresh();
            }
            return;
        }
        const source = request.source;
        let updated = false;
        const timeline = this.timelinesBySource.get(source);
        if (timeline === undefined) {
            this.timelinesBySource.set(source, new TimelineAggregate(response));
            updated = true;
        }
        else {
            updated = timeline.add(response, request.options);
        }
        if (updated) {
            this._pendingRefresh = true;
            // If we have visible items already and there are other pending requests, debounce for a bit to wait for other requests
            if (this.hasVisibleItems && this.pendingRequests.size !== 0) {
                this.refreshDebounced();
            }
            else {
                this.refresh();
            }
        }
        else if (this.pendingRequests.size === 0) {
            if (this._pendingRefresh) {
                this.refresh();
            }
            else {
                this.tree.rerender();
            }
        }
    }
    *getItems() {
        let more = false;
        if (this.uri === undefined || this.timelinesBySource.size === 0) {
            this._visibleItemCount = 0;
            return;
        }
        const maxCount = this._maxItemCount;
        let count = 0;
        if (this.timelinesBySource.size === 1) {
            const [source, timeline] = Iterable.first(this.timelinesBySource);
            timeline.lastRenderedIndex = -1;
            if (this.excludedSources.has(source)) {
                this._visibleItemCount = 0;
                return;
            }
            if (timeline.items.length !== 0) {
                // If we have any items, just say we have one for now -- the real count will be updated below
                this._visibleItemCount = 1;
            }
            more = timeline.more;
            let lastRelativeTime;
            for (const item of timeline.items) {
                item.relativeTime = undefined;
                item.hideRelativeTime = undefined;
                count++;
                if (count > maxCount) {
                    more = true;
                    break;
                }
                lastRelativeTime = updateRelativeTime(item, lastRelativeTime);
                yield { element: item };
            }
            timeline.lastRenderedIndex = count - 1;
        }
        else {
            const sources = [];
            let hasAnyItems = false;
            let mostRecentEnd = 0;
            for (const [source, timeline] of this.timelinesBySource) {
                timeline.lastRenderedIndex = -1;
                if (this.excludedSources.has(source) || timeline.stale) {
                    continue;
                }
                if (timeline.items.length !== 0) {
                    hasAnyItems = true;
                }
                if (timeline.more) {
                    more = true;
                    const last = timeline.items[Math.min(maxCount, timeline.items.length - 1)];
                    if (last.timestamp > mostRecentEnd) {
                        mostRecentEnd = last.timestamp;
                    }
                }
                const iterator = timeline.items[Symbol.iterator]();
                sources.push({ timeline, iterator, nextItem: iterator.next() });
            }
            this._visibleItemCount = hasAnyItems ? 1 : 0;
            function getNextMostRecentSource() {
                return sources
                    .filter((source) => !source.nextItem.done)
                    .reduce((previous, current) => previous === undefined ||
                    current.nextItem.value.timestamp >= previous.nextItem.value.timestamp
                    ? current
                    : previous, undefined);
            }
            let lastRelativeTime;
            let nextSource;
            while ((nextSource = getNextMostRecentSource())) {
                nextSource.timeline.lastRenderedIndex++;
                const item = nextSource.nextItem.value;
                item.relativeTime = undefined;
                item.hideRelativeTime = undefined;
                if (item.timestamp >= mostRecentEnd) {
                    count++;
                    if (count > maxCount) {
                        more = true;
                        break;
                    }
                    lastRelativeTime = updateRelativeTime(item, lastRelativeTime);
                    yield { element: item };
                }
                nextSource.nextItem = nextSource.iterator.next();
            }
        }
        this._visibleItemCount = count;
        if (count > 0) {
            if (more) {
                yield {
                    element: new LoadMoreCommand(this.pendingRequests.size !== 0),
                };
            }
            else if (this.pendingRequests.size !== 0) {
                yield {
                    element: new LoadMoreCommand(true),
                };
            }
        }
    }
    refresh() {
        if (!this.isBodyVisible()) {
            return;
        }
        this.tree.setChildren(null, this.getItems());
        this._isEmpty = !this.hasVisibleItems;
        if (this.uri === undefined) {
            this.updateFilename(undefined);
            this.message = localize('timeline.editorCannotProvideTimeline', 'The active editor cannot provide timeline information.');
        }
        else if (this._isEmpty) {
            if (this.pendingRequests.size !== 0) {
                this.setLoadingUriMessage();
            }
            else {
                this.updateFilename(this.labelService.getUriBasenameLabel(this.uri));
                const scmProviderCount = this.contextKeyService.getContextKeyValue('scm.providerCount');
                if (this.timelineService.getSources().filter(({ id }) => !this.excludedSources.has(id))
                    .length === 0) {
                    this.message = localize('timeline.noTimelineSourcesEnabled', 'All timeline sources have been filtered out.');
                }
                else {
                    if (this.configurationService.getValue('workbench.localHistory.enabled') &&
                        !this.excludedSources.has('timeline.localHistory')) {
                        this.message = localize('timeline.noLocalHistoryYet', 'Local History will track recent changes as you save them unless the file has been excluded or is too large.');
                    }
                    else if (this.excludedSources.size > 0) {
                        this.message = localize('timeline.noTimelineInfoFromEnabledSources', 'No filtered timeline information was provided.');
                    }
                    else {
                        this.message = localize('timeline.noTimelineInfo', 'No timeline information was provided.');
                    }
                }
                if (!scmProviderCount || scmProviderCount === 0) {
                    this.message +=
                        ' ' + localize('timeline.noSCM', 'Source Control has not been configured.');
                }
            }
        }
        else {
            this.updateFilename(this.labelService.getUriBasenameLabel(this.uri));
            this.message = undefined;
        }
        this._pendingRefresh = false;
    }
    refreshDebounced() {
        this.refresh();
    }
    focus() {
        super.focus();
        this.tree.domFocus();
    }
    setExpanded(expanded) {
        const changed = super.setExpanded(expanded);
        if (changed && this.isBodyVisible()) {
            if (!this.followActiveEditor) {
                this.setUriCore(this.uri, true);
            }
            else {
                this.onActiveEditorChanged();
            }
        }
        return changed;
    }
    setVisible(visible) {
        if (visible) {
            this.extensionService.activateByEvent('onView:timeline');
            this.visibilityDisposables = new DisposableStore();
            this.editorService.onDidActiveEditorChange(this.onActiveEditorChanged, this, this.visibilityDisposables);
            // Refresh the view on focus to update the relative timestamps
            this.onDidFocus(() => this.refreshDebounced(), this, this.visibilityDisposables);
            super.setVisible(visible);
            this.onActiveEditorChanged();
        }
        else {
            this.visibilityDisposables?.dispose();
            super.setVisible(visible);
        }
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.layout(height, width);
    }
    renderHeaderTitle(container) {
        super.renderHeaderTitle(container, this.title);
        container.classList.add('timeline-view');
    }
    renderBody(container) {
        super.renderBody(container);
        this.$container = container;
        container.classList.add('tree-explorer-viewlet-tree-view', 'timeline-tree-view');
        this.$message = DOM.append(this.$container, DOM.$('.message'));
        this.$message.classList.add('timeline-subtle');
        this.message = localize('timeline.editorCannotProvideTimeline', 'The active editor cannot provide timeline information.');
        this.$tree = document.createElement('div');
        this.$tree.classList.add('customview-tree', 'file-icon-themable-tree', 'hide-arrows');
        // this.treeElement.classList.add('show-file-icons');
        container.appendChild(this.$tree);
        this.treeRenderer = this.instantiationService.createInstance(TimelineTreeRenderer, this.commands);
        this._register(this.treeRenderer.onDidScrollToEnd((item) => {
            if (this.pageOnScroll) {
                this.loadMore(item);
            }
        }));
        this.tree = this.instantiationService.createInstance((WorkbenchObjectTree), 'TimelinePane', this.$tree, new TimelineListVirtualDelegate(), [this.treeRenderer], {
            identityProvider: new TimelineIdentityProvider(),
            accessibilityProvider: {
                getAriaLabel(element) {
                    if (isLoadMoreCommand(element)) {
                        return element.ariaLabel;
                    }
                    return element.accessibilityInformation
                        ? element.accessibilityInformation.label
                        : localize('timeline.aria.item', '{0}: {1}', element.relativeTimeFullWord ?? '', element.label);
                },
                getRole(element) {
                    if (isLoadMoreCommand(element)) {
                        return 'treeitem';
                    }
                    return element.accessibilityInformation && element.accessibilityInformation.role
                        ? element.accessibilityInformation.role
                        : 'treeitem';
                },
                getWidgetAriaLabel() {
                    return localize('timeline', 'Timeline');
                },
            },
            keyboardNavigationLabelProvider: new TimelineKeyboardNavigationLabelProvider(),
            multipleSelectionSupport: false,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
        });
        TimelineViewFocusedContext.bindTo(this.tree.contextKeyService);
        this._register(this.tree.onContextMenu((e) => this.onContextMenu(this.commands, e)));
        this._register(this.tree.onDidChangeSelection((e) => this.ensureValidItems()));
        this._register(this.tree.onDidOpen((e) => {
            if (!e.browserEvent || !this.ensureValidItems()) {
                return;
            }
            const selection = this.tree.getSelection();
            let item;
            if (selection.length === 1) {
                item = selection[0];
            }
            if (item === null) {
                return;
            }
            if (isTimelineItem(item)) {
                if (item.command) {
                    let args = item.command.arguments ?? [];
                    if (item.command.id === API_OPEN_EDITOR_COMMAND_ID ||
                        item.command.id === API_OPEN_DIFF_EDITOR_COMMAND_ID) {
                        // Some commands owned by us should receive the
                        // `IOpenEvent` as context to open properly
                        args = [...args, e];
                    }
                    this.commandService.executeCommand(item.command.id, ...args);
                }
            }
            else if (isLoadMoreCommand(item)) {
                this.loadMore(item);
            }
        }));
    }
    loadMore(item) {
        if (item.loading) {
            return;
        }
        item.loading = true;
        this.tree.rerender(item);
        if (this.pendingRequests.size !== 0) {
            return;
        }
        this._maxItemCount = this._visibleItemCount + this.pageSize;
        this.loadTimeline(false);
    }
    ensureValidItems() {
        // If we don't have any non-excluded timelines, clear the tree and show the loading message
        if (!this.hasVisibleItems ||
            !this.timelineService
                .getSources()
                .some(({ id }) => !this.excludedSources.has(id) && this.timelinesBySource.has(id))) {
            this.tree.setChildren(null, undefined);
            this._isEmpty = true;
            this.setLoadingUriMessage();
            return false;
        }
        return true;
    }
    setLoadingUriMessage() {
        const file = this.uri && this.labelService.getUriBasenameLabel(this.uri);
        this.updateFilename(file);
        this.message = file ? localize('timeline.loading', 'Loading timeline for {0}...', file) : '';
    }
    onContextMenu(commands, treeEvent) {
        const item = treeEvent.element;
        if (item === null) {
            return;
        }
        const event = treeEvent.browserEvent;
        event.preventDefault();
        event.stopPropagation();
        if (!this.ensureValidItems()) {
            return;
        }
        this.tree.setFocus([item]);
        const actions = commands.getItemContextActions(item);
        if (!actions.length) {
            return;
        }
        this.contextMenuService.showContextMenu({
            getAnchor: () => treeEvent.anchor,
            getActions: () => actions,
            getActionViewItem: (action) => {
                const keybinding = this.keybindingService.lookupKeybinding(action.id);
                if (keybinding) {
                    return new ActionViewItem(action, action, {
                        label: true,
                        keybinding: keybinding.getLabel(),
                    });
                }
                return undefined;
            },
            onHide: (wasCancelled) => {
                if (wasCancelled) {
                    this.tree.domFocus();
                }
            },
            getActionsContext: () => ({ uri: this.uri, item }),
            actionRunner: new TimelineActionRunner(),
        });
    }
};
__decorate([
    debounce(500)
], TimelinePane.prototype, "refreshDebounced", null);
TimelinePane = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IContextKeyService),
    __param(4, IConfigurationService),
    __param(5, IStorageService),
    __param(6, IViewDescriptorService),
    __param(7, IInstantiationService),
    __param(8, IEditorService),
    __param(9, ICommandService),
    __param(10, IProgressService),
    __param(11, ITimelineService),
    __param(12, IOpenerService),
    __param(13, IThemeService),
    __param(14, IHoverService),
    __param(15, ILabelService),
    __param(16, IUriIdentityService),
    __param(17, IExtensionService)
], TimelinePane);
export { TimelinePane };
class TimelineElementTemplate {
    static { this.id = 'TimelineElementTemplate'; }
    constructor(container, actionViewItemProvider, hoverDelegate) {
        container.classList.add('custom-view-tree-node-item');
        this.icon = DOM.append(container, DOM.$('.custom-view-tree-node-item-icon'));
        this.iconLabel = new IconLabel(container, {
            supportHighlights: true,
            supportIcons: true,
            hoverDelegate,
        });
        const timestampContainer = DOM.append(this.iconLabel.element, DOM.$('.timeline-timestamp-container'));
        this.timestamp = DOM.append(timestampContainer, DOM.$('span.timeline-timestamp'));
        const actionsContainer = DOM.append(this.iconLabel.element, DOM.$('.actions'));
        this.actionBar = new ActionBar(actionsContainer, { actionViewItemProvider });
    }
    dispose() {
        this.iconLabel.dispose();
        this.actionBar.dispose();
    }
    reset() {
        this.icon.className = '';
        this.icon.style.backgroundImage = '';
        this.actionBar.clear();
    }
}
export class TimelineIdentityProvider {
    getId(item) {
        return item.handle;
    }
}
class TimelineActionRunner extends ActionRunner {
    async runAction(action, { uri, item }) {
        if (!isTimelineItem(item)) {
            // TODO@eamodio do we need to do anything else?
            await action.run();
            return;
        }
        await action.run({
            $mid: 12 /* MarshalledId.TimelineActionContext */,
            handle: item.handle,
            source: item.source,
            uri,
        }, uri, item.source);
    }
}
export class TimelineKeyboardNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        return element.label;
    }
}
export class TimelineListVirtualDelegate {
    getHeight(_element) {
        return ItemHeight;
    }
    getTemplateId(element) {
        return TimelineElementTemplate.id;
    }
}
let TimelineTreeRenderer = class TimelineTreeRenderer {
    constructor(commands, instantiationService, themeService) {
        this.commands = commands;
        this.instantiationService = instantiationService;
        this.themeService = themeService;
        this._onDidScrollToEnd = new Emitter();
        this.onDidScrollToEnd = this._onDidScrollToEnd.event;
        this.templateId = TimelineElementTemplate.id;
        this.actionViewItemProvider = createActionViewItem.bind(undefined, this.instantiationService);
        this._hoverDelegate = this.instantiationService.createInstance(WorkbenchHoverDelegate, 'element', { instantHover: true }, {
            position: {
                hoverPosition: 1 /* HoverPosition.RIGHT */, // Will flip when there's no space
            },
        });
    }
    setUri(uri) {
        this.uri = uri;
    }
    renderTemplate(container) {
        return new TimelineElementTemplate(container, this.actionViewItemProvider, this._hoverDelegate);
    }
    renderElement(node, index, template, height) {
        template.reset();
        const { element: item } = node;
        const theme = this.themeService.getColorTheme();
        const icon = theme.type === ColorScheme.LIGHT ? item.icon : item.iconDark;
        const iconUrl = icon ? URI.revive(icon) : null;
        if (iconUrl) {
            template.icon.className = 'custom-view-tree-node-item-icon';
            template.icon.style.backgroundImage = css.asCSSUrl(iconUrl);
            template.icon.style.color = '';
        }
        else if (item.themeIcon) {
            template.icon.className = `custom-view-tree-node-item-icon ${ThemeIcon.asClassName(item.themeIcon)}`;
            if (item.themeIcon.color) {
                template.icon.style.color = theme.getColor(item.themeIcon.color.id)?.toString() ?? '';
            }
            else {
                template.icon.style.color = '';
            }
            template.icon.style.backgroundImage = '';
        }
        else {
            template.icon.className = 'custom-view-tree-node-item-icon';
            template.icon.style.backgroundImage = '';
            template.icon.style.color = '';
        }
        const tooltip = item.tooltip
            ? isString(item.tooltip)
                ? item.tooltip
                : {
                    markdown: item.tooltip,
                    markdownNotSupportedFallback: renderMarkdownAsPlaintext(item.tooltip),
                }
            : undefined;
        template.iconLabel.setLabel(item.label, item.description, {
            title: tooltip,
            matches: createMatches(node.filterData),
        });
        template.timestamp.textContent = item.relativeTime ?? '';
        template.timestamp.ariaLabel = item.relativeTimeFullWord ?? '';
        template.timestamp.parentElement.classList.toggle('timeline-timestamp--duplicate', isTimelineItem(item) && item.hideRelativeTime);
        template.actionBar.context = { uri: this.uri, item };
        template.actionBar.actionRunner = new TimelineActionRunner();
        template.actionBar.push(this.commands.getItemActions(item), { icon: true, label: false });
        // If we are rendering the load more item, we've scrolled to the end, so trigger an event
        if (isLoadMoreCommand(item)) {
            setTimeout(() => this._onDidScrollToEnd.fire(item), 0);
        }
    }
    disposeElement(element, index, templateData, height) {
        templateData.actionBar.actionRunner.dispose();
    }
    disposeTemplate(template) {
        template.dispose();
    }
};
TimelineTreeRenderer = __decorate([
    __param(1, IInstantiationService),
    __param(2, IThemeService)
], TimelineTreeRenderer);
const timelineRefresh = registerIcon('timeline-refresh', Codicon.refresh, localize('timelineRefresh', 'Icon for the refresh timeline action.'));
const timelinePin = registerIcon('timeline-pin', Codicon.pin, localize('timelinePin', 'Icon for the pin timeline action.'));
const timelineUnpin = registerIcon('timeline-unpin', Codicon.pinned, localize('timelineUnpin', 'Icon for the unpin timeline action.'));
let TimelinePaneCommands = class TimelinePaneCommands extends Disposable {
    constructor(pane, timelineService, storageService, contextKeyService, menuService) {
        super();
        this.pane = pane;
        this.timelineService = timelineService;
        this.storageService = storageService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this._register((this.sourceDisposables = new DisposableStore()));
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'timeline.refresh',
                    title: localize2('refresh', 'Refresh'),
                    icon: timelineRefresh,
                    category: localize2('timeline', 'Timeline'),
                    menu: {
                        id: MenuId.TimelineTitle,
                        group: 'navigation',
                        order: 99,
                    },
                });
            }
            run(accessor, ...args) {
                pane.reset();
            }
        }));
        this._register(CommandsRegistry.registerCommand('timeline.toggleFollowActiveEditor', (accessor, ...args) => (pane.followActiveEditor = !pane.followActiveEditor)));
        this._register(MenuRegistry.appendMenuItem(MenuId.TimelineTitle, {
            command: {
                id: 'timeline.toggleFollowActiveEditor',
                title: localize2('timeline.toggleFollowActiveEditorCommand.follow', 'Pin the Current Timeline'),
                icon: timelinePin,
                category: localize2('timeline', 'Timeline'),
            },
            group: 'navigation',
            order: 98,
            when: TimelineFollowActiveEditorContext,
        }));
        this._register(MenuRegistry.appendMenuItem(MenuId.TimelineTitle, {
            command: {
                id: 'timeline.toggleFollowActiveEditor',
                title: localize2('timeline.toggleFollowActiveEditorCommand.unfollow', 'Unpin the Current Timeline'),
                icon: timelineUnpin,
                category: localize2('timeline', 'Timeline'),
            },
            group: 'navigation',
            order: 98,
            when: TimelineFollowActiveEditorContext.toNegated(),
        }));
        this._register(timelineService.onDidChangeProviders(() => this.updateTimelineSourceFilters()));
        this.updateTimelineSourceFilters();
    }
    getItemActions(element) {
        return this.getActions(MenuId.TimelineItemContext, {
            key: 'timelineItem',
            value: element.contextValue,
        }).primary;
    }
    getItemContextActions(element) {
        return this.getActions(MenuId.TimelineItemContext, {
            key: 'timelineItem',
            value: element.contextValue,
        }).secondary;
    }
    getActions(menuId, context) {
        const contextKeyService = this.contextKeyService.createOverlay([
            ['view', this.pane.id],
            [context.key, context.value],
        ]);
        const menu = this.menuService.getMenuActions(menuId, contextKeyService, {
            shouldForwardArgs: true,
        });
        return getContextMenuActions(menu, 'inline');
    }
    updateTimelineSourceFilters() {
        this.sourceDisposables.clear();
        const excluded = new Set(JSON.parse(this.storageService.get('timeline.excludeSources', 0 /* StorageScope.PROFILE */, '[]')));
        for (const source of this.timelineService.getSources()) {
            this.sourceDisposables.add(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: `timeline.toggleExcludeSource:${source.id}`,
                        title: source.label,
                        menu: {
                            id: MenuId.TimelineFilterSubMenu,
                            group: 'navigation',
                        },
                        toggled: ContextKeyExpr.regex(`timelineExcludeSources`, new RegExp(`\\b${escapeRegExpCharacters(source.id)}\\b`)).negate(),
                    });
                }
                run(accessor, ...args) {
                    if (excluded.has(source.id)) {
                        excluded.delete(source.id);
                    }
                    else {
                        excluded.add(source.id);
                    }
                    const storageService = accessor.get(IStorageService);
                    storageService.store('timeline.excludeSources', JSON.stringify([...excluded.keys()]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
                }
            }));
        }
    }
};
TimelinePaneCommands = __decorate([
    __param(1, ITimelineService),
    __param(2, IStorageService),
    __param(3, IContextKeyService),
    __param(4, IMenuService)
], TimelinePaneCommands);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZWxpbmVQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90aW1lbGluZS9icm93c2VyL3RpbWVsaW5lUGFuZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEtBQUssR0FBRyxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBVyxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQWMsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQWUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsR0FBRyxFQUFF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