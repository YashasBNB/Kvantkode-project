/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../base/common/keyCodes.js';
import { KeybindingsRegistry, } from '../../../platform/keybinding/common/keybindingsRegistry.js';
import { List } from '../../../base/browser/ui/list/listWidget.js';
import { WorkbenchListFocusContextKey, IListService, WorkbenchListSupportsMultiSelectContextKey, WorkbenchListHasSelectionOrFocus, getSelectionKeyboardEvent, WorkbenchListSelectionNavigation, WorkbenchTreeElementCanCollapse, WorkbenchTreeElementHasParent, WorkbenchTreeElementHasChild, WorkbenchTreeElementCanExpand, RawWorkbenchListFocusContextKey, WorkbenchTreeFindOpen, WorkbenchListSupportsFind, WorkbenchListScrollAtBottomContextKey, WorkbenchListScrollAtTopContextKey, WorkbenchTreeStickyScrollFocused, } from '../../../platform/list/browser/listService.js';
import { PagedList } from '../../../base/browser/ui/list/listPaging.js';
import { equals, range } from '../../../base/common/arrays.js';
import { ContextKeyExpr } from '../../../platform/contextkey/common/contextkey.js';
import { ObjectTree } from '../../../base/browser/ui/tree/objectTree.js';
import { AsyncDataTree } from '../../../base/browser/ui/tree/asyncDataTree.js';
import { DataTree } from '../../../base/browser/ui/tree/dataTree.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { Table } from '../../../base/browser/ui/table/tableWidget.js';
import { AbstractTree, TreeFindMatchType, TreeFindMode, } from '../../../base/browser/ui/tree/abstractTree.js';
import { isActiveElement } from '../../../base/browser/dom.js';
import { Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { localize, localize2 } from '../../../nls.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
function ensureDOMFocus(widget) {
    // it can happen that one of the commands is executed while
    // DOM focus is within another focusable control within the
    // list/tree item. therefor we should ensure that the
    // list/tree has DOM focus again after the command ran.
    const element = widget?.getHTMLElement();
    if (element && !isActiveElement(element)) {
        widget?.domFocus();
    }
}
async function updateFocus(widget, updateFocusFn) {
    if (!WorkbenchListSelectionNavigation.getValue(widget.contextKeyService)) {
        return updateFocusFn(widget);
    }
    const focus = widget.getFocus();
    const selection = widget.getSelection();
    await updateFocusFn(widget);
    const newFocus = widget.getFocus();
    if (selection.length > 1 || !equals(focus, selection) || equals(focus, newFocus)) {
        return;
    }
    const fakeKeyboardEvent = new KeyboardEvent('keydown');
    widget.setSelection(newFocus, fakeKeyboardEvent);
}
async function navigate(widget, updateFocusFn) {
    if (!widget) {
        return;
    }
    await updateFocus(widget, updateFocusFn);
    const listFocus = widget.getFocus();
    if (listFocus.length) {
        widget.reveal(listFocus[0]);
    }
    widget.setAnchor(listFocus[0]);
    ensureDOMFocus(widget);
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 18 /* KeyCode.DownArrow */,
    mac: {
        primary: 18 /* KeyCode.DownArrow */,
        secondary: [256 /* KeyMod.WinCtrl */ | 44 /* KeyCode.KeyN */],
    },
    handler: (accessor, arg2) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            await widget.focusNext(typeof arg2 === 'number' ? arg2 : 1, false, fakeKeyboardEvent);
        });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 16 /* KeyCode.UpArrow */,
    mac: {
        primary: 16 /* KeyCode.UpArrow */,
        secondary: [256 /* KeyMod.WinCtrl */ | 46 /* KeyCode.KeyP */],
    },
    handler: (accessor, arg2) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            await widget.focusPrevious(typeof arg2 === 'number' ? arg2 : 1, false, fakeKeyboardEvent);
        });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusAnyDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
    mac: {
        primary: 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
        secondary: [256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 44 /* KeyCode.KeyN */],
    },
    handler: (accessor, arg2) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown', { altKey: true });
            await widget.focusNext(typeof arg2 === 'number' ? arg2 : 1, false, fakeKeyboardEvent);
        });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusAnyUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
    mac: {
        primary: 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
        secondary: [256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 46 /* KeyCode.KeyP */],
    },
    handler: (accessor, arg2) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown', { altKey: true });
            await widget.focusPrevious(typeof arg2 === 'number' ? arg2 : 1, false, fakeKeyboardEvent);
        });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusPageDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 12 /* KeyCode.PageDown */,
    handler: (accessor) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            await widget.focusNextPage(fakeKeyboardEvent);
        });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusPageUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 11 /* KeyCode.PageUp */,
    handler: (accessor) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            await widget.focusPreviousPage(fakeKeyboardEvent);
        });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusFirst',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 14 /* KeyCode.Home */,
    handler: (accessor) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            await widget.focusFirst(fakeKeyboardEvent);
        });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusLast',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 13 /* KeyCode.End */,
    handler: (accessor) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            await widget.focusLast(fakeKeyboardEvent);
        });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusAnyFirst',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 512 /* KeyMod.Alt */ | 14 /* KeyCode.Home */,
    handler: (accessor) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown', { altKey: true });
            await widget.focusFirst(fakeKeyboardEvent);
        });
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusAnyLast',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 512 /* KeyMod.Alt */ | 13 /* KeyCode.End */,
    handler: (accessor) => {
        navigate(accessor.get(IListService).lastFocusedList, async (widget) => {
            const fakeKeyboardEvent = new KeyboardEvent('keydown', { altKey: true });
            await widget.focusLast(fakeKeyboardEvent);
        });
    },
});
function expandMultiSelection(focused, previousFocus) {
    // List
    if (focused instanceof List || focused instanceof PagedList || focused instanceof Table) {
        const list = focused;
        const focus = list.getFocus() ? list.getFocus()[0] : undefined;
        const selection = list.getSelection();
        if (selection && typeof focus === 'number' && selection.indexOf(focus) >= 0) {
            list.setSelection(selection.filter((s) => s !== previousFocus));
        }
        else {
            if (typeof focus === 'number') {
                list.setSelection(selection.concat(focus));
            }
        }
    }
    // Tree
    else if (focused instanceof ObjectTree ||
        focused instanceof DataTree ||
        focused instanceof AsyncDataTree) {
        const list = focused;
        const focus = list.getFocus() ? list.getFocus()[0] : undefined;
        if (previousFocus === focus) {
            return;
        }
        const selection = list.getSelection();
        const fakeKeyboardEvent = new KeyboardEvent('keydown', { shiftKey: true });
        if (selection && selection.indexOf(focus) >= 0) {
            list.setSelection(selection.filter((s) => s !== previousFocus), fakeKeyboardEvent);
        }
        else {
            list.setSelection(selection.concat(focus), fakeKeyboardEvent);
        }
    }
}
function revealFocusedStickyScroll(tree, postRevealAction) {
    const focus = tree.getStickyScrollFocus();
    if (focus.length === 0) {
        throw new Error(`StickyScroll has no focus`);
    }
    if (focus.length > 1) {
        throw new Error(`StickyScroll can only have a single focused item`);
    }
    tree.reveal(focus[0]);
    tree.getHTMLElement().focus(); // domfocus() would focus stiky scroll dom and not the tree todo@benibenj
    tree.setFocus(focus);
    postRevealAction?.(focus[0]);
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.expandSelectionDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, WorkbenchListSupportsMultiSelectContextKey),
    primary: 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */,
    handler: (accessor, arg2) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget) {
            return;
        }
        // Focus down first
        const previousFocus = widget.getFocus() ? widget.getFocus()[0] : undefined;
        const fakeKeyboardEvent = new KeyboardEvent('keydown');
        widget.focusNext(typeof arg2 === 'number' ? arg2 : 1, false, fakeKeyboardEvent);
        // Then adjust selection
        expandMultiSelection(widget, previousFocus);
        const focus = widget.getFocus();
        if (focus.length) {
            widget.reveal(focus[0]);
        }
        ensureDOMFocus(widget);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.expandSelectionUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, WorkbenchListSupportsMultiSelectContextKey),
    primary: 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */,
    handler: (accessor, arg2) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget) {
            return;
        }
        // Focus up first
        const previousFocus = widget.getFocus() ? widget.getFocus()[0] : undefined;
        const fakeKeyboardEvent = new KeyboardEvent('keydown');
        widget.focusPrevious(typeof arg2 === 'number' ? arg2 : 1, false, fakeKeyboardEvent);
        // Then adjust selection
        expandMultiSelection(widget, previousFocus);
        const focus = widget.getFocus();
        if (focus.length) {
            widget.reveal(focus[0]);
        }
        ensureDOMFocus(widget);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.collapse',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, ContextKeyExpr.or(WorkbenchTreeElementCanCollapse, WorkbenchTreeElementHasParent)),
    primary: 15 /* KeyCode.LeftArrow */,
    mac: {
        primary: 15 /* KeyCode.LeftArrow */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */],
    },
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget ||
            !(widget instanceof ObjectTree ||
                widget instanceof DataTree ||
                widget instanceof AsyncDataTree)) {
            return;
        }
        const tree = widget;
        const focusedElements = tree.getFocus();
        if (focusedElements.length === 0) {
            return;
        }
        const focus = focusedElements[0];
        if (!tree.collapse(focus)) {
            const parent = tree.getParentElement(focus);
            if (parent) {
                navigate(widget, (widget) => {
                    const fakeKeyboardEvent = new KeyboardEvent('keydown');
                    widget.setFocus([parent], fakeKeyboardEvent);
                });
            }
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.stickyScroll.collapse',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    when: WorkbenchTreeStickyScrollFocused,
    primary: 15 /* KeyCode.LeftArrow */,
    mac: {
        primary: 15 /* KeyCode.LeftArrow */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */],
    },
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget ||
            !(widget instanceof ObjectTree ||
                widget instanceof DataTree ||
                widget instanceof AsyncDataTree)) {
            return;
        }
        revealFocusedStickyScroll(widget, (focus) => widget.collapse(focus));
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.collapseAll',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */],
    },
    handler: (accessor) => {
        const focused = accessor.get(IListService).lastFocusedList;
        if (focused &&
            !(focused instanceof List || focused instanceof PagedList || focused instanceof Table)) {
            focused.collapseAll();
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.collapseAllToFocus',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    handler: (accessor) => {
        const focused = accessor.get(IListService).lastFocusedList;
        const fakeKeyboardEvent = getSelectionKeyboardEvent('keydown', true);
        // Trees
        if (focused instanceof ObjectTree ||
            focused instanceof DataTree ||
            focused instanceof AsyncDataTree) {
            const tree = focused;
            const focus = tree.getFocus();
            if (focus.length > 0) {
                tree.collapse(focus[0], true);
            }
            tree.setSelection(focus, fakeKeyboardEvent);
            tree.setAnchor(focus[0]);
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.focusParent',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget ||
            !(widget instanceof ObjectTree ||
                widget instanceof DataTree ||
                widget instanceof AsyncDataTree)) {
            return;
        }
        const tree = widget;
        const focusedElements = tree.getFocus();
        if (focusedElements.length === 0) {
            return;
        }
        const focus = focusedElements[0];
        const parent = tree.getParentElement(focus);
        if (parent) {
            navigate(widget, (widget) => {
                const fakeKeyboardEvent = new KeyboardEvent('keydown');
                widget.setFocus([parent], fakeKeyboardEvent);
            });
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.expand',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, ContextKeyExpr.or(WorkbenchTreeElementCanExpand, WorkbenchTreeElementHasChild)),
    primary: 17 /* KeyCode.RightArrow */,
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget) {
            return;
        }
        if (widget instanceof ObjectTree || widget instanceof DataTree) {
            // TODO@Joao: instead of doing this here, just delegate to a tree method
            const focusedElements = widget.getFocus();
            if (focusedElements.length === 0) {
                return;
            }
            const focus = focusedElements[0];
            if (!widget.expand(focus)) {
                const child = widget.getFirstElementChild(focus);
                if (child) {
                    const node = widget.getNode(child);
                    if (node.visible) {
                        navigate(widget, (widget) => {
                            const fakeKeyboardEvent = new KeyboardEvent('keydown');
                            widget.setFocus([child], fakeKeyboardEvent);
                        });
                    }
                }
            }
        }
        else if (widget instanceof AsyncDataTree) {
            // TODO@Joao: instead of doing this here, just delegate to a tree method
            const focusedElements = widget.getFocus();
            if (focusedElements.length === 0) {
                return;
            }
            const focus = focusedElements[0];
            widget.expand(focus).then((didExpand) => {
                if (focus && !didExpand) {
                    const child = widget.getFirstElementChild(focus);
                    if (child) {
                        const node = widget.getNode(child);
                        if (node.visible) {
                            navigate(widget, (widget) => {
                                const fakeKeyboardEvent = new KeyboardEvent('keydown');
                                widget.setFocus([child], fakeKeyboardEvent);
                            });
                        }
                    }
                }
            });
        }
    },
});
function selectElement(accessor, retainCurrentFocus) {
    const focused = accessor.get(IListService).lastFocusedList;
    const fakeKeyboardEvent = getSelectionKeyboardEvent('keydown', retainCurrentFocus);
    // List
    if (focused instanceof List || focused instanceof PagedList || focused instanceof Table) {
        const list = focused;
        list.setAnchor(list.getFocus()[0]);
        list.setSelection(list.getFocus(), fakeKeyboardEvent);
    }
    // Trees
    else if (focused instanceof ObjectTree ||
        focused instanceof DataTree ||
        focused instanceof AsyncDataTree) {
        const tree = focused;
        const focus = tree.getFocus();
        if (focus.length > 0) {
            let toggleCollapsed = true;
            if (tree.expandOnlyOnTwistieClick === true) {
                toggleCollapsed = false;
            }
            else if (typeof tree.expandOnlyOnTwistieClick !== 'boolean' &&
                tree.expandOnlyOnTwistieClick(focus[0])) {
                toggleCollapsed = false;
            }
            if (toggleCollapsed) {
                tree.toggleCollapsed(focus[0]);
            }
        }
        tree.setAnchor(focus[0]);
        tree.setSelection(focus, fakeKeyboardEvent);
    }
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.select',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 3 /* KeyCode.Enter */,
    mac: {
        primary: 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */],
    },
    handler: (accessor) => {
        selectElement(accessor, false);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.stickyScrollselect',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50, // priorities over file explorer
    when: WorkbenchTreeStickyScrollFocused,
    primary: 3 /* KeyCode.Enter */,
    mac: {
        primary: 3 /* KeyCode.Enter */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */],
    },
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget ||
            !(widget instanceof ObjectTree ||
                widget instanceof DataTree ||
                widget instanceof AsyncDataTree)) {
            return;
        }
        revealFocusedStickyScroll(widget, (focus) => widget.setSelection([focus]));
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.selectAndPreserveFocus',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    handler: (accessor) => {
        selectElement(accessor, true);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.selectAll',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, WorkbenchListSupportsMultiSelectContextKey),
    primary: 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */,
    handler: (accessor) => {
        const focused = accessor.get(IListService).lastFocusedList;
        // List
        if (focused instanceof List || focused instanceof PagedList || focused instanceof Table) {
            const list = focused;
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            list.setSelection(range(list.length), fakeKeyboardEvent);
        }
        // Trees
        else if (focused instanceof ObjectTree ||
            focused instanceof DataTree ||
            focused instanceof AsyncDataTree) {
            const tree = focused;
            const focus = tree.getFocus();
            const selection = tree.getSelection();
            // Which element should be considered to start selecting all?
            let start = undefined;
            if (focus.length > 0 && (selection.length === 0 || !selection.includes(focus[0]))) {
                start = focus[0];
            }
            if (!start && selection.length > 0) {
                start = selection[0];
            }
            // What is the scope of select all?
            let scope = undefined;
            if (!start) {
                scope = undefined;
            }
            else {
                scope = tree.getParentElement(start);
            }
            const newSelection = [];
            const visit = (node) => {
                for (const child of node.children) {
                    if (child.visible) {
                        newSelection.push(child.element);
                        if (!child.collapsed) {
                            visit(child);
                        }
                    }
                }
            };
            // Add the whole scope subtree to the new selection
            visit(tree.getNode(scope));
            // If the scope isn't the tree root, it should be part of the new selection
            if (scope && selection.length === newSelection.length) {
                newSelection.unshift(scope);
            }
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            tree.setSelection(newSelection, fakeKeyboardEvent);
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.toggleSelection',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget) {
            return;
        }
        const focus = widget.getFocus();
        if (focus.length === 0) {
            return;
        }
        const selection = widget.getSelection();
        const index = selection.indexOf(focus[0]);
        if (index > -1) {
            widget.setSelection([...selection.slice(0, index), ...selection.slice(index + 1)]);
        }
        else {
            widget.setSelection([...selection, focus[0]]);
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.showHover',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */),
    when: WorkbenchListFocusContextKey,
    handler: async (accessor, ...args) => {
        const listService = accessor.get(IListService);
        const lastFocusedList = listService.lastFocusedList;
        if (!lastFocusedList) {
            return;
        }
        // Check if a tree element is focused
        const focus = lastFocusedList.getFocus();
        if (!focus || focus.length === 0) {
            return;
        }
        // As the tree does not know anything about the rendered DOM elements
        // we have to traverse the dom to find the HTMLElements
        const treeDOM = lastFocusedList.getHTMLElement();
        const scrollableElement = treeDOM.querySelector('.monaco-scrollable-element');
        const listRows = scrollableElement?.querySelector('.monaco-list-rows');
        const focusedElement = listRows?.querySelector('.focused');
        if (!focusedElement) {
            return;
        }
        const elementWithHover = getCustomHoverForElement(focusedElement);
        if (elementWithHover) {
            accessor.get(IHoverService).showManagedHover(elementWithHover);
        }
    },
});
function getCustomHoverForElement(element) {
    // Check if the element itself has a hover
    if (element.matches('[custom-hover="true"]')) {
        return element;
    }
    // Only consider children that are not action items or have a tabindex
    // as these element are focusable and the user is able to trigger them already
    const noneFocusableElementWithHover = element.querySelector('[custom-hover="true"]:not([tabindex]):not(.action-item)');
    if (noneFocusableElementWithHover) {
        return noneFocusableElementWithHover;
    }
    return undefined;
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.toggleExpand',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    primary: 10 /* KeyCode.Space */,
    handler: (accessor) => {
        const focused = accessor.get(IListService).lastFocusedList;
        // Tree only
        if (focused instanceof ObjectTree ||
            focused instanceof DataTree ||
            focused instanceof AsyncDataTree) {
            const tree = focused;
            const focus = tree.getFocus();
            if (focus.length > 0 && tree.isCollapsible(focus[0])) {
                tree.toggleCollapsed(focus[0]);
                return;
            }
        }
        selectElement(accessor, true);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.stickyScrolltoggleExpand',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50, // priorities over file explorer
    when: WorkbenchTreeStickyScrollFocused,
    primary: 10 /* KeyCode.Space */,
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget ||
            !(widget instanceof ObjectTree ||
                widget instanceof DataTree ||
                widget instanceof AsyncDataTree)) {
            return;
        }
        revealFocusedStickyScroll(widget);
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.clear',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, WorkbenchListHasSelectionOrFocus),
    primary: 9 /* KeyCode.Escape */,
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (!widget) {
            return;
        }
        const selection = widget.getSelection();
        const fakeKeyboardEvent = new KeyboardEvent('keydown');
        if (selection.length > 1) {
            const useSelectionNavigation = WorkbenchListSelectionNavigation.getValue(widget.contextKeyService);
            if (useSelectionNavigation) {
                const focus = widget.getFocus();
                widget.setSelection([focus[0]], fakeKeyboardEvent);
            }
            else {
                widget.setSelection([], fakeKeyboardEvent);
            }
        }
        else {
            widget.setSelection([], fakeKeyboardEvent);
            widget.setFocus([], fakeKeyboardEvent);
        }
        widget.setAnchor(undefined);
    },
});
CommandsRegistry.registerCommand({
    id: 'list.triggerTypeNavigation',
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        widget?.triggerTypeNavigation();
    },
});
CommandsRegistry.registerCommand({
    id: 'list.toggleFindMode',
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (widget instanceof AbstractTree || widget instanceof AsyncDataTree) {
            const tree = widget;
            tree.findMode =
                tree.findMode === TreeFindMode.Filter ? TreeFindMode.Highlight : TreeFindMode.Filter;
        }
    },
});
CommandsRegistry.registerCommand({
    id: 'list.toggleFindMatchType',
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (widget instanceof AbstractTree || widget instanceof AsyncDataTree) {
            const tree = widget;
            tree.findMatchType =
                tree.findMatchType === TreeFindMatchType.Contiguous
                    ? TreeFindMatchType.Fuzzy
                    : TreeFindMatchType.Contiguous;
        }
    },
});
// Deprecated commands
CommandsRegistry.registerCommandAlias('list.toggleKeyboardNavigation', 'list.triggerTypeNavigation');
CommandsRegistry.registerCommandAlias('list.toggleFilterOnType', 'list.toggleFindMode');
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.find',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(RawWorkbenchListFocusContextKey, WorkbenchListSupportsFind),
    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
    secondary: [61 /* KeyCode.F3 */],
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        // List
        if (widget instanceof List || widget instanceof PagedList || widget instanceof Table) {
            // TODO@joao
        }
        // Tree
        else if (widget instanceof AbstractTree || widget instanceof AsyncDataTree) {
            const tree = widget;
            tree.openFind();
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.closeFind',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(RawWorkbenchListFocusContextKey, WorkbenchTreeFindOpen),
    primary: 9 /* KeyCode.Escape */,
    handler: (accessor) => {
        const widget = accessor.get(IListService).lastFocusedList;
        if (widget instanceof AbstractTree || widget instanceof AsyncDataTree) {
            const tree = widget;
            tree.closeFind();
        }
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.scrollUp',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    // Since the default keybindings for list.scrollUp and widgetNavigation.focusPrevious
    // are both Ctrl+UpArrow, we disable this command when the scrollbar is at
    // top-most position. This will give chance for widgetNavigation.focusPrevious to execute
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, WorkbenchListScrollAtTopContextKey?.negate()),
    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
    handler: (accessor) => {
        const focused = accessor.get(IListService).lastFocusedList;
        if (!focused) {
            return;
        }
        focused.scrollTop -= 10;
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.scrollDown',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    // same as above
    when: ContextKeyExpr.and(WorkbenchListFocusContextKey, WorkbenchListScrollAtBottomContextKey?.negate()),
    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
    handler: (accessor) => {
        const focused = accessor.get(IListService).lastFocusedList;
        if (!focused) {
            return;
        }
        focused.scrollTop += 10;
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.scrollLeft',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    handler: (accessor) => {
        const focused = accessor.get(IListService).lastFocusedList;
        if (!focused) {
            return;
        }
        focused.scrollLeft -= 10;
    },
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'list.scrollRight',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: WorkbenchListFocusContextKey,
    handler: (accessor) => {
        const focused = accessor.get(IListService).lastFocusedList;
        if (!focused) {
            return;
        }
        focused.scrollLeft += 10;
    },
});
registerAction2(class ToggleStickyScroll extends Action2 {
    constructor() {
        super({
            id: 'tree.toggleStickyScroll',
            title: {
                ...localize2('toggleTreeStickyScroll', 'Toggle Tree Sticky Scroll'),
                mnemonicTitle: localize({ key: 'mitoggleTreeStickyScroll', comment: ['&& denotes a mnemonic'] }, '&&Toggle Tree Sticky Scroll'),
            },
            category: 'View',
            metadata: {
                description: localize('toggleTreeStickyScrollDescription', 'Toggles Sticky Scroll widget at the top of tree structures such as the File Explorer and Debug variables View.'),
            },
            f1: true,
        });
    }
    run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue('workbench.tree.enableStickyScroll');
        configurationService.updateValue('workbench.tree.enableStickyScroll', newValue);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdENvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvYWN0aW9ucy9saXN0Q29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFtQixRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU1RSxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ2xFLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsWUFBWSxFQUNaLDBDQUEwQyxFQUUxQyxnQ0FBZ0MsRUFDaEMseUJBQXlCLEVBRXpCLGdDQUFnQyxFQUNoQywrQkFBK0IsRUFDL0IsNkJBQTZCLEVBQzdCLDRCQUE0QixFQUM1Qiw2QkFBNkIsRUFDN0IsK0JBQStCLEVBQy9CLHFCQUFxQixFQUNyQix5QkFBeUIsRUFDekIscUNBQXFDLEVBQ3JDLGtDQUFrQyxFQUNsQyxnQ0FBZ0MsR0FDaEMsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDdkUsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDaEYsT0FBTyxFQUFFLEtBQUss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