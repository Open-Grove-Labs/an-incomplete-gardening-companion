import { hydrate, prerender as ssr } from "preact-iso";

// import { getAllCommonNames } from "./utilities/common-name-finder";
import "./style.css";
// import { useEffect, useState } from "preact/hooks";

export function App() {
  // const [commonPlantNames] = useState<Record<string,unknown>>(getAllCommonNames());
  // // const [selectedPlant, setSelectedPlant] = useState();
  // const [plantData, setPlantData] = useState<any>();

  // const handlePlantNameClick = async (event: MouseEvent) => {
  //   event.preventDefault();
  //   const target = event.target as HTMLElement
  //   if (target?.id) {
  //     const plant = await import(`./plants/${target.id}.json`);
  //     setPlantData(plant);
  //   }
  // };

  // const displayNameList = () => {
  //   return (
  //     <ul>
  //       {Object.keys(commonPlantNames).map((name) => (
  //         <li key={name}>
  //           <a
  //             id={name}
  //             onClick={handlePlantNameClick}
  //             href=""
  //           >
  //             {name}
  //           </a>
  //         </li>
  //       ))}
  //     </ul>
  //   );
  // };

  // function displayPlant() {
  //   if (!plantData) return null;

  //   const renderField = (label: string, value: string[] | string) => {
  //     if (!value) return null;
  //     if (Array.isArray(value) && value.length === 0) return null;

  //     return (
  //       <div className="plant-field">
  //         <strong>{label}:</strong>{" "}
  //         {Array.isArray(value) ? value.join(", ") : value}
  //       </div>
  //     );
  //   };

  //   const renderSection = (title: string, children: any) => {
  //     // Check if children has any content
  //     const hasContent = Array.isArray(children?.props?.children)
  //       ? children.props.children.some(
  //           (child: any) => child !== null && child !== false
  //         )
  //       : children?.props?.children !== null &&
  //         children?.props?.children !== false;

  //     if (!hasContent) return null;

  //     return (
  //       <div className="plant-section">
  //         <h3>{title}</h3>
  //         {children}
  //       </div>
  //     );
  //   };

  //   return (
  //     <div className="plant-detail">
  //       <button onClick={() => setPlantData(null)}>← Back to List</button>

  //       <h1>{plantData.fullName}</h1>
  //       {plantData.commonNames && plantData.commonNames.length > 0 && (
  //         <h2>{plantData.commonNames.join(", ")}</h2>
  //       )}

  //       {renderSection(
  //         "Basic Information",
  //         <>
  //           {renderField("Family", plantData.family)}
  //           {renderField("Genus", plantData.genus)}
  //           {renderField("Species", plantData.species)}
  //           {renderField("Life Cycle", plantData["life-cycle"])}
  //           {renderField("Plant Type", plantData["plant-type"])}
  //           {renderField("Origin", plantData["country-or-region-of-origin"])}
  //         </>
  //       )}

  //       {renderSection(
  //         "Growth Characteristics",
  //         <>
  //           {renderField("Dimensions", plantData.dimensions)}
  //           {renderField("Habit/Form", plantData["habit/form"])}
  //           {renderField("Growth Rate", plantData["growth-rate"])}
  //           {renderField("Texture", plantData.texture)}
  //           {renderField(
  //             "Woody Plant Leaf Characteristics",
  //             plantData["woody-plant-leaf-characteristics"]
  //           )}
  //         </>
  //       )}

  //       {renderSection(
  //         "Growing Conditions",
  //         <>
  //           {renderField(
  //             "USDA Hardiness Zones",
  //             plantData["usda-plant-hardiness-zone"]
  //           )}
  //           {renderField("Light Requirements", plantData.light)}
  //           {renderField("Soil pH", plantData["soil-ph"])}
  //           {renderField("Soil Drainage", plantData["soil-drainage"])}
  //           {renderField(
  //             "Available Space Needed",
  //             plantData["available-space-to-plant"]
  //           )}
  //         </>
  //       )}

  //       {renderSection(
  //         "Flowers",
  //         <>
  //           {renderField("Flower Color", plantData["flower-color"])}
  //           {renderField("Bloom Time", plantData["flower-bloom-time"])}
  //           {renderField("Flower Shape", plantData["flower-shape"])}
  //           {renderField("Flower Size", plantData["flower-size"])}
  //           {renderField("Flower Petals", plantData["flower-petals"])}
  //           {renderField("Inflorescence", plantData["flower-inflorescence"])}
  //           {renderField(
  //             "Value to Gardener",
  //             plantData["flower-value-to-gardener"]
  //           )}
  //           {renderField("Description", plantData["flower-description"])}
  //         </>
  //       )}

  //       {renderSection(
  //         "Foliage",
  //         <>
  //           {renderField("Leaf Color", plantData["leaf-color"])}
  //           {renderField("Leaf Type", plantData["leaf-type"])}
  //           {renderField("Leaf Arrangement", plantData["leaf-arrangement"])}
  //           {renderField("Leaf Shape", plantData["leaf-shape"])}
  //           {renderField("Leaf Margin", plantData["leaf-margin"])}
  //           {renderField("Leaf Length", plantData["leaf-length"])}
  //           {renderField("Leaf Width", plantData["leaf-width"])}
  //           {renderField("Hairs Present", plantData["hairs-present"])}
  //           {renderField("Description", plantData["leaf-description"])}
  //         </>
  //       )}

  //       {renderSection(
  //         "Stems",
  //         <>
  //           {renderField("Stem Color", plantData["stem-color"])}
  //           {renderField("Aromatic", plantData["stem-is-aromatic"])}
  //           {renderField("Description", plantData["stem-description"])}
  //         </>
  //       )}

  //       {renderSection(
  //         "Fruit",
  //         <>
  //           {renderField("Fruit Color", plantData["fruit-color"])}
  //           {renderField("Fruit Type", plantData["fruit-type"])}
  //           {renderField(
  //             "Display/Harvest Time",
  //             plantData["display/harvest-time"]
  //           )}
  //         </>
  //       )}

  //       {renderSection(
  //         "Landscape & Wildlife",
  //         <>
  //           {renderField("Maintenance", plantData.maintenance)}
  //           {renderField("Landscape Location", plantData["landscape-location"])}
  //           {renderField("Landscape Theme", plantData["landscape-theme"])}
  //           {renderField("Design Feature", plantData["design-feature"])}
  //           {renderField("Attracts", plantData.attracts)}
  //           {renderField("Wildlife Value", plantData["wildlife-value"])}
  //           {renderField("Play Value", plantData["play-value"])}
  //           {renderField("Resistance", plantData["resistance-to-challenges"])}
  //         </>
  //       )}

  //       {plantData.references &&
  //         plantData.references.length > 0 &&
  //         renderSection(
  //           "References",
  //           <div>
  //             {plantData.references.map((ref: any, idx: number) => (
  //               <div key={idx}>
  //                 <a href={ref.url} target="_blank" rel="noopener noreferrer">
  //                   {ref.url}
  //                 </a>
  //                 {ref.referenced && <span> ({ref.referenced})</span>}
  //               </div>
  //             ))}
  //           </div>
  //         )}
  //     </div>
  //   );
  // }

  // return <div>{plantData ? displayPlant() : displayNameList()}</div>;
  return <div></div>
}

if (typeof window !== "undefined") {
  hydrate(<App />, document.getElementById("app")!);
}

export async function prerender(data: any) {
  return await ssr(<App {...data} />);
}
