import { useSyncExternalStore } from "react";

export type Lang = "en" | "fr";

const KEY = "house-of-flags-lang";
const listeners = new Set<() => void>();

function getInitial(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const v = localStorage.getItem(KEY) as Lang | null;
    if (v === "en" || v === "fr") return v;
  } catch {}
  return "en";
}

let current: Lang = getInitial();

function applyToDOM(l: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("lang", l);
  document.documentElement.setAttribute("dir", "ltr");
}

if (typeof document !== "undefined") applyToDOM(current);

export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {}
  applyToDOM(l);
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useLanguage() {
  const lang = useSyncExternalStore(
    subscribe,
    () => current,
    () => "en" as Lang,
  );
  return { lang, setLang };
}

export function useT() {
  const { lang } = useLanguage();
  return (key: TKey) => translate(key, lang);
}

// ---------------- translations ----------------

type Dict = Record<string, string>;
const dicts: Record<Lang, Dict> = {
  en: {
    "nav.drop": "Drop 001",
    "nav.philosophy": "Philosophy",
    "nav.drops": "Drops",
    "nav.contact": "Contact",
    "nav.cart": "Cart",
    "hero.tag": "HOUSE OF FLAGS — Drop 001 / Live now",
    "hero.sub": "Fabric art for identity",
    "hero.cta": "Explore Drop 001",
    "hero.scroll": "Scroll",
    "buy.cta": "Buy now",
    "banner.tag": "From Tunis · For the wall",
    "banner.line1": "We don't sell decoration.",
    "banner.line2": "Heavyweight cotton flags. One word, one statement.",
    "banner.line3": "No restocks. No regrets.",
    "contact.tag": "Contact / Studio Tunis",
    "contact.title": "Talk to the studio.",
    "contact.intro":
      "Questions, custom orders, press, or just a hello — pick your channel or drop us a note. We answer ourselves.",
    "contact.channels": "Channels",
    "contact.email": "Email",
    "contact.phone": "Phone",
    "contact.formTag": "Drop a note",
    "contact.formTitle": "Send us something",
    "contact.fullName": "Full name",
    "contact.notes": "Notes / Feedback",
    "contact.send": "Send message",
    "contact.sending": "Sending…",
    "contact.successTag": "Message received",
    "contact.successTitle": "We got it.",
    "contact.successBody":
      "We'll come back to you from the studio in Tunis. Sob shwaya — give us a moment.",
    "contact.sendAnother": "Send another",
    "marquee.1": "NO RESTOCKS",
    "marquee.2": "LIMITED EDITION",
    "marquee.3": "DROP 001 — LIVE",
    "marquee.4": "FABRIC NOT PAPER",
    "marquee.5": "STATEMENTS NOT DECORATION",
    "drop.tag": "Collection / 001",
    "drop.title": "DROP 001",
    "drop.intro":
      "One piece live now. Printed on heavyweight cotton flag fabric. Made in limited quantity. When the count hits zero, it stays zero.",
    "drop.comingSoon": "Coming soon",
    "philosophy.tag": "Philosophy",
    "philosophy.h1a": "Not posters.",
    "philosophy.h1b": "Not decoration.",
    "philosophy.h1c": "Statements.",
    "philosophy.h1d": "Identity you hang on your wall.",
    "philosophy.body":
      "HOUSE OF FLAGS was built in Tunis for the ones who never wanted matching frames. Each flag is a piece of fabric that means something — to you, to whoever walks into your room, to the version of you that hung it.",
    "philosophy.readMore": "Read more",
    "system.tag": "The drop system",
    "system.titleA": "Once it's gone,",
    "system.titleB": "it's gone.",
    "system.p1":
      "Each piece is produced in limited quantity. We do not restock. We do not re-release. When a flag sells out, it disappears from this site and it stays disappeared.",
    "system.p2":
      "That's the deal. The piece on your wall is one of a few that exist in the world. That's what makes it yours.",
    "system.pieces": "Pieces",
    "system.flags": "Flags total",
    "system.restocks": "Restocks",
    "cart.add": "Add to cart",
    "cart.shipping": "Shipping included",
    "cart.noRestock": "● No restocks. Once it's gone, it's gone.",
    "product.details": "Details",
    "product.tapZoom": "Tap to zoom fabric",
    "product.tapShrink": "Tap to shrink",
    "product.spec": "Heavyweight cotton — 90 × 140 cm — printed in studio",
    "product.more": "More from Drop 001",
    "product.viewAll": "View all →",
    "checkout.tag": "Checkout / Drop 001",
    "checkout.title": "Claim it.",
    "checkout.intro":
      "Drop your details. We'll reach out from the studio in Tunis to confirm payment and shipping. No bots. No spam. Just one of us.",
    "checkout.name": "Full name",
    "checkout.email": "Email",
    "checkout.phone": "Phone",
    "checkout.city": "City / Country",
    "checkout.address": "Address",
    "checkout.notes": "Notes (optional)",
    "checkout.place": "Place order",
    "checkout.soon": "● We'll contact you soon. 7keya bel 7keya.",
    "checkout.bag": "Your bag",
    "checkout.subtotal": "Subtotal",
    "checkout.total": "Total",
    "checkout.shipping": "Included",
    "checkout.shippedFrom": "Shipped from Tunis · Made in studio · No restocks",
    "checkout.received": "● Order received",
    "checkout.inA": "YOU'RE",
    "checkout.inB": "IN.",
    "checkout.confirm":
      "We got your order. One of us will contact you soon to confirm and arrange delivery — straight from our studio in Tunis.",
    "checkout.ref": "Order ref",
    "checkout.yezzi": "Yezzi tkhammem · Stop overthinking",
    "checkout.back": "Back to the drop",
    "checkout.emptyTitle": "EMPTY BAG",
    "checkout.emptyText": "Nothing to check out. Go pick a piece — they leave faster than you think.",
    "bag.label": "Your bag",
    "bag.piece": "piece",
    "bag.pieces": "pieces",
    "bag.close": "Close ✕",
    "bag.empty": "EMPTY",
    "bag.emptyText": "Nothing on the wall yet. Pick a flag — they don't come back.",
    "bag.checkout": "Checkout →",
    "bag.noRestocks": "● No restocks. Move quick.",
    "bag.remove": "Remove",
    "footer.tag": "دار الرايات — Fabric art from Tunis. Limited drops. No restocks.",
    "footer.index": "Index",
    "footer.follow": "Follow",
    "footer.contact": "Customer Service",
    "footer.contactNote": "For orders, returns, and questions.",
    "footer.rights": "© HOUSE OF FLAGS — Tunis. All flags reserved.",
    "footer.made": "Made for the ones who hang their identity. دار الرايات.",
  },
  fr: {
    "nav.drop": "Drop 001",
    "nav.philosophy": "Philosophie",
    "nav.drops": "Drops",
    "nav.contact": "Contact",
    "nav.cart": "Panier",
    "hero.tag": "HOUSE OF FLAGS — Drop 001 / En direct",
    "hero.sub": "L'art textile de l'identité",
    "hero.cta": "Explorer Drop 001",
    "hero.scroll": "Défiler",
    "buy.cta": "Acheter",
    "banner.tag": "De Tunis · Pour le mur",
    "banner.line1": "On ne vend pas de la déco.",
    "banner.line2": "Drapeaux en coton épais. Un mot, une déclaration.",
    "banner.line3": "Pas de réappro. Pas de regrets.",
    "contact.tag": "Contact / Studio Tunis",
    "contact.title": "Parle au studio.",
    "contact.intro":
      "Questions, commandes spéciales, presse, ou juste un bonjour — choisis ton canal ou laisse-nous un mot. On te répond nous-mêmes.",
    "contact.channels": "Canaux",
    "contact.email": "Email",
    "contact.phone": "Téléphone",
    "contact.formTag": "Laisse un mot",
    "contact.formTitle": "Envoie-nous quelque chose",
    "contact.fullName": "Nom complet",
    "contact.notes": "Notes / Retour",
    "contact.send": "Envoyer le message",
    "contact.sending": "Envoi…",
    "contact.successTag": "Message reçu",
    "contact.successTitle": "On l'a.",
    "contact.successBody":
      "On revient vers toi depuis le studio à Tunis. Sob shwaya — laisse-nous un instant.",
    "contact.sendAnother": "Envoyer un autre",
    "marquee.1": "AUCUN RÉAPPRO",
    "marquee.2": "ÉDITION LIMITÉE",
    "marquee.3": "DROP 001 — EN DIRECT",
    "marquee.4": "TISSU PAS PAPIER",
    "marquee.5": "DÉCLARATIONS PAS DÉCORATION",
    "drop.tag": "Collection / 001",
    "drop.title": "DROP 001",
    "drop.intro":
      "Une pièce en direct. Imprimée sur un tissu drapeau coton épais. Fabriquée en quantité limitée. Quand le compteur atteint zéro, il y reste.",
    "drop.comingSoon": "Bientôt disponible",
    "philosophy.tag": "Philosophie",
    "philosophy.h1a": "Pas des posters.",
    "philosophy.h1b": "Pas de la déco.",
    "philosophy.h1c": "Des déclarations.",
    "philosophy.h1d": "L'identité que tu accroches au mur.",
    "philosophy.body":
      "HOUSE OF FLAGS né à Tunis pour ceux qui n'ont jamais voulu de cadres assortis. Chaque drapeau est un morceau de tissu qui veut dire quelque chose — à toi, à celui qui entre dans ta chambre, à la version de toi qui l'a accroché.",
    "philosophy.readMore": "Lire plus",
    "system.tag": "Le système des drops",
    "system.titleA": "Une fois parti,",
    "system.titleB": "c'est parti.",
    "system.p1":
      "Chaque pièce est produite en quantité limitée. On ne réapprovisionne pas. On ne réédite pas. Quand un drapeau est épuisé, il disparaît du site et il y reste.",
    "system.p2":
      "C'est le deal. La pièce sur ton mur est l'une des rares qui existent dans le monde. C'est ce qui la rend tienne.",
    "system.pieces": "Pièces",
    "system.flags": "Drapeaux en tout",
    "system.restocks": "Réappros",
    "cart.add": "Ajouter au panier",
    "cart.shipping": "Livraison incluse",
    "cart.noRestock": "● Pas de réappro. Une fois parti, c'est parti.",
    "product.details": "Détails",
    "product.tapZoom": "Touche pour zoomer le tissu",
    "product.tapShrink": "Touche pour réduire",
    "product.spec": "Coton épais — 90 × 140 cm — imprimé en studio",
    "product.more": "Plus de Drop 001",
    "product.viewAll": "Tout voir →",
    "checkout.tag": "Commande / Drop 001",
    "checkout.title": "Réclame-le.",
    "checkout.intro":
      "Laisse tes coordonnées. On te contacte depuis le studio à Tunis pour confirmer le paiement et la livraison. Pas de bots. Pas de spam. Juste nous.",
    "checkout.name": "Nom complet",
    "checkout.email": "Email",
    "checkout.phone": "Téléphone",
    "checkout.city": "Ville / Pays",
    "checkout.address": "Adresse",
    "checkout.notes": "Notes (optionnel)",
    "checkout.place": "Passer la commande",
    "checkout.soon": "● On te contacte bientôt. 7keya bel 7keya.",
    "checkout.bag": "Ton panier",
    "checkout.subtotal": "Sous-total",
    "checkout.total": "Total",
    "checkout.shipping": "Incluse",
    "checkout.shippedFrom": "Expédié de Tunis · Fait en studio · Pas de réappro",
    "checkout.received": "● Commande reçue",
    "checkout.inA": "C'EST",
    "checkout.inB": "FAIT.",
    "checkout.confirm":
      "On a bien reçu ta commande. Quelqu'un te contacte bientôt pour confirmer et organiser la livraison — directement de notre studio à Tunis.",
    "checkout.ref": "Réf commande",
    "checkout.yezzi": "Yezzi tkhammem · Arrête de trop réfléchir",
    "checkout.back": "Retour au drop",
    "checkout.emptyTitle": "PANIER VIDE",
    "checkout.emptyText": "Rien à commander. Va choisir une pièce — elles partent vite.",
    "bag.label": "Ton panier",
    "bag.piece": "pièce",
    "bag.pieces": "pièces",
    "bag.close": "Fermer ✕",
    "bag.empty": "VIDE",
    "bag.emptyText": "Rien sur le mur pour l'instant. Choisis un drapeau — ils ne reviennent pas.",
    "bag.checkout": "Commander →",
    "bag.noRestocks": "● Pas de réappro. Bouge vite.",
    "bag.remove": "Retirer",
    "footer.tag": "دار الرايات — Art textile de Tunis. Drops limités. Pas de réappro.",
    "footer.index": "Index",
    "footer.follow": "Suivre",
    "footer.contact": "Service Client",
    "footer.contactNote": "Pour commandes, retours et questions.",
    "footer.rights": "© HOUSE OF FLAGS — Tunis. Tous drapeaux réservés.",
    "footer.made": "Fait pour ceux qui accrochent leur identité. دار الرايات.",
  },
};

export type TKey = keyof (typeof dicts)["en"];

export function translate(key: TKey, lang: Lang): string {
  return (dicts[lang] as Dict)[key] ?? (dicts.en as Dict)[key] ?? key;
}
