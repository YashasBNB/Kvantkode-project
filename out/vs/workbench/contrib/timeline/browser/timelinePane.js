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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZWxpbmVQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGltZWxpbmUvYnJvd3Nlci90aW1lbGluZVBhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQVcsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFjLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFlLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BE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