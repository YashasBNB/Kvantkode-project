/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { Codicon } from '../../../../base/common/codicons.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { createProfileSchemaEnums } from '../../common/terminalProfiles.js';
suite('terminalProfiles', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('createProfileSchemaEnums', () => {
        test('should return an empty array when there are no profiles', () => {
            deepStrictEqual(createProfileSchemaEnums([]), {
                values: [null],
                markdownDescriptions: ['Automatically detect the default'],
            });
        });
        test('should return a single entry when there is one profile', () => {
            const profile = {
                profileName: 'name',
                path: 'path',
                isDefault: true,
            };
            deepStrictEqual(createProfileSchemaEnums([profile]), {
                values: [null, 'name'],
                markdownDescriptions: [
                    'Automatically detect the default',
                    '$(terminal) name\n- path: path',
                ],
            });
        });
        test('should show all profile information', () => {
            const profile = {
                profileName: 'name',
                path: 'path',
                isDefault: true,
                args: ['a', 'b'],
                color: 'terminal.ansiRed',
                env: {
                    c: 'd',
                    e: 'f',
                },
                icon: Codicon.zap,
                overrideName: true,
            };
            deepStrictEqual(createProfileSchemaEnums([profile]), {
                values: [null, 'name'],
                markdownDescriptions: [
                    'Automatically detect the default',
                    `$(zap) name\n- path: path\n- args: ['a','b']\n- overrideName: true\n- color: terminal.ansiRed\n- env: {\"c\":\"d\",\"e\":\"f\"}`,
                ],
            });
        });
        test('should return a multiple entries when there are multiple profiles', () => {
            const profile1 = {
                profileName: 'name',
                path: 'path',
                isDefault: true,
            };
            const profile2 = {
                profileName: 'foo',
                path: 'bar',
                isDefault: false,
            };
            deepStrictEqual(createProfileSchemaEnums([profile1, profile2]), {
                values: [null, 'name', 'foo'],
                markdownDescriptions: [
                    'Automatically detect the default',
                    '$(terminal) name\n- path: path',
                    '$(terminal) foo\n- path: bar',
                ],
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC90ZXN0L2NvbW1vbi90ZXJtaW5hbFByb2ZpbGVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFM0UsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsSUFBSSxDQUFDLHlEQUF5RCxFQUFFLEdBQUcsRUFBRTtZQUNwRSxlQUFlLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQzdDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQztnQkFDZCxvQkFBb0IsRUFBRSxDQUFDLGtDQUFrQyxDQUFDO2FBQzFELENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHdEQUF3RCxFQUFFLEdBQUcsRUFBRTtZQUNuRSxNQUFNLE9BQU8sR0FBcUI7Z0JBQ2pDLFdBQVcsRUFBRSxNQUFNO2dCQUNuQixJQUFJLEVBQUUsTUFBTTtnQkFDWixTQUFTLEVBQUUsSUFBSTthQUNmLENBQUE7WUFDRCxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFO2dCQUNwRCxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO2dCQUN0QixvQkFBb0IsRUFBRTtvQkFDckIsa0NBQWtDO29CQUNsQyxnQ0FBZ0M7aUJBQ2hDO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1lBQ2hELE1BQU0sT0FBTyxHQUFxQjtnQkFDakMsV0FBVyxFQUFFLE1BQU07Z0JBQ25CLElBQUksRUFBRSxNQUFNO2dCQUNaLFNBQVMsRUFBRSxJQUFJO2dCQUNmLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ2hCLEtBQUssRUFBRSxrQkFBa0I7Z0JBQ3pCLEdBQUcsRUFBRTtvQkFDSixDQUFDLEVBQUUsR0FBRztvQkFDTixDQUFDLEVBQUUsR0FBRztpQkFDTjtnQkFDRCxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUc7Z0JBQ2pCLFlBQVksRUFBRSxJQUFJO2FBQ2xCLENBQUE7WUFDRCxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFO2dCQUNwRCxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO2dCQUN0QixvQkFBb0IsRUFBRTtvQkFDckIsa0NBQWtDO29CQUNsQyxpSUFBaUk7aUJBQ2pJO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsbUVBQW1FLEVBQUUsR0FBRyxFQUFFO1lBQzlFLE1BQU0sUUFBUSxHQUFxQjtnQkFDbEMsV0FBVyxFQUFFLE1BQU07Z0JBQ25CLElBQUksRUFBRSxNQUFNO2dCQUNaLFNBQVMsRUFBRSxJQUFJO2FBQ2YsQ0FBQTtZQUNELE1BQU0sUUFBUSxHQUFxQjtnQkFDbEMsV0FBVyxFQUFFLEtBQUs7Z0JBQ2xCLElBQUksRUFBRSxLQUFLO2dCQUNYLFNBQVMsRUFBRSxLQUFLO2FBQ2hCLENBQUE7WUFDRCxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBRTtnQkFDL0QsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUM7Z0JBQzdCLG9CQUFvQixFQUFFO29CQUNyQixrQ0FBa0M7b0JBQ2xDLGdDQUFnQztvQkFDaEMsOEJBQThCO2lCQUM5QjthQUNELENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9