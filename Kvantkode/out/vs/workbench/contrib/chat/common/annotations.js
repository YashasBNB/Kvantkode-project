/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { appendMarkdownString, canMergeMarkdownStrings, } from './chatModel.js';
export const contentRefUrl = 'http://_vscodecontentref_'; // must be lowercase for URI
export function annotateSpecialMarkdownContent(response) {
    let refIdPool = 0;
    const result = [];
    for (const item of response) {
        const previousItem = result.filter((p) => p.kind !== 'textEditGroup').at(-1);
        const previousItemIndex = result.findIndex((p) => p === previousItem);
        if (item.kind === 'inlineReference') {
            let label = item.name;
            if (!label) {
                if (URI.isUri(item.inlineReference)) {
                    label = basename(item.inlineReference);
                }
                else if ('name' in item.inlineReference) {
                    label = item.inlineReference.name;
                }
                else {
                    label = basename(item.inlineReference.uri);
                }
            }
            const refId = refIdPool++;
            const printUri = URI.parse(contentRefUrl).with({ path: String(refId) });
            const markdownText = `[${label}](${printUri.toString()})`;
            const annotationMetadata = { [refId]: item };
            if (previousItem?.kind === 'markdownContent') {
                const merged = appendMarkdownString(previousItem.content, new MarkdownString(markdownText));
                result[previousItemIndex] = {
                    ...previousItem,
                    content: merged,
                    inlineReferences: { ...annotationMetadata, ...(previousItem.inlineReferences || {}) },
                };
            }
            else {
                result.push({
                    content: new MarkdownString(markdownText),
                    inlineReferences: annotationMetadata,
                    kind: 'markdownContent',
                });
            }
        }
        else if (item.kind === 'markdownContent' &&
            previousItem?.kind === 'markdownContent' &&
            canMergeMarkdownStrings(previousItem.content, item.content)) {
            const merged = appendMarkdownString(previousItem.content, item.content);
            result[previousItemIndex] = { ...previousItem, content: merged };
        }
        else if (item.kind === 'markdownVuln') {
            const vulnText = encodeURIComponent(JSON.stringify(item.vulnerabilities));
            const markdownText = `<vscode_annotation details='${vulnText}'>${item.content.value}</vscode_annotation>`;
            if (previousItem?.kind === 'markdownContent') {
                // Since this is inside a codeblock, it needs to be merged into the previous markdown content.
                const merged = appendMarkdownString(previousItem.content, new MarkdownString(markdownText));
                result[previousItemIndex] = { ...previousItem, content: merged };
            }
            else {
                result.push({ content: new MarkdownString(markdownText), kind: 'markdownContent' });
            }
        }
        else if (item.kind === 'codeblockUri') {
            if (previousItem?.kind === 'markdownContent') {
                const isEditText = item.isEdit ? ` isEdit` : '';
                const markdownText = `<vscode_codeblock_uri${isEditText}>${item.uri.toString()}</vscode_codeblock_uri>`;
                const merged = appendMarkdownString(previousItem.content, new MarkdownString(markdownText));
                result[previousItemIndex] = { ...previousItem, content: merged };
            }
        }
        else {
            result.push(item);
        }
    }
    return result;
}
export function annotateVulnerabilitiesInText(response) {
    const result = [];
    for (const item of response) {
        const previousItem = result[result.length - 1];
        if (item.kind === 'markdownContent') {
            if (previousItem?.kind === 'markdownContent') {
                result[result.length - 1] = {
                    content: new MarkdownString(previousItem.content.value + item.content.value, {
                        isTrusted: previousItem.content.isTrusted,
                    }),
                    kind: 'markdownContent',
                };
            }
            else {
                result.push(item);
            }
        }
        else if (item.kind === 'markdownVuln') {
            const vulnText = encodeURIComponent(JSON.stringify(item.vulnerabilities));
            const markdownText = `<vscode_annotation details='${vulnText}'>${item.content.value}</vscode_annotation>`;
            if (previousItem?.kind === 'markdownContent') {
                result[result.length - 1] = {
                    content: new MarkdownString(previousItem.content.value + markdownText, {
                        isTrusted: previousItem.content.isTrusted,
                    }),
                    kind: 'markdownContent',
                };
            }
            else {
                result.push({ content: new MarkdownString(markdownText), kind: 'markdownContent' });
            }
        }
    }
    return result;
}
export function extractCodeblockUrisFromText(text) {
    const match = /<vscode_codeblock_uri( isEdit)?>(.*?)<\/vscode_codeblock_uri>/ms.exec(text);
    if (match) {
        const [all, isEdit, uriString] = match;
        if (uriString) {
            const result = URI.parse(uriString);
            const textWithoutResult = text.substring(0, match.index) + text.substring(match.index + all.length);
            return { uri: result, textWithoutResult, isEdit: !!isEdit };
        }
    }
    return undefined;
}
export function extractVulnerabilitiesFromText(text) {
    const vulnerabilities = [];
    let newText = text;
    let match;
    while ((match = /<vscode_annotation details='(.*?)'>(.*?)<\/vscode_annotation>/ms.exec(newText)) !==
        null) {
        const [full, details, content] = match;
        const start = match.index;
        const textBefore = newText.substring(0, start);
        const linesBefore = textBefore.split('\n').length - 1;
        const linesInside = content.split('\n').length - 1;
        const previousNewlineIdx = textBefore.lastIndexOf('\n');
        const startColumn = start - (previousNewlineIdx + 1) + 1;
        const endPreviousNewlineIdx = (textBefore + content).lastIndexOf('\n');
        const endColumn = start + content.length - (endPreviousNewlineIdx + 1) + 1;
        try {
            const vulnDetails = JSON.parse(decodeURIComponent(details));
            vulnDetails.forEach(({ title, description }) => vulnerabilities.push({
                title,
                description,
                range: {
                    startLineNumber: linesBefore + 1,
                    startColumn,
                    endLineNumber: linesBefore + linesInside + 1,
                    endColumn,
                },
            }));
        }
        catch (err) {
            // Something went wrong with encoding this text, just ignore it
        }
        newText = newText.substring(0, start) + content + newText.substring(start + full.length);
    }
    return { newText, vulnerabilities };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3RhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2Fubm90YXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE9BQU8sRUFHTixvQkFBb0IsRUFDcEIsdUJBQXVCLEdBQ3ZCLE1BQU0sZ0JBQWdCLENBQUE7QUFHdkIsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLDJCQUEyQixDQUFBLENBQUMsNEJBQTRCO0FBRXJGLE1BQU0sVUFBVSw4QkFBOEIsQ0FDN0MsUUFBZ0Q7SUFFaEQsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO0lBRWpCLE1BQU0sTUFBTSxHQUE2QyxFQUFFLENBQUE7SUFDM0QsS0FBSyxNQUFNLElBQUksSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUM3QixNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzVFLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLFlBQVksQ0FBQyxDQUFBO1FBQ3JFLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3JDLElBQUksS0FBSyxHQUF1QixJQUFJLENBQUMsSUFBSSxDQUFBO1lBQ3pDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7b0JBQ3JDLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUN2QyxDQUFDO3FCQUFNLElBQUksTUFBTSxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztvQkFDM0MsS0FBSyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFBO2dCQUNsQyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUMzQyxDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLFNBQVMsRUFBRSxDQUFBO1lBQ3pCLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDdkUsTUFBTSxZQUFZLEdBQUcsSUFBSSxLQUFLLEtBQUssUUFBUSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUE7WUFFekQsTUFBTSxrQkFBa0IsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUE7WUFFNUMsSUFBSSxZQUFZLEVBQUUsSUFBSSxLQUFLLGlCQUFpQixFQUFFLENBQUM7Z0JBQzlDLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsSUFBSSxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtnQkFDM0YsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEdBQUc7b0JBQzNCLEdBQUcsWUFBWTtvQkFDZixPQUFPLEVBQUUsTUFBTTtvQkFDZixnQkFBZ0IsRUFBRSxFQUFFLEdBQUcsa0JBQWtCLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFLENBQUMsRUFBRTtpQkFDckYsQ0FBQTtZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNYLE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxZQUFZLENBQUM7b0JBQ3pDLGdCQUFnQixFQUFFLGtCQUFrQjtvQkFDcEMsSUFBSSxFQUFFLGlCQUFpQjtpQkFDdkIsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUNOLElBQUksQ0FBQyxJQUFJLEtBQUssaUJBQWlCO1lBQy9CLFlBQVksRUFBRSxJQUFJLEtBQUssaUJBQWlCO1lBQ3hDLHVCQUF1QixDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUMxRCxDQUFDO1lBQ0YsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDdkUsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxHQUFHLFlBQVksRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUE7UUFDakUsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxjQUFjLEVBQUUsQ0FBQztZQUN6QyxNQUFNLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFBO1lBQ3pFLE1BQU0sWUFBWSxHQUFHLCtCQUErQixRQUFRLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLHNCQUFzQixDQUFBO1lBQ3pHLElBQUksWUFBWSxFQUFFLElBQUksS0FBSyxpQkFBaUIsRUFBRSxDQUFDO2dCQUM5Qyw4RkFBOEY7Z0JBQzlGLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsSUFBSSxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtnQkFDM0YsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxHQUFHLFlBQVksRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUE7WUFDakUsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtZQUNwRixDQUFDO1FBQ0YsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxjQUFjLEVBQUUsQ0FBQztZQUN6QyxJQUFJLFlBQVksRUFBRSxJQUFJLEtBQUssaUJBQWlCLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7Z0JBQy9DLE1BQU0sWUFBWSxHQUFHLHdCQUF3QixVQUFVLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUseUJBQXlCLENBQUE7Z0JBQ3ZHLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsSUFBSSxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtnQkFDM0YsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxHQUFHLFlBQVksRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUE7WUFDakUsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNsQixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQztBQVFELE1BQU0sVUFBVSw2QkFBNkIsQ0FDNUMsUUFBcUQ7SUFFckQsTUFBTSxNQUFNLEdBQTJCLEVBQUUsQ0FBQTtJQUN6QyxLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQzdCLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzlDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3JDLElBQUksWUFBWSxFQUFFLElBQUksS0FBSyxpQkFBaUIsRUFBRSxDQUFDO2dCQUM5QyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRztvQkFDM0IsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFO3dCQUM1RSxTQUFTLEVBQUUsWUFBWSxDQUFDLE9BQU8sQ0FBQyxTQUFTO3FCQUN6QyxDQUFDO29CQUNGLElBQUksRUFBRSxpQkFBaUI7aUJBQ3ZCLENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNsQixDQUFDO1FBQ0YsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxjQUFjLEVBQUUsQ0FBQztZQUN6QyxNQUFNLFFBQVEsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFBO1lBQ3pFLE1BQU0sWUFBWSxHQUFHLCtCQUErQixRQUFRLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLHNCQUFzQixDQUFBO1lBQ3pHLElBQUksWUFBWSxFQUFFLElBQUksS0FBSyxpQkFBaUIsRUFBRSxDQUFDO2dCQUM5QyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRztvQkFDM0IsT0FBTyxFQUFFLElBQUksY0FBYyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLFlBQVksRUFBRTt3QkFDdEUsU0FBUyxFQUFFLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUztxQkFDekMsQ0FBQztvQkFDRixJQUFJLEVBQUUsaUJBQWlCO2lCQUN2QixDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtZQUNwRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxNQUFNLFVBQVUsNEJBQTRCLENBQzNDLElBQVk7SUFFWixNQUFNLEtBQUssR0FBRyxpRUFBaUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDMUYsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNYLE1BQU0sQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxHQUFHLEtBQUssQ0FBQTtRQUN0QyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNuQyxNQUFNLGlCQUFpQixHQUN0QixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMxRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQzVELENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQUVELE1BQU0sVUFBVSw4QkFBOEIsQ0FBQyxJQUFZO0lBSTFELE1BQU0sZUFBZSxHQUE2QixFQUFFLENBQUE7SUFDcEQsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFBO0lBQ2xCLElBQUksS0FBNkIsQ0FBQTtJQUNqQyxPQUNDLENBQUMsS0FBSyxHQUFHLGlFQUFpRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN6RixJQUFJLEVBQ0gsQ0FBQztRQUNGLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEtBQUssQ0FBQTtRQUN0QyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFBO1FBQ3pCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlDLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNyRCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFFbEQsTUFBTSxrQkFBa0IsR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sV0FBVyxHQUFHLEtBQUssR0FBRyxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN4RCxNQUFNLHFCQUFxQixHQUFHLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0RSxNQUFNLFNBQVMsR0FBRyxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUUxRSxJQUFJLENBQUM7WUFDSixNQUFNLFdBQVcsR0FBcUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQzdGLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQzlDLGVBQWUsQ0FBQyxJQUFJLENBQUM7Z0JBQ3BCLEtBQUs7Z0JBQ0wsV0FBVztnQkFDWCxLQUFLLEVBQUU7b0JBQ04sZUFBZSxFQUFFLFdBQVcsR0FBRyxDQUFDO29CQUNoQyxXQUFXO29CQUNYLGFBQWEsRUFBRSxXQUFXLEdBQUcsV0FBVyxHQUFHLENBQUM7b0JBQzVDLFNBQVM7aUJBQ1Q7YUFDRCxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsK0RBQStEO1FBQ2hFLENBQUM7UUFDRCxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN6RixDQUFDO0lBRUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsQ0FBQTtBQUNwQyxDQUFDIn0=