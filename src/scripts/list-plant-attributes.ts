import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const plantsDir = path.resolve(__dirname, "..", "plants");

const listPlantAttributes = async () => {
  const entries = await fs.readdir(plantsDir, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);

  const attributeSet = new Set<string>();

  for (const fileName of jsonFiles) {
    const filePath = path.join(plantsDir, fileName);
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as Record<string, unknown>;

    Object.keys(data).forEach((key) => attributeSet.add(key));
  }

  const attributes = Array.from(attributeSet).sort((a, b) =>
    a.localeCompare(b),
  );

  console.log(`Found ${attributes.length} attributes across ${jsonFiles.length} plants:`);
  console.log(attributes.join("\n"));
};

await listPlantAttributes();
