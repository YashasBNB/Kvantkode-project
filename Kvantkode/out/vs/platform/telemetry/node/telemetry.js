/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { join } from '../../../base/common/path.js';
import { Promises } from '../../../base/node/pfs.js';
export async function buildTelemetryMessage(appRoot, extensionsPath) {
    const mergedTelemetry = Object.create(null);
    // Simple function to merge the telemetry into one json object
    const mergeTelemetry = (contents, dirName) => {
        const telemetryData = JSON.parse(contents);
        mergedTelemetry[dirName] = telemetryData;
    };
    if (extensionsPath) {
        const dirs = [];
        const files = await Promises.readdir(extensionsPath);
        for (const file of files) {
            try {
                const fileStat = await fs.promises.stat(join(extensionsPath, file));
                if (fileStat.isDirectory()) {
                    dirs.push(file);
                }
            }
            catch {
                // This handles case where broken symbolic links can cause statSync to throw and error
            }
        }
        const telemetryJsonFolders = [];
        for (const dir of dirs) {
            const files = (await Promises.readdir(join(extensionsPath, dir))).filter((file) => file === 'telemetry.json');
            if (files.length === 1) {
                telemetryJsonFolders.push(dir); // // We know it contains a telemetry.json file so we add it to the list of folders which have one
            }
        }
        for (const folder of telemetryJsonFolders) {
            const contents = (await fs.promises.readFile(join(extensionsPath, folder, 'telemetry.json'))).toString();
            mergeTelemetry(contents, folder);
        }
    }
    let contents = (await fs.promises.readFile(join(appRoot, 'telemetry-core.json'))).toString();
    mergeTelemetry(contents, 'vscode-core');
    contents = (await fs.promises.readFile(join(appRoot, 'telemetry-extensions.json'))).toString();
    mergeTelemetry(contents, 'vscode-extensions');
    return JSON.stringify(mergedTelemetry, null, 4);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvbm9kZS90ZWxlbWV0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUVwRCxNQUFNLENBQUMsS0FBSyxVQUFVLHFCQUFxQixDQUMxQyxPQUFlLEVBQ2YsY0FBdUI7SUFFdkIsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUUzQyw4REFBOEQ7SUFDOUQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxRQUFnQixFQUFFLE9BQWUsRUFBRSxFQUFFO1FBQzVELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDMUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLGFBQWEsQ0FBQTtJQUN6QyxDQUFDLENBQUE7SUFFRCxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ3BCLE1BQU0sSUFBSSxHQUFhLEVBQUUsQ0FBQTtRQUV6QixNQUFNLEtBQUssR0FBRyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDcEQsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUM7Z0JBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7Z0JBQ25FLElBQUksUUFBUSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7b0JBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2hCLENBQUM7WUFDRixDQUFDO1lBQUMsTUFBTSxDQUFDO2dCQUNSLHNGQUFzRjtZQUN2RixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sb0JBQW9CLEdBQWEsRUFBRSxDQUFBO1FBQ3pDLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFDeEIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUN2RSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxLQUFLLGdCQUFnQixDQUNuQyxDQUFBO1lBQ0QsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN4QixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUEsQ0FBQyxrR0FBa0c7WUFDbEksQ0FBQztRQUNGLENBQUM7UUFFRCxLQUFLLE1BQU0sTUFBTSxJQUFJLG9CQUFvQixFQUFFLENBQUM7WUFDM0MsTUFBTSxRQUFRLEdBQUcsQ0FDaEIsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQzFFLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDWixjQUFjLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxRQUFRLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDNUYsY0FBYyxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUV2QyxRQUFRLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDOUYsY0FBYyxDQUFDLFFBQVEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO0lBRTdDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO0FBQ2hELENBQUMifQ==