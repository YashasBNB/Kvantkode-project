/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { annotateSpecialMarkdownContent, extractVulnerabilitiesFromText, } from '../../common/annotations.js';
function content(str) {
    return { kind: 'markdownContent', content: new MarkdownString(str) };
}
suite('Annotations', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('extractVulnerabilitiesFromText', () => {
        test('single line', async () => {
            const before = 'some code ';
            const vulnContent = 'content with vuln';
            const after = ' after';
            const annotatedResult = annotateSpecialMarkdownContent([
                content(before),
                {
                    kind: 'markdownVuln',
                    content: new MarkdownString(vulnContent),
                    vulnerabilities: [{ title: 'title', description: 'vuln' }],
                },
                content(after),
            ]);
            await assertSnapshot(annotatedResult);
            const markdown = annotatedResult[0];
            const result = extractVulnerabilitiesFromText(markdown.content.value);
            await assertSnapshot(result);
        });
        test('multiline', async () => {
            const before = 'some code\nover\nmultiple lines ';
            const vulnContent = 'content with vuln\nand\nnewlines';
            const after = 'more code\nwith newline';
            const annotatedResult = annotateSpecialMarkdownContent([
                content(before),
                {
                    kind: 'markdownVuln',
                    content: new MarkdownString(vulnContent),
                    vulnerabilities: [{ title: 'title', description: 'vuln' }],
                },
                content(after),
            ]);
            await assertSnapshot(annotatedResult);
            const markdown = annotatedResult[0];
            const result = extractVulnerabilitiesFromText(markdown.content.value);
            await assertSnapshot(result);
        });
        test('multiple vulns', async () => {
            const before = 'some code\nover\nmultiple lines ';
            const vulnContent = 'content with vuln\nand\nnewlines';
            const after = 'more code\nwith newline';
            const annotatedResult = annotateSpecialMarkdownContent([
                content(before),
                {
                    kind: 'markdownVuln',
                    content: new MarkdownString(vulnContent),
                    vulnerabilities: [{ title: 'title', description: 'vuln' }],
                },
                content(after),
                {
                    kind: 'markdownVuln',
                    content: new MarkdownString(vulnContent),
                    vulnerabilities: [{ title: 'title', description: 'vuln' }],
                },
            ]);
            await assertSnapshot(annotatedResult);
            const markdown = annotatedResult[0];
            const result = extractVulnerabilitiesFromText(markdown.content.value);
            await assertSnapshot(result);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3RhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vYW5ub3RhdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIsOEJBQThCLEdBQzlCLE1BQU0sNkJBQTZCLENBQUE7QUFFcEMsU0FBUyxPQUFPLENBQUMsR0FBVztJQUMzQixPQUFPLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFBO0FBQ3JFLENBQUM7QUFFRCxLQUFLLENBQUMsYUFBYSxFQUFFO0lBQ3BCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxJQUFJLENBQUMsYUFBYSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzlCLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQTtZQUMzQixNQUFNLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQTtZQUN2QyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUE7WUFDdEIsTUFBTSxlQUFlLEdBQUcsOEJBQThCLENBQUM7Z0JBQ3RELE9BQU8sQ0FBQyxNQUFNLENBQUM7Z0JBQ2Y7b0JBQ0MsSUFBSSxFQUFFLGNBQWM7b0JBQ3BCLE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxXQUFXLENBQUM7b0JBQ3hDLGVBQWUsRUFBRSxDQUFDLEVBQUUs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