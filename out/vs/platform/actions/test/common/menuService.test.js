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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjdGlvbnMvdGVzdC9jb21tb24vbWVudVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDekQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDeEYsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixxQkFBcUIsR0FDckIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzRSx3QkFBd0I7QUFFeEIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLHFCQUFxQjtJQUN4RCxtQkFBbUI7UUFDM0IsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0NBQ0QsQ0FBQyxFQUFFLENBQUE7QUFFSixZQUFZO0FBRVosS0FBSyxDQUFDLGFBQWEsRUFBRTtJQUNwQixJQUFJLFdBQXdCLENBQUE7SUFDNUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUN6QyxJQUFJLFVBQWtCLENBQUE7SUFFdEIsS0FBSyxDQUFDO1FBQ0wsV0FBVyxHQUFH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