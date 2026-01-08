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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmljZU1hY2hpbmVJZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZXJuYWxTZXJ2aWNlcy9jb21tb24vc2VydmljZU1hY2hpbmVJZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUtuRSxNQUFNLENBQUMsS0FBSyxVQUFVLG1CQUFtQixDQUN4QyxrQkFBdUMsRUFDdkMsV0FBeUIsRUFDekIsY0FBMkM7SUFFM0MsSUFBSSxJQUFJLEdBQWtCLGNBQWM7UUFDdkMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLG9DQUEyQixJQUFJLElBQUk7UUFDbEYsQ0FBQyxDQUFDLElBQUksQ0FBQTtJQUNQLElBQUksSUFBSSxFQUFFLENBQUM7UUFDVixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxJQUFJLENBQUM7UUFDSixNQUFNLFFBQVEsR0FBRyxNQUFNLFdBQVcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUN4RixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3ZDLElBQUksR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO0lBQ3BDLENBQUM7SUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ1osSUFBSSxHQUFHLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDWCxJQUFJLEdBQUcsWUFBWSxFQUFFLENBQUE7UUFDckIsSUFBSSxDQUFDO1lBQ0osTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixrQkFBa0IsQ0FBQyx3QkFBd0IsRUFDM0MsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FDekIsQ0FBQTtRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU07UUFDUCxDQUFDO0lBQ0YsQ0FBQztJQUVELGNBQWMsRUFBRSxLQUFLLENBQ3BCLDBCQUEwQixFQUMxQixJQUFJLG1FQUdKLENBQUE7SUFFRCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUMifQ==