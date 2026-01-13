/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { env } from './process.js';
// Define the enumeration for Desktop Environments
var DesktopEnvironment;
(function (DesktopEnvironment) {
    DesktopEnvironment["UNKNOWN"] = "UNKNOWN";
    DesktopEnvironment["CINNAMON"] = "CINNAMON";
    DesktopEnvironment["DEEPIN"] = "DEEPIN";
    DesktopEnvironment["GNOME"] = "GNOME";
    DesktopEnvironment["KDE3"] = "KDE3";
    DesktopEnvironment["KDE4"] = "KDE4";
    DesktopEnvironment["KDE5"] = "KDE5";
    DesktopEnvironment["KDE6"] = "KDE6";
    DesktopEnvironment["PANTHEON"] = "PANTHEON";
    DesktopEnvironment["UNITY"] = "UNITY";
    DesktopEnvironment["XFCE"] = "XFCE";
    DesktopEnvironment["UKUI"] = "UKUI";
    DesktopEnvironment["LXQT"] = "LXQT";
})(DesktopEnvironment || (DesktopEnvironment = {}));
const kXdgCurrentDesktopEnvVar = 'XDG_CURRENT_DESKTOP';
const kKDESessionEnvVar = 'KDE_SESSION_VERSION';
export function getDesktopEnvironment() {
    const xdgCurrentDesktop = env[kXdgCurrentDesktopEnvVar];
    if (xdgCurrentDesktop) {
        const values = xdgCurrentDesktop
            .split(':')
            .map((value) => value.trim())
            .filter((value) => value.length > 0);
        for (const value of values) {
            switch (value) {
                case 'Unity': {
                    const desktopSessionUnity = env['DESKTOP_SESSION'];
                    if (desktopSessionUnity && desktopSessionUnity.includes('gnome-fallback')) {
                        return DesktopEnvironment.GNOME;
                    }
                    return DesktopEnvironment.UNITY;
                }
                case 'Deepin':
                    return DesktopEnvironment.DEEPIN;
                case 'GNOME':
                    return DesktopEnvironment.GNOME;
                case 'X-Cinnamon':
                    return DesktopEnvironment.CINNAMON;
                case 'KDE': {
                    const kdeSession = env[kKDESessionEnvVar];
                    if (kdeSession === '5') {
                        return DesktopEnvironment.KDE5;
                    }
                    if (kdeSession === '6') {
                        return DesktopEnvironment.KDE6;
                    }
                    return DesktopEnvironment.KDE4;
                }
                case 'Pantheon':
                    return DesktopEnvironment.PANTHEON;
                case 'XFCE':
                    return DesktopEnvironment.XFCE;
                case 'UKUI':
                    return DesktopEnvironment.UKUI;
                case 'LXQt':
                    return DesktopEnvironment.LXQT;
            }
        }
    }
    const desktopSession = env['DESKTOP_SESSION'];
    if (desktopSession) {
        switch (desktopSession) {
            case 'deepin':
                return DesktopEnvironment.DEEPIN;
            case 'gnome':
            case 'mate':
                return DesktopEnvironment.GNOME;
            case 'kde4':
            case 'kde-plasma':
                return DesktopEnvironment.KDE4;
            case 'kde':
                if (kKDESessionEnvVar in env) {
                    return DesktopEnvironment.KDE4;
                }
                return DesktopEnvironment.KDE3;
            case 'xfce':
            case 'xubuntu':
                return DesktopEnvironment.XFCE;
            case 'ukui':
                return DesktopEnvironment.UKUI;
        }
    }
    if ('GNOME_DESKTOP_SESSION_ID' in env) {
        return DesktopEnvironment.GNOME;
    }
    if ('KDE_FULL_SESSION' in env) {
        if (kKDESessionEnvVar in env) {
            return DesktopEnvironment.KDE4;
        }
        return DesktopEnvironment.KDE3;
    }
    return DesktopEnvironment.UNKNOWN;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVza3RvcEVudmlyb25tZW50SW5mby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vZGVza3RvcEVudmlyb25tZW50SW5mby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBRWxDLGtEQUFrRDtBQUNsRCxJQUFLLGtCQWNKO0FBZEQsV0FBSyxrQkFBa0I7SUFDdEIseUNBQW1CLENBQUE7SUFDbkIsMkNBQXFCLENBQUE7SUFDckIsdUNBQWlCLENBQUE7SUFDakIscUNBQWUsQ0FBQTtJQUNmLG1DQUFhLENBQUE7SUFDYixtQ0FBYSxDQUFBO0lBQ2IsbUNBQWEsQ0FBQTtJQUNiLG1DQUFhLENBQUE7SUFDYiwyQ0FBcUIsQ0FBQTtJQUNyQixxQ0FBZSxDQUFBO0lBQ2YsbUNBQWEsQ0FBQTtJQUNiLG1DQUFhLENBQUE7SUFDYixtQ0FBYSxDQUFBO0FBQ2QsQ0FBQyxFQWRJLGtCQUFrQixLQUFsQixrQkFBa0IsUUFjdEI7QUFFRCxNQUFNLHdCQUF3QixHQUFHLHFCQUFxQixDQUFBO0FBQ3RELE1BQU0saUJBQWlCLEdBQUcscUJBQXFCLENBQUE7QUFFL0MsTUFBTSxVQUFVLHFCQUFxQjtJQUNwQyxNQUFNLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO0lBQ3ZELElBQUksaUJBQWlCLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxpQkFBaUI7YUFDOUIsS0FBSyxDQUFDLEdBQUcsQ0FBQzthQUNWLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO2FBQzVCLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMs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