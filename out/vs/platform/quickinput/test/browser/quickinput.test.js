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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tpbnB1dC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcXVpY2tpbnB1dC90ZXN0L2Jyb3dzZXIvcXVpY2tpbnB1dC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQy9HLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFL0QsT0FBTyxFQUFrQixjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDekcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDcEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBRXpHLDJKQUEySjtBQUMzSiw4R0FBOEc7QUFDOUcsS0FBSyxVQUFVLHlCQUF5QixDQUFDLFVBQWdDO0lBQ3hFLE1BQU0sTUFBTSxHQUFHLE1BQU0sV0FBVyxDQUMvQixJQUFJLE9BQU8sQ0FBVSxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ2hDLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNyQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDZixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDZCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxFQUNGLElBQUksQ0FDSixDQUFBO0lBRUQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUM3QixDQUFDO0FBQ0YsQ0FBQztBQUVELEtBQUssQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO0lBQ3hCLG9EQUFvRDtJQUNwRCxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBQ3ZELElBQUksVUFBZ0MsQ0FBQTtJQUVwQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDN0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUvQyxNQUFNLG9CQUFvQixHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQTtRQUUzRCxpRUFBaUU7UUFDakUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLGdCQUFnQixFQUFFLENBQUMsQ0FBQTtRQUNoRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsSUFBSSx3QkFBd0IsRUFBRSxDQUFDLENBQUE7UUFDaEYsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLElBQUksd0JBQXdCLEVBQUUsQ0FBQyxDQUFBO1FBQ2hGLG9CQUFvQixDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ3pDLGVBQWUsRUFBRSxPQUFPO1lBQ3hCLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxJQUFJO1NBQ3pCLENBQUMsQ0FBQTtRQUNULG9CQUFvQixDQUFDLElBQUksQ0FDeEIsbUJBQW1CLEVBQ25CLEtBQUssQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FDbEUsQ0FBQTtRQUNELG9CQUFvQixDQUFDLElBQUksQ0FDeEIsa0JBQWtCLEVBQ2xCLEtBQUssQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FDakUsQ0FBQTtRQUNELG9CQUFvQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtZQUM3Qyw4QkFBOEI7Z0JBQzdCLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUNELFlBQVk7Z0JBQ1gsT0FBTyxZQUFZLENBQUE7WUFDcEIsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLFVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNyQixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUU7WUFDekQsU0FBUyxFQUFFLE9BQU87WUFDbEIsUUFBUSxFQUFFLGdCQUFnQjtZQUMxQixjQUFjO2dCQUNiLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUNELFdBQVcsS0FBSSxDQUFDO1lBQ2hCLG1CQUFtQjtnQkFDbEIsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztZQUNELGFBQWE7Z0JBQ1osT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztZQUNELGtCQUFrQixDQUFDLE9BQU8sSUFBRyxDQUFDO1lBQzlCLGFBQWEsRUFBRTtnQkFDZCxTQUFTLENBQUMsT0FBTyxFQUFFLEtBQUs7b0JBQ3ZCLE9BQU8sU0FBUyxDQUFBO2dCQUNqQixDQUFDO2dCQUNELEtBQUssRUFBRSxHQUFHO2FBQ1Y7WUFDRCxNQUFNLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLG9CQUFvQjtnQkFDNUIsVUFBVSxFQUFFLG1CQUFtQjtnQkFDL0IsUUFBUSxFQUFFLG1CQUFtQjtnQkFDN0IsTUFBTSxFQUFFLG9CQUFvQjtnQkFDNUIsZUFBZSxFQUFFLDhCQUE4QjtnQkFDL0MsSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsV0FBVyxFQUFFLDBCQUEwQjtnQkFDdkMsTUFBTSxFQUFFO29CQUNQLG9CQUFvQixFQUFFLFNBQVM7b0JBQy9CLG9CQUFvQixFQUFFLFNBQVM7b0JBQy9CLHlCQUF5QixFQUFFLFNBQVM7b0JBQ3BDLFlBQVksRUFBRSxTQUFTO29CQUN2QixZQUFZLEVBQUUsU0FBUztpQkFDdkI7Z0JBQ0QsV0FBVyxFQUFFO29CQUNaLGlCQUFpQixFQUFFLFNBQVM7b0JBQzVCLHFCQUFxQixFQUFFLFNBQVM7aUJBQ2hDO2FBQ0Q7U0FDRCxDQUFDLENBQ0YsQ0FBQTtRQUVELGlCQUFpQjtRQUNqQixVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDaEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbEMsTUFBTSxJQUFJLEdBQUcsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUE7UUFFN0IsTUFBTSxJQUFJLEdBQUcseUJBQXlCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbEQsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0QsTUFBTSxJQUFJLENBQUE7UUFFVixVQUFVLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDbkIsTUFBTSxJQUFJLEdBQUcsTUFBTSxXQUFXLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRWpELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQy9CLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9DLE1BQU0sSUFBSSxHQUFHLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFBO1FBRTdCLE1BQU0sSUFBSSxHQUFHLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ25GLE1BQU0sSUFBSSxDQUFBO1FBRVYsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ25CLE1BQU0sSUFBSSxHQUFHLE1BQU0sV0FBVyxDQUFBO1FBRTlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQy9CLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ25DLE1BQU0sSUFBSSxHQUFHLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUN2RCxNQUFNLElBQUksQ0FBQTtRQUVWLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNuQixNQUFNLEtBQUssR0FBRyxNQUFNLFdBQVcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDakMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0RBQXNELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdkUsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQTtRQUV6RCxJQUFJLEtBQUssR0FBdUIsU0FBUyxDQUFBO1FBQ3pDLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFekQsbUJBQW1CO1FBQ25CLFNBQVMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFBO1FBRTNCLElBQUksQ0FBQztZQUNKLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUMzQyxDQUFDO2dCQUFTLENBQUM7WUFDVixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDcEIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlELE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBK0IsQ0FBQyxDQUFBO1FBRXRGLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQTtRQUNoQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDL0IsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNuQyxDQUFDO1FBQ0QsU0FBUyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFDdkIsOEVBQThFO1FBQzlFLFNBQVMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pELFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUVoQixNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFBO1FBRXJDLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRW5DLFNBQVMsQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUE7UUFDbkMsU0FBUyxDQUFDLFdBQVcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUVsRCxTQUFTLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFBO1FBQ3BDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUNBQXVDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEQsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUErQixDQUFDLENBQUE7UUFFdEYsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFBO1FBQ2hCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMvQixLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ25DLENBQUM7UUFDRCxTQUFTLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUN2Qiw4RUFBOEU7UUFDOUUsU0FBUyxDQUFDLFdBQVcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakQsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFBO1FBRWhCLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUE7UUFDckMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbkMsU0FBUyxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQTtRQUNuQyxTQUFTLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFbEQsU0FBUyxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtRQUNwQyxTQUFTLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUZBQXVGLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEcsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQTtRQUN6RCxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUN2QyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFaEIsS0FBSyxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUN6QyxLQUFLLENBQUMsR0FBRyxDQUNSLFNBQVMsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO2dCQUMxQixTQUFTLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQTtnQkFDOUIsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7Z0JBQ2xFLE9BQU8sRUFBRSxDQUFBO1lBQ1YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELGtCQUFrQjtZQUNsQixVQUFVLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVILHlCQUF5QjtRQUN6QixVQUFVLENBQUMsTUFBTSxFQUFFLENBQUE7UUFFbkIsc0VBQXNFO1FBQ3RFLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDdEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUVBQXlFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUYsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQTtRQUV6RCxrQ0FBa0M7UUFDbEMsTUFBTSxvQkFBb0IsR0FBcUIsRUFBRSxDQUFBO1FBQ2pELEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFdEYsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFBO1FBRWhCLE1BQU0sSUFBSSxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFBO1FBQ2hDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV4QixNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ25ELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDhHQUE4RyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9ILE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFDekQsTUFBTSxJQUFJLEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUE7UUFDaEMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3hCLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNoQixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFbEQsa0NBQWtDO1FBQ2xDLE1BQU0sb0JBQW9CLEdBQXFCLEVBQUUsQ0FBQTtRQUNqRCxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXRGLG1CQUFtQjtRQUNuQixTQUFTLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUE7UUFDOUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXhCLE1BQU0sQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDcEQsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9