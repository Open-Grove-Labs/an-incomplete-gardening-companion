import fs from 'fs/promises'
import plantNames from '../indices/plants.all.scientific-to-common-namesindex.json' with { type: "json" };
import { gzip } from 'zlib'
import { promisify } from 'util'
import { LightPlantData } from '../types/plants';

const gzipAsync = promisify(gzip)

type LightDataSet = {
  [key: string]: LightPlantData
}

const zipper = async (data: unknown, fileName: string) => {
  try {
    const buffer = await gzipAsync(JSON.stringify(data))
    await fs.writeFile(fileName, buffer)
    console.log(`JSON data successfully gzipped and saved to ${fileName}`)
  } catch (err) {
    console.error(`Error gzipping/writing ${fileName}:`, err)
    throw err
  }
}

await fs.rm('public/zipped-plants', { recursive: true, force: true })
await fs.mkdir('public/zipped-plants', { recursive: true })

const lightDataSet: LightDataSet = {}
const zipPromises: Promise<void>[] = []

for (const plant of Object.keys(plantNames)) {
  const plantData = (await import(`../plants/${plant}.json`, { with: { type: "json" } })).default

  lightDataSet[plantData.name] = {
    ...(plantData['full-name'] && { f: plantData['full-name'] }),
    ...(plantData['common-names'] && { c: plantData['common-names'] }),
    ...(plantData.cultivars?.length && { cv: plantData.cultivars.map((c: { ['cultivar-name']: string }) => c['cultivar-name'])}),
    ...(plantData.genus && { g: plantData.genus }),
    ...(plantData.species && { sp: plantData.species }),
    ...(plantData['plant-type'] && { t: plantData['plant-type'] }),
    ...(plantData['usda-plant-hardiness-zone'] && { z: plantData['usda-plant-hardiness-zone'] }),
    ...(plantData.attracts && { a: plantData.attracts }),
    ...(plantData['resistance-to-challenges'] && { r: plantData['resistance-to-challenges'] }),
    ...(plantData.maintenance && { m: plantData.maintenance }),
    ...(plantData.light && { l: plantData.light }),
    ...((plantData['soil-texture'] || plantData['soil-type']) && { s: (plantData['soil-texture'] || plantData['soil-type']) }),
    ...(plantData['soil-ph'] && { ph: plantData['soil-ph'] }),
    ...(plantData['soil-drainage'] && { d: plantData['soil-drainage'] }),
    ...(plantData.problems && { p: plantData.problems }),
    ...(plantData['play-value'] && { v: plantData['play-value'] }),
    ...(plantData.tags && { tg: plantData.tags }),
  }

  // Queue up the zipping operation
  zipPromises.push(zipper(plantData, `public/zipped-plants/${plant}.gz`))
}

// Wait for all individual plant files to be zipped
await Promise.all(zipPromises)
console.log(`Finished zipping ${zipPromises.length} individual plant files`)

// Finally, zip the lightweight dataset
await zipper(lightDataSet, 'public/light-weight-data-set.json.gz')
