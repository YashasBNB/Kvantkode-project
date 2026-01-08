/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class UserActivityRegistry {
    constructor() {
        this.todo = [];
        this.add = (ctor) => {
            this.todo.push(ctor);
        };
    }
    take(userActivityService, instantiation) {
        this.add = (ctor) => instantiation.createInstance(ctor, userActivityService);
        this.todo.forEach(this.add);
        this.todo = [];
    }
}
export const userActivityRegistry = new UserActivityRegistry();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckFjdGl2aXR5UmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyQWN0aXZpdHkvY29tbW9uL3VzZXJBY3Rpdml0eVJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE1BQU0sb0JBQW9CO0lBQTFCO1FBQ1MsU0FBSSxHQUFpRSxFQUFFLENBQUE7UUFFeEUsUUFBRyxHQUFHLENBQUMsSUFBZ0UsRUFBRSxFQUFFO1lBQ2pGLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JCLENBQUMsQ0FBQTtJQU9GLENBQUM7SUFMTyxJQUFJLENBQUMsbUJBQXlDLEVBQUUsYUFBb0M7UUFDMUYsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0IsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUE7SUFDZixDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLG9CQUFvQixFQUFFLENBQUEifQ==