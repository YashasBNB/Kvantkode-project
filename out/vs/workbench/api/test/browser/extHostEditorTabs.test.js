/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ExtHostEditorTabs } from '../../common/extHostEditorTabs.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { TextMergeTabInput, TextTabInput } from '../../common/extHostTypes.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostEditorTabs', function () {
    const defaultTabDto = {
        id: 'uniquestring',
        input: { kind: 1 /* TabInputKind.TextInput */, uri: URI.parse('file://abc/def.txt') },
        isActive: true,
        isDirty: true,
        isPinned: true,
        isPreview: false,
        label: 'label1',
    };
    function createTabDto(dto) {
        return { ...defaultTabDto, ...dto };
    }
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('Ensure empty model throws when accessing active group', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
        })()));
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 0);
        // Active group should never be undefined (there is always an active group). Ensure accessing it undefined throws.
        // TODO @lramos15 Add a throw on the main side when a model is sent without an active group
        assert.throws(() => extHostEditorTabs.tabGroups.activeTabGroup);
    });
    test('single tab', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
        })()));
        const tab = createTabDto({
            id: 'uniquestring',
            isActive: true,
            isDirty: true,
            isPinned: true,
            label: 'label1',
        });
        extHostEditorTabs.$acceptEditorTabModel([
            {
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab],
            },
        ]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        const [first] = extHostEditorTabs.tabGroups.all;
        assert.ok(first.activeTab);
        assert.strictEqual(first.tabs.indexOf(first.activeTab), 0);
        {
            extHostEditorTabs.$acceptEditorTabModel([
                {
                    isActive: true,
                    viewColumn: 0,
                    groupId: 12,
                    tabs: [tab],
                },
            ]);
            assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
            const [first] = extHostEditorTabs.tabGroups.all;
            assert.ok(first.activeTab);
            assert.strictEqual(first.tabs.indexOf(first.activeTab), 0);
        }
    });
    test('Empty tab group', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
        })()));
        extHostEditorTabs.$acceptEditorTabModel([
            {
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [],
            },
        ]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        const [first] = extHostEditorTabs.tabGroups.all;
        assert.strictEqual(first.activeTab, undefined);
        assert.strictEqual(first.tabs.length, 0);
    });
    test('Ensure tabGroup change events fires', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
        })()));
        let count = 0;
        store.add(extHostEditorTabs.tabGroups.onDidChangeTabGroups(() => count++));
        assert.strictEqual(count, 0);
        extHostEditorTabs.$acceptEditorTabModel([
            {
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [],
            },
        ]);
        assert.ok(extHostEditorTabs.tabGroups.activeTabGroup);
        const activeTabGroup = extHostEditorTabs.tabGroups.activeTabGroup;
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(activeTabGroup.tabs.length, 0);
        assert.strictEqual(count, 1);
    });
    test('Check TabGroupChangeEvent properties', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
        })()));
        const group1Data = {
            isActive: true,
            viewColumn: 0,
            groupId: 12,
            tabs: [],
        };
        const group2Data = { ...group1Data, groupId: 13 };
        const events = [];
        store.add(extHostEditorTabs.tabGroups.onDidChangeTabGroups((e) => events.push(e)));
        // OPEN
        extHostEditorTabs.$acceptEditorTabModel([group1Data]);
        assert.deepStrictEqual(events, [
            {
                changed: [],
                closed: [],
                opened: [extHostEditorTabs.tabGroups.activeTabGroup],
            },
        ]);
        // OPEN, CHANGE
        events.length = 0;
        extHostEditorTabs.$acceptEditorTabModel([{ ...group1Data, isActive: false }, group2Data]);
        assert.deepStrictEqual(events, [
            {
                changed: [extHostEditorTabs.tabGroups.all[0]],
                closed: [],
                opened: [extHostEditorTabs.tabGroups.all[1]],
            },
        ]);
        // CHANGE
        events.length = 0;
        extHostEditorTabs.$acceptEditorTabModel([group1Data, { ...group2Data, isActive: false }]);
        assert.deepStrictEqual(events, [
            {
                changed: extHostEditorTabs.tabGroups.all,
                closed: [],
                opened: [],
            },
        ]);
        // CLOSE, CHANGE
        events.length = 0;
        const oldActiveGroup = extHostEditorTabs.tabGroups.activeTabGroup;
        extHostEditorTabs.$acceptEditorTabModel([group2Data]);
        assert.deepStrictEqual(events, [
            {
                changed: extHostEditorTabs.tabGroups.all,
                closed: [oldActiveGroup],
                opened: [],
            },
        ]);
    });
    test('Ensure reference equality for activeTab and activeGroup', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
        })()));
        const tab = createTabDto({
            id: 'uniquestring',
            isActive: true,
            isDirty: true,
            isPinned: true,
            label: 'label1',
            editorId: 'default',
        });
        extHostEditorTabs.$acceptEditorTabModel([
            {
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab],
            },
        ]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        const [first] = extHostEditorTabs.tabGroups.all;
        assert.ok(first.activeTab);
        assert.strictEqual(first.tabs.indexOf(first.activeTab), 0);
        assert.strictEqual(first.activeTab, first.tabs[0]);
        assert.strictEqual(extHostEditorTabs.tabGroups.activeTabGroup, first);
    });
    test('TextMergeTabInput surfaces in the UI', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
        })()));
        const tab = createTabDto({
            input: {
                kind: 3 /* TabInputKind.TextMergeInput */,
                base: URI.from({ scheme: 'test', path: 'base' }),
                input1: URI.from({ scheme: 'test', path: 'input1' }),
                input2: URI.from({ scheme: 'test', path: 'input2' }),
                result: URI.from({ scheme: 'test', path: 'result' }),
            },
        });
        extHostEditorTabs.$acceptEditorTabModel([
            {
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab],
            },
        ]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        const [first] = extHostEditorTabs.tabGroups.all;
        assert.ok(first.activeTab);
        assert.strictEqual(first.tabs.indexOf(first.activeTab), 0);
        assert.ok(first.activeTab.input instanceof TextMergeTabInput);
    });
    test('Ensure reference stability', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
        })()));
        const tabDto = createTabDto();
        // single dirty tab
        extHostEditorTabs.$acceptEditorTabModel([
            {
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tabDto],
            },
        ]);
        let all = extHostEditorTabs.tabGroups.all.map((group) => group.tabs).flat();
        assert.strictEqual(all.length, 1);
        const apiTab1 = all[0];
        assert.ok(apiTab1.input instanceof TextTabInput);
        assert.strictEqual(tabDto.input.kind, 1 /* TabInputKind.TextInput */);
        const dtoResource = tabDto.input.uri;
        assert.strictEqual(apiTab1.input.uri.toString(), URI.revive(dtoResource).toString());
        assert.strictEqual(apiTab1.isDirty, true);
        // NOT DIRTY anymore
        const tabDto2 = { ...tabDto, isDirty: false };
        // Accept a simple update
        extHostEditorTabs.$acceptTabOperation({
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            index: 0,
            tabDto: tabDto2,
            groupId: 12,
        });
        all = extHostEditorTabs.tabGroups.all.map((group) => group.tabs).flat();
        assert.strictEqual(all.length, 1);
        const apiTab2 = all[0];
        assert.ok(apiTab1.input instanceof TextTabInput);
        assert.strictEqual(apiTab1.input.uri.toString(), URI.revive(dtoResource).toString());
        assert.strictEqual(apiTab2.isDirty, false);
        assert.strictEqual(apiTab1 === apiTab2, true);
    });
    test('Tab.isActive working', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
        })()));
        const tabDtoAAA = createTabDto({
            id: 'AAA',
            isActive: true,
            isDirty: true,
            isPinned: true,
            label: 'label1',
            input: { kind: 1 /* TabInputKind.TextInput */, uri: URI.parse('file://abc/AAA.txt') },
            editorId: 'default',
        });
        const tabDtoBBB = createTabDto({
            id: 'BBB',
            isActive: false,
            isDirty: true,
            isPinned: true,
            label: 'label1',
            input: { kind: 1 /* TabInputKind.TextInput */, uri: URI.parse('file://abc/BBB.txt') },
            editorId: 'default',
        });
        // single dirty tab
        extHostEditorTabs.$acceptEditorTabModel([
            {
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tabDtoAAA, tabDtoBBB],
            },
        ]);
        const all = extHostEditorTabs.tabGroups.all.map((group) => group.tabs).flat();
        assert.strictEqual(all.length, 2);
        const activeTab1 = extHostEditorTabs.tabGroups.activeTabGroup?.activeTab;
        assert.ok(activeTab1?.input instanceof TextTabInput);
        assert.strictEqual(tabDtoAAA.input.kind, 1 /* TabInputKind.TextInput */);
        const dtoAAAResource = tabDtoAAA.input.uri;
        assert.strictEqual(activeTab1?.input?.uri.toString(), URI.revive(dtoAAAResource)?.toString());
        assert.strictEqual(activeTab1?.isActive, true);
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 1,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            tabDto: { ...tabDtoBBB, isActive: true }, /// BBB is now active
        });
        const activeTab2 = extHostEditorTabs.tabGroups.activeTabGroup?.activeTab;
        assert.ok(activeTab2?.input instanceof TextTabInput);
        assert.strictEqual(tabDtoBBB.input.kind, 1 /* TabInputKind.TextInput */);
        const dtoBBBResource = tabDtoBBB.input.uri;
        assert.strictEqual(activeTab2?.input?.uri.toString(), URI.revive(dtoBBBResource)?.toString());
        assert.strictEqual(activeTab2?.isActive, true);
        assert.strictEqual(activeTab1?.isActive, false);
    });
    test('vscode.window.tagGroups is immutable', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
        })()));
        assert.throws(() => {
            // @ts-expect-error write to readonly prop
            extHostEditorTabs.tabGroups.activeTabGroup = undefined;
        });
        assert.throws(() => {
            // @ts-expect-error write to readonly prop
            extHostEditorTabs.tabGroups.all.length = 0;
        });
        assert.throws(() => {
            // @ts-expect-error write to readonly prop
            extHostEditorTabs.tabGroups.onDidChangeActiveTabGroup = undefined;
        });
        assert.throws(() => {
            // @ts-expect-error write to readonly prop
            extHostEditorTabs.tabGroups.onDidChangeTabGroups = undefined;
        });
    });
    test('Ensure close is called with all tab ids', function () {
        const closedTabIds = [];
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
            // override/implement $moveTab or $closeTab
            async $closeTab(tabIds, preserveFocus) {
                closedTabIds.push(tabIds);
                return true;
            }
        })()));
        const tab = createTabDto({
            id: 'uniquestring',
            isActive: true,
            isDirty: true,
            isPinned: true,
            label: 'label1',
            editorId: 'default',
        });
        extHostEditorTabs.$acceptEditorTabModel([
            {
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab],
            },
        ]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        const activeTab = extHostEditorTabs.tabGroups.activeTabGroup?.activeTab;
        assert.ok(activeTab);
        extHostEditorTabs.tabGroups.close(activeTab, false);
        assert.strictEqual(closedTabIds.length, 1);
        assert.deepStrictEqual(closedTabIds[0], ['uniquestring']);
        // Close with array
        extHostEditorTabs.tabGroups.close([activeTab], false);
        assert.strictEqual(closedTabIds.length, 2);
        assert.deepStrictEqual(closedTabIds[1], ['uniquestring']);
    });
    test('Update tab only sends tab change event', async function () {
        const closedTabIds = [];
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
            // override/implement $moveTab or $closeTab
            async $closeTab(tabIds, preserveFocus) {
                closedTabIds.push(tabIds);
                return true;
            }
        })()));
        const tabDto = createTabDto({
            id: 'uniquestring',
            isActive: true,
            isDirty: true,
            isPinned: true,
            label: 'label1',
            editorId: 'default',
        });
        extHostEditorTabs.$acceptEditorTabModel([
            {
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tabDto],
            },
        ]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map((g) => g.tabs).flat().length, 1);
        const tab = extHostEditorTabs.tabGroups.all[0].tabs[0];
        const p = new Promise((resolve) => store.add(extHostEditorTabs.tabGroups.onDidChangeTabs(resolve)));
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 0,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            tabDto: { ...tabDto, label: 'NEW LABEL' },
        });
        const changedTab = (await p).changed[0];
        assert.ok(tab === changedTab);
        assert.strictEqual(changedTab.label, 'NEW LABEL');
    });
    test('Active tab', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
        })()));
        const tab1 = createTabDto({
            id: 'uniquestring',
            isActive: true,
            isDirty: true,
            isPinned: true,
            label: 'label1',
        });
        const tab2 = createTabDto({
            isActive: false,
            id: 'uniquestring2',
        });
        const tab3 = createTabDto({
            isActive: false,
            id: 'uniquestring3',
        });
        extHostEditorTabs.$acceptEditorTabModel([
            {
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab1, tab2, tab3],
            },
        ]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map((g) => g.tabs).flat().length, 3);
        // Active tab is correct
        assert.strictEqual(extHostEditorTabs.tabGroups.activeTabGroup?.activeTab, extHostEditorTabs.tabGroups.activeTabGroup?.tabs[0]);
        // Switching active tab works
        tab1.isActive = false;
        tab2.isActive = true;
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 0,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            tabDto: tab1,
        });
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 1,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            tabDto: tab2,
        });
        assert.strictEqual(extHostEditorTabs.tabGroups.activeTabGroup?.activeTab, extHostEditorTabs.tabGroups.activeTabGroup?.tabs[1]);
        //Closing tabs out works
        tab3.isActive = true;
        extHostEditorTabs.$acceptEditorTabModel([
            {
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab3],
            },
        ]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map((g) => g.tabs).flat().length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.activeTabGroup?.activeTab, extHostEditorTabs.tabGroups.activeTabGroup?.tabs[0]);
        // Closing out all tabs returns undefine active tab
        extHostEditorTabs.$acceptEditorTabModel([
            {
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [],
            },
        ]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map((g) => g.tabs).flat().length, 0);
        assert.strictEqual(extHostEditorTabs.tabGroups.activeTabGroup?.activeTab, undefined);
    });
    test('Tab operations patches open and close correctly', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
        })()));
        const tab1 = createTabDto({
            id: 'uniquestring',
            isActive: true,
            label: 'label1',
        });
        const tab2 = createTabDto({
            isActive: false,
            id: 'uniquestring2',
            label: 'label2',
        });
        const tab3 = createTabDto({
            isActive: false,
            id: 'uniquestring3',
            label: 'label3',
        });
        extHostEditorTabs.$acceptEditorTabModel([
            {
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab1, tab2, tab3],
            },
        ]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map((g) => g.tabs).flat().length, 3);
        // Close tab 2
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 1,
            kind: 1 /* TabModelOperationKind.TAB_CLOSE */,
            tabDto: tab2,
        });
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map((g) => g.tabs).flat().length, 2);
        // Close active tab and update tab 3 to be active
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 0,
            kind: 1 /* TabModelOperationKind.TAB_CLOSE */,
            tabDto: tab1,
        });
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map((g) => g.tabs).flat().length, 1);
        tab3.isActive = true;
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 0,
            kind: 2 /* TabModelOperationKind.TAB_UPDATE */,
            tabDto: tab3,
        });
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map((g) => g.tabs).flat().length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all[0]?.activeTab?.label, 'label3');
        // Open tab 2 back
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 1,
            kind: 0 /* TabModelOperationKind.TAB_OPEN */,
            tabDto: tab2,
        });
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map((g) => g.tabs).flat().length, 2);
        assert.strictEqual(extHostEditorTabs.tabGroups.all[0]?.tabs[1]?.label, 'label2');
    });
    test('Tab operations patches move correctly', function () {
        const extHostEditorTabs = new ExtHostEditorTabs(SingleProxyRPCProtocol(new (class extends mock() {
        })()));
        const tab1 = createTabDto({
            id: 'uniquestring',
            isActive: true,
            label: 'label1',
        });
        const tab2 = createTabDto({
            isActive: false,
            id: 'uniquestring2',
            label: 'label2',
        });
        const tab3 = createTabDto({
            isActive: false,
            id: 'uniquestring3',
            label: 'label3',
        });
        extHostEditorTabs.$acceptEditorTabModel([
            {
                isActive: true,
                viewColumn: 0,
                groupId: 12,
                tabs: [tab1, tab2, tab3],
            },
        ]);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map((g) => g.tabs).flat().length, 3);
        // Move tab 2 to index 0
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 0,
            oldIndex: 1,
            kind: 3 /* TabModelOperationKind.TAB_MOVE */,
            tabDto: tab2,
        });
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map((g) => g.tabs).flat().length, 3);
        assert.strictEqual(extHostEditorTabs.tabGroups.all[0]?.tabs[0]?.label, 'label2');
        // Move tab 3 to index 1
        extHostEditorTabs.$acceptTabOperation({
            groupId: 12,
            index: 1,
            oldIndex: 2,
            kind: 3 /* TabModelOperationKind.TAB_MOVE */,
            tabDto: tab3,
        });
        assert.strictEqual(extHostEditorTabs.tabGroups.all.length, 1);
        assert.strictEqual(extHostEditorTabs.tabGroups.all.map((g) => g.tabs).flat().length, 3);
        assert.strictEqual(extHostEditorTabs.tabGroups.all[0]?.tabs[1]?.label, 'label3');
        assert.strictEqual(extHostEditorTabs.tabGroups.all[0]?.tabs[0]?.label, 'label2');
        assert.strictEqual(extHostEditorTabs.tabGroups.all[0]?.tabs[2]?.label, 'label1');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEVkaXRvclRhYnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RFZGl0b3JUYWJzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFTM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDckUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLEtBQUssQ0FBQyxtQkFBbUIsRUFBRTtJQUMxQixNQUFNLGFBQWEsR0FBa0I7UUFDcEMsRUFBRSxFQUFFLGNBQWM7UUFDbEIsS0FBSyxFQUFFLEVBQUUsSUFBSSxnQ0FBd0IsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFO1FBQzdFLFFBQVEsRUFBRSxJQUFJO1FBQ2QsT0FBTyxFQUFFLElBQUk7UUFDYixRQUFRLEVBQUUsSUFBSTtRQUNkLFNBQVMsRUFBRSxLQUFLO1FBQ2hCLEtBQUssRUFBRSxRQUFRO0tBQ2YsQ0FBQTtJQUVELFNBQVMsWUFBWSxDQUFDLEdBQTRCO1FBQ2pELE9BQU8sRUFBRSxHQUFHLGFBQWEsRUFBRSxHQUFHLEdBQUcsRUFBRSxDQUFBO0lBQ3BDLENBQUM7SUFFRCxNQUFNLEtBQUssR0FBRyx1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Q0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDakYsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9