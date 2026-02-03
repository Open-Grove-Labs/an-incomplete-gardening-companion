export type Reference = {
  url: URL;
  referenced: string;
};

export type plantData = {
  fullName?: string;
  name?: string;
  commonNames?: string[];
  references?: Reference[];
  genus?: string;
  species?: string;
  family?: string;
  "life-cycle"?: string[];
  "country-or-region-of-origin"?: string[];
  "wildlife-value"?: string[];
  "play-value"?: string[];
  dimensions?: string[];
  "plant-type"?: string[];
  "woody-plant-leaf-characteristics"?: string[];
  "habit/form"?: string[];
  "growth-rate"?: string[];
  maintenance?: string[];
  texture?: string[];
  light?: string[];
  "soil-ph"?: string[];
  "soil-drainage"?: string[];
  "available-space-to-plant"?: string[];
  "usda-plant-hardiness-zone"?: string[];
  "fruit-color"?: string[];
  "display/harvest-time"?: string[];
  "fruit-type"?: string[];
  "flower-color"?: string[];
  "flower-inflorescence"?: string[];
  "flower-value-to-gardener"?: string[];
  "flower-bloom-time"?: string[];
  "flower-shape"?: string[];
  "flower-petals"?: string[];
  "flower-size"?: string[];
  "flower-description"?: string[];
  "leaf-color"?: string[];
  "leaf-type"?: string[];
  "leaf-arrangement"?: string[];
  "leaf-shape"?: string[];
  "leaf-margin"?: string[];
  "hairs-present"?: string[];
  "leaf-length"?: string[];
  "leaf-width"?: string[];
  "leaf-description"?: string[];
  "stem-color"?: string[];
  "stem-is-aromatic"?: string;
  "stem-description"?: string[];
  "landscape-location"?: string[];
  "landscape-theme"?: string[];
  "design-feature"?: string[];
  attracts?: string[];
  "resistance-to-challenges"?: string[];
};

export type LightPlantData = {
  /** full name */
  f?: string;
  /** common names array */
  c?: string[];
  /** genus */
  g?: string;
  /** species */
  sp?: string;
  /** type of plant */
  t?: string[];
  /** hardiness zone */
  z?: string[];
  /** plant attracts array */
  a?: string[];
  /** plant resists array */
  r?: string[];
  /** maintenance */
  m?: string;
  /** light needs array */
  l?: string[];
  /** soil preference array */
  s?: string[];
  /** soil ph array*/
  ph?: string[];
  /** drainage array */
  d?: string[];
  /** problems array */
  p?: string[];
  /** additional value array */
  v?: string[];
  /** tags */
  tg?: string[]
};
