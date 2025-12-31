/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Server } from '../../../../base/parts/ipc/node/ipc.cp.js';
import { TelemetryAppenderChannel } from '../../../../platform/telemetry/common/telemetryIpc.js';
import { OneDataSystemAppender } from '../../../../platform/telemetry/node/1dsAppender.js';
const appender = new OneDataSystemAppender(undefined, false, process.argv[2], JSON.parse(process.argv[3]), process.argv[4]);
process.once('exit', () => appender.flush());
const channel = new TelemetryAppenderChannel([appender]);
const server = new Server('telemetry');
server.registerChannel('telemetryAppender', channel);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5QXBwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvbm9kZS90ZWxlbWV0cnlBcHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRTFGLE1BQU0sUUFBUSxHQUFHLElBQUkscUJBQXFCLENBQ3pDLFNBQVMsRUFDVCxLQUFLLEVBQ0wsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDZixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDM0IsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDZixDQUFBO0FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7QUFFNUMsTUFBTSxPQUFPLEdBQUcsSUFBSSx3QkFBd0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7QUFDeEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUE7QUFDdEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxPQUFPLENBQUMsQ0FBQSJ9