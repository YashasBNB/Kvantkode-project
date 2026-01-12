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
import { TreeFindMode } from '../../../../base/browser/ui/tree/abstractTree.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { createMatches } from '../../../../base/common/filters.js';
import { normalizeDriveLetter, tildify } from '../../../../base/common/labels.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { isAbsolute, normalize, posix } from '../../../../base/common/path.js';
import { isWindows } from '../../../../base/common/platform.js';
import { ltrim } from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchCompressibleObjectTree } from '../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { ResourceLabels, } from '../../../browser/labels.js';
import { ViewAction, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { CONTEXT_LOADED_SCRIPTS_ITEM_TYPE, IDebugService, LOADED_SCRIPTS_VIEW_ID, } from '../common/debug.js';
import { DebugContentProvider } from '../common/debugContentProvider.js';
import { renderViewTree } from './baseDebugView.js';
const NEW_STYLE_COMPRESS = true;
// RFC 2396, Appendix A: https://www.ietf.org/rfc/rfc2396.txt
const URI_SCHEMA_PATTERN = /^[a-zA-Z][a-zA-Z0-9\+\-\.]+:/;
class BaseTreeItem {
    constructor(_parent, _label, isIncompressible = false) {
        this._parent = _parent;
        this._label = _label;
        this.isIncompressible = isIncompressible;
        this._children = new Map();
        this._showedMoreThanOne = false;
    }
    updateLabel(label) {
        this._label = label;
    }
    isLeaf() {
        return this._children.size === 0;
    }
    getSession() {
        if (this._parent) {
            return this._parent.getSession();
        }
        return undefined;
    }
    setSource(session, source) {
        this._source = source;
        this._children.clear();
        if (source.raw && source.raw.sources) {
            for (const src of source.raw.sources) {
                if (src.name && src.path) {
                    const s = new BaseTreeItem(this, src.name);
                    this._children.set(src.path, s);
                    const ss = session.getSource(src);
                    s.setSource(session, ss);
                }
            }
        }
    }
    createIfNeeded(key, factory) {
        let child = this._children.get(key);
        if (!child) {
            child = factory(this, key);
            this._children.set(key, child);
        }
        return child;
    }
    getChild(key) {
        return this._children.get(key);
    }
    remove(key) {
        this._children.delete(key);
    }
    removeFromParent() {
        if (this._parent) {
            this._parent.remove(this._label);
            if (this._parent._children.size === 0) {
                this._parent.removeFromParent();
            }
        }
    }
    getTemplateId() {
        return 'id';
    }
    // a dynamic ID based on the parent chain; required for reparenting (see #55448)
    getId() {
        const parent = this.getParent();
        return parent ? `${parent.getId()}/${this.getInternalId()}` : this.getInternalId();
    }
    getInternalId() {
        return this._label;
    }
    // skips intermediate single-child nodes
    getParent() {
        if (this._parent) {
            if (this._parent.isSkipped()) {
                return this._parent.getParent();
            }
            return this._parent;
        }
        return undefined;
    }
    isSkipped() {
        if (this._parent) {
            if (this._parent.oneChild()) {
                return true; // skipped if I'm the only child of my parents
            }
            return false;
        }
        return true; // roots are never skipped
    }
    // skips intermediate single-child nodes
    hasChildren() {
        const child = this.oneChild();
        if (child) {
            return child.hasChildren();
        }
        return this._children.size > 0;
    }
    // skips intermediate single-child nodes
    getChildren() {
        const child = this.oneChild();
        if (child) {
            return child.getChildren();
        }
        const array = [];
        for (const child of this._children.values()) {
            array.push(child);
        }
        return array.sort((a, b) => this.compare(a, b));
    }
    // skips intermediate single-child nodes
    getLabel(separateRootFolder = true) {
        const child = this.oneChild();
        if (child) {
            const sep = this instanceof RootFolderTreeItem && separateRootFolder ? ' • ' : posix.sep;
            return `${this._label}${sep}${child.getLabel()}`;
        }
        return this._label;
    }
    // skips intermediate single-child nodes
    getHoverLabel() {
        if (this._source && this._parent && this._parent._source) {
            return this._source.raw.path || this._source.raw.name;
        }
        const label = this.getLabel(false);
        const parent = this.getParent();
        if (parent) {
            const hover = parent.getHoverLabel();
            if (hover) {
                return `${hover}/${label}`;
            }
        }
        return label;
    }
    // skips intermediate single-child nodes
    getSource() {
        const child = this.oneChild();
        if (child) {
            return child.getSource();
        }
        return this._source;
    }
    compare(a, b) {
        if (a._label && b._label) {
            return a._label.localeCompare(b._label);
        }
        return 0;
    }
    oneChild() {
        if (!this._source && !this._showedMoreThanOne && this.skipOneChild()) {
            if (this._children.size === 1) {
                return this._children.values().next().value;
            }
            // if a node had more than one child once, it will never be skipped again
            if (this._children.size > 1) {
                this._showedMoreThanOne = true;
            }
        }
        return undefined;
    }
    skipOneChild() {
        if (NEW_STYLE_COMPRESS) {
            // if the root node has only one Session, don't show the session
            return this instanceof RootTreeItem;
        }
        else {
            return !(this instanceof RootFolderTreeItem) && !(this instanceof SessionTreeItem);
        }
    }
}
class RootFolderTreeItem extends BaseTreeItem {
    constructor(parent, folder) {
        super(parent, folder.name, true);
        this.folder = folder;
    }
}
class RootTreeItem extends BaseTreeItem {
    constructor(_pathService, _contextService, _labelService) {
        super(undefined, 'Root');
        this._pathService = _pathService;
        this._contextService = _contextService;
        this._labelService = _labelService;
    }
    add(session) {
        return this.createIfNeeded(session.getId(), () => new SessionTreeItem(this._labelService, this, session, this._pathService, this._contextService));
    }
    find(session) {
        return this.getChild(session.getId());
    }
}
class SessionTreeItem extends BaseTreeItem {
    static { this.URL_REGEXP = /^(https?:\/\/[^/]+)(\/.*)$/; }
    constructor(labelService, parent, session, _pathService, rootProvider) {
        super(parent, session.getLabel(), true);
        this._pathService = _pathService;
        this.rootProvider = rootProvider;
        this._map = new Map();
        this._labelService = labelService;
        this._session = session;
    }
    getInternalId() {
        return this._session.getId();
    }
    getSession() {
        return this._session;
    }
    getHoverLabel() {
        return undefined;
    }
    hasChildren() {
        return true;
    }
    compare(a, b) {
        const acat = this.category(a);
        const bcat = this.category(b);
        if (acat !== bcat) {
            return acat - bcat;
        }
        return super.compare(a, b);
    }
    category(item) {
        // workspace scripts come at the beginning in "folder" order
        if (item instanceof RootFolderTreeItem) {
            return item.folder.index;
        }
        // <...> come at the very end
        const l = item.getLabel();
        if (l && /^<.+>$/.test(l)) {
            return 1000;
        }
        // everything else in between
        return 999;
    }
    async addPath(source) {
        let folder;
        let url;
        let path = source.raw.path;
        if (!path) {
            return;
        }
        if (this._labelService && URI_SCHEMA_PATTERN.test(path)) {
            path = this._labelService.getUriLabel(URI.parse(path));
        }
        const match = SessionTreeItem.URL_REGEXP.exec(path);
        if (match && match.length === 3) {
            url = match[1];
            path = decodeURI(match[2]);
        }
        else {
            if (isAbsolute(path)) {
                const resource = URI.file(path);
                // return early if we can resolve a relative path label from the root folder
                folder = this.rootProvider ? this.rootProvider.getWorkspaceFolder(resource) : null;
                if (folder) {
                    // strip off the root folder path
                    path = normalize(ltrim(resource.path.substring(folder.uri.path.length), posix.sep));
                    const hasMultipleRoots = this.rootProvider.getWorkspace().folders.length > 1;
                    if (hasMultipleRoots) {
                        path = posix.sep + path;
                    }
                    else {
                        // don't show root folder
                        folder = null;
                    }
                }
                else {
                    // on unix try to tildify absolute paths
                    path = normalize(path);
                    if (isWindows) {
                        path = normalizeDriveLetter(path);
                    }
                    else {
                        path = tildify(path, (await this._pathService.userHome()).fsPath);
                    }
                }
            }
        }
        let leaf = this;
        path.split(/[\/\\]/).forEach((segment, i) => {
            if (i === 0 && folder) {
                const f = folder;
                leaf = leaf.createIfNeeded(folder.name, (parent) => new RootFolderTreeItem(parent, f));
            }
            else if (i === 0 && url) {
                leaf = leaf.createIfNeeded(url, (parent) => new BaseTreeItem(parent, url));
            }
            else {
                leaf = leaf.createIfNeeded(segment, (parent) => new BaseTreeItem(parent, segment));
            }
        });
        leaf.setSource(this._session, source);
        if (source.raw.path) {
            this._map.set(source.raw.path, leaf);
        }
    }
    removePath(source) {
        if (source.raw.path) {
            const leaf = this._map.get(source.raw.path);
            if (leaf) {
                leaf.removeFromParent();
                return true;
            }
        }
        return false;
    }
}
/**
 * This maps a model item into a view model item.
 */
function asTreeElement(item, viewState) {
    const children = item.getChildren();
    const collapsed = viewState
        ? !viewState.expanded.has(item.getId())
        : !(item instanceof SessionTreeItem);
    return {
        element: item,
        collapsed,
        collapsible: item.hasChildren(),
        children: children.map((i) => asTreeElement(i, viewState)),
    };
}
let LoadedScriptsView = class LoadedScriptsView extends ViewPane {
    constructor(options, contextMenuService, keybindingService, instantiationService, viewDescriptorService, configurationService, editorService, contextKeyService, contextService, debugService, labelService, pathService, openerService, themeService, hoverService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.editorService = editorService;
        this.contextService = contextService;
        this.debugService = debugService;
        this.labelService = labelService;
        this.pathService = pathService;
        this.treeNeedsRefreshOnVisible = false;
        this.loadedScriptsItemType = CONTEXT_LOADED_SCRIPTS_ITEM_TYPE.bindTo(contextKeyService);
    }
    renderBody(container) {
        super.renderBody(container);
        this.element.classList.add('debug-pane');
        container.classList.add('debug-loaded-scripts', 'show-file-icons');
        this.treeContainer = renderViewTree(container);
        this.filter = new LoadedScriptsFilter();
        const root = new RootTreeItem(this.pathService, this.contextService, this.labelService);
        this.treeLabels = this.instantiationService.createInstance(ResourceLabels, {
            onDidChangeVisibility: this.onDidChangeBodyVisibility,
        });
        this._register(this.treeLabels);
        const onFileIconThemeChange = (fileIconTheme) => {
            this.treeContainer.classList.toggle('align-icons-and-twisties', fileIconTheme.hasFileIcons && !fileIconTheme.hasFolderIcons);
            this.treeContainer.classList.toggle('hide-arrows', fileIconTheme.hidesExplorerArrows === true);
        };
        this._register(this.themeService.onDidFileIconThemeChange(onFileIconThemeChange));
        onFileIconThemeChange(this.themeService.getFileIconTheme());
        this.tree = this.instantiationService.createInstance((WorkbenchCompressibleObjectTree), 'LoadedScriptsView', this.treeContainer, new LoadedScriptsDelegate(), [new LoadedScriptsRenderer(this.treeLabels)], {
            compressionEnabled: NEW_STYLE_COMPRESS,
            collapseByDefault: true,
            hideTwistiesOfChildlessElements: true,
            identityProvider: {
                getId: (element) => element.getId(),
            },
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (element) => {
                    return element.getLabel();
                },
                getCompressedNodeKeyboardNavigationLabel: (elements) => {
                    return elements.map((e) => e.getLabel()).join('/');
                },
            },
            filter: this.filter,
            accessibilityProvider: new LoadedSciptsAccessibilityProvider(),
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
        });
        const updateView = (viewState) => this.tree.setChildren(null, asTreeElement(root, viewState).children);
        updateView();
        this.changeScheduler = new RunOnceScheduler(() => {
            this.treeNeedsRefreshOnVisible = false;
            if (this.tree) {
                updateView();
            }
        }, 300);
        this._register(this.changeScheduler);
        this._register(this.tree.onDidOpen((e) => {
            if (e.element instanceof BaseTreeItem) {
                const source = e.element.getSource();
                if (source && source.available) {
                    const nullRange = { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 };
                    source.openInEditor(this.editorService, nullRange, e.editorOptions.preserveFocus, e.sideBySide, e.editorOptions.pinned);
                }
            }
        }));
        this._register(this.tree.onDidChangeFocus(() => {
            const focus = this.tree.getFocus();
            if (focus instanceof SessionTreeItem) {
                this.loadedScriptsItemType.set('session');
            }
            else {
                this.loadedScriptsItemType.reset();
            }
        }));
        const scheduleRefreshOnVisible = () => {
            if (this.isBodyVisible()) {
                this.changeScheduler.schedule();
            }
            else {
                this.treeNeedsRefreshOnVisible = true;
            }
        };
        const addSourcePathsToSession = async (session) => {
            if (session.capabilities.supportsLoadedSourcesRequest) {
                const sessionNode = root.add(session);
                const paths = await session.getLoadedSources();
                for (const path of paths) {
                    await sessionNode.addPath(path);
                }
                scheduleRefreshOnVisible();
            }
        };
        const registerSessionListeners = (session) => {
            this._register(session.onDidChangeName(async () => {
                const sessionRoot = root.find(session);
                if (sessionRoot) {
                    sessionRoot.updateLabel(session.getLabel());
                    scheduleRefreshOnVisible();
                }
            }));
            this._register(session.onDidLoadedSource(async (event) => {
                let sessionRoot;
                switch (event.reason) {
                    case 'new':
                    case 'changed':
                        sessionRoot = root.add(session);
                        await sessionRoot.addPath(event.source);
                        scheduleRefreshOnVisible();
                        if (event.reason === 'changed') {
                            DebugContentProvider.refreshDebugContent(event.source.uri);
                        }
                        break;
                    case 'removed':
                        sessionRoot = root.find(session);
                        if (sessionRoot && sessionRoot.removePath(event.source)) {
                            scheduleRefreshOnVisible();
                        }
                        break;
                    default:
                        this.filter.setFilter(event.source.name);
                        this.tree.refilter();
                        break;
                }
            }));
        };
        this._register(this.debugService.onDidNewSession(registerSessionListeners));
        this.debugService.getModel().getSessions().forEach(registerSessionListeners);
        this._register(this.debugService.onDidEndSession(({ session }) => {
            root.remove(session.getId());
            this.changeScheduler.schedule();
        }));
        this.changeScheduler.schedule(0);
        this._register(this.onDidChangeBodyVisibility((visible) => {
            if (visible && this.treeNeedsRefreshOnVisible) {
                this.changeScheduler.schedule();
            }
        }));
        // feature: expand all nodes when filtering (not when finding)
        let viewState;
        this._register(this.tree.onDidChangeFindPattern((pattern) => {
            if (this.tree.findMode === TreeFindMode.Highlight) {
                return;
            }
            if (!viewState && pattern) {
                const expanded = new Set();
                const visit = (node) => {
                    if (node.element && !node.collapsed) {
                        expanded.add(node.element.getId());
                    }
                    for (const child of node.children) {
                        visit(child);
                    }
                };
                visit(this.tree.getNode());
                viewState = { expanded };
                this.tree.expandAll();
            }
            else if (!pattern && viewState) {
                this.tree.setFocus([]);
                updateView(viewState);
                viewState = undefined;
            }
        }));
        // populate tree model with source paths from all debug sessions
        this.debugService
            .getModel()
            .getSessions()
            .forEach((session) => addSourcePathsToSession(session));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.layout(height, width);
    }
    collapseAll() {
        this.tree.collapseAll();
    }
    dispose() {
        dispose(this.tree);
        dispose(this.treeLabels);
        super.dispose();
    }
};
LoadedScriptsView = __decorate([
    __param(1, IContextMenuService),
    __param(2, IKeybindingService),
    __param(3, IInstantiationService),
    __param(4, IViewDescriptorService),
    __param(5, IConfigurationService),
    __param(6, IEditorService),
    __param(7, IContextKeyService),
    __param(8, IWorkspaceContextService),
    __param(9, IDebugService),
    __param(10, ILabelService),
    __param(11, IPathService),
    __param(12, IOpenerService),
    __param(13, IThemeService),
    __param(14, IHoverService)
], LoadedScriptsView);
export { LoadedScriptsView };
class LoadedScriptsDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        return LoadedScriptsRenderer.ID;
    }
}
class LoadedScriptsRenderer {
    static { this.ID = 'lsrenderer'; }
    constructor(labels) {
        this.labels = labels;
    }
    get templateId() {
        return LoadedScriptsRenderer.ID;
    }
    renderTemplate(container) {
        const label = this.labels.create(container, { supportHighlights: true });
        return { label };
    }
    renderElement(node, index, data) {
        const element = node.element;
        const label = element.getLabel();
        this.render(element, label, data, node.filterData);
    }
    renderCompressedElements(node, index, data, height) {
        const element = node.element.elements[node.element.elements.length - 1];
        const labels = node.element.elements.map((e) => e.getLabel());
        this.render(element, labels, data, node.filterData);
    }
    render(element, labels, data, filterData) {
        const label = {
            name: labels,
        };
        const options = {
            title: element.getHoverLabel(),
        };
        if (element instanceof RootFolderTreeItem) {
            options.fileKind = FileKind.ROOT_FOLDER;
        }
        else if (element instanceof SessionTreeItem) {
            options.title = nls.localize('loadedScriptsSession', 'Debug Session');
            options.hideIcon = true;
        }
        else if (element instanceof BaseTreeItem) {
            const src = element.getSource();
            if (src && src.uri) {
                label.resource = src.uri;
                options.fileKind = FileKind.FILE;
            }
            else {
                options.fileKind = FileKind.FOLDER;
            }
        }
        options.matches = createMatches(filterData);
        data.label.setResource(label, options);
    }
    disposeTemplate(templateData) {
        templateData.label.dispose();
    }
}
class LoadedSciptsAccessibilityProvider {
    getWidgetAriaLabel() {
        return nls.localize({ comment: ['Debug is a noun in this context, not a verb.'], key: 'loadedScriptsAriaLabel' }, 'Debug Loaded Scripts');
    }
    getAriaLabel(element) {
        if (element instanceof RootFolderTreeItem) {
            return nls.localize('loadedScriptsRootFolderAriaLabel', 'Workspace folder {0}, loaded script, debug', element.getLabel());
        }
        if (element instanceof SessionTreeItem) {
            return nls.localize('loadedScriptsSessionAriaLabel', 'Session {0}, loaded script, debug', element.getLabel());
        }
        if (element.hasChildren()) {
            return nls.localize('loadedScriptsFolderAriaLabel', 'Folder {0}, loaded script, debug', element.getLabel());
        }
        else {
            return nls.localize('loadedScriptsSourceAriaLabel', '{0}, loaded script, debug', element.getLabel());
        }
    }
}
class LoadedScriptsFilter {
    setFilter(filterText) {
        this.filterText = filterText;
    }
    filter(element, parentVisibility) {
        if (!this.filterText) {
            return 1 /* TreeVisibility.Visible */;
        }
        if (element.isLeaf()) {
            const name = element.getLabel();
            if (name.indexOf(this.filterText) >= 0) {
                return 1 /* TreeVisibility.Visible */;
            }
            return 0 /* TreeVisibility.Hidden */;
        }
        return 2 /* TreeVisibility.Recurse */;
    }
}
registerAction2(class Collapse extends ViewAction {
    constructor() {
        super({
            id: 'loadedScripts.collapse',
            viewId: LOADED_SCRIPTS_VIEW_ID,
            title: nls.localize('collapse', 'Collapse All'),
            f1: false,
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                order: 30,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', LOADED_SCRIPTS_VIEW_ID),
            },
        });
    }
    runInView(_accessor, view) {
        view.collapseAll();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZGVkU2NyaXB0c1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvbG9hZGVkU2NyaXB0c1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBVS9FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFjLE1BQU0sb0NBQW9DLENBQUE7QUFDOUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsbUJB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