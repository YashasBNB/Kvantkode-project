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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdENvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9hY3Rpb25zL2xpc3RDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQW1CLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTVFLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbEUsT0FBTyxFQUNOLDRCQUE0QixFQUM1QixZQUFZLEVBQ1osMENBQTBDLEVBRTFDLGdDQUFnQyxFQUNoQyx5QkFBeUIsRUFFekIsZ0NBQWdDLEVBQ2hDLCtCQUErQixFQUMvQiw2QkFBNkIsRUFDN0IsNEJBQTRCLEVBQzVCLDZCQUE2QixFQUM3QiwrQkFBK0IsRUFDL0IscUJBQXFCLEVBQ3JCLHlCQUF5QixFQUN6QixxQ0FBcUMsRUFDckMsa0NBQWtDLEVBQ2xDLGdDQUFnQyxHQUNoQyxNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUs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