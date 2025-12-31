/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TerminalCapabilityStore, TerminalCapabilityStoreMultiplexer, } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
suite('TerminalCapabilityStore', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let capabilityStore;
    let addEvents;
    let removeEvents;
    setup(() => {
        capabilityStore = store.add(new TerminalCapabilityStore());
        store.add(capabilityStore.onDidAddCapabilityType((e) => addEvents.push(e)));
        store.add(capabilityStore.onDidRemoveCapabilityType((e) => removeEvents.push(e)));
        addEvents = [];
        removeEvents = [];
    });
    teardown(() => capabilityStore.dispose());
    test('should fire events when capabilities are added', () => {
        assertEvents(addEvents, []);
        capabilityStore.add(0 /* TerminalCapability.CwdDetection */, {});
        assertEvents(addEvents, [0 /* TerminalCapability.CwdDetection */]);
    });
    test('should fire events when capabilities are removed', async () => {
        assertEvents(removeEvents, []);
        capabilityStore.add(0 /* TerminalCapability.CwdDetection */, {});
        assertEvents(removeEvents, []);
        capabilityStore.remove(0 /* TerminalCapability.CwdDetection */);
        assertEvents(removeEvents, [0 /* TerminalCapability.CwdDetection */]);
    });
    test('has should return whether a capability is present', () => {
        deepStrictEqual(capabilityStore.has(0 /* TerminalCapability.CwdDetection */), false);
        capabilityStore.add(0 /* TerminalCapability.CwdDetection */, {});
        deepStrictEqual(capabilityStore.has(0 /* TerminalCapability.CwdDetection */), true);
        capabilityStore.remove(0 /* TerminalCapability.CwdDetection */);
        deepStrictEqual(capabilityStore.has(0 /* TerminalCapability.CwdDetection */), false);
    });
    test('items should reflect current state', () => {
        deepStrictEqual(Array.from(capabilityStore.items), []);
        capabilityStore.add(0 /* TerminalCapability.CwdDetection */, {});
        deepStrictEqual(Array.from(capabilityStore.items), [0 /* TerminalCapability.CwdDetection */]);
        capabilityStore.add(1 /* TerminalCapability.NaiveCwdDetection */, {});
        deepStrictEqual(Array.from(capabilityStore.items), [
            0 /* TerminalCapability.CwdDetection */,
            1 /* TerminalCapability.NaiveCwdDetection */,
        ]);
        capabilityStore.remove(0 /* TerminalCapability.CwdDetection */);
        deepStrictEqual(Array.from(capabilityStore.items), [1 /* TerminalCapability.NaiveCwdDetection */]);
    });
});
suite('TerminalCapabilityStoreMultiplexer', () => {
    let store;
    let multiplexer;
    let store1;
    let store2;
    let addEvents;
    let removeEvents;
    setup(() => {
        store = new DisposableStore();
        multiplexer = store.add(new TerminalCapabilityStoreMultiplexer());
        multiplexer.onDidAddCapabilityType((e) => addEvents.push(e));
        multiplexer.onDidRemoveCapabilityType((e) => removeEvents.push(e));
        store1 = store.add(new TerminalCapabilityStore());
        store2 = store.add(new TerminalCapabilityStore());
        addEvents = [];
        removeEvents = [];
    });
    teardown(() => store.dispose());
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should fire events when capabilities are enabled', async () => {
        assertEvents(addEvents, []);
        multiplexer.add(store1);
        multiplexer.add(store2);
        store1.add(0 /* TerminalCapability.CwdDetection */, {});
        assertEvents(addEvents, [0 /* TerminalCapability.CwdDetection */]);
        store2.add(1 /* TerminalCapability.NaiveCwdDetection */, {});
        assertEvents(addEvents, [1 /* TerminalCapability.NaiveCwdDetection */]);
    });
    test('should fire events when capabilities are disabled', async () => {
        assertEvents(removeEvents, []);
        multiplexer.add(store1);
        multiplexer.add(store2);
        store1.add(0 /* TerminalCapability.CwdDetection */, {});
        store2.add(1 /* TerminalCapability.NaiveCwdDetection */, {});
        assertEvents(removeEvents, []);
        store1.remove(0 /* TerminalCapability.CwdDetection */);
        assertEvents(removeEvents, [0 /* TerminalCapability.CwdDetection */]);
        store2.remove(1 /* TerminalCapability.NaiveCwdDetection */);
        assertEvents(removeEvents, [1 /* TerminalCapability.NaiveCwdDetection */]);
    });
    test('should fire events when stores are added', async () => {
        assertEvents(addEvents, []);
        store1.add(0 /* TerminalCapability.CwdDetection */, {});
        assertEvents(addEvents, []);
        store2.add(1 /* TerminalCapability.NaiveCwdDetection */, {});
        multiplexer.add(store1);
        multiplexer.add(store2);
        assertEvents(addEvents, [0 /* TerminalCapability.CwdDetection */, 1 /* TerminalCapability.NaiveCwdDetection */]);
    });
    test('items should return items from all stores', () => {
        deepStrictEqual(Array.from(multiplexer.items).sort(), [].sort());
        multiplexer.add(store1);
        multiplexer.add(store2);
        store1.add(0 /* TerminalCapability.CwdDetection */, {});
        deepStrictEqual(Array.from(multiplexer.items).sort(), [0 /* TerminalCapability.CwdDetection */].sort());
        store1.add(2 /* TerminalCapability.CommandDetection */, {});
        store2.add(1 /* TerminalCapability.NaiveCwdDetection */, {});
        deepStrictEqual(Array.from(multiplexer.items).sort(), [
            0 /* TerminalCapability.CwdDetection */,
            2 /* TerminalCapability.CommandDetection */,
            1 /* TerminalCapability.NaiveCwdDetection */,
        ].sort());
        store2.remove(1 /* TerminalCapability.NaiveCwdDetection */);
        deepStrictEqual(Array.from(multiplexer.items).sort(), [0 /* TerminalCapability.CwdDetection */, 2 /* TerminalCapability.CommandDetection */].sort());
    });
    test('has should return whether a capability is present', () => {
        deepStrictEqual(multiplexer.has(0 /* TerminalCapability.CwdDetection */), false);
        multiplexer.add(store1);
        store1.add(0 /* TerminalCapability.CwdDetection */, {});
        deepStrictEqual(multiplexer.has(0 /* TerminalCapability.CwdDetection */), true);
        store1.remove(0 /* TerminalCapability.CwdDetection */);
        deepStrictEqual(multiplexer.has(0 /* TerminalCapability.CwdDetection */), false);
    });
});
function assertEvents(actual, expected) {
    deepStrictEqual(actual, expected);
    actual.length = 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDYXBhYmlsaXR5U3RvcmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci9jYXBhYmlsaXRpZXMvdGVybWluYWxDYXBhYmlsaXR5U3RvcmUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVyRyxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLGtDQUFrQyxHQUNsQyxNQUFNLG9GQUFvRixDQUFBO0FBRTNGLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7SUFDckMsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLGVBQXdDLENBQUE7SUFDNUMsSUFBSSxTQUErQixDQUFBO0lBQ25DLElBQUksWUFBa0MsQ0FBQTtJQUV0QyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsZUFBZSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUE7UUFDMUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNFLEtBQUssQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENB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