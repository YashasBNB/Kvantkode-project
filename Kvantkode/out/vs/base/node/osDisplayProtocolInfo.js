/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { constants as FSConstants, promises as FSPromises } from 'fs';
import { join } from '../common/path.js';
import { env } from '../common/process.js';
const XDG_SESSION_TYPE = 'XDG_SESSION_TYPE';
const WAYLAND_DISPLAY = 'WAYLAND_DISPLAY';
const XDG_RUNTIME_DIR = 'XDG_RUNTIME_DIR';
var DisplayProtocolType;
(function (DisplayProtocolType) {
    DisplayProtocolType["Wayland"] = "wayland";
    DisplayProtocolType["XWayland"] = "xwayland";
    DisplayProtocolType["X11"] = "x11";
    DisplayProtocolType["Unknown"] = "unknown";
})(DisplayProtocolType || (DisplayProtocolType = {}));
export async function getDisplayProtocol(errorLogger) {
    const xdgSessionType = env[XDG_SESSION_TYPE];
    if (xdgSessionType) {
        // If XDG_SESSION_TYPE is set, return its value if it's either 'wayland' or 'x11'.
        // We assume that any value other than 'wayland' or 'x11' is an error or unexpected,
        // hence 'unknown' is returned.
        return xdgSessionType === "wayland" /* DisplayProtocolType.Wayland */ ||
            xdgSessionType === "x11" /* DisplayProtocolType.X11 */
            ? xdgSessionType
            : "unknown" /* DisplayProtocolType.Unknown */;
    }
    else {
        const waylandDisplay = env[WAYLAND_DISPLAY];
        if (!waylandDisplay) {
            // If WAYLAND_DISPLAY is empty, then the session is x11.
            return "x11" /* DisplayProtocolType.X11 */;
        }
        else {
            const xdgRuntimeDir = env[XDG_RUNTIME_DIR];
            if (!xdgRuntimeDir) {
                // If XDG_RUNTIME_DIR is empty, then the session can only be guessed.
                return "unknown" /* DisplayProtocolType.Unknown */;
            }
            else {
                // Check for the presence of the file $XDG_RUNTIME_DIR/wayland-0.
                const waylandServerPipe = join(xdgRuntimeDir, 'wayland-0');
                try {
                    await FSPromises.access(waylandServerPipe, FSConstants.R_OK);
                    // If the file exists, then the session is wayland.
                    return "wayland" /* DisplayProtocolType.Wayland */;
                }
                catch (err) {
                    // If the file does not exist or an error occurs, we guess 'unknown'
                    // since WAYLAND_DISPLAY was set but no wayland-0 pipe could be confirmed.
                    errorLogger(err);
                    return "unknown" /* DisplayProtocolType.Unknown */;
                }
            }
        }
    }
}
export function getCodeDisplayProtocol(displayProtocol, ozonePlatform) {
    if (!ozonePlatform) {
        return displayProtocol === "wayland" /* DisplayProtocolType.Wayland */
            ? "xwayland" /* DisplayProtocolType.XWayland */
            : "x11" /* DisplayProtocolType.X11 */;
    }
    else {
        switch (ozonePlatform) {
            case 'auto':
                return displayProtocol;
            case 'x11':
                return displayProtocol === "wayland" /* DisplayProtocolType.Wayland */
                    ? "xwayland" /* DisplayProtocolType.XWayland */
                    : "x11" /* DisplayProtocolType.X11 */;
            case 'wayland':
                return "wayland" /* DisplayProtocolType.Wayland */;
            default:
                return "unknown" /* DisplayProtocolType.Unknown */;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3NEaXNwbGF5UHJvdG9jb2xJbmZvLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvb3NEaXNwbGF5UHJvdG9jb2xJbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLElBQUksV0FBVyxFQUFFLFFBQVEsSUFBSSxVQUFVLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDckUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ3hDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUUxQyxNQUFNLGdCQUFnQixHQUFHLGtCQUFrQixDQUFBO0FBQzNDLE1BQU0sZUFBZSxHQUFHLGlCQUFpQixDQUFBO0FBQ3pDLE1BQU0sZUFBZSxHQUFHLGlCQUFpQixDQUFBO0FBRXpDLElBQVcsbUJBS1Y7QUFMRCxXQUFXLG1CQUFtQjtJQUM3QiwwQ0FBbUIsQ0FBQTtJQUNuQiw0Q0FBcUIsQ0FBQTtJQUNyQixrQ0FBVyxDQUFBO0lBQ1gsMENBQW1CLENBQUE7QUFDcEIsQ0FBQyxFQUxVLG1CQUFtQixLQUFuQixtQkFBbUIsUUFLN0I7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLGtCQUFrQixDQUN2QyxXQUFpQztJQUVqQyxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUU1QyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ3BCLGtGQUFrRjtRQUNsRixvRkFBb0Y7UUFDcEYsK0JBQStCO1FBQy9CLE9BQU8sY0FBYyxnREFBZ0M7WUFDcEQsY0FBYyx3Q0FBNEI7WUFDMUMsQ0FBQyxDQUFDLGNBQWM7WUFDaEIsQ0FBQyw0Q0FBNEIsQ0FBQTtJQUMvQixDQUFDO1NBQU0sQ0FBQztRQUNQLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUUzQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDckIsd0RBQXdEO1lBQ3hELDJDQUE4QjtRQUMvQixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUUxQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3BCLHFFQUFxRTtnQkFDckUsbURBQWtDO1lBQ25DLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxpRUFBaUU7Z0JBQ2pFLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQTtnQkFFMUQsSUFBSSxDQUFDO29CQUNKLE1BQU0sVUFBVSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBRTVELG1EQUFtRDtvQkFDbkQsbURBQWtDO2dCQUNuQyxDQUFDO2dCQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7b0JBQ2Qsb0VBQW9FO29CQUNwRSwwRUFBMEU7b0JBQzFFLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDaEIsbURBQWtDO2dCQUNuQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxzQkFBc0IsQ0FDckMsZUFBb0MsRUFDcEMsYUFBaUM7SUFFakMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sZUFBZSxnREFBZ0M7WUFDckQsQ0FBQztZQUNELENBQUMsb0NBQXdCLENBQUE7SUFDM0IsQ0FBQztTQUFNLENBQUM7UUFDUCxRQUFRLGFBQWEsRUFBRSxDQUFDO1lBQ3ZCLEtBQUssTUFBTTtnQkFDVixPQUFPLGVBQWUsQ0FBQTtZQUN2QixLQUFLLEtBQUs7Z0JBQ1QsT0FBTyxlQUFlLGdEQUFnQztvQkFDckQsQ0FBQztvQkFDRCxDQUFDLG9DQUF3QixDQUFBO1lBQzNCLEtBQUssU0FBUztnQkFDYixtREFBa0M7WUFDbkM7Z0JBQ0MsbURBQWtDO1FBQ3BDLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQyJ9