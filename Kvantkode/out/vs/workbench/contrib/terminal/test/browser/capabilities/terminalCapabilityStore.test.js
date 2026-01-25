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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDYXBhYmlsaXR5U3RvcmUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL2NhcGFiaWxpdGllcy90ZXJtaW5hbENhcGFiaWxpdHlTdG9yZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDeEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXJHLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsa0NBQWtDLEdBQ2xDLE1BQU0sb0ZBQW9GLENBQUE7QUFFM0YsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUNyQyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXZELElBQUksZUFBd0MsQ0FBQTtJQUM1QyxJQUFJLFNBQStCLENBQUE7SUFDbkMsSUFBSSxZQUFrQyxDQUFBO0lBRXRDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixlQUFlLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQTtRQUMxRCxLQUFLLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0UsS0FBSyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENB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