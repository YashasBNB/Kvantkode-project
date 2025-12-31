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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L25vZGUvdGVsZW1ldHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFcEQsTUFBTSxDQUFDLEtBQUssVUFBVSxxQkFBcUIsQ0FDMUMsT0FBZSxFQUNmLGNBQXVCO0lBRXZCLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7SUFFM0MsOERBQThEO0lBQzlELE1BQU0sY0FBYyxHQUFHLENBQUMsUUFBZ0IsRUFBRSxPQUFlLEVBQUUsRUFBRTtRQUM1RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsR0FBRyxhQUFhLENBQUE7SUFDekMsQ0FBQyxDQUFBO0lBRUQsSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUNwQixNQUFNLElBQUksR0FBYSxFQUFFLENBQUE7UUFFekIsTUFBTSxLQUFLLEdBQUcsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ3BELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sUUFBUSxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO2dCQUNuRSxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO29CQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNoQixDQUFDO1lBQ0YsQ0FBQztZQUFDLE1BQU0sQ0FBQztnQkFDUixzRkFBc0Y7WUFDdkYsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLG9CQUFvQixHQUFhLEVBQUUsQ0FBQTtRQUN6QyxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3hCLE1BQU0sS0FBSyxHQUFHLENBQUMsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FDdkUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksS0FBSyxnQkFBZ0IsQ0FDbkMsQ0FBQTtZQUNELElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDeEIsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBLENBQUMsa0dBQWtHO1lBQ2xJLENBQUM7UUFDRixDQUFDO1FBRUQsS0FBSyxNQUFNLE1BQU0sSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzNDLE1BQU0sUUFBUSxHQUFHLENBQ2hCLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUMxRSxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ1osY0FBYyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNqQyxDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksUUFBUSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQzVGLGNBQWMsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFFdkMsUUFBUSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQzlGLGNBQWMsQ0FBQyxRQUFRLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtJQUU3QyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUNoRCxDQUFDIn0=