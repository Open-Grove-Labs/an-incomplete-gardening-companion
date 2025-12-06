import pako from 'pako'
import FlexSearch from 'flexsearch';
import plantNames from '../indices/plants.all.scientific-to-common-namesindex.json' with { type: "json" };

const gzDataURL = 'https://google.com'

async function generateIndex() {
  const response = await fetch(gzDataURL);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const gzippedBuffer = await response.arrayBuffer();

  // const output = pako.deflate(input);
  // lightDataSet[plantData.name] = {
  //   "f": plantData.fullName,
  //   "c": plantData.commonNames,
  //   "g": plantData.genus,
  //   "s": plantData.species,
  //   "t": plantData['plant-type'],
  //   "z": plantData['usda-plant-hardiness-zone'],
  //   "a": plantData.attracts,
  //   "r": plantData['resistance-to-challenges']
  // }

  const index = new FlexSearch.Document({
    document: {
      id: "name",
      index: [
        "f",
        "c",
        "g",
        "s",
        "t",
        "z",
        "a",
        "r",
      ],
      store: true
    },
    tokenize: "forward"
  });

  for (const plant of Object.keys(plantNames)) {
    const plantData = (await import(`../plants/${plant}.json`, { with: { type: "json" } })).default
    index.add(plantData.name, plantData);
  }
}






// const exportIndex = () => {
//   index.export((key, data) => {
//     fs.writeFileSync(`./search-index-${key}.json`, data);
//   });
// }

// exportIndex()

// // Export all index data
// const exportedIndexData = await index.export();

