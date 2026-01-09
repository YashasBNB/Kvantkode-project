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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEVkaXRvclRhYnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdEVkaXRvclRhYnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQVMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsS0FBSyxDQUFDLG1CQUFtQixFQUFFO0lBQzFCLE1BQU0sYUFBYSxHQUFrQjtRQUNwQyxFQUFFLEVBQUUsY0FBYztRQUNsQixLQUFLLEVBQUUsRUFBRSxJQUFJLGdDQUF3QixFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLEVBQUU7UUFDN0UsUUFBUSxFQUFFLElBQUk7UUFDZCxPQUFPLEVBQUUsSUFBSTtRQUNiLFFBQVEsRUFBRSxJQUFJO1FBQ2QsU0FBUyxFQUFFLEtBQUs7UUFDaEIsS0FBSyxFQUFFLFFBQVE7S0FDZixDQUFBO0lBRUQsU0FBUyxZQUFZLENBQUMsR0FBNEI7UUFDakQsT0FBTyxFQUFFLEdBQUcsYUFBYSxFQUFFLEdBQUcsR0FBRyxFQUFFLENBQUE7SUFDcEMsQ0FB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LENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2RixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNqRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=