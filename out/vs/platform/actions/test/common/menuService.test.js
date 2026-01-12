/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { isIMenuItem, MenuId, MenuRegistry } from '../../common/actions.js';
import { MenuService } from '../../common/menuService.js';
import { NullCommandService } from '../../../commands/test/common/nullCommandService.js';
import { MockContextKeyService, MockKeybindingService, } from '../../../keybinding/test/common/mockKeybindingService.js';
import { InMemoryStorageService } from '../../../storage/common/storage.js';
// --- service instances
const contextKeyService = new (class extends MockContextKeyService {
    contextMatchesRules() {
        return true;
    }
})();
// --- tests
suite('MenuService', function () {
    let menuService;
    const disposables = new DisposableStore();
    let testMenuId;
    setup(function () {
        menuService = new MenuService(NullCommandService, new MockKeybindingService(), new InMemoryStorageService());
        testMenuId = new MenuId(`testo/${generateUuid()}`);
        disposables.clear();
    });
    teardown(function () {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('group sorting', function () {
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'one', title: 'FOO' },
            group: '0_hello',
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'two', title: 'FOO' },
            group: 'hello',
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'three', title: 'FOO' },
            group: 'Hello',
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'four', title: 'FOO' },
            group: '',
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'five', title: 'FOO' },
            group: 'navigation',
        }));
        const groups = disposables
            .add(menuService.createMenu(testMenuId, contextKeyService))
            .getActions();
        assert.strictEqual(groups.length, 5);
        const [one, two, three, four, five] = groups;
        assert.strictEqual(one[0], 'navigation');
        assert.strictEqual(two[0], '0_hello');
        assert.strictEqual(three[0], 'hello');
        assert.strictEqual(four[0], 'Hello');
        assert.strictEqual(five[0], '');
    });
    test('in group sorting, by title', function () {
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'a', title: 'aaa' },
            group: 'Hello',
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'b', title: 'fff' },
            group: 'Hello',
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'c', title: 'zzz' },
            group: 'Hello',
        }));
        const groups = disposables
            .add(menuService.createMenu(testMenuId, contextKeyService))
            .getActions();
        assert.strictEqual(groups.length, 1);
        const [, actions] = groups[0];
        assert.strictEqual(actions.length, 3);
        const [one, two, three] = actions;
        assert.strictEqual(one.id, 'a');
        assert.strictEqual(two.id, 'b');
        assert.strictEqual(three.id, 'c');
    });
    test('in group sorting, by title and order', function () {
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'a', title: 'aaa' },
            group: 'Hello',
            order: 10,
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'b', title: 'fff' },
            group: 'Hello',
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'c', title: 'zzz' },
            group: 'Hello',
            order: -1,
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'd', title: 'yyy' },
            group: 'Hello',
            order: -1,
        }));
        const groups = disposables
            .add(menuService.createMenu(testMenuId, contextKeyService))
            .getActions();
        assert.strictEqual(groups.length, 1);
        const [, actions] = groups[0];
        assert.strictEqual(actions.length, 4);
        const [one, two, three, four] = actions;
        assert.strictEqual(one.id, 'd');
        assert.strictEqual(two.id, 'c');
        assert.strictEqual(three.id, 'b');
        assert.strictEqual(four.id, 'a');
    });
    test('in group sorting, special: navigation', function () {
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'a', title: 'aaa' },
            group: 'navigation',
            order: 1.3,
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'b', title: 'fff' },
            group: 'navigation',
            order: 1.2,
        }));
        disposables.add(MenuRegistry.appendMenuItem(testMenuId, {
            command: { id: 'c', title: 'zzz' },
            group: 'navigation',
            order: 1.1,
        }));
        const groups = disposables
            .add(menuService.createMenu(testMenuId, contextKeyService))
            .getActions();
        assert.strictEqual(groups.length, 1);
        const [[, actions]] = groups;
        assert.strictEqual(actions.length, 3);
        const [one, two, three] = actions;
        assert.strictEqual(one.id, 'c');
        assert.strictEqual(two.id, 'b');
        assert.strictEqual(three.id, 'a');
    });
    test('special MenuId palette', function () {
        disposables.add(MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
            command: { id: 'a', title: 'Explicit' },
        }));
        disposables.add(MenuRegistry.addCommand({ id: 'b', title: 'Implicit' }));
        let foundA = false;
        let foundB = false;
        for (const item of MenuRegistry.getMenuItems(MenuId.CommandPalette)) {
            if (isIMenuItem(item)) {
                if (item.command.id === 'a') {
                    assert.strictEqual(item.command.title, 'Explicit');
                    foundA = true;
                }
                if (item.command.id === 'b') {
                    assert.strictEqual(item.command.title, 'Implicit');
                    foundB = true;
                }
            }
        }
        assert.strictEqual(foundA, true);
        assert.strictEqual(foundB, true);
    });
    test('Extension contributed submenus missing with errors in output #155030', function () {
        const id = generateUuid();
        const menu = new MenuId(id);
        assert.throws(() => new MenuId(id));
        assert.ok(menu === MenuId.for(id));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWN0aW9ucy90ZXN0L2NvbW1vbi9tZW51U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN4RixPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLHFCQUFxQixHQUNyQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTNFLHdCQUF3QjtBQUV4QixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEscUJBQXFCO0lBQ3hELG1CQUFtQjtRQUMzQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7Q0FDRCxDQUFDLEVBQUUsQ0FBQTtBQUVKLFlBQVk7QUFFWixLQUFLLENBQUMsYUFBYSxFQUFFO0lBQ3BCLElBQUksV0FBd0IsQ0FBQTtJQUM1QixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLElBQUksVUFBa0IsQ0FBQTtJQUV0QixLQUFLLENBQUM7UUFDTCxXQUFX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