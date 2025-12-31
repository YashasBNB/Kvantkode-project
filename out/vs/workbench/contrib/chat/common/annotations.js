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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ub3RhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9hbm5vdGF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRCxPQUFPLEVBR04sb0JBQW9CLEVBQ3BCLHVCQUF1QixHQUN2QixNQUFNLGdCQUFnQixDQUFBO0FBR3ZCLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRywyQkFBMkIsQ0FBQSxDQUFDLDRCQUE0QjtBQUVyRixNQUFNLFVBQVUsOEJBQThCLENBQzdDLFFBQWdEO0lBRWhELElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtJQUVqQixNQUFNLE1BQU0sR0FBNkMsRUFBRSxDQUFBO0lBQzNELEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxFQUFFLENBQUM7UUFDN0IsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1RSxNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxZQUFZLENBQUMsQ0FBQTtRQUNyRSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssaUJBQWlCLEVBQUUsQ0FBQztZQUNyQyxJQUFJLEtBQUssR0FBdUIsSUFBSSxDQUFDLElBQUksQ0FBQTtZQUN6QyxJ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