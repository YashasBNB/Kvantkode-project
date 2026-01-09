/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { parseEnabledApiProposalNames } from '../../common/extensions.js';
suite('Parsing Enabled Api Proposals', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parsingEnabledApiProposals', () => {
        assert.deepStrictEqual(['activeComment', 'commentsDraftState'], parseEnabledApiProposalNames(['activeComment', 'commentsDraftState']));
        assert.deepStrictEqual(['activeComment', 'commentsDraftState'], parseEnabledApiProposalNames(['activeComment', 'commentsDraftState@1']));
        assert.deepStrictEqual(['activeComment', 'commentsDraftState'], parseEnabledApiProposalNames(['activeComment', 'commentsDraftState@']));
        assert.deepStrictEqual(['activeComment', 'commentsDraftState'], parseEnabledApiProposalNames(['activeComment', 'commentsDraftState@randomstring']));
        assert.deepStrictEqual(['activeComment', 'commentsDraftState'], parseEnabledApiProposalNames(['activeComment', 'commentsDraftState@1234']));
        assert.deepStrictEqual(['activeComment', 'commentsDraftState'], parseEnabledApiProposalNames(['activeComment', 'commentsDraftState@1234_random']));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25zL3Rlc3QvY29tbW9uL2V4dGVuc2lvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFekUsS0FBSyxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtJQUMzQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDdkMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsRUFDdkMsNEJBQTRCLENBQUMsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUNyRSxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsRUFDdkMsNEJBQTRCLENBQUMsQ0FBQyxlQUFlLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyxDQUN2RSxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsRUFDdkMsNEJBQTRCLENBQUMsQ0FBQyxlQUFlLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUN0RSxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsRUFDdkMsNEJBQTRCLENBQUMsQ0FBQyxlQUFlLEVBQUUsaUNBQWlDLENBQUMsQ0FBQyxDQUNsRixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsRUFDdkMsNEJBQTRCLENBQUMsQ0FBQyxlQUFlLEVBQUUseUJBQXlCLENBQUMsQ0FBQyxDQUMxRSxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsRUFDdkMsNEJBQTRCLENBQUMsQ0FBQyxlQUFlLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQyxDQUNqRixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9