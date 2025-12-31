/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
export const IURITransformerService = createDecorator('IURITransformerService');
export class URITransformerService {
    constructor(delegate) {
        if (!delegate) {
            this.transformIncoming = (arg) => arg;
            this.transformOutgoing = (arg) => arg;
            this.transformOutgoingURI = (arg) => arg;
            this.transformOutgoingScheme = (arg) => arg;
        }
        else {
            this.transformIncoming = delegate.transformIncoming.bind(delegate);
            this.transformOutgoing = delegate.transformOutgoing.bind(delegate);
            this.transformOutgoingURI = delegate.transformOutgoingURI.bind(delegate);
            this.transformOutgoingScheme = delegate.transformOutgoingScheme.bind(delegate);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFVyaVRyYW5zZm9ybWVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RVcmlUcmFuc2Zvcm1lclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBT3pGLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUNsQyxlQUFlLENBQXlCLHdCQUF3QixDQUFDLENBQUE7QUFFbEUsTUFBTSxPQUFPLHFCQUFxQjtJQVFqQyxZQUFZLFFBQWdDO1FBQzNDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFBO1lBQ3JDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFBO1lBQ3JDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFBO1lBQ3hDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFBO1FBQzVDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDbEUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDbEUsSUFBSSxDQUFDLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDeEUsSUFBSSxDQUFDLHVCQUF1QixHQUFHLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDL0UsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9