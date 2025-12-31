/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
import { generateUuid, isUUID } from '../../../base/common/uuid.js';
export async function getServiceMachineId(environmentService, fileService, storageService) {
    let uuid = storageService
        ? storageService.get('storage.serviceMachineId', -1 /* StorageScope.APPLICATION */) || null
        : null;
    if (uuid) {
        return uuid;
    }
    try {
        const contents = await fileService.readFile(environmentService.serviceMachineIdResource);
        const value = contents.value.toString();
        uuid = isUUID(value) ? value : null;
    }
    catch (e) {
        uuid = null;
    }
    if (!uuid) {
        uuid = generateUuid();
        try {
            await fileService.writeFile(environmentService.serviceMachineIdResource, VSBuffer.fromString(uuid));
        }
        catch (error) {
            //noop
        }
    }
    storageService?.store('storage.serviceMachineId', uuid, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    return uuid;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZU1hY2hpbmVJZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVybmFsU2VydmljZXMvY29tbW9uL3NlcnZpY2VNYWNoaW5lSWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFLbkUsTUFBTSxDQUFDLEtBQUssVUFBVSxtQkFBbUIsQ0FDeEMsa0JBQXVDLEVBQ3ZDLFdBQXlCLEVBQ3pCLGNBQTJDO0lBRTNDLElBQUksSUFBSSxHQUFrQixjQUFjO1FBQ3ZDLENBQUMsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixvQ0FBMkIsSUFBSSxJQUFJO1FBQ2xGLENBQUMsQ0FBQyxJQUFJLENBQUE7SUFDUCxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ1YsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsSUFBSSxDQUFDO1FBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDeEYsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN2QyxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtJQUNwQyxDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNaLElBQUksR0FBRyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1gsSUFBSSxHQUFHLFlBQVksRUFBRSxDQUFBO1FBQ3JCLElBQUksQ0FBQztZQUNKLE1BQU0sV0FBVyxDQUFDLFNBQVMsQ0FDMUIsa0JBQWtCLENBQUMsd0JBQXdCLEVBQzNDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQ3pCLENBQUE7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNO1FBQ1AsQ0FBQztJQUNGLENBQUM7SUFFRCxjQUFjLEVBQUUsS0FBSyxDQUNwQiwwQkFBMEIsRUFDMUIsSUFBSSxtRUFHSixDQUFBO0lBRUQsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDIn0=