/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../base/common/uri.js';
export function claudeConfigToServerDefinition(idPrefix, contents, cwd) {
    let parsed;
    try {
        parsed = JSON.parse(contents.toString());
    }
    catch {
        return;
    }
    return Object.entries(parsed.mcpServers).map(([name, server]) => {
        return {
            id: `${idPrefix}.${name}`,
            label: name,
            launch: server.url
                ? {
                    type: 2 /* McpServerTransportType.SSE */,
                    uri: URI.parse(server.url),
                    headers: [],
                }
                : {
                    type: 1 /* McpServerTransportType.Stdio */,
                    args: server.args || [],
                    command: server.command,
                    env: server.env || {},
                    envFile: undefined,
                    cwd,
                },
        };
    });
}
export class ClaudeDesktopMpcDiscoveryAdapter {
    constructor(remoteAuthority) {
        this.remoteAuthority = remoteAuthority;
        this.order = 400 /* McpCollectionSortOrder.Filesystem */;
        this.discoverySource = "claude-desktop" /* DiscoverySource.ClaudeDesktop */;
        this.id = `claude-desktop.${this.remoteAuthority}`;
    }
    getFilePath({ platform, winAppData, xdgHome, homedir, }) {
        if (platform === 3 /* Platform.Windows */) {
            const appData = winAppData || URI.joinPath(homedir, 'AppData', 'Roaming');
            return URI.joinPath(appData, 'Claude', 'claude_desktop_config.json');
        }
        else if (platform === 1 /* Platform.Mac */) {
            return URI.joinPath(homedir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
        }
        else {
            const configDir = xdgHome || URI.joinPath(homedir, '.config');
            return URI.joinPath(configDir, 'Claude', 'claude_desktop_config.json');
        }
    }
    adaptFile(contents, { homedir }) {
        return claudeConfigToServerDefinition(this.id, contents, homedir);
    }
}
export class WindsurfDesktopMpcDiscoveryAdapter extends ClaudeDesktopMpcDiscoveryAdapter {
    constructor(remoteAuthority) {
        super(remoteAuthority);
        this.discoverySource = "windsurf" /* DiscoverySource.Windsurf */;
        this.id = `windsurf.${this.remoteAuthority}`;
    }
    getFilePath({ homedir }) {
        return URI.joinPath(homedir, '.codeium', 'windsurf', 'mcp_config.json');
    }
}
export class CursorDesktopMpcDiscoveryAdapter extends ClaudeDesktopMpcDiscoveryAdapter {
    constructor(remoteAuthority) {
        super(remoteAuthority);
        this.discoverySource = "cursor-global" /* DiscoverySource.CursorGlobal */;
        this.id = `cursor.${this.remoteAuthority}`;
    }
    getFilePath({ homedir }) {
        return URI.joinPath(homedir, '.cursor', 'mcp.json');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTWNwRGlzY292ZXJ5QWRhcHRlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL2Rpc2NvdmVyeS9uYXRpdmVNY3BEaXNjb3ZlcnlBZGFwdGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFldkQsTUFBTSxVQUFVLDhCQUE4QixDQUFDLFFBQWdCLEVBQUUsUUFBa0IsRUFBRSxHQUFTO0lBQzdGLElBQUksTUFVSCxDQUFBO0lBRUQsSUFBSSxDQUFDO1FBQ0osTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUFDLE1BQU0sQ0FBQztRQUNSLE9BQU07SUFDUCxDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBZ0MsRUFBRTtRQUM3RixPQUFPO1lBQ04sRUFBRSxFQUFFLEdBQUcsUUFBUSxJQUFJLElBQUksRUFBRTtZQUN6QixLQUFLLEVBQUUsSUFBSTtZQUNYLE1BQU0sRUFBRSxNQUFNLENBQUMsR0FBRztnQkFDakIsQ0FBQyxDQUFDO29CQUNBLElBQUksb0NBQTRCO29CQUNoQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO29CQUMxQixPQUFPLEVBQUUsRUFBRTtpQkFDWDtnQkFDRixDQUFDLENBQUM7b0JBQ0EsSUFBSSxzQ0FBOEI7b0JBQ2xDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUU7b0JBQ3ZCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztvQkFDdkIsR0FBRyxFQUFFLE1BQU0sQ0FBQyxHQUFHLElBQUksRUFBRTtvQkFDckIsT0FBTyxFQUFFLFNBQVM7b0JBQ2xCLEdBQUc7aUJBQ0g7U0FDSCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsTUFBTSxPQUFPLGdDQUFnQztJQUs1QyxZQUE0QixlQUE4QjtRQUE5QixvQkFBZSxHQUFmLGVBQWUsQ0FBZTtRQUgxQyxVQUFLLCtDQUFvQztRQUN6QyxvQkFBZSx3REFBaUQ7UUFHL0UsSUFBSSxDQUFDLEVBQUUsR0FBRyxrQkFBa0IsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO0lBQ25ELENBQUM7SUFFRCxXQUFXLENBQUMsRUFDWCxRQUFRLEVBQ1IsVUFBVSxFQUNWLE9BQU8sRUFDUCxPQUFPLEdBQ2tCO1FBQ3pCLElBQUksUUFBUSw2QkFBcUIsRUFBRSxDQUFDO1lBQ25DLE1BQU0sT0FBTyxHQUFHLFVBQVUsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDekUsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtRQUNyRSxDQUFDO2FBQU0sSUFBSSxRQUFRLHlCQUFpQixFQUFFLENBQUM7WUFDdEMsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUNsQixPQUFPLEVBQ1AsU0FBUyxFQUNULHFCQUFxQixFQUNyQixRQUFRLEVBQ1IsNEJBQTRCLENBQzVCLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sU0FBUyxHQUFHLE9BQU8sSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUM3RCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO1FBQ3ZFLENBQUM7SUFDRixDQUFDO0lBRUQsU0FBUyxDQUNSLFFBQWtCLEVBQ2xCLEVBQUUsT0FBTyxFQUEyQjtRQUVwQyxPQUFPLDhCQUE4QixDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ2xFLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxrQ0FBbUMsU0FBUSxnQ0FBZ0M7SUFHdkYsWUFBWSxlQUE4QjtRQUN6QyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7UUFIRSxvQkFBZSw2Q0FBNEM7UUFJbkYsSUFBSSxDQUFDLEVBQUUsR0FBRyxZQUFZLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUM3QyxDQUFDO0lBRVEsV0FBVyxDQUFDLEVBQUUsT0FBTyxFQUEyQjtRQUN4RCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtJQUN4RSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZ0NBQWlDLFNBQVEsZ0NBQWdDO0lBR3JGLFlBQVksZUFBOEI7UUFDekMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBSEUsb0JBQWUsc0RBQWdEO1FBSXZGLElBQUksQ0FBQyxFQUFFLEdBQUcsVUFBVSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7SUFDM0MsQ0FBQztJQUVRLFdBQVcsQ0FBQyxFQUFFLE9BQU8sRUFBMkI7UUFDeEQsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDcEQsQ0FBQztDQUNEIn0=