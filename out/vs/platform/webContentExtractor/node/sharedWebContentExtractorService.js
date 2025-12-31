/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
export class SharedWebContentExtractorService {
    async readImage(uri, token) {
        if (token.isCancellationRequested) {
            return undefined;
        }
        try {
            const response = await fetch(uri.toString(true), {
                headers: {
                    Accept: 'image/*',
                    'User-Agent': 'Mozilla/5.0',
                },
            });
            const contentType = response.headers.get('content-type');
            if (!response.ok ||
                !contentType?.startsWith('image/') ||
                !/(webp|jpg|jpeg|gif|png|bmp)$/i.test(contentType)) {
                return undefined;
            }
            const content = VSBuffer.wrap(await response.bytes());
            return content;
        }
        catch (err) {
            console.log(err);
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkV2ViQ29udGVudEV4dHJhY3RvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93ZWJDb250ZW50RXh0cmFjdG9yL25vZGUvc2hhcmVkV2ViQ29udGVudEV4dHJhY3RvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBS3pELE1BQU0sT0FBTyxnQ0FBZ0M7SUFHNUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFRLEVBQUUsS0FBd0I7UUFDakQsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQyxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDaEQsT0FBTyxFQUFFO29CQUNSLE1BQU0sRUFBRSxTQUFTO29CQUNqQixZQUFZLEVBQUUsYUFBYTtpQkFDM0I7YUFDRCxDQUFDLENBQUE7WUFDRixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUN4RCxJQUNDLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQ1osQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQztnQkFDbEMsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQ2pELENBQUM7Z0JBQ0YsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztZQUVELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUNyRCxPQUFPLE9BQU8sQ0FBQTtRQUNmLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNoQixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=