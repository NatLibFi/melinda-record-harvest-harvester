/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Record harvester microservice for Melinda
*
* Copyright (C) 2020 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-record-harvest-harvester
*
* melinda-record-harvest-harvester program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-record-harvest-harvester is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/

import humanInterval from 'human-interval';
import {readEnvironmentVariable} from '@natlibfi/melinda-backend-commons';

export const url = readEnvironmentVariable('URL');
export const harvestPeriod = readEnvironmentVariable('HARVEST_PERIOD', {format: humanInterval});

export const metadataPrefix = readEnvironmentVariable('METADATA_PREFIX', {defaultValue: 'marc21'});
export const set = readEnvironmentVariable('SET', {defaultValue: '', format: v => v || undefined});

export const logLevel = readEnvironmentVariable('LOG_LEVEL', {defaultValue: 'info'});

export const stateInterfaceOptions = {
  mongoUri: readEnvironmentVariable('MONGO_URI', {defaultValue: 'mongodb://localhost:27017/db'}),
  amqpUri: readEnvironmentVariable('AMQP_URI', {defaultValue: 'amqp://localhost:5672'})
};

/*
export const dumpRecordsOptions = {
  logLevel: logLevelArg,
  dumpDirectory: readEnvironmentVariable('DUMP_DIRECTORY', {defaultValue: 'dump'}),
  // 10 megabytes
  maxFileSize: readEnvironmentVariable('MAX_FILE_SIZE', {defaultValue: 100000000, format: v => Number(v)})
};*/
