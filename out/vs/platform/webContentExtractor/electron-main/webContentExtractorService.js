/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BrowserWindow } from 'electron';
import { convertToReadibleFormat } from './cdpAccessibilityDomain.js';
import { Limiter } from '../../../base/common/async.js';
import { ResourceMap } from '../../../base/common/map.js';
export class NativeWebContentExtractorService {
    constructor() {
        // Only allow 3 windows to be opened at a time
        // to avoid overwhelming the system with too many processes.
        this._limiter = new Limiter(3);
        this._webContentsCache = new ResourceMap();
        this._cacheDuration = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    }
    isExpired(entry) {
        return Date.now() - entry.timestamp > this._cacheDuration;
    }
    extract(uris) {
        if (uris.length === 0) {
            return Promise.resolve([]);
        }
        return Promise.all(uris.map((uri) => this._limiter.queue(() => this.doExtract(uri))));
    }
    async doExtract(uri) {
        const cached = this._webContentsCache.get(uri);
        if (cached) {
            if (this.isExpired(cached)) {
                this._webContentsCache.delete(uri);
            }
            else {
                return cached.content;
            }
        }
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            webPreferences: {
                javascript: false,
                offscreen: true,
                sandbox: true,
                webgl: false,
            },
        });
        try {
            await win.loadURL(uri.toString(true));
            win.webContents.debugger.attach('1.1');
            const result = await win.webContents.debugger.sendCommand('Accessibility.getFullAXTree');
            const str = convertToReadibleFormat(result.nodes);
            this._webContentsCache.set(uri, { content: str, timestamp: Date.now() });
            return str;
        }
        catch (err) {
            console.log(err);
        }
        finally {
            win.destroy();
        }
        return '';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViQ29udGVudEV4dHJhY3RvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93ZWJDb250ZW50RXh0cmFjdG9yL2VsZWN0cm9uLW1haW4vd2ViQ29udGVudEV4dHJhY3RvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUd4QyxPQUFPLEVBQVUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBT3pELE1BQU0sT0FBTyxnQ0FBZ0M7SUFBN0M7UUFHQyw4Q0FBOEM7UUFDOUMsNERBQTREO1FBQ3BELGFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBUyxDQUFDLENBQUMsQ0FBQTtRQUNqQyxzQkFBaUIsR0FBRyxJQUFJLFdBQVcsRUFBYyxDQUFBO1FBQ3hDLG1CQUFjLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFBLENBQUMsd0JBQXdCO0lBa0QvRSxDQUFDO0lBaERRLFNBQVMsQ0FBQyxLQUFpQjtRQUNsQyxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDMUQsQ0FBQztJQUVELE9BQU8sQ0FBQyxJQUFXO1FBQ2xCLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDM0IsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3RGLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQVE7UUFDdkIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM5QyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDbkMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQTtZQUN0QixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLElBQUksYUFBYSxDQUFDO1lBQzdCLEtBQUssRUFBRSxHQUFHO1lBQ1YsTUFBTSxFQUFFLEdBQUc7WUFDWCxJQUFJLEVBQUUsS0FBSztZQUNYLGNBQWMsRUFBRTtnQkFDZixVQUFVLEVBQUUsS0FBSztnQkFDakIsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsS0FBSyxFQUFFLEtBQUs7YUFDWjtTQUNELENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQztZQUNKLE1BQU0sR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7WUFDckMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sTUFBTSxHQUF3QixNQUFNLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FDN0UsNkJBQTZCLENBQzdCLENBQUE7WUFDRCxNQUFNLEdBQUcsR0FBRyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDakQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3hFLE9BQU8sR0FBRyxDQUFBO1FBQ1gsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLENBQUM7Z0JBQVMsQ0FBQztZQUNWLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNkLENBQUM7UUFDRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7Q0FDRCJ9