/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { DEFAULT_TERMINAL_OSX, } from '../../common/externalTerminal.js';
import { LinuxExternalTerminalService, MacExternalTerminalService, WindowsExternalTerminalService, } from '../../node/externalTerminalService.js';
const mockConfig = Object.freeze({
    terminal: {
        explorerKind: 'external',
        external: {
            windowsExec: 'testWindowsShell',
            osxExec: 'testOSXShell',
            linuxExec: 'testLinuxShell',
        },
    },
});
suite('ExternalTerminalService', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test(`WinTerminalService - uses terminal from configuration`, (done) => {
        const testShell = 'cmd';
        const testCwd = 'path/to/workspace';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                strictEqual(command, testShell, 'shell should equal expected');
                strictEqual(args[args.length - 1], mockConfig.terminal.external.windowsExec);
                strictEqual(opts.cwd, testCwd);
                done();
                return {
                    on: (evt) => evt,
                };
            },
        };
        const testService = new WindowsExternalTerminalService();
        testService.spawnTerminal(mockSpawner, mockConfig.terminal.external, testShell, testCwd);
    });
    test(`WinTerminalService - uses default terminal when configuration.terminal.external.windowsExec is undefined`, (done) => {
        const testShell = 'cmd';
        const testCwd = 'path/to/workspace';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                strictEqual(args[args.length - 1], WindowsExternalTerminalService.getDefaultTerminalWindows());
                done();
                return {
                    on: (evt) => evt,
                };
            },
        };
        mockConfig.terminal.external.windowsExec = undefined;
        const testService = new WindowsExternalTerminalService();
        testService.spawnTerminal(mockSpawner, mockConfig.terminal.external, testShell, testCwd);
    });
    test(`WinTerminalService - cwd is correct regardless of case`, (done) => {
        const testShell = 'cmd';
        const testCwd = 'c:/foo';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                strictEqual(opts.cwd, 'C:/foo', "cwd should be uppercase regardless of the case that's passed in");
                done();
                return {
                    on: (evt) => evt,
                };
            },
        };
        const testService = new WindowsExternalTerminalService();
        testService.spawnTerminal(mockSpawner, mockConfig.terminal.external, testShell, testCwd);
    });
    test(`WinTerminalService - cmder should be spawned differently`, (done) => {
        const testShell = 'cmd';
        const testCwd = 'c:/foo';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                deepStrictEqual(args, ['C:/foo']);
                strictEqual(opts, undefined);
                done();
                return { on: (evt) => evt };
            },
        };
        const testService = new WindowsExternalTerminalService();
        testService.spawnTerminal(mockSpawner, { windowsExec: 'cmder' }, testShell, testCwd);
    });
    test(`WinTerminalService - windows terminal should open workspace directory`, (done) => {
        const testShell = 'wt';
        const testCwd = 'c:/foo';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                strictEqual(opts.cwd, 'C:/foo');
                done();
                return { on: (evt) => evt };
            },
        };
        const testService = new WindowsExternalTerminalService();
        testService.spawnTerminal(mockSpawner, mockConfig.terminal.external, testShell, testCwd);
    });
    test(`MacTerminalService - uses terminal from configuration`, (done) => {
        const testCwd = 'path/to/workspace';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                strictEqual(args[1], mockConfig.terminal.external.osxExec);
                done();
                return {
                    on: (evt) => evt,
                };
            },
        };
        const testService = new MacExternalTerminalService();
        testService.spawnTerminal(mockSpawner, mockConfig.terminal.external, testCwd);
    });
    test(`MacTerminalService - uses default terminal when configuration.terminal.external.osxExec is undefined`, (done) => {
        const testCwd = 'path/to/workspace';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                strictEqual(args[1], DEFAULT_TERMINAL_OSX);
                done();
                return {
                    on: (evt) => evt,
                };
            },
        };
        const testService = new MacExternalTerminalService();
        testService.spawnTerminal(mockSpawner, { osxExec: undefined }, testCwd);
    });
    test(`LinuxTerminalService - uses terminal from configuration`, (done) => {
        const testCwd = 'path/to/workspace';
        const mockSpawner = {
            spawn: (command, args, opts) => {
                strictEqual(command, mockConfig.terminal.external.linuxExec);
                strictEqual(opts.cwd, testCwd);
                done();
                return {
                    on: (evt) => evt,
                };
            },
        };
        const testService = new LinuxExternalTerminalService();
        testService.spawnTerminal(mockSpawner, mockConfig.terminal.external, testCwd);
    });
    test(`LinuxTerminalService - uses default terminal when configuration.terminal.external.linuxExec is undefined`, (done) => {
        LinuxExternalTerminalService.getDefaultTerminalLinuxReady().then((defaultTerminalLinux) => {
            const testCwd = 'path/to/workspace';
            const mockSpawner = {
                spawn: (command, args, opts) => {
                    strictEqual(command, defaultTerminalLinux);
                    done();
                    return {
                        on: (evt) => evt,
                    };
                },
            };
            mockConfig.terminal.external.linuxExec = undefined;
            const testService = new LinuxExternalTerminalService();
            testService.spawnTerminal(mockSpawner, mockConfig.terminal.external, testCwd);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVybmFsVGVybWluYWwvdGVzdC9lbGVjdHJvbi1tYWluL2V4dGVybmFsVGVybWluYWxTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDckQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsMEJBQTBCLEVBQzFCLDhCQUE4QixHQUM5QixNQUFNLHVDQUF1QyxDQUFBO0FBRTlDLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQWlDO0lBQ2hFLFFBQVEsRUFBRTtRQUNULFlBQVksRUFBRSxVQUFVO1FBQ3hCLFFBQVEsRUFBRTtZQUNULFdBQVcsRUFBRSxrQkFBa0I7WUFDL0IsT0FBTyxFQUFFLGNBQWM7WUFDdkIsU0FBUyxFQUFFLGdCQUFnQjtTQUMzQjtLQUNEO0NBQ0QsQ0FBQyxDQUFBO0FBRUYsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUNyQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyx1REFBdUQsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ3RFLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUN2QixNQUFNLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQTtRQUNuQyxNQUFNLFdBQVcsR0FBUTtZQUN4QixLQUFLLEVBQUUsQ0FBQyxPQUFZLEVBQUUsSUFBUyxFQUFFLElBQVMsRUFBRSxFQUFFO2dCQUM3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