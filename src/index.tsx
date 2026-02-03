import { hydrate, prerender as ssr } from "preact-iso";
import { useEffect, useMemo, useState } from "preact/hooks";
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

const MAINTENANCE_ORDER = ["low", "medium", "high"];
const LIGHT_ORDER = [
  "full sun (6 or more hours of direct sunlight a day)",
  "partial shade (direct sunlight only part of the day, 2-6 hours)",
  "dappled sunlight (shade through upper canopy all day)",
  "deep shade (less than 2 hours to no direct sunlight)",
];

export function App() {
  const [plants, setPlants] = useState<LightDataSet | null>(null);
  const [searchIndex, setSearchIndex] = useState<Index | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<FullPlantData | null>(
    null,
  );
  const [renderLimit, setRenderLimit] = useState(200);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedZones, setSelectedZones] = useState<Set<string>>(new Set());
  const [selectedLights, setSelectedLights] = useState<Set<string>>(new Set());
  const [selectedMaintenance, setSelectedMaintenance] = useState<Set<string>>(
    new Set(),
  );
  const [includeProblemPlants, setIncludeProblemPlants] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        console.log("Fetching compressed data...");
        const response = await fetch("./light-weight-data-set.json.gz");
        if (!response.ok)
          throw new Error(
            `Failed to fetch data: ${response.status} ${response.statusText}`,
          );

        console.log(
          "Response headers:",
          Object.fromEntries(response.headers.entries()),
        );
        const compressed = await response.arrayBuffer();
        console.log("Received data size:", compressed.byteLength);

        let jsonString: string;
        try {
          // Try to decompress with pako
          console.log("Attempting to decompress...");
          jsonString = pako.ungzip(new Uint8Array(compressed), {
            to: "string",
          });
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
            plant.g,
            plant.sp,
            ...(plant.c || []),
            ...(plant.tg || []),
            ...(plant.s || []),
            ...(plant.d || []),
            ...(plant.p || []),
            ...(plant.a || []),
            ...(plant.r || []),
            ...(plant.v || []),
          ]
            .filter(Boolean)
            .join(" ");

          index.add(name, searchableText);
        });

        setSearchIndex(index);
        console.log("Search index built");

        // Initialize all filters as checked
        const types = new Set(Object.values(data).flatMap((p) => p.t || []));
        const zones = new Set(Object.values(data).flatMap((p) => p.z || []));
        const lights = new Set(Object.values(data).flatMap((p) => p.l || []));
        const maintenance = new Set(
          Object.values(data).flatMap((p) => {
            if (!p.m) return [];
            return Array.isArray(p.m) ? p.m : [p.m];
          }),
        );

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

  const searchResults = useMemo(() => {
    if (!searchTerm || !searchIndex) return null;
    return new Set(searchIndex.search(searchTerm));
  }, [searchIndex, searchTerm]);

  const filteredPlants = useMemo(() => {
    if (!plants) return [];
    return Object.entries(plants).filter(([name, plant]) => {
      const matchesSearch = !searchResults || searchResults.has(name);

      const matchesType = plant.t?.some((t) => selectedTypes.has(t)) ?? false;
      const matchesZone = plant.z?.some((z) => selectedZones.has(z)) ?? false;
      const matchesLight = plant.l?.some((l) => selectedLights.has(l)) ?? false;
      const matchesMaintenance = plant.m
        ? Array.isArray(plant.m)
          ? plant.m.some((m) => selectedMaintenance.has(m))
          : selectedMaintenance.has(plant.m)
        : false;
      const matchesProblems = includeProblemPlants
        ? true
        : !plant.p || plant.p.length === 0;

      return (
        matchesSearch &&
        matchesType &&
        matchesZone &&
        matchesLight &&
        matchesMaintenance &&
        matchesProblems
      );
    });
  }, [
    plants,
    searchResults,
    selectedTypes,
    selectedZones,
    selectedLights,
    selectedMaintenance,
    includeProblemPlants,
  ]);

  useEffect(() => {
    setRenderLimit(200);
  }, [
    searchTerm,
    selectedTypes,
    selectedZones,
    selectedLights,
    selectedMaintenance,
    includeProblemPlants,
  ]);

  const visiblePlants = useMemo(
    () => filteredPlants.slice(0, renderLimit),
    [filteredPlants, renderLimit],
  );

  // Get unique values for filters
  const allTypes = useMemo(() => {
    if (!plants) return [];
    return [...new Set(Object.values(plants).flatMap((p) => p.t || []))].sort();
  }, [plants]);

  const allZones = useMemo(() => {
    if (!plants) return [];
    return [...new Set(Object.values(plants).flatMap((p) => p.z || []))].sort(
      (a, b) => {
        const aMatch = a.match(/^(\d+)([a-z]?)$/i);
        const bMatch = b.match(/^(\d+)([a-z]?)$/i);
        if (!aMatch || !bMatch) return 0;

        const aNum = parseInt(aMatch[1]);
        const bNum = parseInt(bMatch[1]);
        const aLetter = aMatch[2] || "";
        const bLetter = bMatch[2] || "";

        if (aNum !== bNum) return aNum - bNum;
        return aLetter.localeCompare(bLetter);
      },
    );
  }, [plants]);

  const allLights = useMemo(() => {
    if (!plants) return [];
    return [...new Set(Object.values(plants).flatMap((p) => p.l || []))].sort(
      (a, b) => {
        const aKey = a.toLowerCase();
        const bKey = b.toLowerCase();
        const aIndex = LIGHT_ORDER.indexOf(aKey);
        const bIndex = LIGHT_ORDER.indexOf(bKey);

        if (aIndex !== -1 || bIndex !== -1) {
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        }

        return aKey.localeCompare(bKey);
      },
    );
  }, [plants]);

  const allMaintenance = useMemo(() => {
    if (!plants) return [];
    return [
      ...new Set(
        Object.values(plants).flatMap((p) => {
          if (!p.m) return [];
          return Array.isArray(p.m) ? p.m : [p.m];
        }),
      ),
    ].sort((a, b) => {
      const aKey = a.toLowerCase();
      const bKey = b.toLowerCase();
      const aIndex = MAINTENANCE_ORDER.indexOf(aKey);
      const bIndex = MAINTENANCE_ORDER.indexOf(bKey);

      if (aIndex !== -1 || bIndex !== -1) {
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      }

      return aKey.localeCompare(bKey);
    });
  }, [plants]);
  const toggleFilter = (
    set: Set<string>,
    setter: (s: Set<string>) => void,
    value: string,
  ) => {
    const newSet = new Set(set);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setter(newSet);
  };

  const selectAllFilter = (
    setter: (s: Set<string>) => void,
    values: string[],
  ) => {
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
      const aLetter = aMatch[2] || "";
      const bLetter = bMatch[2] || "";

      if (aNum !== bNum) return aNum - bNum;
      return aLetter.localeCompare(bLetter);
    });

    return `${sorted[0]} - ${sorted[sorted.length - 1]}`;
  };

  const formatLight = (lights: string[] | undefined): string => {
    if (!lights || lights.length === 0) return "-";

    const shortened = lights.map((light) => {
      const lower = light.toLowerCase();
      if (lower.includes("full sun") || lower.includes("full sunlight"))
        return "Full";
      if (lower.includes("partial")) return "Partial";
      if (lower.includes("dappled")) return "Dappled";
      if (lower.includes("shade") || lower.includes("shaded")) return "Shade";
      return light; // fallback to original if no match
    });

    // Remove duplicates and join
    return [...new Set(shortened)].join(", ");
  };

  const addTagToSearch = (tag: string) => {
    setSearchTerm((current) => {
      const trimmed = current.trim();
      const parts = trimmed ? trimmed.split(/\s+/) : [];

      if (parts.some((part) => part.toLowerCase() === tag.toLowerCase())) {
        return trimmed;
      }

      return trimmed ? `${trimmed} ${tag}` : tag;
    });
  };

  const getMaintenanceClass = (maintenance: LightPlantData["m"]) => {
    const values = Array.isArray(maintenance)
      ? maintenance
      : maintenance
        ? [maintenance]
        : [];
    const normalized = values.map((value) => value.toLowerCase());

    if (normalized.some((value) => value.includes("high"))) {
      return "maintenance-high";
    }
    if (normalized.some((value) => value.includes("medium"))) {
      return "maintenance-medium";
    }
    if (normalized.some((value) => value.includes("low"))) {
      return "maintenance-low";
    }
    return "";
  };

  const getMaintenanceSwatchClass = (maintenance: string) => {
    const value = maintenance.toLowerCase();
    if (value.includes("high")) return "maintenance-high";
    if (value.includes("medium")) return "maintenance-medium";
    if (value.includes("low")) return "maintenance-low";
    return "maintenance-none";
  };

  const plantDetailFields: Array<{ key: string; label: string }> = [
    { key: "appendage", label: "Appendage" },
    { key: "attracts", label: "Attracts" },
    { key: "available-space-to-plant", label: "Available Space to Plant" },
    { key: "bark-color", label: "Bark Color" },
    { key: "bark-description", label: "Bark Description" },
    { key: "bark-plate-shape", label: "Bark Plate Shape" },
    { key: "bulb-storage", label: "Bulb Storage" },
    { key: "causes-contact-dermatitis", label: "Causes Contact Dermatitis" },
    { key: "climbing-method", label: "Climbing Method" },
    { key: "common-names", label: "Common Names" },
    {
      key: "country-or-region-of-origin",
      label: "Country or Region of Origin",
    },
    { key: "cultivars", label: "Cultivars" },
    { key: "deciduous-leaf-fall-color", label: "Deciduous Leaf Fall Color" },
    { key: "design-feature", label: "Design Feature" },
    { key: "dimensions", label: "Dimensions" },
    { key: "display/harvest-time", label: "Display / Harvest Time" },
    { key: "distribution", label: "Distribution" },
    { key: "edibility", label: "Edibility" },
    { key: "family", label: "Family" },
    { key: "fire-risk-rating", label: "Fire Risk Rating" },
    { key: "flower-bloom-time", label: "Flower Bloom Time" },
    { key: "flower-color", label: "Flower Color" },
    { key: "flower-description", label: "Flower Description" },
    { key: "flower-inflorescence", label: "Flower Inflorescence" },
    { key: "flower-petals", label: "Flower Petals" },
    { key: "flower-shape", label: "Flower Shape" },
    { key: "flower-size", label: "Flower Size" },
    { key: "flower-value-to-gardener", label: "Flower Value to Gardener" },
    { key: "fruit-color", label: "Fruit Color" },
    { key: "fruit-description", label: "Fruit Description" },
    { key: "fruit-length", label: "Fruit Length" },
    { key: "fruit-type", label: "Fruit Type" },
    { key: "fruit-value-to-gardener", label: "Fruit Value to Gardener" },
    { key: "fruit-width", label: "Fruit Width" },
    { key: "full-name", label: "Full Name" },
    { key: "genus", label: "Genus" },
    { key: "growth-rate", label: "Growth Rate" },
    { key: "habit/form", label: "Habit / Form" },
    { key: "hairs-present", label: "Hairs Present" },
    { key: "landscape-location", label: "Landscape Location" },
    { key: "landscape-theme", label: "Landscape Theme" },
    { key: "leaf-arrangement", label: "Leaf Arrangement" },
    { key: "leaf-color", label: "Leaf Color" },
    { key: "leaf-description", label: "Leaf Description" },
    { key: "leaf-feel", label: "Leaf Feel" },
    { key: "leaf-length", label: "Leaf Length" },
    { key: "leaf-margin", label: "Leaf Margin" },
    { key: "leaf-shape", label: "Leaf Shape" },
    { key: "leaf-type", label: "Leaf Type" },
    { key: "leaf-value-to-gardener", label: "Leaf Value to Gardener" },
    { key: "leaf-width", label: "Leaf Width" },
    { key: "life-cycle", label: "Life Cycle" },
    { key: "light", label: "Light" },
    { key: "maintenance", label: "Maintenance" },
    { key: "name", label: "Name" },
    { key: "nutrition-profiles", label: "Nutrition Profiles" },
    {
      key: "particularly-resistant-to-insects/diseases/other-problems",
      label: "Particularly Resistant to Insects / Diseases / Other Problems",
    },
    { key: "phonetic-spelling", label: "Phonetic Spelling" },
    { key: "pith-split-longitudinally", label: "Pith Split Longitudinally" },
    { key: "plant-type", label: "Plant Type" },
    { key: "play-value", label: "Play Value" },
    { key: "poison-part", label: "Poison Part" },
    { key: "poison-severity", label: "Poison Severity" },
    { key: "poison-symptoms", label: "Poison Symptoms" },
    { key: "poison-toxic-principle", label: "Poison Toxic Principle" },
    { key: "problems", label: "Problems" },
    {
      key: "recommended-propagation-strategy",
      label: "Recommended Propagation Strategy",
    },
    { key: "references", label: "References" },
    { key: "resistance-to-challenges", label: "Resistance to Challenges" },
    { key: "soil-drainage", label: "Soil Drainage" },
    { key: "soil-ph", label: "Soil pH" },
    { key: "soil-texture", label: "Soil Texture" },
    { key: "species", label: "Species" },
    { key: "stem-bud-scales", label: "Stem Bud Scales" },
    { key: "stem-bud-terminal", label: "Stem Bud Terminal" },
    { key: "stem-buds", label: "Stem Buds" },
    { key: "stem-color", label: "Stem Color" },
    { key: "stem-cross-section", label: "Stem Cross Section" },
    { key: "stem-description", label: "Stem Description" },
    { key: "stem-form", label: "Stem Form" },
    { key: "stem-is-aromatic", label: "Stem is Aromatic" },
    { key: "stem-leaf-scar-shape", label: "Stem Leaf Scar Shape" },
    { key: "stem-lenticels", label: "Stem Lenticels" },
    { key: "stem-surface", label: "Stem Surface" },
    { key: "surface/attachment", label: "Surface / Attachment" },
    { key: "tags", label: "Tags" },
    { key: "texture", label: "Texture" },
    { key: "usda-plant-hardiness-zone", label: "USDA Plant Hardiness Zone" },
    { key: "uses", label: "Uses" },
    { key: "wildlife-value", label: "Wildlife Value" },
    {
      key: "woody-plant-leaf-characteristics",
      label: "Woody Plant Leaf Characteristics",
    },
  ];

  const formatDetailValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (Array.isArray(value)) {
      return value
        .map((item) =>
          typeof item === "string" || typeof item === "number"
            ? String(item)
            : JSON.stringify(item),
        )
        .join(", ");
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  };

  if (loading) return <div className="loading">Loading plant data...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  if (selectedPlant) {
    return (
      <div className="app">
        <button onClick={() => setSelectedPlant(null)} className="back-btn">
          ← Back to List
        </button>
        <div className="plant-detail">
          <h1>{selectedPlant.fullName}</h1>
          {selectedPlant.commonNames &&
            selectedPlant.commonNames.length > 0 && (
              <h2 className="common-names">
                {selectedPlant.commonNames.join(", ")}
              </h2>
            )}
          {plantDetailFields.some((field) => {
            const value = selectedPlant[field.key];
            return Array.isArray(value) ? value.length > 0 : value != null;
          }) && (
            <div className="section">
              <h3>Details</h3>
              {plantDetailFields.map((field) => {
                const value = selectedPlant[field.key];
                if (value === undefined || value === null) return null;
                if (Array.isArray(value) && value.length === 0) return null;
                if (typeof value === "string" && value.trim() === "")
                  return null;

                return (
                  <p key={field.key}>
                    <strong>{field.label}:</strong> {formatDetailValue(value)}
                  </p>
                );
              })}
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
              <button
                onClick={() => selectAllFilter(setSelectedTypes, allTypes)}
              >
                All
              </button>
              <button onClick={() => clearAllFilter(setSelectedTypes)}>
                None
              </button>
            </div>
          </div>
          <div className="filter-checkboxes">
            {allTypes.map((type) => (
              <label key={type}>
                <input
                  type="checkbox"
                  checked={selectedTypes.has(type)}
                  onChange={() =>
                    toggleFilter(selectedTypes, setSelectedTypes, type)
                  }
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
              <button
                onClick={() => selectAllFilter(setSelectedZones, allZones)}
              >
                All
              </button>
              <button onClick={() => clearAllFilter(setSelectedZones)}>
                None
              </button>
            </div>
          </div>
          <div className="filter-checkboxes">
            {allZones.map((zone) => (
              <label key={zone}>
                <input
                  type="checkbox"
                  checked={selectedZones.has(zone)}
                  onChange={() =>
                    toggleFilter(selectedZones, setSelectedZones, zone)
                  }
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
              <button
                onClick={() => selectAllFilter(setSelectedLights, allLights)}
              >
                All
              </button>
              <button onClick={() => clearAllFilter(setSelectedLights)}>
                None
              </button>
            </div>
          </div>
          <div className="filter-checkboxes">
            {allLights.map((light) => (
              <label key={light}>
                <input
                  type="checkbox"
                  checked={selectedLights.has(light)}
                  onChange={() =>
                    toggleFilter(selectedLights, setSelectedLights, light)
                  }
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
              <button
                onClick={() =>
                  selectAllFilter(setSelectedMaintenance, allMaintenance)
                }
              >
                All
              </button>
              <button onClick={() => clearAllFilter(setSelectedMaintenance)}>
                None
              </button>
            </div>
          </div>
          <div className="filter-checkboxes">
            {allMaintenance.map((maint) => (
              <label key={maint}>
                <input
                  type="checkbox"
                  checked={selectedMaintenance.has(maint)}
                  onChange={() =>
                    toggleFilter(
                      selectedMaintenance,
                      setSelectedMaintenance,
                      maint,
                    )
                  }
                />
                <span
                  className={`maintenance-swatch ${getMaintenanceSwatchClass(
                    maint,
                  )} maintenance-text`}
                >
                  {maint}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-header">
            <h3>Problems</h3>
          </div>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={includeProblemPlants}
              onChange={(e) =>
                setIncludeProblemPlants((e.target as HTMLInputElement).checked)
              }
            />
            Include plants with problems
          </label>
        </div>
      </div>

      <div className="results-count">
        Showing {filteredPlants.length} of{" "}
        {plants ? Object.keys(plants).length : 0} plants
      </div>

      <div className="table-container">
        <table className="plant-table">
          <thead>
            <tr>
              <th>Name(s)</th>
              <th>Zone / Type</th>
              <th>Light</th>
              <th>Soil Type</th>
              <th>Soil pH</th>
              <th>Drainage</th>
              <th>Attracts</th>
              <th>Resists</th>
              <th>Additional Value</th>
              <th>Tags</th>
              <th>Problems</th>
            </tr>
          </thead>
          <tbody>
            {visiblePlants.map(([name, plant]) => (
              <tr
                key={name}
                onClick={() => loadPlantDetail(name)}
                className={`clickable ${getMaintenanceClass(plant.m)}`}
              >
                <td>
                  <div className="plant-title">{plant.f || name}</div>
                  {plant.c?.length && (
                    <>
                      <div className="subtitle">Common Names</div>
                      <div>{plant.c.join(", ")}</div>
                    </>
                  )}
                  {plant.cv?.length && (
                    <>
                      <div className="subtitle">Cultivars</div>
                      <div>{plant.cv.join(", ")}</div>
                    </>
                  )}
                </td>
                <td>
                  <div className="zone-range">{formatZoneRange(plant.z)}</div>
                  <div>{plant.t?.join(", ") || "-"}</div>
                </td>
                <td>{formatLight(plant.l)}</td>
                <td>{plant.s?.join(", ") || "-"}</td>
                <td>{plant.ph?.join(", ") || "-"}</td>
                <td>{plant.d?.join(", ") || "-"}</td>
                <td>{plant.a?.join(", ") || "-"}</td>
                <td>{plant.r?.join(", ") || "-"}</td>
                <td>{plant.v?.join(", ") || "-"}</td>
                <td className="cell-compact">
                  <div className="cell-scroll" title={name + " tags"}>
                    {plant.tg?.map((tag) => (
                      <button
                        key={name + tag}
                        type="button"
                        className="tag-chip"
                        onClick={(event) => {
                          event.stopPropagation();
                          addTagToSearch(tag);
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </td>
                <td>{plant.p?.join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPlants.length > renderLimit && (
        <div className="results-count load-more-row">
          <div>
            Showing {visiblePlants.length} of {filteredPlants.length} results
          </div>
          <button
            className="back-btn"
            onClick={() => setRenderLimit((limit) => limit + 200)}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}

if (typeof window !== "undefined") {
  hydrate(<App />, document.getElementById("app")!);
}

export async function prerender(data: any) {
  return await ssr(<App {...data} />);
}
