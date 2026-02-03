import { hydrate, prerender as ssr } from "preact-iso";
import { useEffect, useState } from "preact/hooks";
import * as pako from "pako";
import { Index } from "flexsearch";
import "./style.css";
import { LightPlantData } from "./types/plants";

type LightDataSet = {
  [key: string]: LightPlantData;
};

type FullPlantData = {
  [key: string]: any;
};

export function App() {
  const [plants, setPlants] = useState<LightDataSet | null>(null);
  const [searchIndex, setSearchIndex] = useState<Index | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<FullPlantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());
  const [selectedLights, setSelectedLights] = useState<Set<string>>(new Set());
  const [selectedMaintenance, setSelectedMaintenance] = useState<Set<string>>(new Set());
  const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadData() {
      try {
        console.log("Fetching compressed data...");
        const response = await fetch("/light-weight-data-set.json.gz");
        if (!response.ok) throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        
        console.log("Response headers:", Object.fromEntries(response.headers.entries()));
        const compressed = await response.arrayBuffer();
        console.log("Received data size:", compressed.byteLength);
        
        let jsonString: string;
        try {
          // Try to decompress with pako
          console.log("Attempting to decompress...");
          jsonString = pako.ungzip(new Uint8Array(compressed), { to: "string" });
          console.log("Decompressed size:", jsonString.length);
        } catch (err) {
          // If decompression fails, the server might have already decompressed it
          console.log("Decompression failed, treating as plain JSON:", err);
          const decoder = new TextDecoder();
          jsonString = decoder.decode(compressed);
        }
        
        console.log("Parsing JSON...");
        const data = JSON.parse(jsonString) as LightDataSet;
        console.log("Plants loaded:", Object.keys(data).length);
        
        setPlants(data);
        
        // Create FlexSearch index
        console.log("Building search index...");
        const index = new Index({
          tokenize: "forward",
          cache: true,
        });
        
        Object.entries(data).forEach(([name, plant]) => {
          const searchableText = [
            name,
            plant.f,
            ...(plant.c || []),
            plant.g,
            plant.sp,
            plant.s,
            plant.d,
            plant.p,
            plant.a,
            plant.r,
            plant.v
          ].filter(Boolean).join(" ");
          
          index.add(name, searchableText);
        });
        
        setSearchIndex(index);
        console.log("Search index built");
        
        // Initialize all filters as checked
        const types = new Set(Object.values(data).flatMap((p) => p.t || []));
        const zones = new Set(Object.values(data).flatMap((p) => p.z || []));
        const lights = new Set(Object.values(data).flatMap((p) => p.l || []));
        const maintenance = new Set(Object.values(data).flatMap((p) => {
          if (!p.m) return [];
          return Array.isArray(p.m) ? p.m : [p.m];
        }));
        
        setSelectedTypes(types);
        setSelectedZones(zones);
        setSelectedLights(lights);
        setSelectedMaintenance(maintenance);
        
        setLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const loadPlantDetail = async (plantName: string) => {
    try {
      const response = await fetch(`/zipped-plants/${plantName}.gz`);
      if (!response.ok) throw new Error("Failed to load plant details");
      
      const compressed = await response.arrayBuffer();
      let jsonString: string;
      try {
        jsonString = pako.ungzip(new Uint8Array(compressed), { to: "string" });
      } catch {
        const decoder = new TextDecoder();
        jsonString = decoder.decode(compressed);
      }
      
      const plantData = JSON.parse(jsonString);
      setSelectedPlant(plantData);
    } catch (err) {
      console.error("Error loading plant detail:", err);
      alert("Failed to load plant details");
    }
  };

  const filteredPlants = plants
    ? Object.entries(plants).filter(([name, plant]) => {
        // Use FlexSearch for text search
        const matchesSearch = !searchTerm || (searchIndex && searchIndex.search(searchTerm).includes(name));

        const matchesType = plant.t?.some(t => selectedTypes.has(t)) ?? false;
        const matchesZone = plant.z?.some(z => selectedZones.has(z)) ?? false;
        const matchesLight = plant.l?.some(l => selectedLights.has(l)) ?? false;
        const matchesMaintenance = plant.m 
          ? (Array.isArray(plant.m) 
              ? plant.m.some(m => selectedMaintenance.has(m))
              : selectedMaintenance.has(plant.m))
          : false;
        // Problems filter: if none selected, only show plants with no problems; if some selected, show plants with those problems
        const matchesProblems = selectedProblems.size === 0 
          ? (!plant.p || plant.p.length === 0)  // No problems selected: only show plants without problems
          : plant.p?.some(p => selectedProblems.has(p)) || false;  // Problems selected: show plants with those problems

        return matchesSearch && matchesType && matchesZone && matchesLight && matchesMaintenance && matchesProblems;
      })
    : [];

  // Get unique values for filters
  const allTypes = plants
    ? [...new Set(Object.values(plants).flatMap((p) => p.t || []))].sort()
    : [];
  const allZones = plants
    ? [...new Set(Object.values(plants).flatMap((p) => p.z || []))].sort((a, b) => {
        // Extract number and letter parts (e.g., "13b" -> 13 and "b")
        const aMatch = a.match(/^(\d+)([a-z]?)$/i);
        const bMatch = b.match(/^(\d+)([a-z]?)$/i);
        if (!aMatch || !bMatch) return 0;
        
        const aNum = parseInt(aMatch[1]);
        const bNum = parseInt(bMatch[1]);
        const aLetter = aMatch[2] || '';
        const bLetter = bMatch[2] || '';
        
        // Sort by number ascending, then by letter ascending
        if (aNum !== bNum) return aNum - bNum;
        return aLetter.localeCompare(bLetter);
      })
    : [];
  const allLights = plants
    ? [...new Set(Object.values(plants).flatMap((p) => p.l || []))].sort()
    : [];
  const allMaintenance = plants
    ? [...new Set(Object.values(plants).flatMap((p) => {
        if (!p.m) return [];
        return Array.isArray(p.m) ? p.m : [p.m];
      }))].sort()
    : [];
  const allProblems = plants
    ? [...new Set(Object.values(plants).flatMap((p) => p.p || []))].sort()
    : [];

  const toggleFilter = (set: Set<string>, setter: (s: Set<string>) => void, value: string) => {
    const newSet = new Set(set);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setter(newSet);
  };

  const selectAllFilter = (setter: (s: Set<string>) => void, values: string[]) => {
    setter(new Set(values));
  };

  const clearAllFilter = (setter: (s: Set<string>) => void) => {
    setter(new Set());
  };

  const formatZoneRange = (zones: string[] | undefined): string => {
    if (!zones || zones.length === 0) return "-";
    if (zones.length === 1) return zones[0];
    
    // Sort zones to find min and max
    const sorted = [...zones].sort((a, b) => {
      const aMatch = a.match(/^(\d+)([a-z]?)$/i);
      const bMatch = b.match(/^(\d+)([a-z]?)$/i);
      if (!aMatch || !bMatch) return 0;
      
      const aNum = parseInt(aMatch[1]);
      const bNum = parseInt(bMatch[1]);
      const aLetter = aMatch[2] || '';
      const bLetter = bMatch[2] || '';
      
      if (aNum !== bNum) return aNum - bNum;
      return aLetter.localeCompare(bLetter);
    });
    
    return `${sorted[0]} - ${sorted[sorted.length - 1]}`;
  };

  const formatLight = (lights: string[] | undefined): string => {
    if (!lights || lights.length === 0) return "-";
    
    const shortened = lights.map(light => {
      const lower = light.toLowerCase();
      if (lower.includes("full sun") || lower.includes("full sunlight")) return "Full";
      if (lower.includes("partial")) return "Partial";
      if (lower.includes("dappled")) return "Dappled";
      if (lower.includes("shade") || lower.includes("shaded")) return "Shade";
      return light; // fallback to original if no match
    });
    
    // Remove duplicates and join
    return [...new Set(shortened)].join(", ");
  };

  if (loading) return <div className="loading">Loading plant data...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  if (selectedPlant) {
    return (
      <div className="app">
        <button onClick={() => setSelectedPlant(null)} className="back-btn">← Back to List</button>
        <div className="plant-detail">
          <h1>{selectedPlant.fullName}</h1>
          {selectedPlant.commonNames && selectedPlant.commonNames.length > 0 && (
            <h2 className="common-names">{selectedPlant.commonNames.join(", ")}</h2>
          )}
          
          {selectedPlant.genus && (
            <div className="section">
              <h3>Classification</h3>
              <p><strong>Family:</strong> {selectedPlant.family || "-"}</p>
              <p><strong>Genus:</strong> {selectedPlant.genus}</p>
              <p><strong>Species:</strong> {selectedPlant.species || "-"}</p>
            </div>
          )}
          
          {selectedPlant["plant-type"] && (
            <div className="section">
              <h3>Plant Type</h3>
              <p>{selectedPlant["plant-type"].join(", ")}</p>
            </div>
          )}
          
          {selectedPlant.dimensions && (
            <div className="section">
              <h3>Size</h3>
              {selectedPlant.dimensions.map((dim: string, i: number) => <p key={i}>{dim}</p>)}
            </div>
          )}
          
          {selectedPlant["usda-plant-hardiness-zone"] && (
            <div className="section">
              <h3>Hardiness Zones</h3>
              <p>{selectedPlant["usda-plant-hardiness-zone"].join(", ")}</p>
            </div>
          )}
          
          {selectedPlant.light && (
            <div className="section">
              <h3>Light Requirements</h3>
              {selectedPlant.light.map((l: string, i: number) => <p key={i}>{l}</p>)}
            </div>
          )}
          
          {selectedPlant.maintenance && (
            <div className="section">
              <h3>Maintenance</h3>
              <p>{selectedPlant.maintenance}</p>
            </div>
          )}
          
          {selectedPlant["soil-ph"] && (
            <div className="section">
              <h3>Soil pH</h3>
              <p>{selectedPlant["soil-ph"].join(", ")}</p>
            </div>
          )}
          
          {selectedPlant["soil-drainage"] && (
            <div className="section">
              <h3>Soil Drainage</h3>
              <p>{selectedPlant["soil-drainage"].join(", ")}</p>
            </div>
          )}
          
          {selectedPlant["flower-color"] && (
            <div className="section">
              <h3>Flowers</h3>
              <p><strong>Color:</strong> {selectedPlant["flower-color"].join(", ")}</p>
              {selectedPlant["flower-bloom-time"] && (
                <p><strong>Bloom Time:</strong> {selectedPlant["flower-bloom-time"].join(", ")}</p>
              )}
              {selectedPlant["flower-description"] && (
                <p>{selectedPlant["flower-description"].join(" ")}</p>
              )}
            </div>
          )}
          
          {selectedPlant.attracts && (
            <div className="section">
              <h3>Wildlife</h3>
              <p><strong>Attracts:</strong> {selectedPlant.attracts.join(", ")}</p>
              {selectedPlant["wildlife-value"] && (
                <p>{selectedPlant["wildlife-value"].join(" ")}</p>
              )}
            </div>
          )}
          
          {selectedPlant["resistance-to-challenges"] && (
            <div className="section">
              <h3>Tolerances</h3>
              <p>{selectedPlant["resistance-to-challenges"].join(", ")}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>An Incomplete Gardening Companion</h1>
      
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search plants..."
          value={searchTerm}
          onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
          className="search-input"
        />
      </div>

      <div className="filter-groups">
        <div className="filter-group">
          <div className="filter-header">
            <h3>Plant Type</h3>
            <div className="filter-actions">
              <button onClick={() => selectAllFilter(setSelectedTypes, allTypes)}>All</button>
              <button onClick={() => clearAllFilter(setSelectedTypes)}>None</button>
            </div>
          </div>
          <div className="filter-checkboxes">
            {allTypes.map((type) => (
              <label key={type}>
                <input
                  type="checkbox"
                  checked={selectedTypes.has(type)}
                  onChange={() => toggleFilter(selectedTypes, setSelectedTypes, type)}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-header">
            <h3>Hardiness Zone</h3>
            <div className="filter-actions">
              <button onClick={() => selectAllFilter(setSelectedZones, allZones)}>All</button>
              <button onClick={() => clearAllFilter(setSelectedZones)}>None</button>
            </div>
          </div>
          <div className="filter-checkboxes">
            {allZones.map((zone) => (
              <label key={zone}>
                <input
                  type="checkbox"
                  checked={selectedZones.has(zone)}
                  onChange={() => toggleFilter(selectedZones, setSelectedZones, zone)}
                />
                Zone {zone}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-header">
            <h3>Light Requirements</h3>
            <div className="filter-actions">
              <button onClick={() => selectAllFilter(setSelectedLights, allLights)}>All</button>
              <button onClick={() => clearAllFilter(setSelectedLights)}>None</button>
            </div>
          </div>
          <div className="filter-checkboxes">
            {allLights.map((light) => (
              <label key={light}>
                <input
                  type="checkbox"
                  checked={selectedLights.has(light)}
                  onChange={() => toggleFilter(selectedLights, setSelectedLights, light)}
                />
                {light}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-header">
            <h3>Maintenance</h3>
            <div className="filter-actions">
              <button onClick={() => selectAllFilter(setSelectedMaintenance, allMaintenance)}>All</button>
              <button onClick={() => clearAllFilter(setSelectedMaintenance)}>None</button>
            </div>
          </div>
          <div className="filter-checkboxes">
            {allMaintenance.map((maint) => (
              <label key={maint}>
                <input
                  type="checkbox"
                  checked={selectedMaintenance.has(maint)}
                  onChange={() => toggleFilter(selectedMaintenance, setSelectedMaintenance, maint)}
                />
                {maint}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-header">
            <h3>Problems</h3>
            <div className="filter-actions">
              <button onClick={() => selectAllFilter(setSelectedProblems, allProblems)}>All</button>
              <button onClick={() => clearAllFilter(setSelectedProblems)}>None</button>
            </div>
          </div>
          <div className="filter-checkboxes">
            {allProblems.map((problem) => (
              <label key={problem}>
                <input
                  type="checkbox"
                  checked={selectedProblems.has(problem)}
                  onChange={() => toggleFilter(selectedProblems, setSelectedProblems, problem)}
                />
                {problem}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="results-count">
        Showing {filteredPlants.length} of {plants ? Object.keys(plants).length : 0} plants
      </div>

      <div className="table-container">
        <table className="plant-table">
          <thead>
            <tr>
              <th>Scientific Name</th>
              <th>Common Names</th>
              <th>Type</th>
              <th>Zones</th>
              <th>Light</th>
              <th>Maintenance</th>
              <th>Soil Type</th>
              <th>Soil pH</th>
              <th>Drainage</th>
              <th>Attracts</th>
              <th>Resists</th>
              <th>Problems</th>
              <th>Additional Value</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlants.map(([name, plant]) => (
              <tr key={name} onClick={() => loadPlantDetail(name)} className="clickable">
                <td>{plant.f || name}</td>
                <td>{plant.c?.join(", ") || "-"}</td>
                <td>{plant.t?.join(", ") || "-"}</td>
                <td>{formatZoneRange(plant.z)}</td>
                <td>{formatLight(plant.l)}</td>
                <td>{Array.isArray(plant.m) ? plant.m.join(", ") : (plant.m || "-")}</td>
                <td>{plant.s?.join(", ") || "-"}</td>
                <td>{plant.ph?.join(", ") || "-"}</td>
                <td>{plant.d?.join(", ") || "-"}</td>
                <td>{plant.a?.join(", ") || "-"}</td>
                <td>{plant.r?.join(", ") || "-"}</td>
                <td>{plant.p?.join(", ") || "-"}</td>
                <td>{plant.v?.join(", ") || "-"}</td>
                <td>{plant.tg?.join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

if (typeof window !== "undefined") {
  hydrate(<App />, document.getElementById("app")!);
}

export async function prerender(data: any) {
  return await ssr(<App {...data} />);
}
