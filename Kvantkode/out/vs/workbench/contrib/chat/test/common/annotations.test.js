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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3RhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9hbm5vdGF0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDNUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUNOLDhCQUE4QixFQUM5Qiw4QkFBOEIsR0FDOUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUVwQyxTQUFTLE9BQU8sQ0FBQyxHQUFXO0lBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUE7QUFDckUsQ0FBQztBQUVELEtBQUssQ0FBQyxhQUFhLEVBQUU7SUFDcEIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1FBQzVDLElBQUksQ0FBQyxhQUFhLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDOUIsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFBO1lBQzNCLE1BQU0sV0FBVyxHQUFHLG1CQUFtQixDQUFBO1lBQ3ZDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQTtZQUN0QixNQUFNLGVBQWUsR0FBRyw4QkFBOEIsQ0FBQztnQkFDdEQsT0FBTyxDQUFDLE1BQU0sQ0FBQztnQkFDZjtvQkFDQyxJQUFJLEVBQUUsY0FBYztvQkFDcEIsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLFdBQVcsQ0FBQztvQkFDeEMsZUFBZSxFQUFFLENBQUMs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