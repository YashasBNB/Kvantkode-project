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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9maWxlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvdGVzdC9jb21tb24vdGVybWluYWxQcm9maWxlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDeEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTNFLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLElBQUksQ0FBQyx5REFBeUQsRUFBRSxHQUFHLEVBQUU7WUFDcEUsZUFBZSxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUM3QyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUM7Z0JBQ2Qsb0JBQW9CLEVBQUUsQ0FBQyxrQ0FBa0MsQ0FBQzthQUMxRCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyx3REFBd0QsRUFBRSxHQUFHLEVBQUU7WUFDbkUsTUFBTSxPQUFPLEdBQXFCO2dCQUNqQyxXQUFXLEVBQUUsTUFBTTtnQkFDbkIsSUFBSSxFQUFFLE1BQU07Z0JBQ1osU0FBUyxFQUFFLElBQUk7YUFDZixDQUFBO1lBQ0QsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRTtnQkFDcEQsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztnQkFDdEIsb0JBQW9CLEVBQUU7b0JBQ3JCLGtDQUFrQztvQkFDbEMsZ0NBQWdDO2lCQUNoQzthQUNELENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtZQUNoRCxNQUFNLE9BQU8sR0FBcUI7Z0JBQ2pDLFdBQVcsRUFBRSxNQUFNO2dCQUNuQixJQUFJLEVBQUUsTUFBTTtnQkFDWixTQUFTLEVBQUUsSUFBSTtnQkFDZixJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUNoQixLQUFLLEVBQUUsa0JBQWtCO2dCQUN6QixHQUFHLEVBQUU7b0JBQ0osQ0FBQyxFQUFFLEdBQUc7b0JBQ04sQ0FBQyxFQUFFLEdBQUc7aUJBQ047Z0JBQ0QsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHO2dCQUNqQixZQUFZLEVBQUUsSUFBSTthQUNsQixDQUFBO1lBQ0QsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRTtnQkFDcEQsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQztnQkFDdEIsb0JBQW9CLEVBQUU7b0JBQ3JCLGtDQUFrQztvQkFDbEMsaUlBQWlJO2lCQUNqSTthQUNELENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLG1FQUFtRSxFQUFFLEdBQUcsRUFBRTtZQUM5RSxNQUFNLFFBQVEsR0FBcUI7Z0JBQ2xDLFdBQVcsRUFBRSxNQUFNO2dCQUNuQixJQUFJLEVBQUUsTUFBTTtnQkFDWixTQUFTLEVBQUUsSUFBSTthQUNmLENBQUE7WUFDRCxNQUFNLFFBQVEsR0FBcUI7Z0JBQ2xDLFdBQVcsRUFBRSxLQUFLO2dCQUNsQixJQUFJLEVBQUUsS0FBSztnQkFDWCxTQUFTLEVBQUUsS0FBSzthQUNoQixDQUFBO1lBQ0QsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUU7Z0JBQy9ELE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDO2dCQUM3QixvQkFBb0IsRUFBRTtvQkFDckIsa0NBQWtDO29CQUNsQyxnQ0FBZ0M7b0JBQ2hDLDhCQUE4QjtpQkFDOUI7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==