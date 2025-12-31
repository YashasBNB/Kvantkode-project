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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9ucy90ZXN0L2NvbW1vbi9leHRlbnNpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRXpFLEtBQUssQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7SUFDM0MsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLENBQUMsZUFBZSxFQUFFLG9CQUFvQixDQUFDLEVBQ3ZDLDRCQUE0QixDQUFDLENBQUMsZUFBZSxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FDckUsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLENBQUMsZUFBZSxFQUFFLG9CQUFvQixDQUFDLEVBQ3ZDLDRCQUE0QixDQUFDLENBQUMsZUFBZSxFQUFFLHNCQUFzQixDQUFDLENBQUMsQ0FDdkUsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLENBQUMsZUFBZSxFQUFFLG9CQUFvQixDQUFDLEVBQ3ZDLDRCQUE0QixDQUFDLENBQUMsZUFBZSxFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FDdEUsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLENBQUMsZUFBZSxFQUFFLG9CQUFvQixDQUFDLEVBQ3ZDLDRCQUE0QixDQUFDLENBQUMsZUFBZSxFQUFFLGlDQUFpQyxDQUFDLENBQUMsQ0FDbEYsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLENBQUMsZUFBZSxFQUFFLG9CQUFvQixDQUFDLEVBQ3ZDLDRCQUE0QixDQUFDLENBQUMsZUFBZSxFQUFFLHlCQUF5QixDQUFDLENBQUMsQ0FDMUUsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLENBQUMsZUFBZSxFQUFFLG9CQUFvQixDQUFDLEVBQ3ZDLDRCQUE0QixDQUFDLENBQUMsZUFBZSxFQUFFLGdDQUFnQyxDQUFDLENBQUMsQ0FDakYsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==