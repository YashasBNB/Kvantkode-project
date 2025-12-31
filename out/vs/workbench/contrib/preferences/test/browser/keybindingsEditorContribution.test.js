/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { KeybindingEditorDecorationsRenderer } from '../../browser/keybindingsEditorContribution.js';
suite('KeybindingsEditorContribution', () => {
    function assertUserSettingsFuzzyEquals(a, b, expected) {
        const actual = KeybindingEditorDecorationsRenderer._userSettingsFuzzyEquals(a, b);
        const message = expected ? `${a} == ${b}` : `${a} != ${b}`;
        assert.strictEqual(actual, expected, 'fuzzy: ' + message);
    }
    function assertEqual(a, b) {
        assertUserSettingsFuzzyEquals(a, b, true);
    }
    function assertDifferent(a, b) {
        assertUserSettingsFuzzyEquals(a, b, false);
    }
    test('_userSettingsFuzzyEquals', () => {
        assertEqual('a', 'a');
        assertEqual('a', 'A');
        assertEqual('ctrl+a', 'CTRL+A');
        assertEqual('ctrl+a', ' CTRL+A ');
        assertEqual('ctrl+shift+a', 'shift+ctrl+a');
        assertEqual('ctrl+shift+a ctrl+alt+b', 'shift+ctrl+a alt+ctrl+b');
        assertDifferent('ctrl+[KeyA]', 'ctrl+a');
        // issue #23335
        assertEqual('cmd+shift+p', 'shift+cmd+p');
        assertEqual('cmd+shift+p', 'shift-cmd-p');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JDb250cmlidXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL3Rlc3QvYnJvd3Nlci9rZXliaW5kaW5nc0VkaXRvckNvbnRyaWJ1dGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVwRyxLQUFLLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO0lBQzNDLFNBQVMsNkJBQTZCLENBQUMsQ0FBUyxFQUFFLENBQVMsRUFBRSxRQUFpQjtRQUM3RSxNQUFNLE1BQU0sR0FBRyxtQ0FBbUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsR0FBRyxPQUFPLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRUQsU0FBUyxXQUFXLENBQUMsQ0FBUyxFQUFFLENBQVM7UUFDeEMsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsU0FBUyxlQUFlLENBQUMsQ0FBUyxFQUFFLENBQVM7UUFDNUMsNkJBQTZCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtRQUNyQyxXQUFXLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3JCLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDckIsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMvQixXQUFXLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRWpDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDM0MsV0FBVyxDQUFDLHlCQUF5QixFQUFFLHlCQUF5QixDQUFDLENBQUE7UUFFakUsZUFBZSxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUV4QyxlQUFlO1FBQ2YsV0FBVyxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUN6QyxXQUFXLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBQzFDLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtBQUMxQyxDQUFDLENBQUMsQ0FBQSJ9