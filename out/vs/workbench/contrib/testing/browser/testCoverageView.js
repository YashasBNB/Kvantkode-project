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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL3Rlc3RDb3ZlcmFnZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBUTlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQWMsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLGlCQUFpQixHQUNqQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBZSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxv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