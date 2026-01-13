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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0RmlsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9jb250cmlidXRpb25zL2NyZWF0ZVByb21wdENvbW1hbmQvdXRpbHMvY3JlYXRlUHJvbXB0RmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUcxRSxPQUFPLEVBQ04sWUFBWSxHQUVaLE1BQU0sOERBQThELENBQUE7QUEwQnJFOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLEVBQUUsT0FBaUMsRUFBZ0IsRUFBRTtJQUN6RixNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxHQUFHLE9BQU8sQ0FBQTtJQUV6RSxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUVoRCxNQUFNLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUVoRSxnRUFBZ0U7SUFDaEUsSUFBSSxNQUFNLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztRQUN6QyxNQUFNLFVBQVUsR0FBRyxNQUFNLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFdkQsaURBQWlEO1FBQ2pELE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFFbkUsd0NBQXdDO1FBQ3hDLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUVuQyxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQscURBQXFEO0lBQ3JELE1BQU0sV0FBVyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtJQUVsRCx3REFBd0Q7SUFDeEQsTUFBTSxXQUFXLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFFckUsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQyxDQUFBIn0=