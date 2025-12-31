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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZGVkU2NyaXB0c1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2xvYWRlZFNjcmlwdHNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQVUvRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGFBQWEsRUFBYyxNQUFNLG9DQUFvQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixF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