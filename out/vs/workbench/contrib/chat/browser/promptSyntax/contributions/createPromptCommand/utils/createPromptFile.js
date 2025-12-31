/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FolderExists, InvalidPromptName } from '../errors.js';
import { URI } from '../../../../../../../../base/common/uri.js';
import { assert } from '../../../../../../../../base/common/assert.js';
import { VSBuffer } from '../../../../../../../../base/common/buffer.js';
import { dirname } from '../../../../../../../../base/common/resources.js';
import { isPromptFile, } from '../../../../../../../../platform/prompts/common/constants.js';
/**
 * Create a prompt file at the provided folder and with
 * the provided file content.
 *
 * @throws in the following cases:
 *  - if the `fileName` does not end with {@link PROMPT_FILE_EXTENSION}
 *  - if a folder or file with the same already name exists in the destination folder
 */
export const createPromptFile = async (options) => {
    const { fileName, folder, content, fileService, openerService } = options;
    const promptUri = URI.joinPath(folder, fileName);
    assert(isPromptFile(promptUri), new InvalidPromptName(fileName));
    // if a folder or file with the same name exists, throw an error
    if (await fileService.exists(promptUri)) {
        const promptInfo = await fileService.resolve(promptUri);
        // if existing object is a folder, throw an error
        assert(!promptInfo.isDirectory, new FolderExists(promptUri.fsPath));
        // prompt file already exists so open it
        await openerService.open(promptUri);
        return promptUri;
    }
    // ensure the parent folder of the prompt file exists
    await fileService.createFolder(dirname(promptUri));
    // create the prompt file with the provided text content
    await fileService.createFile(promptUri, VSBuffer.fromString(content));
    return promptUri;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0RmlsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9wcm9tcHRTeW50YXgvY29udHJpYnV0aW9ucy9jcmVhdGVQcm9tcHRDb21tYW5kL3V0aWxzL2NyZWF0ZVByb21wdEZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFHMUUsT0FBTyxFQUNOLFlBQVksR0FFWixNQUFNLDhEQUE4RCxDQUFBO0FBMEJyRTs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxFQUFFLE9BQWlDLEVBQWdCLEVBQUU7SUFDekYsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsR0FBRyxPQUFPLENBQUE7SUFFekUsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFFaEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7SUFFaEUsZ0VBQWdFO0lBQ2hFLElBQUksTUFBTSxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDekMsTUFBTSxVQUFVLEdBQUcsTUFBTSxXQUFXLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRXZELGlEQUFpRDtRQUNqRCxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBRW5FLHdDQUF3QztRQUN4QyxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFbkMsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVELHFEQUFxRDtJQUNyRCxNQUFNLFdBQVcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7SUFFbEQsd0RBQXdEO0lBQ3hELE1BQU0sV0FBVyxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBRXJFLE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUMsQ0FBQSJ9