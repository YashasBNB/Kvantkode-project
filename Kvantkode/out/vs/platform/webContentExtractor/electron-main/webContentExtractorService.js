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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViQ29udGVudEV4dHJhY3RvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dlYkNvbnRlbnRFeHRyYWN0b3IvZWxlY3Ryb24tbWFpbi93ZWJDb250ZW50RXh0cmFjdG9yU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sVUFBVSxDQUFBO0FBR3hDLE9BQU8sRUFBVSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzdFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFPekQsTUFBTSxPQUFPLGdDQUFnQztJQUE3QztRQUdDLDhDQUE4QztRQUM5Qyw0REFBNEQ7UUFDcEQsYUFBUSxHQUFHLElBQUksT0FBTyxDQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLHNCQUFpQixHQUFHLElBQUksV0FBVyxFQUFjLENBQUE7UUFDeEMsbUJBQWMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUEsQ0FBQyx3QkFBd0I7SUFrRC9FLENBQUM7SUFoRFEsU0FBUyxDQUFDLEtBQWlCO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMxRCxDQUFDO0lBRUQsT0FBTyxDQUFDLElBQVc7UUFDbEIsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMzQixDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDdEYsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBUTtRQUN2QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzlDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNuQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFBO1lBQ3RCLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxhQUFhLENBQUM7WUFDN0IsS0FBSyxFQUFFLEdBQUc7WUFDVixNQUFNLEVBQUUsR0FBRztZQUNYLElBQUksRUFBRSxLQUFLO1lBQ1gsY0FBYyxFQUFFO2dCQUNmLFVBQVUsRUFBRSxLQUFLO2dCQUNqQixTQUFTLEVBQUUsSUFBSTtnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixLQUFLLEVBQUUsS0FBSzthQUNaO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDO1lBQ0osTUFBTSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUNyQyxHQUFHLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdEMsTUFBTSxNQUFNLEdBQXdCLE1BQU0sR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUM3RSw2QkFBNkIsQ0FDN0IsQ0FBQTtZQUNELE1BQU0sR0FBRyxHQUFHLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNqRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDeEUsT0FBTyxHQUFHLENBQUE7UUFDWCxDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDakIsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2QsQ0FBQztRQUNELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztDQUNEIn0=