/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Melinda record harvester microservice
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
export const harvestPeriod = readEnvironmentVariable('HARVEST_PERIOD', {defaultValue: 'never', format: humanInterval});

export const metadataPrefix = readEnvironmentVariable('METADATA_PREFIX', {defaultValue: 'marc21'});
export const set = readEnvironmentVariable('SET', {defaultValue: '', format: v => v || undefined});

export const logLevel = readEnvironmentVariable('LOG_LEVEL', {defaultValue: 'info'});

export const stateInterfaceOptions = {
  db: {
    host: readEnvironmentVariable('DATABASE_HOST', {defaultValue: 'localhost'}),
    port: readEnvironmentVariable('DATABASE_PORT', {defaultValue: 3306, format: v => Number(v)}),
    connectionLimit: readEnvironmentVariable('DATABASE_CONNECTION_LIMIT', {defaultValue: 5, format: v => Number(v)}),
    database: readEnvironmentVariable('DATABASE_NAME'),
    username: readEnvironmentVariable('DATABASE_USERNAME'),
    password: readEnvironmentVariable('DATABASE_PASSWORD')
  }
};
