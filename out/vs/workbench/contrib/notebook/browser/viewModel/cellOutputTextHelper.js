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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE91dHB1dFRleHRIZWxwZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld01vZGVsL2NlbGxPdXRwdXRUZXh0SGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBa0IsZ0JBQWdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQVNqRixNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLFFBQTJCLEVBQzNCLFFBQXdCLEVBQ3hCLGNBQXVCLEtBQUs7SUFFNUIsTUFBTSxVQUFVLEdBQWEsRUFBRSxDQUFBO0lBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDNUQsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsZUFBZSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMvRSxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFBO1FBQ3pDLElBQUksTUFBTSxHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFBO1FBRS9FLElBQUksQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzdDLE1BQU0sR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixTQUFRO1FBQ1QsQ0FBQztRQUVELElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUNiLElBQUksZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNoQyxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxtQkFBbUIsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUNwRSxJQUFJLEdBQUcsTUFBTSxDQUFBO1lBQ2IsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2YsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUE7WUFDZixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLEdBQUcsYUFBYSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDcEQsQ0FBQztRQUVELFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDdEIsQ0FBQztJQUVELElBQUksYUFBcUIsQ0FBQTtJQUN6QixJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDM0IsYUFBYSxHQUFHLFVBQVU7YUFDeEIsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2xCLE9BQU8sZUFBZSxDQUFDLEdBQUcsQ0FBQyxPQUFPLFVBQVUsQ0FBQyxNQUFNLEtBQUssTUFBTSxFQUFFLENBQUE7UUFDakUsQ0FBQyxDQUFDO2FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2IsQ0FBQztTQUFNLENBQUM7UUFDUCxhQUFhLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsT0FBTyxhQUFhLENBQUE7QUFDckIsQ0FBQztBQUVELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxNQUE0QjtJQUMvRCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUE7SUFDYixNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsYUFBK0IsQ0FBQTtJQUM1RCxJQUFJLEtBQUssR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQzNELElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQTtJQUNiLE9BQU8sS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ25ELE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3pELE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUN6RixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsTUFBSztRQUNOLENBQUM7UUFFRCxJQUFJLEdBQUcsSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwRCxLQUFLLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUNqQixLQUFLLEVBQUUsQ0FBQTtJQUNSLENBQUM7SUFFRCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQTtBQUNwQyxDQUFDO0FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQTtBQUVqQyxNQUFNLFVBQVUsYUFBYSxDQUM1QixRQUFnQixFQUNoQixNQUFzQixFQUN0QixhQUFzQixLQUFLO0lBRTNCLElBQUksSUFBSSxHQUFHLEdBQUcsUUFBUSxFQUFFLENBQUEsQ0FBQywrREFBK0Q7SUFFeEYsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFBO0lBQ3hCLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUU3RCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsRUFBRSxDQUFDO1FBQ3hDLElBQUksR0FBRyxJQUFJLEdBQUcsZ0JBQWdCLENBQUE7SUFDL0IsQ0FBQztTQUFNLElBQUksUUFBUSxLQUFLLHFDQUFxQyxFQUFFLENBQUM7UUFDL0QsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDOUMsSUFBSSxDQUFDO1lBQ0osTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQVUsQ0FBQTtZQUN2QyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDekMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFBO1lBQ25CLENBQUM7UUFDRixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1Isb0JBQW9CO1FBQ3JCLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7QUFDbkIsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsY0FBYyxDQUNuQyxRQUE0QixFQUM1QixlQUFxQyxFQUNyQyxnQkFBbUMsRUFDbkMsVUFBdUI7SUFFdkIsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQTtJQUN4QyxNQUFNLE1BQU0sR0FDWCxRQUFRLElBQUksb0JBQW9CLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztRQUNsRCxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDO1FBQy9ELENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBRW5GLFFBQVEsR0FBRyxNQUFNLEVBQUUsSUFBSSxDQUFBO0lBRXZCLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUMxQixPQUFNO0lBQ1AsQ0FBQztJQUVELE1BQU0sSUFBSSxHQUFHLGdCQUFnQixDQUFDLFFBQVEsQ0FBQztRQUN0QyxDQUFDLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDLENBQUMsSUFBSTtRQUMzQyxDQUFDLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUVsQyxJQUFJLENBQUM7UUFDSixNQUFNLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNaLFVBQVUsQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDakQsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRztJQUNuQyxZQUFZO0lBQ1osV0FBVztJQUNYLHFDQUFxQztJQUNyQyxzQ0FBc0M7SUFDdEMsK0JBQStCO0lBQy9CLCtCQUErQjtJQUMvQixzQ0FBc0M7SUFDdEMsK0JBQStCO0lBQy9CLFlBQVk7SUFDWixlQUFlO0lBQ2Ysa0JBQWtCO0NBQ2xCLENBQUEifQ==