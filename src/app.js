
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

import moment from 'moment';
import {createLogger} from '@natlibfi/melinda-backend-commons';
import createStateInterface, {statuses} from '@natlibfi/melinda-record-harvest-commons';
import {MARCXML} from '@natlibfi/marc-record-serializers';
import createOaiPmhClient from '@natlibfi/oai-pmh-client';

export default async ({harvestPeriod, url, metadataPrefix, set, logLevel, stateInterfaceOptions}) => {
  const oaiPmhClient = createOaiPmhClient({url, metadataPrefix, set, retrieveAll: false, filterDeleted: true});
  const logger = createLogger(logLevel);
  const {readState, writeState, handleQueues} = createStateInterface(stateInterfaceOptions);

  logger.log('info', `Starting melinda-record-harvest-harvester`);

  const {status, resumptionToken, timestamp} = await readState();

  await handleQueues();

  if (status === statuses.pending) {
    logger.log('info', resumptionToken ? `Resuming harvest. Cursor of last response: ${resumptionToken.cursor}` : 'Starting harvest');
    return harvest(resumptionToken);
  }

  if (status === statuses.done) {
    if (isHarvestDue()) {
      logger.log('info', 'Harvest is due');
      await writeState({status: statuses.pending});
      return harvest();
    }

    logger.info('Nothing to do. Exiting.');
    return;
  }

  logger.info('Nothing to do. Exiting.');

  function isHarvestDue() {
    const now = moment();
    const dumpAge = now.diff(timestamp);
    return dumpAge > harvestPeriod;
  }

  async function harvest(resumptionToken) {
    const {records, newToken} = await fetchRecords();

    if (newToken) {
      await writeState({resumptionToken: formatToken()}, records);
      logger.log('info', 'Harvesting more records');
      return harvest(newToken);
    }

    await writeState({status: statuses.done}, records);

    function formatToken() {
      return {token: newToken.token, cursor: newToken.cursor};
    }

    function fetchRecords() {
      return new Promise((resolve, reject) => {
        const promises = [];

        oaiPmhClient.listRecords({resumptionToken})
          .on('error', reject)
          .on('record', ({metadata}) => promises.push(MARCXML.from(metadata))) // eslint-disable-line functional/immutable-data
          .on('end', async newToken => {
            try {
              const records = await Promise.all(promises);
              resolve({records, newToken});
            } catch (err) {
              reject(err);
            }
          });
      });
    }
  }
};
