/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class LanguageDetectionWorkerHost {
    static { this.CHANNEL_NAME = 'languageDetectionWorkerHost'; }
    static getChannel(workerServer) {
        return workerServer.getChannel(LanguageDetectionWorkerHost.CHANNEL_NAME);
    }
    static setChannel(workerClient, obj) {
        workerClient.setChannel(LanguageDetectionWorkerHost.CHANNEL_NAME, obj);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VEZXRlY3Rpb25Xb3JrZXIucHJvdG9jb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9sYW5ndWFnZURldGVjdGlvbi9icm93c2VyL2xhbmd1YWdlRGV0ZWN0aW9uV29ya2VyLnByb3RvY29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE1BQU0sT0FBZ0IsMkJBQTJCO2FBQ2xDLGlCQUFZLEdBQUcsNkJBQTZCLENBQUE7SUFDbkQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUE4QjtRQUN0RCxPQUFPLFlBQVksQ0FBQyxVQUFVLENBQzdCLDJCQUEyQixDQUFDLFlBQVksQ0FDeEMsQ0FBQTtJQUNGLENBQUM7SUFDTSxNQUFNLENBQUMsVUFBVSxDQUN2QixZQUFtQyxFQUNuQyxHQUFnQztRQUVoQyxZQUFZLENBQUMsVUFBVSxDQUN0QiwyQkFBMkIsQ0FBQyxZQUFZLEVBQ3hDLEdBQUcsQ0FDSCxDQUFBO0lBQ0YsQ0FBQyJ9