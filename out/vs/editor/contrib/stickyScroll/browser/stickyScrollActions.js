/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction2 } from '../../../browser/editorExtensions.js';
import { localize, localize2 } from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { StickyScrollController } from './stickyScrollController.js';
export class ToggleStickyScroll extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.action.toggleStickyScroll',
            title: {
                ...localize2('toggleEditorStickyScroll', 'Toggle Editor Sticky Scroll'),
                mnemonicTitle: localize({ key: 'mitoggleStickyScroll', comment: ['&& denotes a mnemonic'] }, '&&Toggle Editor Sticky Scroll'),
            },
            metadata: {
                description: localize2('toggleEditorStickyScroll.description', 'Toggle/enable the editor sticky scroll which shows the nested scopes at the top of the viewport'),
            },
            category: Categories.View,
            toggled: {
                condition: ContextKeyExpr.equals('config.editor.stickyScroll.enabled', true),
                title: localize('stickyScroll', 'Sticky Scroll'),
                mnemonicTitle: localize({ key: 'miStickyScroll', comment: ['&& denotes a mnemonic'] }, '&&Sticky Scroll'),
            },
            menu: [
                { id: MenuId.CommandPalette },
                { id: MenuId.MenubarAppearanceMenu, group: '4_editor', order: 3 },
                { id: MenuId.StickyScrollContext },
            ],
        });
    }
    async runEditorCommand(accessor, editor) {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue('editor.stickyScroll.enabled');
        const isFocused = StickyScrollController.get(editor)?.isFocused();
        configurationService.updateValue('editor.stickyScroll.enabled', newValue);
        if (isFocused) {
            editor.focus();
        }
    }
}
const weight = 100 /* KeybindingWeight.EditorContrib */;
export class FocusStickyScroll extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.action.focusStickyScroll',
            title: {
                ...localize2('focusStickyScroll', 'Focus Editor Sticky Scroll'),
                mnemonicTitle: localize({ key: 'mifocusEditorStickyScroll', comment: ['&& denotes a mnemonic'] }, '&&Focus Editor Sticky Scroll'),
            },
            precondition: ContextKeyExpr.and(ContextKeyExpr.has('config.editor.stickyScroll.enabled'), EditorContextKeys.stickyScrollVisible),
            menu: [{ id: MenuId.CommandPalette }],
        });
    }
    runEditorCommand(_accessor, editor) {
        StickyScrollController.get(editor)?.focus();
    }
}
export class SelectNextStickyScrollLine extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.action.selectNextStickyScrollLine',
            title: localize2('selectNextStickyScrollLine.title', 'Select the next editor sticky scroll line'),
            precondition: EditorContextKeys.stickyScrollFocused.isEqualTo(true),
            keybinding: {
                weight,
                primary: 18 /* KeyCode.DownArrow */,
            },
        });
    }
    runEditorCommand(_accessor, editor) {
        StickyScrollController.get(editor)?.focusNext();
    }
}
export class SelectPreviousStickyScrollLine extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.action.selectPreviousStickyScrollLine',
            title: localize2('selectPreviousStickyScrollLine.title', 'Select the previous sticky scroll line'),
            precondition: EditorContextKeys.stickyScrollFocused.isEqualTo(true),
            keybinding: {
                weight,
                primary: 16 /* KeyCode.UpArrow */,
            },
        });
    }
    runEditorCommand(_accessor, editor) {
        StickyScrollController.get(editor)?.focusPrevious();
    }
}
export class GoToStickyScrollLine extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.action.goToFocusedStickyScrollLine',
            title: localize2('goToFocusedStickyScrollLine.title', 'Go to the focused sticky scroll line'),
            precondition: EditorContextKeys.stickyScrollFocused.isEqualTo(true),
            keybinding: {
                weight,
                primary: 3 /* KeyCode.Enter */,
            },
        });
    }
    runEditorCommand(_accessor, editor) {
        StickyScrollController.get(editor)?.goToFocused();
    }
}
export class SelectEditor extends EditorAction2 {
    constructor() {
        super({
            id: 'editor.action.selectEditor',
            title: localize2('selectEditor.title', 'Select Editor'),
            precondition: EditorContextKeys.stickyScrollFocused.isEqualTo(true),
            keybinding: {
                weight,
                primary: 9 /* KeyCode.Escape */,
            },
        });
    }
    runEditorCommand(_accessor, editor) {
        StickyScrollController.get(editor)?.selectEditor();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N0aWNreVNjcm9sbC9icm93c2VyL3N0aWNreVNjcm9sbEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGFBQWEsRUFBb0IsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXBFLE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxhQUFhO0lBQ3BEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtDQUFrQztZQUN0QyxLQUFLLEVBQUU7Z0JBQ04sR0FBRyxTQUFTLENBQUMsMEJBQTBCLEVBQUUsNkJBQTZCLENBQUM7Z0JBQ3ZFLGFBQWEsRUFBRSxRQUFRLENBQ3RCLEVBQUUsR0FBRyxFQUFFLHNCQUFzQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDbkUsK0JBQStCLENBQy9CO2FBQ0Q7WUFDRCxRQUFRLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLFNBQVMsQ0FDckIsc0NBQXNDLEVBQ3RDLGlHQUFpRyxDQUNqRzthQUNE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