/**
 * Traduit « Audi » + « Q5 » vers les identifiants d'URL du site source (« audi » / « q5 »).
 *
 * ⚠ SEUL audi/q5 a été vérifié sur le site. Les autres lignes sont des suppositions
 *   raisonnables : pour chacune, cherche le modèle sur le site, regarde l'URL obtenue
 *   (…/s=brand!:XXX@model!:YYY/1) et corrige ici. Un slug faux ne casse rien :
 *   le site répond « 0 annonce » et l'interface affiche « No comparable listings ».
 */
export const slugify = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// clé = `${slugify(marque)}|${slugify(modèle du showroom)}`
const OVERRIDES = {
  'audi|q5': { brand: 'audi', model: 'q5' }, // ✔ vérifié
  'audi|q3-crossback': { brand: 'audi', model: 'q3' },
  'audi|a3-sportback': { brand: 'audi', model: 'a3' },
  'mercedes-benz|c-class': { brand: 'mercedes-benz', model: 'classe-c' },
  'bmw|x2-sdrive-pack': { brand: 'bmw', model: 'x2' },
  'bmw|x3-hybride': { brand: 'bmw', model: 'x3' },
  'range-rover|evoque': { brand: 'land-rover', model: 'range-rover-evoque' },
  'jaguar|f-pace': { brand: 'jaguar', model: 'f-pace' },
};

export function toSiteSlugs(brand, model) {
  const key = `${slugify(brand)}|${slugify(model)}`;
  return OVERRIDES[key] ?? { brand: slugify(brand), model: slugify(model) };
}
