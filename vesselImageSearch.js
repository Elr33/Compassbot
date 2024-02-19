const { google } = require('googleapis');
const config = require('./config');

const customSearchEngineId = config.customSearchEngineId;
const googleApiKey = config.googleApiKey;
const googleClient = google.customsearch('v1');

async function searchVesselImage(imoNumber) {
  try {
    const response = await googleClient.cse.list({
      cx: customSearchEngineId,
      auth: googleApiKey,
      q: `IMO ${imoNumber} ship`,
      searchType: 'image',
    });

    const items = response.data.items;
    if (items && items.length > 0) {
      return items[0].link;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error searching vessel image:', error);
    throw error;
  }
}

module.exports = {
  searchVesselImage,
};
