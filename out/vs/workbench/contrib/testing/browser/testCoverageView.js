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
var CurrentlyFilteredToRenderer_1, FileCoverageRenderer_1, DeclarationCoverageRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { findLast } from '../../../../base/common/arraysFind.js';
import { assertNever } from '../../../../base/common/assert.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { memoize } from '../../../../base/common/decorators.js';
import { createMatches } from '../../../../base/common/filters.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../base/common/observable.js';
import { basenameOrAuthority } from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { getActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { EditorOpenSource, } from '../../../../platform/editor/common/editor.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchCompressibleObjectTree } from '../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { ViewAction, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP, } from '../../../services/editor/common/editorService.js';
import { onObservableChange } from '../common/observableUtils.js';
import { BypassedFileCoverage, FileCoverage, getTotalCoveragePercent, } from '../common/testCoverage.js';
import { ITestCoverageService } from '../common/testCoverageService.js';
import { TestId } from '../common/testId.js';
import { TestingContextKeys } from '../common/testingContextKeys.js';
import * as coverUtils from './codeCoverageDisplayUtils.js';
import { testingStatesToIcons, testingWasCovered } from './icons.js';
import { ManagedTestCoverageBars } from './testCoverageBars.js';
var CoverageSortOrder;
(function (CoverageSortOrder) {
    CoverageSortOrder[CoverageSortOrder["Coverage"] = 0] = "Coverage";
    CoverageSortOrder[CoverageSortOrder["Location"] = 1] = "Location";
    CoverageSortOrder[CoverageSortOrder["Name"] = 2] = "Name";
})(CoverageSortOrder || (CoverageSortOrder = {}));
let TestCoverageView = class TestCoverageView extends ViewPane {
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, coverageService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.coverageService = coverageService;
        this.tree = new MutableDisposable();
        this.sortOrder = observableValue('sortOrder', 1 /* CoverageSortOrder.Location */);
    }
    renderBody(container) {
        super.renderBody(container);
        const labels = this._register(this.instantiationService.createInstance(ResourceLabels, {
            onDidChangeVisibility: this.onDidChangeBodyVisibility,
        }));
        this._register(autorun((reader) => {
            const coverage = this.coverageService.selected.read(reader);
            if (coverage) {
                const t = (this.tree.value ??= this.instantiationService.createInstance(TestCoverageTree, container, labels, this.sortOrder));
                t.setInput(coverage, this.coverageService.filterToTest.read(reader));
            }
            else {
                this.tree.clear();
            }
        }));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.value?.layout(height, width);
    }
};
TestCoverageView = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService),
    __param(10, ITestCoverageService)
], TestCoverageView);
export { TestCoverageView };
let fnNodeId = 0;
class DeclarationCoverageNode {
    get hits() {
        return this.data.count;
    }
    get label() {
        return this.data.name;
    }
    get location() {
        return this.data.location;
    }
    get tpc() {
        const attr = this.attributableCoverage();
        return attr && getTotalCoveragePercent(attr.statement, attr.branch, undefined);
    }
    constructor(uri, data, details) {
        this.uri = uri;
        this.data = data;
        this.id = String(fnNodeId++);
        this.containedDetails = new Set();
        this.children = [];
        if (data.location instanceof Range) {
            for (const detail of details) {
                if (this.contains(detail.location)) {
                    this.containedDetails.add(detail);
                }
            }
        }
    }
    /** Gets whether this function has a defined range and contains the given range. */
    contains(location) {
        const own = this.data.location;
        return (own instanceof Range &&
            (location instanceof Range ? own.containsRange(location) : own.containsPosition(location)));
    }
    /**
     * If the function defines a range, we can look at statements within the
     * function to get total coverage for the function, rather than a boolean
     * yes/no.
     */
    attributableCoverage() {
        const { location, count } = this.data;
        if (!(location instanceof Range) || !count) {
            return;
        }
        const statement = { covered: 0, total: 0 };
        const branch = { covered: 0, total: 0 };
        for (const detail of this.containedDetails) {
            if (detail.type !== 1 /* DetailType.Statement */) {
                continue;
            }
            statement.covered += detail.count ? 1 : 0;
            statement.total++;
            if (detail.branches) {
                for (const { count } of detail.branches) {
                    branch.covered += count ? 1 : 0;
                    branch.total++;
                }
            }
        }
        return { statement, branch };
    }
}
__decorate([
    memoize
], DeclarationCoverageNode.prototype, "attributableCoverage", null);
class RevealUncoveredDeclarations {
    get label() {
        return localize('functionsWithoutCoverage', '{0} declarations without coverage...', this.n);
    }
    constructor(n) {
        this.n = n;
        this.id = String(fnNodeId++);
    }
}
class CurrentlyFilteredTo {
    get label() {
        return localize('filteredToTest', 'Showing coverage for "{0}"', this.testItem.label);
    }
    constructor(testItem) {
        this.testItem = testItem;
        this.id = String(fnNodeId++);
    }
}
class LoadingDetails {
    constructor() {
        this.id = String(fnNodeId++);
        this.label = localize('loadingCoverageDetails', 'Loading Coverage Details...');
    }
}
const isFileCoverage = (c) => typeof c === 'object' && 'value' in c;
const isDeclarationCoverage = (c) => c instanceof DeclarationCoverageNode;
const shouldShowDeclDetailsOnExpand = (c) => isFileCoverage(c) && c.value instanceof FileCoverage && !!c.value.declaration?.total;
let TestCoverageTree = class TestCoverageTree extends Disposable {
    constructor(container, labels, sortOrder, instantiationService, editorService, commandService) {
        super();
        this.inputDisposables = this._register(new DisposableStore());
        container.classList.add('testing-stdtree');
        this.tree = instantiationService.createInstance((WorkbenchCompressibleObjectTree), 'TestCoverageView', container, new TestCoverageTreeListDelegate(), [
            instantiationService.createInstance(FileCoverageRenderer, labels),
            instantiationService.createInstance(DeclarationCoverageRenderer),
            instantiationService.createInstance(BasicRenderer),
            instantiationService.createInstance(CurrentlyFilteredToRenderer),
        ], {
            expandOnlyOnTwistieClick: true,
            sorter: new Sorter(sortOrder),
            keyboardNavigationLabelProvider: {
                getCompressedNodeKeyboardNavigationLabel(elements) {
                    return elements.map((e) => this.getKeyboardNavigationLabel(e)).join('/');
                },
                getKeyboardNavigationLabel(e) {
                    return isFileCoverage(e) ? basenameOrAuthority(e.value.uri) : e.label;
                },
            },
            accessibilityProvider: {
                getAriaLabel(element) {
                    if (isFileCoverage(element)) {
                        const name = basenameOrAuthority(element.value.uri);
                        return localize('testCoverageItemLabel', '{0} coverage: {0}%', name, (element.value.tpc * 100).toFixed(2));
                    }
                    else {
                        return element.label;
                    }
                },
                getWidgetAriaLabel() {
                    return localize('testCoverageTreeLabel', 'Test Coverage Explorer');
                },
            },
            identityProvider: new TestCoverageIdentityProvider(),
        });
        this._register(autorun((reader) => {
            sortOrder.read(reader);
            this.tree.resort(null, true);
        }));
        this._register(this.tree);
        this._register(this.tree.onDidChangeCollapseState((e) => {
            const el = e.node.element;
            if (!e.node.collapsed &&
                !e.node.children.length &&
                el &&
                shouldShowDeclDetailsOnExpand(el)) {
                if (el.value.hasSynchronousDetails) {
                    this.tree.setChildren(el, [{ element: new LoadingDetails(), incompressible: true }]);
                }
                el.value.details().then((details) => this.updateWithDetails(el, details));
            }
        }));
        this._register(this.tree.onDidOpen((e) => {
            let resource;
            let selection;
            if (e.element) {
                if (isFileCoverage(e.element) && !e.element.children?.size) {
                    resource = e.element.value.uri;
                }
                else if (isDeclarationCoverage(e.element)) {
                    resource = e.element.uri;
                    selection = e.element.location;
                }
                else if (e.element instanceof CurrentlyFilteredTo) {
                    commandService.executeCommand("testing.coverageFilterToTest" /* TestCommandId.CoverageFilterToTest */);
                    return;
                }
            }
            if (!resource) {
                return;
            }
            editorService.openEditor({
                resource,
                options: {
                    selection: selection instanceof Position
                        ? Range.fromPositions(selection, selection)
                        : selection,
                    revealIfOpened: true,
                    selectionRevealType: 3 /* TextEditorSelectionRevealType.NearTopIfOutsideViewport */,
                    preserveFocus: e.editorOptions.preserveFocus,
                    pinned: e.editorOptions.pinned,
                    source: EditorOpenSource.USER,
                },
            }, e.sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
        }));
    }
    setInput(coverage, showOnlyTest) {
        this.inputDisposables.clear();
        let tree = coverage.tree;
        // Filter to only a test, generate a new tree with only those items selected
        if (showOnlyTest) {
            tree = coverage.filterTreeForTest(showOnlyTest);
        }
        const files = [];
        for (let node of tree.nodes) {
            // when showing initial children, only show from the first file or tee
            while (!(node.value instanceof FileCoverage) && node.children?.size === 1) {
                node = Iterable.first(node.children.values());
            }
            files.push(node);
        }
        const toChild = (value) => {
            const isFile = !value.children?.size;
            return {
                element: value,
                incompressible: isFile,
                collapsed: isFile,
                // directories can be expanded, and items with function info can be expanded
                collapsible: !isFile || !!value.value?.declaration?.total,
                children: value.children && Iterable.map(value.children?.values(), toChild),
            };
        };
        this.inputDisposables.add(onObservableChange(coverage.didAddCoverage, (nodes) => {
            const toRender = findLast(nodes, (n) => this.tree.hasElement(n));
            if (toRender) {
                this.tree.setChildren(toRender, Iterable.map(toRender.children?.values() || [], toChild), { diffIdentityProvider: { getId: (el) => el.value.id } });
            }
        }));
        let children = Iterable.map(files, toChild);
        const filteredTo = showOnlyTest && coverage.result.getTestById(showOnlyTest.toString());
        if (filteredTo) {
            children = Iterable.concat(Iterable.single({
                element: new CurrentlyFilteredTo(filteredTo),
                incompressible: true,
            }), children);
        }
        this.tree.setChildren(null, children);
    }
    layout(height, width) {
        this.tree.layout(height, width);
    }
    updateWithDetails(el, details) {
        if (!this.tree.hasElement(el)) {
            return; // avoid any issues if the tree changes in the meanwhile
        }
        const decl = [];
        for (const fn of details) {
            if (fn.type !== 0 /* DetailType.Declaration */) {
                continue;
            }
            let arr = decl;
            while (true) {
                const parent = arr.find((p) => p.containedDetails.has(fn));
                if (parent) {
                    arr = parent.children;
                }
                else {
                    break;
                }
            }
            arr.push(new DeclarationCoverageNode(el.value.uri, fn, details));
        }
        const makeChild = (fn) => ({
            element: fn,
            incompressible: true,
            collapsed: true,
            collapsible: fn.children.length > 0,
            children: fn.children.map(makeChild),
        });
        this.tree.setChildren(el, decl.map(makeChild));
    }
};
TestCoverageTree = __decorate([
    __param(3, IInstantiationService),
    __param(4, IEditorService),
    __param(5, ICommandService)
], TestCoverageTree);
class TestCoverageTreeListDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        if (isFileCoverage(element)) {
            return FileCoverageRenderer.ID;
        }
        if (isDeclarationCoverage(element)) {
            return DeclarationCoverageRenderer.ID;
        }
        if (element instanceof LoadingDetails || element instanceof RevealUncoveredDeclarations) {
            return BasicRenderer.ID;
        }
        if (element instanceof CurrentlyFilteredTo) {
            return CurrentlyFilteredToRenderer.ID;
        }
        assertNever(element);
    }
}
class Sorter {
    constructor(order) {
        this.order = order;
    }
    compare(a, b) {
        const order = this.order.get();
        if (isFileCoverage(a) && isFileCoverage(b)) {
            switch (order) {
                case 1 /* CoverageSortOrder.Location */:
                case 2 /* CoverageSortOrder.Name */:
                    return a.value.uri.toString().localeCompare(b.value.uri.toString());
                case 0 /* CoverageSortOrder.Coverage */:
                    return b.value.tpc - a.value.tpc;
            }
        }
        else if (isDeclarationCoverage(a) && isDeclarationCoverage(b)) {
            switch (order) {
                case 1 /* CoverageSortOrder.Location */:
                    return Position.compare(a.location instanceof Range ? a.location.getStartPosition() : a.location, b.location instanceof Range ? b.location.getStartPosition() : b.location);
                case 2 /* CoverageSortOrder.Name */:
                    return a.label.localeCompare(b.label);
                case 0 /* CoverageSortOrder.Coverage */: {
                    const attrA = a.tpc;
                    const attrB = b.tpc;
                    return ((attrA !== undefined && attrB !== undefined && attrB - attrA) ||
                        +b.hits - +a.hits ||
                        a.label.localeCompare(b.label));
                }
            }
        }
        else {
            return 0;
        }
    }
}
let CurrentlyFilteredToRenderer = class CurrentlyFilteredToRenderer {
    static { CurrentlyFilteredToRenderer_1 = this; }
    static { this.ID = 'C'; }
    constructor(menuService, contextKeyService) {
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.templateId = CurrentlyFilteredToRenderer_1.ID;
    }
    renderCompressedElements(node, index, templateData, height) {
        this.renderInner(node.element.elements[node.element.elements.length - 1], templateData);
    }
    renderTemplate(container) {
        container.classList.add('testing-stdtree-container');
        const label = dom.append(container, dom.$('.label'));
        const menu = this.menuService.getMenuActions(MenuId.TestCoverageFilterItem, this.contextKeyService, {
            shouldForwardArgs: true,
        });
        const actions = new ActionBar(container);
        actions.push(getActionBarActions(menu, 'inline').primary, { icon: true, label: false });
        actions.domNode.style.display = 'block';
        return { label, actions };
    }
    renderElement(element, index, templateData, height) {
        this.renderInner(element.element, templateData);
    }
    disposeTemplate(templateData) {
        templateData.actions.dispose();
    }
    renderInner(element, container) {
        container.label.innerText = element.label;
    }
};
CurrentlyFilteredToRenderer = CurrentlyFilteredToRenderer_1 = __decorate([
    __param(0, IMenuService),
    __param(1, IContextKeyService)
], CurrentlyFilteredToRenderer);
let FileCoverageRenderer = class FileCoverageRenderer {
    static { FileCoverageRenderer_1 = this; }
    static { this.ID = 'F'; }
    constructor(labels, labelService, instantiationService) {
        this.labels = labels;
        this.labelService = labelService;
        this.instantiationService = instantiationService;
        this.templateId = FileCoverageRenderer_1.ID;
    }
    /** @inheritdoc */
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        container.classList.add('testing-stdtree-container', 'test-coverage-list-item');
        return {
            container,
            bars: templateDisposables.add(this.instantiationService.createInstance(ManagedTestCoverageBars, {
                compact: false,
                container,
            })),
            label: templateDisposables.add(this.labels.create(container, {
                supportHighlights: true,
            })),
            elementsDisposables: templateDisposables.add(new DisposableStore()),
            templateDisposables,
        };
    }
    /** @inheritdoc */
    renderElement(node, _index, templateData) {
        this.doRender(node.element, templateData, node.filterData);
    }
    /** @inheritdoc */
    renderCompressedElements(node, _index, templateData) {
        this.doRender(node.element.elements, templateData, node.filterData);
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
    /** @inheritdoc */
    doRender(element, templateData, filterData) {
        templateData.elementsDisposables.clear();
        const stat = (element instanceof Array ? element[element.length - 1] : element);
        const file = stat.value;
        const name = element instanceof Array
            ? element.map((e) => basenameOrAuthority(e.value.uri))
            : basenameOrAuthority(file.uri);
        if (file instanceof BypassedFileCoverage) {
            templateData.bars.setCoverageInfo(undefined);
        }
        else {
            templateData.elementsDisposables.add(autorun((reader) => {
                stat.value?.didChange.read(reader);
                templateData.bars.setCoverageInfo(file);
            }));
            templateData.bars.setCoverageInfo(file);
        }
        templateData.label.setResource({ resource: file.uri, name }, {
            fileKind: stat.children?.size ? FileKind.FOLDER : FileKind.FILE,
            matches: createMatches(filterData),
            separator: this.labelService.getSeparator(file.uri.scheme, file.uri.authority),
            extraClasses: ['label'],
        });
    }
};
FileCoverageRenderer = FileCoverageRenderer_1 = __decorate([
    __param(1, ILabelService),
    __param(2, IInstantiationService)
], FileCoverageRenderer);
let DeclarationCoverageRenderer = class DeclarationCoverageRenderer {
    static { DeclarationCoverageRenderer_1 = this; }
    static { this.ID = 'N'; }
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
        this.templateId = DeclarationCoverageRenderer_1.ID;
    }
    /** @inheritdoc */
    renderTemplate(container) {
        const templateDisposables = new DisposableStore();
        container.classList.add('test-coverage-list-item', 'testing-stdtree-container');
        const icon = dom.append(container, dom.$('.state'));
        const label = dom.append(container, dom.$('.label'));
        return {
            container,
            bars: templateDisposables.add(this.instantiationService.createInstance(ManagedTestCoverageBars, {
                compact: false,
                container,
            })),
            templateDisposables,
            icon,
            label,
        };
    }
    /** @inheritdoc */
    renderElement(node, _index, templateData) {
        this.doRender(node.element, templateData, node.filterData);
    }
    /** @inheritdoc */
    renderCompressedElements(node, _index, templateData) {
        this.doRender(node.element.elements[node.element.elements.length - 1], templateData, node.filterData);
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
    /** @inheritdoc */
    doRender(element, templateData, _filterData) {
        const covered = !!element.hits;
        const icon = covered ? testingWasCovered : testingStatesToIcons.get(0 /* TestResultState.Unset */);
        templateData.container.classList.toggle('not-covered', !covered);
        templateData.icon.className = `computed-state ${ThemeIcon.asClassName(icon)}`;
        templateData.label.innerText = element.label;
        templateData.bars.setCoverageInfo(element.attributableCoverage());
    }
};
DeclarationCoverageRenderer = DeclarationCoverageRenderer_1 = __decorate([
    __param(0, IInstantiationService)
], DeclarationCoverageRenderer);
class BasicRenderer {
    constructor() {
        this.templateId = BasicRenderer.ID;
    }
    static { this.ID = 'B'; }
    renderCompressedElements(node, _index, container) {
        this.renderInner(node.element.elements[node.element.elements.length - 1], container);
    }
    renderTemplate(container) {
        return container;
    }
    renderElement(node, index, container) {
        this.renderInner(node.element, container);
    }
    disposeTemplate() {
        // no-op
    }
    renderInner(element, container) {
        container.innerText = element.label;
    }
}
class TestCoverageIdentityProvider {
    getId(element) {
        return isFileCoverage(element) ? element.value.uri.toString() : element.id;
    }
}
registerAction2(class TestCoverageChangePerTestFilterAction extends Action2 {
    constructor() {
        super({
            id: "testing.coverageFilterToTest" /* TestCommandId.CoverageFilterToTest */,
            category: Categories.Test,
            title: localize2('testing.changeCoverageFilter', 'Filter Coverage by Test'),
            icon: Codicon.filter,
            toggled: {
                icon: Codicon.filterFilled,
                condition: TestingContextKeys.isCoverageFilteredToTest,
            },
            menu: [
                { id: MenuId.CommandPalette, when: TestingContextKeys.hasPerTestCoverage },
                { id: MenuId.TestCoverageFilterItem, group: 'inline' },
                {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.and(TestingContextKeys.hasPerTestCoverage, ContextKeyExpr.equals('view', "workbench.view.testCoverage" /* Testing.CoverageViewId */)),
                    group: 'navigation',
                },
            ],
        });
    }
    run(accessor) {
        const coverageService = accessor.get(ITestCoverageService);
        const quickInputService = accessor.get(IQuickInputService);
        const coverage = coverageService.selected.get();
        if (!coverage) {
            return;
        }
        const tests = [...coverage.allPerTestIDs()].map(TestId.fromString);
        const commonPrefix = TestId.getLengthOfCommonPrefix(tests.length, (i) => tests[i]);
        const result = coverage.result;
        const previousSelection = coverageService.filterToTest.get();
        const previousSelectionStr = previousSelection?.toString();
        const items = [
            { label: coverUtils.labels.allTests, id: undefined },
            { type: 'separator' },
            ...tests.map((testId) => ({
                label: coverUtils.getLabelForItem(result, testId, commonPrefix),
                testId,
            })),
        ];
        quickInputService
            .pick(items, {
            activeItem: items.find((item) => 'testId' in item && item.testId?.toString() === previousSelectionStr),
            placeHolder: coverUtils.labels.pickShowCoverage,
            onDidFocus: (entry) => {
                coverageService.filterToTest.set(entry.testId, undefined);
            },
        })
            .then((selected) => {
            coverageService.filterToTest.set(selected ? selected.testId : previousSelection, undefined);
        });
    }
});
registerAction2(class TestCoverageChangeSortingAction extends ViewAction {
    constructor() {
        super({
            id: "testing.coverageViewChangeSorting" /* TestCommandId.CoverageViewChangeSorting */,
            viewId: "workbench.view.testCoverage" /* Testing.CoverageViewId */,
            title: localize2('testing.changeCoverageSort', 'Change Sort Order'),
            icon: Codicon.sortPrecedence,
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.equals('view', "workbench.view.testCoverage" /* Testing.CoverageViewId */),
                group: 'navigation',
            },
        });
    }
    runInView(accessor, view) {
        const disposables = new DisposableStore();
        const quickInput = disposables.add(accessor.get(IQuickInputService).createQuickPick());
        const items = [
            {
                label: localize('testing.coverageSortByLocation', 'Sort by Location'),
                value: 1 /* CoverageSortOrder.Location */,
                description: localize('testing.coverageSortByLocationDescription', 'Files are sorted alphabetically, declarations are sorted by position'),
            },
            {
                label: localize('testing.coverageSortByCoverage', 'Sort by Coverage'),
                value: 0 /* CoverageSortOrder.Coverage */,
                description: localize('testing.coverageSortByCoverageDescription', 'Files and declarations are sorted by total coverage'),
            },
            {
                label: localize('testing.coverageSortByName', 'Sort by Name'),
                value: 2 /* CoverageSortOrder.Name */,
                description: localize('testing.coverageSortByNameDescription', 'Files and declarations are sorted alphabetically'),
            },
        ];
        quickInput.placeholder = localize('testing.coverageSortPlaceholder', 'Sort the Test Coverage view...');
        quickInput.items = items;
        quickInput.show();
        disposables.add(quickInput.onDidHide(() => disposables.dispose()));
        disposables.add(quickInput.onDidAccept(() => {
            const picked = quickInput.selectedItems[0]?.value;
            if (picked !== undefined) {
                view.sortOrder.set(picked, undefined);
                quickInput.dispose();
            }
        }));
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0Q292ZXJhZ2VWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQVE5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFjLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixpQkFBaUIsR0FDakIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQWUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRTdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9C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