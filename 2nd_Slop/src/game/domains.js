// Domaine de jauge de chaque personnage (clé de portrait -> domaine), d'après le
// groupement de gen-assets-vitrail.sh. Sert à teinter le cadre de carte par orateur.
import { PORTRAITS } from './portraits.js';

export const DOMAINS = ['foi', 'magie', 'chevalerie', 'couronne', 'peuple'];

export const DOMAIN_BY_PORTRAIT = {
  eveque: 'foi', moine: 'foi', galaad: 'foi', ermite: 'foi', pelerin: 'foi',
  merlin: 'magie', morgane: 'magie', fee: 'magie', 'dame-lac': 'magie',
  lancelot: 'chevalerie', gauvain: 'chevalerie', perceval: 'chevalerie',
  bedivere: 'chevalerie', keu: 'chevalerie', chevalier: 'chevalerie',
  ecuyer: 'chevalerie', 'chevalier-noir': 'chevalerie',
  guenievre: 'couronne', 'roi-lot': 'couronne', baron: 'couronne',
  conseiller: 'couronne', heraut: 'couronne', roi: 'couronne', mordred: 'couronne',
  paysan: 'peuple', marchand: 'peuple', barde: 'peuple', saxon: 'peuple',
  'chef-saxon': 'peuple',
};

/** Domaine de l'orateur d'une carte (via son portrait) ; peuple par défaut. */
export function domainFor(speaker) {
  return DOMAIN_BY_PORTRAIT[PORTRAITS[speaker]] ?? 'peuple';
}
