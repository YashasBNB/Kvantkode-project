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
import { localize } from '../../../../nls.js';
import { Emitter } from '../../../../base/common/event.js';
import { BinaryEditorModel } from '../../../common/editor/binaryEditorModel.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ByteSize } from '../../../../platform/files/common/files.js';
import { EditorPlaceholder } from './editorPlaceholder.js';
/*
 * This class is only intended to be subclassed and not instantiated.
 */
let BaseBinaryResourceEditor = class BaseBinaryResourceEditor extends EditorPlaceholder {
    constructor(id, group, callbacks, telemetryService, themeService, storageService) {
        super(id, group, telemetryService, themeService, storageService);
        this.callbacks = callbacks;
        this._onDidChangeMetadata = this._register(new Emitter());
        this.onDidChangeMetadata = this._onDidChangeMetadata.event;
        this._onDidOpenInPlace = this._register(new Emitter());
        this.onDidOpenInPlace = this._onDidOpenInPlace.event;
    }
    getTitle() {
        return this.input ? this.input.getName() : localize('binaryEditor', 'Binary Viewer');
    }
    async getContents(input, options) {
        const model = await input.resolve();
        // Assert Model instance
        if (!(model instanceof BinaryEditorModel)) {
            throw new Error('Unable to open file as binary');
        }
        // Update metadata
        const size = model.getSize();
        this.handleMetadataChanged(typeof size === 'number' ? ByteSize.formatSize(size) : '');
        return {
            icon: '$(warning)',
            label: localize('binaryError', 'The file is not displayed in the text editor because it is either binary or uses an unsupported text encoding.'),
            actions: [
                {
                    label: localize('openAnyway', 'Open Anyway'),
                    run: async () => {
                        // Open in place
                        await this.callbacks.openInternal(input, options);
                        // Signal to listeners that the binary editor has been opened in-place
                        this._onDidOpenInPlace.fire();
                    },
                },
            ],
        };
    }
    handleMetadataChanged(meta) {
        this.metadata = meta;
        this._onDidChangeMetadata.fire();
    }
    getMetadata() {
        return this.metadata;
    }
};
BaseBinaryResourceEditor = __decorate([
    __param(5, IStorageService)
], BaseBinaryResourceEditor);
export { BaseBinaryResourceEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5RWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvYmluYXJ5RWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFHL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQThCLE1BQU0sd0JBQXdCLENBQUE7QUFPdEY7O0dBRUc7QUFDSSxJQUFlLHdCQUF3QixHQUF2QyxNQUFlLHdCQUF5QixTQUFRLGlCQUFpQjtJQVN2RSxZQUNDLEVBQVUsRUFDVixLQUFtQixFQUNGLFNBQXlCLEVBQzFDLGdCQUFtQyxFQUNuQyxZQUEyQixFQUNWLGNBQStCO1FBRWhELEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUwvQyxjQUFTLEdBQVQsU0FBUyxDQUFnQjtRQVgxQix5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNsRSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBRTdDLHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQy9ELHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7SUFheEQsQ0FBQztJQUVRLFFBQVE7UUFDaEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFBO0lBQ3JGLENBQUM7SUFFUyxLQUFLLENBQUMsV0FBVyxDQUMxQixLQUFrQixFQUNsQixPQUF1QjtRQUV2QixNQUFNLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUVuQyx3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLENBQUMsS0FBSyxZQUFZLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztZQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUE7UUFDakQsQ0FBQztRQUVELGtCQUFrQjtRQUNsQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDNUIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFckYsT0FBTztZQUNOLElBQUksRUFBRSxZQUFZO1lBQ2xCLEtBQUssRUFBRSxRQUFRLENBQ2QsYUFBYSxFQUNiLGdIQUFnSCxDQUNoSDtZQUNELE9BQU8sRUFBRTtnQkFDUjtvQkFDQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUM7b0JBQzVDLEdBQUcsRUFBRSxLQUFLLElBQUksRUFBRTt3QkFDZixnQkFBZ0I7d0JBQ2hCLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO3dCQUVqRCxzRUFBc0U7d0JBQ3RFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtvQkFDOUIsQ0FBQztpQkFDRDthQUNEO1NBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxJQUF3QjtRQUNyRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtRQUVwQixJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDakMsQ0FBQztJQUVELFdBQVc7UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztDQUNELENBQUE7QUFyRXFCLHdCQUF3QjtJQWUzQyxXQUFBLGVBQWUsQ0FBQTtHQWZJLHdCQUF3QixDQXFFN0MifQ==