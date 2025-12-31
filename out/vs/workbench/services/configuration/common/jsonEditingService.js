/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as nls from '../../../../nls.js';
import * as json from '../../../../base/common/json.js';
import { setProperty } from '../../../../base/common/jsonEdit.js';
import { Queue } from '../../../../base/common/async.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { IJSONEditingService, JSONEditingError, } from './jsonEditing.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IFilesConfigurationService } from '../../filesConfiguration/common/filesConfigurationService.js';
let JSONEditingService = class JSONEditingService {
    constructor(fileService, textModelResolverService, textFileService, filesConfigurationService) {
        this.fileService = fileService;
        this.textModelResolverService = textModelResolverService;
        this.textFileService = textFileService;
        this.filesConfigurationService = filesConfigurationService;
        this.queue = new Queue();
    }
    write(resource, values) {
        return Promise.resolve(this.queue.queue(() => this.doWriteConfiguration(resource, values))); // queue up writes to prevent race conditions
    }
    async doWriteConfiguration(resource, values) {
        const reference = await this.resolveAndValidate(resource, true);
        try {
            await this.writeToBuffer(reference.object.textEditorModel, values);
        }
        finally {
            reference.dispose();
        }
    }
    async writeToBuffer(model, values) {
        let disposable;
        try {
            // Optimization: we apply edits to a text model and save it
            // right after. Use the files config service to signal this
            // to the workbench to optimise the UI during this operation.
            // For example, avoids to briefly show dirty indicators.
            disposable = this.filesConfigurationService.enableAutoSaveAfterShortDelay(model.uri);
            let hasEdits = false;
            for (const value of values) {
                const edit = this.getEdits(model, value)[0];
                hasEdits = (!!edit && this.applyEditsToBuffer(edit, model)) || hasEdits;
            }
            if (hasEdits) {
                return this.textFileService.save(model.uri);
            }
        }
        finally {
            disposable?.dispose();
        }
    }
    applyEditsToBuffer(edit, model) {
        const startPosition = model.getPositionAt(edit.offset);
        const endPosition = model.getPositionAt(edit.offset + edit.length);
        const range = new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column);
        const currentText = model.getValueInRange(range);
        if (edit.content !== currentText) {
            const editOperation = currentText
                ? EditOperation.replace(range, edit.content)
                : EditOperation.insert(startPosition, edit.content);
            model.pushEditOperations([
                new Selection(startPosition.lineNumber, startPosition.column, startPosition.lineNumber, startPosition.column),
            ], [editOperation], () => []);
            return true;
        }
        return false;
    }
    getEdits(model, configurationValue) {
        const { tabSize, insertSpaces } = model.getOptions();
        const eol = model.getEOL();
        const { path, value } = configurationValue;
        // With empty path the entire file is being replaced, so we just use JSON.stringify
        if (!path.length) {
            const content = JSON.stringify(value, null, insertSpaces ? ' '.repeat(tabSize) : '\t');
            return [
                {
                    content,
                    length: content.length,
                    offset: 0,
                },
            ];
        }
        return setProperty(model.getValue(), path, value, { tabSize, insertSpaces, eol });
    }
    async resolveModelReference(resource) {
        const exists = await this.fileService.exists(resource);
        if (!exists) {
            await this.textFileService.write(resource, '{}', { encoding: 'utf8' });
        }
        return this.textModelResolverService.createModelReference(resource);
    }
    hasParseErrors(model) {
        const parseErrors = [];
        json.parse(model.getValue(), parseErrors, { allowTrailingComma: true, allowEmptyContent: true });
        return parseErrors.length > 0;
    }
    async resolveAndValidate(resource, checkDirty) {
        const reference = await this.resolveModelReference(resource);
        const model = reference.object.textEditorModel;
        if (this.hasParseErrors(model)) {
            reference.dispose();
            return this.reject(0 /* JSONEditingErrorCode.ERROR_INVALID_FILE */);
        }
        return reference;
    }
    reject(code) {
        const message = this.toErrorMessage(code);
        return Promise.reject(new JSONEditingError(message, code));
    }
    toErrorMessage(error) {
        switch (error) {
            // User issues
            case 0 /* JSONEditingErrorCode.ERROR_INVALID_FILE */: {
                return nls.localize('errorInvalidFile', 'Unable to write into the file. Please open the file to correct errors/warnings in the file and try again.');
            }
        }
    }
};
JSONEditingService = __decorate([
    __param(0, IFileService),
    __param(1, ITextModelService),
    __param(2, ITextFileService),
    __param(3, IFilesConfigurationService)
], JSONEditingService);
export { JSONEditingService };
registerSingleton(IJSONEditingService, JSONEditingService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbkVkaXRpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb24vY29tbW9uL2pzb25FZGl0aW5nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUd4RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDL0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFDTixtQkFBbUIsRUFFbkIsZ0JBQWdCLEdBRWhCLE1BQU0sa0JBQWtCLENBQUE7QUFFekIsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBRWxHLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQWtCO0lBSzlCLFlBQ2dDLFdBQXlCLEVBQ3BCLHdCQUEyQyxFQUM1QyxlQUFpQyxFQUVuRCx5QkFBcUQ7UUFKdkMsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDcEIsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUFtQjtRQUM1QyxvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFFbkQsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUE0QjtRQUV0RSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxFQUFRLENBQUE7SUFDL0IsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFhLEVBQUUsTUFBb0I7UUFDeEMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUMsNkNBQTZDO0lBQzFJLENBQUM7SUFFTyxLQUFLLENBQUMsb0JBQW9CLENBQUMsUUFBYSxFQUFFLE1BQW9CO1FBQ3JFLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvRCxJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbkUsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFpQixFQUFFLE1BQW9CO1FBQ2xFLElBQUksVUFBbUMsQ0FBQTtRQUN2QyxJQUFJLENBQUM7WUFDSiwyREFBMkQ7WUFDM0QsMkRBQTJEO1lBQzNELDZEQUE2RDtZQUM3RCx3REFBd0Q7WUFDeEQsVUFBVSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFcEYsSUFBSSxRQUFRLEdBQVksS0FBSyxDQUFBO1lBQzdCLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQzVCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUMzQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUE7WUFDeEUsQ0FBQztZQUNELElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDNUMsQ0FBQztRQUNGLENBQUM7Z0JBQVMsQ0FBQztZQUNWLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUN0QixDQUFDO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQixDQUFDLElBQVUsRUFBRSxLQUFpQjtRQUN2RCxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN0RCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUN0QixhQUFhLENBQUMsVUFBVSxFQUN4QixhQUFhLENBQUMsTUFBTSxFQUNwQixXQUFXLENBQUMsVUFBVSxFQUN0QixXQUFXLENBQUMsTUFBTSxDQUNsQixDQUFBO1FBQ0QsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNoRCxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDbEMsTUFBTSxhQUFhLEdBQUcsV0FBVztnQkFDaEMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUM7Z0JBQzVDLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDcEQsS0FBSyxDQUFDLGtCQUFrQixDQUN2QjtnQkFDQyxJQUFJLFNBQVMsQ0FDWixhQUFhLENBQUMsVUFBVSxFQUN4QixhQUFhLENBQUMsTUFBTSxFQUNwQixhQUFhLENBQUMsVUFBVSxFQUN4QixhQUFhLENBQUMsTUFBTSxDQUNwQjthQUNELEVBQ0QsQ0FBQyxhQUFhLENBQUMsRUFDZixHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQ1IsQ0FBQTtZQUNELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLFFBQVEsQ0FBQyxLQUFpQixFQUFFLGtCQUE4QjtRQUNqRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxHQUFHLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNwRCxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDMUIsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQTtRQUUxQyxtRkFBbUY7UUFDbkYsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN0RixPQUFPO2dCQUNOO29CQUNDLE9BQU87b0JBQ1AsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO29CQUN0QixNQUFNLEVBQUUsQ0FBQztpQkFDVDthQUNELENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7SUFDbEYsQ0FBQztJQUVPLEtBQUssQ0FBQyxxQkFBcUIsQ0FDbEMsUUFBYTtRQUViLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdEQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDdkUsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3BFLENBQUM7SUFFTyxjQUFjLENBQUMsS0FBaUI7UUFDdkMsTUFBTSxXQUFXLEdBQXNCLEVBQUUsQ0FBQTtRQUN6QyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNoRyxPQUFPLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCLENBQy9CLFFBQWEsRUFDYixVQUFtQjtRQUVuQixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUU1RCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQTtRQUU5QyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDbkIsT0FBTyxJQUFJLENBQUMsTUFBTSxpREFFakIsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRU8sTUFBTSxDQUFJLElBQTBCO1FBQzNDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDekMsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksZ0JBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUVPLGNBQWMsQ0FBQyxLQUEyQjtRQUNqRCxRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsY0FBYztZQUNkLG9EQUE0QyxDQUFDLENBQUMsQ0FBQztnQkFDOUMsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUNsQixrQkFBa0IsRUFDbEIsMkdBQTJHLENBQzNHLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBdkpZLGtCQUFrQjtJQU01QixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLDBCQUEwQixDQUFBO0dBVGhCLGtCQUFrQixDQXVKOUI7O0FBRUQsaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsa0JBQWtCLG9DQUE0QixDQUFBIn0=