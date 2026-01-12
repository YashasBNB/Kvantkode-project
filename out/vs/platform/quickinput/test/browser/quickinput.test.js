/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { unthemedInboxStyles } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { unthemedButtonStyles } from '../../../../base/browser/ui/button/button.js';
import { unthemedListStyles } from '../../../../base/browser/ui/list/listWidget.js';
import { unthemedToggleStyles } from '../../../../base/browser/ui/toggle/toggle.js';
import { Event } from '../../../../base/common/event.js';
import { raceTimeout } from '../../../../base/common/async.js';
import { unthemedCountStyles } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { unthemedKeybindingLabelOptions } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { unthemedProgressBarOptions } from '../../../../base/browser/ui/progressbar/progressbar.js';
import { QuickInputController } from '../../browser/quickInputController.js';
import { TestThemeService } from '../../../theme/test/common/testThemeService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { ItemActivation } from '../../common/quickInput.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { IThemeService } from '../../../theme/common/themeService.js';
import { IConfigurationService } from '../../../configuration/common/configuration.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import { ILayoutService } from '../../../layout/browser/layoutService.js';
import { IContextViewService } from '../../../contextview/browser/contextView.js';
import { IListService, ListService } from '../../../list/browser/listService.js';
import { IContextKeyService } from '../../../contextkey/common/contextkey.js';
import { ContextKeyService } from '../../../contextkey/browser/contextKeyService.js';
import { NoMatchingKb } from '../../../keybinding/common/keybindingResolver.js';
import { IKeybindingService } from '../../../keybinding/common/keybinding.js';
import { ContextViewService } from '../../../contextview/browser/contextViewService.js';
import { IAccessibilityService } from '../../../accessibility/common/accessibility.js';
import { TestAccessibilityService } from '../../../accessibility/test/common/testAccessibilityService.js';
// Sets up an `onShow` listener to allow us to wait until the quick pick is shown (useful when triggering an `accept()` right after launching a quick pick)
// kick this off before you launch the picker and then await the promise returned after you launch the picker.
async function setupWaitTilShownListener(controller) {
    const result = await raceTimeout(new Promise((resolve) => {
        const event = controller.onShow((_) => {
            event.dispose();
            resolve(true);
        });
    }), 2000);
    if (!result) {
        throw new Error('Cancelled');
    }
}
suite('QuickInput', () => {
    // https://github.com/microsoft/vscode/issues/147543
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let controller;
    setup(() => {
        const fixture = document.createElement('div');
        mainWindow.document.body.appendChild(fixture);
        store.add(toDisposable(() => fixture.remove()));
        const instantiationService = new TestInstantiationService();
        // Stub the services the quick input controller needs to function
        instantiationService.stub(IThemeService, new TestThemeService());
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IAccessibilityService, new TestAccessibilityService());
        instantiationService.stub(IListService, store.add(new ListService()));
        instantiationService.stub(ILayoutService, {
            activeContainer: fixture,
            onDidLayoutContainer: Event.None,
        });
        instantiationService.stub(IContextViewService, store.add(instantiationService.createInstance(ContextViewService)));
        instantiationService.stub(IContextKeyService, store.add(instantiationService.createInstance(ContextKeyService)));
        instantiationService.stub(IKeybindingService, {
            mightProducePrintableCharacter() {
                return false;
            },
            softDispatch() {
                return NoMatchingKb;
            },
        });
        controller = store.add(instantiationService.createInstance(QuickInputController, {
            container: fixture,
            idPrefix: 'testQuickInput',
            ignoreFocusOut() {
                return true;
            },
            returnFocus() { },
            backKeybindingLabel() {
                return undefined;
            },
            setContextKey() {
                return undefined;
            },
            linkOpenerDelegate(content) { },
            hoverDelegate: {
                showHover(options, focus) {
                    return undefined;
                },
                delay: 200,
            },
            styles: {
                button: unthemedButtonStyles,
                countBadge: unthemedCountStyles,
                inputBox: unthemedInboxStyles,
                toggle: unthemedToggleStyles,
                keybindingLabel: unthemedKeybindingLabelOptions,
                list: unthemedListStyles,
                progressBar: unthemedProgressBarOptions,
                widget: {
                    quickInputBackground: undefined,
                    quickInputForeground: undefined,
                    quickInputTitleBackground: undefined,
                    widgetBorder: undefined,
                    widgetShadow: undefined,
                },
                pickerGroup: {
                    pickerGroupBorder: undefined,
                    pickerGroupForeground: undefined,
                },
            },
        }));
        // initial layout
        controller.layout({ height: 20, width: 40 }, 0);
    });
    test('pick - basecase', async () => {
        const item = { label: 'foo' };
        const wait = setupWaitTilShownListener(controller);
        const pickPromise = controller.pick([item, { label: 'bar' }]);
        await wait;
        controller.accept();
        const pick = await raceTimeout(pickPromise, 2000);
        assert.strictEqual(pick, item);
    });
    test('pick - activeItem is honored', async () => {
        const item = { label: 'foo' };
        const wait = setupWaitTilShownListener(controller);
        const pickPromise = controller.pick([{ label: 'bar' }, item], { activeItem: item });
        await wait;
        controller.accept();
        const pick = await pickPromise;
        assert.strictEqual(pick, item);
    });
    test('input - basecase', async () => {
        const wait = setupWaitTilShownListener(controller);
        const inputPromise = controller.input({ value: 'foo' });
        await wait;
        controller.accept();
        const value = await raceTimeout(inputPromise, 2000);
        assert.strictEqual(value, 'foo');
    });
    test('onDidChangeValue - gets triggered when .value is set', async () => {
        const quickpick = store.add(controller.createQuickPick());
        let value = undefined;
        store.add(quickpick.onDidChangeValue((e) => (value = e)));
        // Trigger a change
        quickpick.value = 'changed';
        try {
            assert.strictEqual(value, quickpick.value);
        }
        finally {
            quickpick.dispose();
        }
    });
    test('keepScrollPosition - works with activeItems', async () => {
        const quickpick = store.add(controller.createQuickPick());
        const items = [];
        for (let i = 0; i < 1000; i++) {
            items.push({ label: `item ${i}` });
        }
        quickpick.items = items;
        // setting the active item should cause the quick pick to scroll to the bottom
        quickpick.activeItems = [items[items.length - 1]];
        quickpick.show();
        const cursorTop = quickpick.scrollTop;
        assert.notStrictEqual(cursorTop, 0);
        quickpick.keepScrollPosition = true;
        quickpick.activeItems = [items[0]];
        assert.strictEqual(cursorTop, quickpick.scrollTop);
        quickpick.keepScrollPosition = false;
        quickpick.activeItems = [items[0]];
        assert.strictEqual(quickpick.scrollTop, 0);
    });
    test('keepScrollPosition - works with items', async () => {
        const quickpick = store.add(controller.createQuickPick());
        const items = [];
        for (let i = 0; i < 1000; i++) {
            items.push({ label: `item ${i}` });
        }
        quickpick.items = items;
        // setting the active item should cause the quick pick to scroll to the bottom
        quickpick.activeItems = [items[items.length - 1]];
        quickpick.show();
        const cursorTop = quickpick.scrollTop;
        assert.notStrictEqual(cursorTop, 0);
        quickpick.keepScrollPosition = true;
        quickpick.items = items;
        assert.strictEqual(cursorTop, quickpick.scrollTop);
        quickpick.keepScrollPosition = false;
        quickpick.items = items;
        assert.strictEqual(quickpick.scrollTop, 0);
    });
    test('selectedItems - verify previous selectedItems does not hang over to next set of items', async () => {
        const quickpick = store.add(controller.createQuickPick());
        quickpick.items = [{ label: 'step 1' }];
        quickpick.show();
        void (await new Promise((resolve) => {
            store.add(quickpick.onDidAccept(() => {
                quickpick.canSelectMany = true;
                quickpick.items = [{ label: 'a' }, { label: 'b' }, { label: 'c' }];
                resolve();
            }));
            // accept 'step 1'
            controller.accept();
        }));
        // accept in multi-select
        controller.accept();
        // Since we don't select any items, the selected items should be empty
        assert.strictEqual(quickpick.selectedItems.length, 0);
    });
    test('activeItems - verify onDidChangeActive is triggered after setting items', async () => {
        const quickpick = store.add(controller.createQuickPick());
        // Setup listener for verification
        const activeItemsFromEvent = [];
        store.add(quickpick.onDidChangeActive((items) => activeItemsFromEvent.push(...items)));
        quickpick.show();
        const item = { label: 'step 1' };
        quickpick.items = [item];
        assert.strictEqual(activeItemsFromEvent.length, 1);
        assert.strictEqual(activeItemsFromEvent[0], item);
        assert.strictEqual(quickpick.activeItems.length, 1);
        assert.strictEqual(quickpick.activeItems[0], item);
    });
    test('activeItems - verify setting itemActivation to None still triggers onDidChangeActive after selection #207832', async () => {
        const quickpick = store.add(controller.createQuickPick());
        const item = { label: 'step 1' };
        quickpick.items = [item];
        quickpick.show();
        assert.strictEqual(quickpick.activeItems[0], item);
        // Setup listener for verification
        const activeItemsFromEvent = [];
        store.add(quickpick.onDidChangeActive((items) => activeItemsFromEvent.push(...items)));
        // Trigger a change
        quickpick.itemActivation = ItemActivation.NONE;
        quickpick.items = [item];
        assert.strictEqual(activeItemsFromEvent.length, 0);
        assert.strictEqual(quickpick.activeItems.length, 0);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tpbnB1dC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L3Rlc3QvYnJvd3Nlci9xdWlja2lucHV0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDMUYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDL0csT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDbkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDNUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUvRCxPQUFPLEVBQWtCLGNBQWMsRUFBRSxNQUFNLDRC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