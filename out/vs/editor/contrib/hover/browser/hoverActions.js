/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DECREASE_HOVER_VERBOSITY_ACTION_ID, DECREASE_HOVER_VERBOSITY_ACTION_LABEL, GO_TO_BOTTOM_HOVER_ACTION_ID, GO_TO_TOP_HOVER_ACTION_ID, HIDE_HOVER_ACTION_ID, INCREASE_HOVER_VERBOSITY_ACTION_ID, INCREASE_HOVER_VERBOSITY_ACTION_LABEL, PAGE_DOWN_HOVER_ACTION_ID, PAGE_UP_HOVER_ACTION_ID, SCROLL_DOWN_HOVER_ACTION_ID, SCROLL_LEFT_HOVER_ACTION_ID, SCROLL_RIGHT_HOVER_ACTION_ID, SCROLL_UP_HOVER_ACTION_ID, SHOW_DEFINITION_PREVIEW_HOVER_ACTION_ID, SHOW_OR_FOCUS_HOVER_ACTION_ID, } from './hoverActionIds.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { EditorAction } from '../../../browser/editorExtensions.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { GotoDefinitionAtPositionEditorContribution } from '../../gotoSymbol/browser/link/goToDefinitionAtPosition.js';
import { ContentHoverController } from './contentHoverController.js';
import { HoverVerbosityAction } from '../../../common/languages.js';
import * as nls from '../../../../nls.js';
import './hover.css';
var HoverFocusBehavior;
(function (HoverFocusBehavior) {
    HoverFocusBehavior["NoAutoFocus"] = "noAutoFocus";
    HoverFocusBehavior["FocusIfVisible"] = "focusIfVisible";
    HoverFocusBehavior["AutoFocusImmediately"] = "autoFocusImmediately";
})(HoverFocusBehavior || (HoverFocusBehavior = {}));
export class ShowOrFocusHoverAction extends EditorAction {
    constructor() {
        super({
            id: SHOW_OR_FOCUS_HOVER_ACTION_ID,
            label: nls.localize2({
                key: 'showOrFocusHover',
                comment: [
                    'Label for action that will trigger the showing/focusing of a hover in the editor.',
                    'If the hover is not visible, it will show the hover.',
                    'This allows for users to show the hover without using the mouse.',
                ],
            }, 'Show or Focus Hover'),
            metadata: {
                description: nls.localize2('showOrFocusHoverDescription', 'Show or focus the editor hover which shows documentation, references, and other content for a symbol at the current cursor position.'),
                args: [
                    {
                        name: 'args',
                        schema: {
                            type: 'object',
                            properties: {
                                focus: {
                                    description: 'Controls if and when the hover should take focus upon being triggered by this action.',
                                    enum: [
                                        HoverFocusBehavior.NoAutoFocus,
                                        HoverFocusBehavior.FocusIfVisible,
                                        HoverFocusBehavior.AutoFocusImmediately,
                                    ],
                                    enumDescriptions: [
                                        nls.localize('showOrFocusHover.focus.noAutoFocus', 'The hover will not automatically take focus.'),
                                        nls.localize('showOrFocusHover.focus.focusIfVisible', 'The hover will take focus only if it is already visible.'),
                                        nls.localize('showOrFocusHover.focus.autoFocusImmediately', 'The hover will automatically take focus when it appears.'),
                                    ],
                                    default: HoverFocusBehavior.FocusIfVisible,
                                },
                            },
                        },
                    },
                ],
            },
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */),
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        const controller = ContentHoverController.get(editor);
        if (!controller) {
            return;
        }
        const focusArgument = args?.focus;
        let focusOption = HoverFocusBehavior.FocusIfVisible;
        if (Object.values(HoverFocusBehavior).includes(focusArgument)) {
            focusOption = focusArgument;
        }
        else if (typeof focusArgument === 'boolean' && focusArgument) {
            focusOption = HoverFocusBehavior.AutoFocusImmediately;
        }
        const showContentHover = (focus) => {
            const position = editor.getPosition();
            const range = new Range(position.lineNumber, position.column, position.lineNumber, position.column);
            controller.showContentHover(range, 1 /* HoverStartMode.Immediate */, 2 /* HoverStartSource.Keyboard */, focus);
        };
        const accessibilitySupportEnabled = editor.getOption(2 /* EditorOption.accessibilitySupport */) === 2 /* AccessibilitySupport.Enabled */;
        if (controller.isHoverVisible) {
            if (focusOption !== HoverFocusBehavior.NoAutoFocus) {
                controller.focus();
            }
            else {
                showContentHover(accessibilitySupportEnabled);
            }
        }
        else {
            showContentHover(accessibilitySupportEnabled || focusOption === HoverFocusBehavior.AutoFocusImmediately);
        }
    }
}
export class ShowDefinitionPreviewHoverAction extends EditorAction {
    constructor() {
        super({
            id: SHOW_DEFINITION_PREVIEW_HOVER_ACTION_ID,
            label: nls.localize2({
                key: 'showDefinitionPreviewHover',
                comment: [
                    'Label for action that will trigger the showing of definition preview hover in the editor.',
                    'This allows for users to show the definition preview hover without using the mouse.',
                ],
            }, 'Show Definition Preview Hover'),
            precondition: undefined,
            metadata: {
                description: nls.localize2('showDefinitionPreviewHoverDescription', 'Show the definition preview hover in the editor.'),
            },
        });
    }
    run(accessor, editor) {
        const controller = ContentHoverController.get(editor);
        if (!controller) {
            return;
        }
        const position = editor.getPosition();
        if (!position) {
            return;
        }
        const range = new Range(position.lineNumber, position.column, position.lineNumber, position.column);
        const goto = GotoDefinitionAtPositionEditorContribution.get(editor);
        if (!goto) {
            return;
        }
        const promise = goto.startFindDefinitionFromCursor(position);
        promise.then(() => {
            controller.showContentHover(range, 1 /* HoverStartMode.Immediate */, 2 /* HoverStartSource.Keyboard */, true);
        });
    }
}
export class HideContentHoverAction extends EditorAction {
    constructor() {
        super({
            id: HIDE_HOVER_ACTION_ID,
            label: nls.localize2({
                key: 'hideHover',
                comment: ['Label for action that will hide the hover in the editor.'],
            }, 'Hide Hover'),
            alias: 'Hide Content Hover',
            precondition: undefined,
        });
    }
    run(accessor, editor) {
        ContentHoverController.get(editor)?.hideContentHover();
    }
}
export class ScrollUpHoverAction extends EditorAction {
    constructor() {
        super({
            id: SCROLL_UP_HOVER_ACTION_ID,
            label: nls.localize2({
                key: 'scrollUpHover',
                comment: [
                    'Action that allows to scroll up in the hover widget with the up arrow when the hover widget is focused.',
                ],
            }, 'Scroll Up Hover'),
            precondition: EditorContextKeys.hoverFocused,
            kbOpts: {
                kbExpr: EditorContextKeys.hoverFocused,
                primary: 16 /* KeyCode.UpArrow */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: {
                description: nls.localize2('scrollUpHoverDescription', 'Scroll up the editor hover.'),
            },
        });
    }
    run(accessor, editor) {
        const controller = ContentHoverController.get(editor);
        if (!controller) {
            return;
        }
        controller.scrollUp();
    }
}
export class ScrollDownHoverAction extends EditorAction {
    constructor() {
        super({
            id: SCROLL_DOWN_HOVER_ACTION_ID,
            label: nls.localize2({
                key: 'scrollDownHover',
                comment: [
                    'Action that allows to scroll down in the hover widget with the up arrow when the hover widget is focused.',
                ],
            }, 'Scroll Down Hover'),
            precondition: EditorContextKeys.hoverFocused,
            kbOpts: {
                kbExpr: EditorContextKeys.hoverFocused,
                primary: 18 /* KeyCode.DownArrow */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: {
                description: nls.localize2('scrollDownHoverDescription', 'Scroll down the editor hover.'),
            },
        });
    }
    run(accessor, editor) {
        const controller = ContentHoverController.get(editor);
        if (!controller) {
            return;
        }
        controller.scrollDown();
    }
}
export class ScrollLeftHoverAction extends EditorAction {
    constructor() {
        super({
            id: SCROLL_LEFT_HOVER_ACTION_ID,
            label: nls.localize2({
                key: 'scrollLeftHover',
                comment: [
                    'Action that allows to scroll left in the hover widget with the left arrow when the hover widget is focused.',
                ],
            }, 'Scroll Left Hover'),
            precondition: EditorContextKeys.hoverFocused,
            kbOpts: {
                kbExpr: EditorContextKeys.hoverFocused,
                primary: 15 /* KeyCode.LeftArrow */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: {
                description: nls.localize2('scrollLeftHoverDescription', 'Scroll left the editor hover.'),
            },
        });
    }
    run(accessor, editor) {
        const controller = ContentHoverController.get(editor);
        if (!controller) {
            return;
        }
        controller.scrollLeft();
    }
}
export class ScrollRightHoverAction extends EditorAction {
    constructor() {
        super({
            id: SCROLL_RIGHT_HOVER_ACTION_ID,
            label: nls.localize2({
                key: 'scrollRightHover',
                comment: [
                    'Action that allows to scroll right in the hover widget with the right arrow when the hover widget is focused.',
                ],
            }, 'Scroll Right Hover'),
            precondition: EditorContextKeys.hoverFocused,
            kbOpts: {
                kbExpr: EditorContextKeys.hoverFocused,
                primary: 17 /* KeyCode.RightArrow */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: {
                description: nls.localize2('scrollRightHoverDescription', 'Scroll right the editor hover.'),
            },
        });
    }
    run(accessor, editor) {
        const controller = ContentHoverController.get(editor);
        if (!controller) {
            return;
        }
        controller.scrollRight();
    }
}
export class PageUpHoverAction extends EditorAction {
    constructor() {
        super({
            id: PAGE_UP_HOVER_ACTION_ID,
            label: nls.localize2({
                key: 'pageUpHover',
                comment: [
                    'Action that allows to page up in the hover widget with the page up command when the hover widget is focused.',
                ],
            }, 'Page Up Hover'),
            precondition: EditorContextKeys.hoverFocused,
            kbOpts: {
                kbExpr: EditorContextKeys.hoverFocused,
                primary: 11 /* KeyCode.PageUp */,
                secondary: [512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */],
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: {
                description: nls.localize2('pageUpHoverDescription', 'Page up the editor hover.'),
            },
        });
    }
    run(accessor, editor) {
        const controller = ContentHoverController.get(editor);
        if (!controller) {
            return;
        }
        controller.pageUp();
    }
}
export class PageDownHoverAction extends EditorAction {
    constructor() {
        super({
            id: PAGE_DOWN_HOVER_ACTION_ID,
            label: nls.localize2({
                key: 'pageDownHover',
                comment: [
                    'Action that allows to page down in the hover widget with the page down command when the hover widget is focused.',
                ],
            }, 'Page Down Hover'),
            precondition: EditorContextKeys.hoverFocused,
            kbOpts: {
                kbExpr: EditorContextKeys.hoverFocused,
                primary: 12 /* KeyCode.PageDown */,
                secondary: [512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */],
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: {
                description: nls.localize2('pageDownHoverDescription', 'Page down the editor hover.'),
            },
        });
    }
    run(accessor, editor) {
        const controller = ContentHoverController.get(editor);
        if (!controller) {
            return;
        }
        controller.pageDown();
    }
}
export class GoToTopHoverAction extends EditorAction {
    constructor() {
        super({
            id: GO_TO_TOP_HOVER_ACTION_ID,
            label: nls.localize2({
                key: 'goToTopHover',
                comment: [
                    'Action that allows to go to the top of the hover widget with the home command when the hover widget is focused.',
                ],
            }, 'Go To Top Hover'),
            precondition: EditorContextKeys.hoverFocused,
            kbOpts: {
                kbExpr: EditorContextKeys.hoverFocused,
                primary: 14 /* KeyCode.Home */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */],
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: {
                description: nls.localize2('goToTopHoverDescription', 'Go to the top of the editor hover.'),
            },
        });
    }
    run(accessor, editor) {
        const controller = ContentHoverController.get(editor);
        if (!controller) {
            return;
        }
        controller.goToTop();
    }
}
export class GoToBottomHoverAction extends EditorAction {
    constructor() {
        super({
            id: GO_TO_BOTTOM_HOVER_ACTION_ID,
            label: nls.localize2({
                key: 'goToBottomHover',
                comment: [
                    'Action that allows to go to the bottom in the hover widget with the end command when the hover widget is focused.',
                ],
            }, 'Go To Bottom Hover'),
            precondition: EditorContextKeys.hoverFocused,
            kbOpts: {
                kbExpr: EditorContextKeys.hoverFocused,
                primary: 13 /* KeyCode.End */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */],
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            metadata: {
                description: nls.localize2('goToBottomHoverDescription', 'Go to the bottom of the editor hover.'),
            },
        });
    }
    run(accessor, editor) {
        const controller = ContentHoverController.get(editor);
        if (!controller) {
            return;
        }
        controller.goToBottom();
    }
}
export class IncreaseHoverVerbosityLevel extends EditorAction {
    constructor() {
        super({
            id: INCREASE_HOVER_VERBOSITY_ACTION_ID,
            label: INCREASE_HOVER_VERBOSITY_ACTION_LABEL,
            alias: 'Increase Hover Verbosity Level',
            precondition: EditorContextKeys.hoverVisible,
        });
    }
    run(accessor, editor, args) {
        const hoverController = ContentHoverController.get(editor);
        if (!hoverController) {
            return;
        }
        const index = args?.index !== undefined ? args.index : hoverController.focusedHoverPartIndex();
        hoverController.updateHoverVerbosityLevel(HoverVerbosityAction.Increase, index, args?.focus);
    }
}
export class DecreaseHoverVerbosityLevel extends EditorAction {
    constructor() {
        super({
            id: DECREASE_HOVER_VERBOSITY_ACTION_ID,
            label: DECREASE_HOVER_VERBOSITY_ACTION_LABEL,
            alias: 'Decrease Hover Verbosity Level',
            precondition: EditorContextKeys.hoverVisible,
        });
    }
    run(accessor, editor, args) {
        const hoverController = ContentHoverController.get(editor);
        if (!hoverController) {
            return;
        }
        const index = args?.index !== undefined ? args.index : hoverController.focusedHoverPartIndex();
        ContentHoverController.get(editor)?.updateHoverVerbosityLevel(HoverVerbosityAction.Decrease, index, args?.focus);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL2hvdmVyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLHFDQUFxQyxFQUNyQyw0QkFBNEIsRUFDNUIseUJBQXlCLEVBQ3pCLG9CQUFvQixFQUNwQixrQ0FBa0MsRUFDbEMscUNBQXFDLEVBQ3JDLHlCQUF5QixFQUN6Qix1QkFBdUIsRUFDdkIsMkJBQTJCLEVBQzNCLDJCQUEyQixFQUMzQiw0QkFBNEIsRUFDNUIseUJBQXlCLEVBQ3pCLHVDQUF1QyxFQUN2Qyw2QkFBNkIsR0FDN0IsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFBO0FBRS9FLE9BQU8sRUFBRSxZQUFZLEVBQW9CLE1BQU0sc0NBQXNDLENBQUE7QUFFckYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSwwQ0FBMEMsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBSXRILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3BFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25FLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxhQUFhLENBQUE7QUFFcEIsSUFBSyxrQkFJSjtBQUpELFdBQUssa0JBQWtCO0lBQ3RCLGlEQUEyQixDQUFBO0lBQzNCLHVEQUFpQyxDQUFBO0lBQ2pDLG1FQUE2QyxDQUFBO0FBQzlDLENBQUMs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