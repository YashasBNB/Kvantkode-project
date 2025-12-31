/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../../base/common/arrays.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
export class DataTransferFileCache {
    constructor() {
        this.requestIdPool = 0;
        this.dataTransferFiles = new Map();
    }
    add(dataTransfer) {
        const requestId = this.requestIdPool++;
        this.dataTransferFiles.set(requestId, coalesce(Array.from(dataTransfer, ([, item]) => item.asFile())));
        return {
            id: requestId,
            dispose: () => {
                this.dataTransferFiles.delete(requestId);
            },
        };
    }
    async resolveFileData(requestId, dataItemId) {
        const files = this.dataTransferFiles.get(requestId);
        if (!files) {
            throw new Error('No data transfer found');
        }
        const file = files.find((file) => file.id === dataItemId);
        if (!file) {
            throw new Error('No matching file found in data transfer');
        }
        return VSBuffer.wrap(await file.data());
    }
    dispose() {
        this.dataTransferFiles.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YVRyYW5zZmVyQ2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9zaGFyZWQvZGF0YVRyYW5zZmVyQ2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUc1RCxNQUFNLE9BQU8scUJBQXFCO0lBQWxDO1FBQ1Msa0JBQWEsR0FBRyxDQUFDLENBQUE7UUFDUixzQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFHekMsQ0FBQTtJQWlDSixDQUFDO0lBL0JPLEdBQUcsQ0FBQyxZQUFxQztRQUMvQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDdEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FDekIsU0FBUyxFQUNULFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FDL0QsQ0FBQTtRQUNELE9BQU87WUFDTixFQUFFLEVBQUUsU0FBUztZQUNiLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUN6QyxDQUFDO1NBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZSxDQUFDLFNBQWlCLEVBQUUsVUFBa0I7UUFDMUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNuRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDMUMsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssVUFBVSxDQUFDLENBQUE7UUFDekQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFBO1FBQzNELENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0NBQ0QifQ==