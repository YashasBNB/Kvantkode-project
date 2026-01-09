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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZXJuYWxUZXJtaW5hbC90ZXN0L2VsZWN0cm9uLW1haW4vZXh0ZXJuYWxUZXJtaW5hbFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUNOLDRCQUE0QixFQUM1QiwwQkFBMEIsRUFDMUIsOEJBQThCLEdBQzlCLE1BQU0sdUNBQXVDLENBQUE7QUFFOUMsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBaUM7SUFDaEUsUUFBUSxFQUFFO1FBQ1QsWUFBWSxFQUFFLFVBQVU7UUFDeEIsUUFBUSxFQUFFO1lBQ1QsV0FBVyxFQUFFLGtCQUFrQjtZQUMvQixPQUFPLEVBQUUsY0FBYztZQUN2QixTQUFTLEVBQUUsZ0JBQWdCO1NBQzNCO0tBQ0Q7Q0FDRCxDQUFDLENBQUE7QUFFRixLQUFLLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO0lBQ3JDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHVEQUF1RCxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDdEUsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFBO1FBQ3ZCLE1BQU0sT0FBTyxHQUFHLG1CQUFtQixDQUFBO1FBQ25DLE1BQU0sV0FBVyxHQUFRO1lBQ3hCLEtBQUssRUFBRSxDQUFDLE9BQVksRUFBRSxJQUFTLEVB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