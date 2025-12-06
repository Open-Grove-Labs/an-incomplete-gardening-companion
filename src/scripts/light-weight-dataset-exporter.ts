import fs from 'fs'
import plantNames from '../indices/plants.all.scientific-to-common-namesindex.json' with { type: "json" };
import zlib from 'zlib'

type LightDataSet = {
  [key: string]: {
    "f": string,
    "c": string[],
    "g": string,
    "s": string,
    "t": string[],
    "z": string[],
    "a": string[],
    "r": string[]
  }
}

const lightDataSet: LightDataSet = {}
for (const plant of Object.keys(plantNames)) {
  const plantData = (await import(`../plants/${plant}.json`, { with: { type: "json" } })).default

  lightDataSet[plantData.name] = {
    f: plantData.fullName,
    c: plantData.commonNames,
    g: plantData.genus,
    s: plantData.species,
    t: plantData['plant-type'],
    z: plantData['usda-plant-hardiness-zone'],
    a: plantData.attracts,
    r: plantData['resistance-to-challenges']
  }
}

zlib.gzip(JSON.stringify(lightDataSet), (err, buffer) => {
  if (err) {
    console.error('Error gzipping data:', err);
    return;
  }

  fs.writeFile('light-weight-data-set.json.gz', buffer, (err) => {
    if (err) {
        console.error('Error writing gzipped file:', err);
        return;
    }
    console.log('JSON data successfully gzipped and saved to light-weight-data-set.json.gz');
  });
});
