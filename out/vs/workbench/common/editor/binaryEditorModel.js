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
import { EditorModel } from './editorModel.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { Mimes } from '../../../base/common/mime.js';
/**
 * An editor model that just represents a resource that can be loaded.
 */
let BinaryEditorModel = class BinaryEditorModel extends EditorModel {
    constructor(resource, name, fileService) {
        super();
        this.resource = resource;
        this.name = name;
        this.fileService = fileService;
        this.mime = Mimes.binary;
    }
    /**
     * The name of the binary resource.
     */
    getName() {
        return this.name;
    }
    /**
     * The size of the binary resource if known.
     */
    getSize() {
        return this.size;
    }
    /**
     * The mime of the binary resource if known.
     */
    getMime() {
        return this.mime;
    }
    /**
     * The etag of the binary resource if known.
     */
    getETag() {
        return this.etag;
    }
    async resolve() {
        // Make sure to resolve up to date stat for file resources
        if (this.fileService.hasProvider(this.resource)) {
            const stat = await this.fileService.stat(this.resource);
            this.etag = stat.etag;
            if (typeof stat.size === 'number') {
                this.size = stat.size;
            }
        }
        return super.resolve();
    }
};
BinaryEditorModel = __decorate([
    __param(2, IFileService)
], BinaryEditorModel);
export { BinaryEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmluYXJ5RWRpdG9yTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2VkaXRvci9iaW5hcnlFZGl0b3JNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFOUMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUVwRDs7R0FFRztBQUNJLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsV0FBVztJQU1qRCxZQUNVLFFBQWEsRUFDTCxJQUFZLEVBQ2YsV0FBMEM7UUFFeEQsS0FBSyxFQUFFLENBQUE7UUFKRSxhQUFRLEdBQVIsUUFBUSxDQUFLO1FBQ0wsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNFLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBUnhDLFNBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFBO0lBV3BDLENBQUM7SUFFRDs7T0FFRztJQUNILE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUE7SUFDakIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTztRQUNOLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQTtJQUNqQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxPQUFPO1FBQ04sT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFBO0lBQ2pCLENBQUM7SUFFRDs7T0FFRztJQUNILE9BQU87UUFDTixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUE7SUFDakIsQ0FBQztJQUVRLEtBQUssQ0FBQyxPQUFPO1FBQ3JCLDBEQUEwRDtRQUMxRCxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ2pELE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3ZELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQTtZQUNyQixJQUFJLE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFBO1lBQ3RCLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdkIsQ0FBQztDQUNELENBQUE7QUF0RFksaUJBQWlCO0lBUzNCLFdBQUEsWUFBWSxDQUFBO0dBVEYsaUJBQWlCLENBc0Q3QiJ9