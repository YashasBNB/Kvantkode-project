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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JDb250cmlidXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvdGVzdC9icm93c2VyL2tleWJpbmRpbmdzRWRpdG9yQ29udHJpYnV0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXBHLEtBQUssQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7SUFDM0MsU0FBUyw2QkFBNkIsQ0FBQyxDQUFTLEVBQUUsQ0FBUyxFQUFFLFFBQWlCO1FBQzdFLE1BQU0sTUFBTSxHQUFHLG1DQUFtQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqRixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxHQUFHLE9BQU8sQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFRCxTQUFTLFdBQVcsQ0FBQyxDQUFTLEVBQUUsQ0FBUztRQUN4Qyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxTQUFTLGVBQWUsQ0FBQyxDQUFTLEVBQUUsQ0FBUztRQUM1Qyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDckIsV0FBVyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNyQixXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQy9CLFdBQVcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFakMsV0FBVyxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUMzQyxXQUFXLENBQUMseUJBQXlCLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtRQUVqRSxlQUFlLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRXhDLGVBQWU7UUFDZixXQUFXLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ3pDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFDMUMsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=