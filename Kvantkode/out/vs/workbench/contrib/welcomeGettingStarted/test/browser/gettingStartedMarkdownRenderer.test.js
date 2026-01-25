/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FileAccess } from '../../../../../base/common/network.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { LanguageService } from '../../../../../editor/common/services/languageService.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { GettingStartedDetailsRenderer } from '../../browser/gettingStartedDetailsRenderer.js';
import { convertInternalMediaPathToFileURI } from '../../browser/gettingStartedService.js';
import { TestFileService } from '../../../../test/browser/workbenchTestServices.js';
import { TestExtensionService } from '../../../../test/common/workbenchTestServices.js';
suite('Getting Started Markdown Renderer', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('renders theme picker markdown with images', async () => {
        const fileService = new TestFileService();
        const languageService = new LanguageService();
        const renderer = new GettingStartedDetailsRenderer(fileService, new TestNotificationService(), new TestExtensionService(), languageService);
        const mdPath = convertInternalMediaPathToFileURI('theme_picker').with({
            query: JSON.stringify({
                moduleId: 'vs/workbench/contrib/welcomeGettingStarted/common/media/theme_picker',
            }),
        });
        const mdBase = FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/');
        const rendered = await renderer.renderMarkdown(mdPath, mdBase);
        const imageSrcs = [...rendered.matchAll(/img src="[^"]*"/g)].map((match) => match[0]);
        for (const src of imageSrcs) {
            const targetSrcFormat = /^img src=".*\/vs\/workbench\/contrib\/welcomeGettingStarted\/common\/media\/.*.png"$/;
            assert(targetSrcFormat.test(src), `${src} didnt match regex`);
        }
        languageService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRNYXJrZG93blJlbmRlcmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVHZXR0aW5nU3RhcnRlZC90ZXN0L2Jyb3dzZXIvZ2V0dGluZ1N0YXJ0ZWRNYXJrZG93blJlbmRlcmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDMUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkVBQTZFLENBQUE7QUFDckgsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRXZGLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7SUFDL0MsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQzdDLE1BQU0sUUFBUSxHQUFHLElBQUksNkJBQTZCLENBQ2pELFdBQVcsRUFDWCxJQUFJLHVCQUF1QixFQUFFLEVBQzdCLElBQUksb0JBQW9CLEVBQUUsRUFDMUIsZUFBZSxDQUNmLENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxpQ0FBaUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDckUsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ3JCLFFBQVEsRUFBRSxzRUFBc0U7YUFDaEYsQ0FBQztTQUNGLENBQUMsQ0FBQTtRQUNGLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsMERBQTBELENBQUMsQ0FBQTtRQUMvRixNQUFNLFFBQVEsR0FBRyxNQUFNLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzlELE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLEtBQUssTUFBTSxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7WUFDN0IsTUFBTSxlQUFlLEdBQ3BCLHNGQUFzRixDQUFBO1lBQ3ZGLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzlELENBQUM7UUFDRCxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDMUIsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9