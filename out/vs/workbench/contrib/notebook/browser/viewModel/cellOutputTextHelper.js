/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isTextStreamMime } from '../../common/notebookCommon.js';
export function getAllOutputsText(notebook, viewCell, shortErrors = false) {
    const outputText = [];
    for (let i = 0; i < viewCell.outputsViewModels.length; i++) {
        const outputViewModel = viewCell.outputsViewModels[i];
        const outputTextModel = viewCell.model.outputs[i];
        const [mimeTypes, pick] = outputViewModel.resolveMimeTypes(notebook, undefined);
        const mimeType = mimeTypes[pick].mimeType;
        let buffer = outputTextModel.outputs.find((output) => output.mime === mimeType);
        if (!buffer || mimeType.startsWith('image')) {
            buffer = outputTextModel.outputs.find((output) => !output.mime.startsWith('image'));
        }
        if (!buffer) {
            continue;
        }
        let text = '';
        if (isTextStreamMime(mimeType)) {
            const { text: stream, count } = getOutputStreamText(outputViewModel);
            text = stream;
            if (count > 1) {
                i += count - 1;
            }
        }
        else {
            text = getOutputText(mimeType, buffer, shortErrors);
        }
        outputText.push(text);
    }
    let outputContent;
    if (outputText.length > 1) {
        outputContent = outputText
            .map((output, i) => {
            return `Cell output ${i + 1} of ${outputText.length}\n${output}`;
        })
            .join('\n');
    }
    else {
        outputContent = outputText[0] ?? '';
    }
    return outputContent;
}
export function getOutputStreamText(output) {
    let text = '';
    const cellViewModel = output.cellViewModel;
    let index = cellViewModel.outputsViewModels.indexOf(output);
    let count = 0;
    while (index < cellViewModel.model.outputs.length) {
        const nextCellOutput = cellViewModel.model.outputs[index];
        const nextOutput = nextCellOutput.outputs.find((output) => isTextStreamMime(output.mime));
        if (!nextOutput) {
            break;
        }
        text = text + decoder.decode(nextOutput.data.buffer);
        index = index + 1;
        count++;
    }
    return { text: text.trim(), count };
}
const decoder = new TextDecoder();
export function getOutputText(mimeType, buffer, shortError = false) {
    let text = `${mimeType}`; // default in case we can't get the text value for some reason.
    const charLimit = 100000;
    text = decoder.decode(buffer.data.slice(0, charLimit).buffer);
    if (buffer.data.byteLength > charLimit) {
        text = text + '...(truncated)';
    }
    else if (mimeType === 'application/vnd.code.notebook.error') {
        text = text.replace(/\\u001b\[[0-9;]*m/gi, '');
        try {
            const error = JSON.parse(text);
            if (!error.stack || shortError) {
                text = `${error.name}: ${error.message}`;
            }
            else {
                text = error.stack;
            }
        }
        catch {
            // just use raw text
        }
    }
    return text.trim();
}
export async function copyCellOutput(mimeType, outputViewModel, clipboardService, logService) {
    const cellOutput = outputViewModel.model;
    const output = mimeType && TEXT_BASED_MIMETYPES.includes(mimeType)
        ? cellOutput.outputs.find((output) => output.mime === mimeType)
        : cellOutput.outputs.find((output) => TEXT_BASED_MIMETYPES.includes(output.mime));
    mimeType = output?.mime;
    if (!mimeType || !output) {
        return;
    }
    const text = isTextStreamMime(mimeType)
        ? getOutputStreamText(outputViewModel).text
        : getOutputText(mimeType, output);
    try {
        await clipboardService.writeText(text);
    }
    catch (e) {
        logService.error(`Failed to copy content: ${e}`);
    }
}
export const TEXT_BASED_MIMETYPES = [
    'text/latex',
    'text/html',
    'application/vnd.code.notebook.error',
    'application/vnd.code.notebook.stdout',
    'application/x.notebook.stdout',
    'application/x.notebook.stream',
    'application/vnd.code.notebook.stderr',
    'application/x.notebook.stderr',
    'text/plain',
    'text/markdown',
    'application/json',
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE91dHB1dFRleHRIZWxwZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdNb2RlbC9jZWxsT3V0cHV0VGV4dEhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQWtCLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFTakYsTUFBTSxVQUFVLGlCQUFpQixDQUNoQyxRQUEyQixFQUMzQixRQUF3QixFQUN4QixjQUF1QixLQUFLO0lBRTVCLE1BQU0sVUFBVSxHQUFhLEVBQUUsQ0FBQTtJQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzVELE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRCxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDL0UsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUN6QyxJQUFJLE1BQU0sR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQTtRQUUvRSxJQUFJLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsT0FBTyxD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