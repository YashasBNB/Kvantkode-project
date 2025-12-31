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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaG92ZXIvYnJvd3Nlci9ob3ZlckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLGtDQUFrQyxFQUNsQyxxQ0FBcUMsRUFDckMsNEJBQTRCLEVBQzVCLHlCQUF5QixFQUN6QixvQkFBb0IsRUFDcEIsa0NBQWtDLEVBQ2xDLHFDQUFxQyxFQUNyQyx5QkFBeUIsRUFDekIsdUJBQXVCLEVBQ3ZCLDJCQUEyQixFQUMzQiwyQkFBMkIsRUFDM0IsNEJBQTRCLEVBQzVCLHlCQUF5QixFQUN6Qix1Q0FBdUMsRUFDdkMsNkJBQTZCLEdBQzdCLE1BQU0scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUvRSxPQUFPLEVBQUUsWUFBWSxFQUFvQixNQUFNLHNDQUFzQyxDQUFBO0FBRXJGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsMENBQTBDLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUl0SCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRSxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sYUFBYSxDQUFBO0FBRXBCLElBQUssa0JBSUo7QUFKRCxXQUFLLGtCQUFrQjtJQUN0QixpREFBMkIsQ0FBQTtJQUMzQix1REFBaUMsQ0FBQTtJQUNqQyxtRUFBNkMsQ0FBQTtBQUM5QyxDQUFDLEVBSkks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