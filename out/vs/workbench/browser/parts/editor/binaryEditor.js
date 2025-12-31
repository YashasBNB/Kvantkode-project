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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5RWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2JpbmFyeUVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFckUsT0FBTyxFQUFFLGlCQUFpQixFQUE4QixNQUFNLHdCQUF3QixDQUFBO0FBT3RGOztHQUVHO0FBQ0ksSUFBZSx3QkFBd0IsR0FBdkMsTUFBZSx3QkFBeUIsU0FBUSxpQkFBaUI7SUFTdkUsWUFDQyxFQUFVLEVBQ1YsS0FBbUIsRUFDRixTQUF5QixFQUMxQyxnQkFBbUMsRUFDbkMsWUFBMkIsRUFDVixjQUErQjtRQUVoRCxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFML0MsY0FBUyxHQUFULFNBQVMsQ0FBZ0I7UUFYMUIseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDbEUsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQTtRQUU3QyxzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUMvRCxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO0lBYXhELENBQUM7SUFFUSxRQUFRO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUNyRixDQUFDO0lBRVMsS0FBSyxDQUFDLFdBQVcsQ0FDMUIsS0FBa0IsRUFDbEIsT0FBdUI7UUFFdkIsTUFBTSxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFbkMsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxDQUFDLEtBQUssWUFBWSxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7WUFDM0MsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1FBQ2pELENBQUM7UUFFRCxrQkFBa0I7UUFDbEIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzVCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXJGLE9BQU87WUFDTixJQUFJLEVBQUUsWUFBWTtZQUNsQixLQUFLLEVBQUUsUUFBUSxDQUNkLGFBQWEsRUFDYixnSEFBZ0gsQ0FDaEg7WUFDRCxPQUFPLEVBQUU7Z0JBQ1I7b0JBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDO29CQUM1QyxHQUFHLEVBQUUsS0FBSyxJQUFJLEVBQUU7d0JBQ2YsZ0JBQWdCO3dCQUNoQixNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTt3QkFFakQsc0VBQXNFO3dCQUN0RSxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUE7b0JBQzlCLENBQUM7aUJBQ0Q7YUFDRDtTQUNELENBQUE7SUFDRixDQUFDO0lBRU8scUJBQXFCLENBQUMsSUFBd0I7UUFDckQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7UUFFcEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFFRCxXQUFXO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7Q0FDRCxDQUFBO0FBckVxQix3QkFBd0I7SUFlM0MsV0FBQSxlQUFlLENBQUE7R0FmSSx3QkFBd0IsQ0FxRTdDIn0=