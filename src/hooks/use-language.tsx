import { useSyncExternalStore } from "react";

export type Lang = "en" | "fr" | "ar";

const KEY = "house-of-flags-lang";
const listeners = new Set<() => void>();

function getInitial(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const v = localStorage.getItem(KEY) as Lang | null;
    if (v === "en" || v === "fr" || v === "ar") return v;
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
    "nav.philosophy": "Story",
    "nav.drops": "Drops",
    "nav.contact": "Contact",
    "nav.cart": "Cart",

    // Landing contact strip
    "top.hello": "Say hi — we're a small studio in Tunis and we answer ourselves.",
    "top.email": "Email us",
    "top.call": "Call us",
    "top.dm": "DM us",

    "hero.tag": "Drop 001 — available now",
    "hero.sub": "Fabric flags made in Tunis. Made to say something.",
    "hero.cta": "See Drop 001",
    "hero.scroll": "Scroll",
    "hero.slide1": "In the wild",
    "hero.slide2": "On the wall",
    "hero.slide3": "In the gallery",
    "hero.slide4": "Up close",
    "hero.slide5": "The flag",

    "buy.cta": "Buy now",
    "buy.preOrder": "Pre-Order",
    "buy.soldOut": "Sold out",
    "buy.preOrderNote": "This piece is out of stock — your pre-order ships when restocked.",
    "banner.tag": "From Tunis · For the wall",
    "banner.line1": "A new way to make your space yours.",
    "banner.line2": "Premium heavyweight cotton flags, made to stand out and built to last.",
    "banner.line3": "Decorate boldly. Choose differently. No regrets.",
    "contact.tag": "Contact / Studio Tunis",
    "contact.title": "Talk to the studio.",
    "contact.intro":
      "Questions, custom orders, press, or just a hello — pick a channel below or drop us a note. A real person from our small studio in Tunis will reply.",
    "contact.channels": "Channels",
    "contact.email": "Email",
    "contact.phone": "Phone",
    "contact.formTag": "Write to us",
    "contact.formTitle": "Send a message",
    "contact.fullName": "Your name",
    "contact.notes": "Your message",
    "contact.send": "Send message",
    "contact.sending": "Sending…",
    "contact.successTag": "Message received",
    "contact.successTitle": "Thanks!",
    "contact.successBody":
      "We got your message. Give us a moment — we'll get back to you from the studio soon.",
    "contact.sendAnother": "Send another",

    "marquee.1": "MADE IN TUNIS",
    "marquee.2": "LIMITED EDITION",
    "marquee.3": "DROP 001 — LIVE",
    "marquee.4": "FABRIC NOT PAPER",
    "marquee.5": "WHERE MODERN HOMES BEGIN",
    "drop.tag": "Collection / 001",
    "drop.title": "DROP 001",
    "drop.intro":
      "Pieces live now. Printed on heavyweight cotton flag fabric. Made in limited quantity.",
    "drop.comingSoon": "Coming soon",
    "philosophy.tag": "Philosophy",
    "philosophy.h1a": "Make every wall feel alive.",
    "philosophy.h1b": "Not decoration.",
    "philosophy.h1c": "Banners.",
    "philosophy.h1d": "Identity you hang on your wall.",
    "philosophy.body":
      "HOUSE OF FLAGS started in Tunis for people who wanted something more personal on their wall. Each flag is a piece of real fabric with real meaning — for you, for your space, for the story you're telling.",
    "philosophy.readMore": "Read more",
    "system.tag": "The drop system",
    "system.titleA": "Made in limited quantities.",
    "system.titleB": "Restocks when you ask for them.",
    "system.p1":
      "Each piece is produced in limited quantities to keep every drop intentional. When a flag sells out, it may come back — but only when enough of you want it. That's the deal. If a design gets enough demand, we'll bring it back and make more for the next drop.",
    "system.p2":
      "That's the deal. The flag on your wall is one of only a few in the world — and that's what makes it yours.",
    "system.pieces": "Pieces",
    "system.flags": "Made",
    "system.restocks": "Restocks",

    "cart.add": "Add to cart",
    "cart.shippingNote": "Delivery calculated at checkout",
    "cart.noRestock": "● Restocks only when enough of you want it.",
    "support.question": "Do you want the product with the support?",
    "support.without": "Without support",
    "support.with": "With support",
    "support.label": "Support",
    "product.details": "Details",
    "product.tapZoom": "Tap to zoom",
    "product.tapShrink": "Tap to shrink",
    "product.spec": "Heavyweight cotton — 90 × 140 cm — printed in our studio",
    "product.more": "More from Drop 001",
    "product.viewAll": "View all →",

    "checkout.tag": "Checkout — Drop 001",
    "checkout.title": "Almost yours.",
    "checkout.intro":
      "Leave your details and someone from our studio in Tunis will reach out to confirm payment and delivery. No bots, no spam — just us.",
    "checkout.name": "Full name",
    "checkout.email": "Email",
    "checkout.phone": "Phone",
    "checkout.city": "City / Country",
    "checkout.address": "Address",
    "checkout.notes": "Notes (optional)",
    "checkout.place": "Place order",
    "checkout.soon": "● We'll be in touch soon.",
    "checkout.bag": "Your bag",
    "checkout.subtotal": "Subtotal",
    "checkout.total": "Total",
    "checkout.delivery": "Delivery",
    "checkout.deliveryAtCheckout": "Delivery fee added at checkout",
    "checkout.shippedFrom": "Shipped from Tunis · Made in studio · No restocks",
    "checkout.received": "● Order received",
    "checkout.inA": "YOU'RE",
    "checkout.inB": "IN.",
    "checkout.confirm":
      "Thanks for your order! Someone from our studio in Tunis will contact you shortly to confirm and arrange delivery.",
    "checkout.ref": "Order ref",
    "checkout.preOrderRef": "Pre-order ref",
    "checkout.preOrderItem": "Pre-order",
    "checkout.orderItem": "Order",
    "checkout.yezzi": "Yezzi tkhammem · Stop overthinking",
    "checkout.back": "Back to the drop",
    "checkout.emptyTitle": "EMPTY BAG",
    "checkout.emptyText": "Your bag is empty. Go pick a piece — they don't stay long.",

    "bag.label": "Your bag",
    "bag.piece": "piece",
    "bag.pieces": "pieces",
    "bag.close": "Close ✕",
    "bag.empty": "EMPTY",
    "bag.emptyText": "Nothing on your wall yet. Pick a flag — they don't come back.",
    "bag.checkout": "Checkout →",
    "bag.noRestocks": "● Restocks only when enough of you want it.",
    "bag.remove": "Remove",
    "footer.tag": "دار الرايات — Fabric art from Tunis. Limited drops. Limited restocks.",
    "footer.index": "Index",
    "footer.follow": "Follow",
    "footer.contact": "Customer Service",
    "footer.contactNote": "For orders, returns, and questions.",
    "footer.rights": "© HOUSE OF FLAGS — Tunis. All flags reserved.",
    "footer.made": "Made for the ones who hang their identity. دار الرايات.",
    "checkout.insufficientStock": "Not enough stock available",
    "checkout.exceedsAvailable": "You ordered more items than are currently available. Please adjust your quantity or use Pre-Order instead.",
    "preorder.page.title": "Pre-Order",
    "preorder.page.received": "Pre-Order Received",
    "preorder.page.thanks": "Thanks for the Commitment",
    "preorder.page.message": "Your pre-order for",
    "preorder.page.notified": "has been recorded. We'll notify you when this piece is back in stock.",
    "preorder.page.ref": "Pre-Order Reference",
    "preorder.page.explore": "Check out more pieces",
    "preorder.page.back": "Back to Drop",
    "preorder.page.summary": "HOUSE OF FLAGS / Drop 001 /",
    "preorder.page.basePrice": "Base Price",
    "preorder.page.totalExclShipping": "Total (excl. shipping)",
    "preorder.page.outOfStock": "⚠️ This item is currently out of stock. Your pre-order secures one when we restock. Shipping will be calculated at fulfillment.",
    "preorder.page.backToProduct": "← Back to product",
    "preorder.page.confirm": "Confirm Pre-Order",
    "preorder.page.confirming": "Submitting...",
    "preorder.page.contact": "Contact Information",
    "preorder.page.note": "✓ We will contact you when this item is back in stock.",
  },
  fr: {
    "nav.philosophy": "Philosophie",
    "nav.drops": "Drops",
    "nav.contact": "Contact",
    "nav.cart": "Panier",

    "top.hello": "Un petit coucou ? On est un studio à Tunis et on répond nous-mêmes.",
    "top.email": "Écrivez-nous",
    "top.call": "Appelez-nous",
    "top.dm": "Un message",

    "hero.tag": "Drop 001 — dispo maintenant",
    "hero.sub": "Drapeaux en tissu, faits à Tunis. Faits pour dire quelque chose.",
    "hero.cta": "Voir Drop 001",
    "hero.scroll": "Défiler",
    "hero.slide1": "En situation",
    "hero.slide2": "Sur le mur",
    "hero.slide3": "En galerie",
    "hero.slide4": "De près",
    "hero.slide5": "Le drapeau",

    "buy.cta": "Acheter",
    "buy.preOrder": "Précommander",
    "buy.soldOut": "Épuisé",
    "buy.preOrderNote": "Pièce en rupture — votre précommande partira au réapprovisionnement.",
    "banner.tag": "De Tunis · Pour le mur",
    "banner.line1": "Une nouvelle façon de faire de votre espace le vôtre.",
    "banner.line2": "Des drapeaux en coton épais et premium, conçus pour se démarquer et durer.",
    "banner.line3": "Décorez avec audace. Choisissez différemment. Aucun regret.",
    "contact.tag": "Contact / Studio Tunis",
    "contact.title": "Parle au studio.",
    "contact.intro":
      "Questions, commandes spéciales, presse, ou juste un bonjour — choisissez un canal ou laissez-nous un mot. Quelqu'un de notre petit studio à Tunis vous répondra.",
    "contact.channels": "Canaux",
    "contact.email": "Email",
    "contact.phone": "Téléphone",
    "contact.formTag": "Écrivez-nous",
    "contact.formTitle": "Envoyez un message",
    "contact.fullName": "Votre nom",
    "contact.notes": "Votre message",
    "contact.send": "Envoyer le message",
    "contact.sending": "Envoi…",
    "contact.successTag": "Message reçu",
    "contact.successTitle": "Merci !",
    "contact.successBody":
      "On a bien reçu votre message. On revient vers vous depuis le studio très bientôt.",
    "contact.sendAnother": "Envoyer un autre",
    "marquee.1": "Réapprovisionnement limité",
    "marquee.2": "ÉDITION LIMITÉE",
    "marquee.3": "DROP 001 — EN DIRECT",
    "marquee.4": "TISSU PAS PAPIER",
    "marquee.5": "OÙ LES MAISONS MODERNES S'INSTALLENT",
    "drop.tag": "Collection / 001",
    "drop.title": "DROP 001",
    "drop.intro":
      "Les pièces en direct. Imprimée sur un tissu drapeau coton épais. Fabriquée en quantité limitée.",
    "drop.comingSoon": "Bientôt disponible",
    "philosophy.tag": "Philosophie",
    "philosophy.h1a": "Pas des posters.",
    "philosophy.h1b": "Pas de la déco.",
    "philosophy.h1c": "Des bannières.",
    "philosophy.h1d": "L'identité que tu accroches au mur.",
    "philosophy.body":
      "HOUSE OF FLAGS est né à Tunis pour ceux qui voulaient quelque chose de plus personnel au mur. Chaque drapeau est un morceau de vrai tissu qui veut dire quelque chose — pour vous, pour votre espace, pour l'histoire que vous racontez.",
    "philosophy.readMore": "Lire plus",

    "system.tag": "Comment marchent nos drops",
    "system.titleA": "Petites séries.",
    "system.titleB": "Pas de réappro.",
    "system.p1":
      "Chaque pièce est produite en quantité limitée. Réapprovisionnement limité. On ne réédite pas. Quand un drapeau est épuisé, il disparaît du site et il y reste.",
    "system.p2":
      "C'est le deal. Le drapeau sur votre mur est l'un des rares qui existent — et c'est ça qui le rend à vous.",
    "system.pieces": "Pièces",
    "system.flags": "Faits",
    "system.restocks": "Réappros",

    "cart.add": "Ajouter au panier",
    "cart.shippingNote": "Livraison calculée à la commande",
    "cart.noRestock": "● Réapprovisionnement limité. Bouge vite.",
    "support.question": "Veux-tu le produit avec le support ?",
    "support.without": "Sans support",
    "support.with": "Avec support",
    "support.label": "Support",
    "product.details": "Détails",
    "product.tapZoom": "Touchez pour zoomer",
    "product.tapShrink": "Touchez pour réduire",
    "product.spec": "Coton épais — 90 × 140 cm — imprimé dans notre studio",
    "product.more": "Plus de Drop 001",
    "product.viewAll": "Tout voir →",

    "checkout.tag": "Commande — Drop 001",
    "checkout.title": "Presque à vous.",
    "checkout.intro":
      "Laissez vos coordonnées et quelqu'un du studio vous contactera pour confirmer le paiement et la livraison. Pas de bots, pas de spam — juste nous.",
    "checkout.name": "Nom complet",
    "checkout.email": "Email",
    "checkout.phone": "Téléphone",
    "checkout.city": "Ville / Pays",
    "checkout.address": "Adresse",
    "checkout.notes": "Notes (optionnel)",
    "checkout.place": "Passer la commande",
    "checkout.soon": "● On vous contacte bientôt.",
    "checkout.bag": "Votre panier",
    "checkout.subtotal": "Sous-total",
    "checkout.total": "Total",
    "checkout.delivery": "Livraison",
    "checkout.deliveryAtCheckout": "Frais de livraison ajoutés à la commande",
    "checkout.shippedFrom": "Expédié de Tunis · Fait en studio · Réapprovisionnement limité",
    "checkout.received": "● Commande reçue",
    "checkout.inA": "C'EST",
    "checkout.inB": "FAIT.",
    "checkout.confirm":
      "Merci pour votre commande ! Quelqu'un du studio à Tunis vous contactera très vite pour confirmer et organiser la livraison.",
    "checkout.ref": "Réf commande",
    "checkout.preOrderRef": "Réf précommande",
    "checkout.preOrderItem": "Précommande",
    "checkout.orderItem": "Commande",
    "checkout.yezzi": "Yezzi tkhammem · Arrête de trop réfléchir",
    "checkout.back": "Retour au drop",
    "checkout.emptyTitle": "PANIER VIDE",
    "checkout.emptyText": "Votre panier est vide. Allez choisir une pièce — elles partent vite.",

    "bag.label": "Votre panier",
    "bag.piece": "pièce",
    "bag.pieces": "pièces",
    "bag.close": "Fermer ✕",
    "bag.empty": "VIDE",
    "bag.emptyText": "Rien sur votre mur pour l'instant. Choisissez un drapeau — ils ne reviennent pas.",
    "bag.checkout": "Commander →",
    "bag.noRestocks": "● Réapprovisionnement limité. Bouge vite.",
    "bag.remove": "Retirer",
    "footer.tag": "دار الرايات — Art textile de Tunis. Drops limités. Réapprovisionnement limité.",
    "footer.index": "Index",
    "footer.follow": "Suivre",
    "footer.contact": "Service Client",
    "footer.contactNote": "Pour commandes, retours et questions.",
    "footer.rights": "© HOUSE OF FLAGS — Tunis. Tous drapeaux réservés.",
    "footer.made": "Fait pour ceux qui accrochent leur identité. دار الرايات.",
    "checkout.insufficientStock": "Stock insuffisant",
    "checkout.exceedsAvailable": "Vous avez commandé plus d'articles que disponibles. Veuillez ajuster la quantité ou utiliser Précommande à la place.",
    "preorder.page.title": "Précommande",
    "preorder.page.received": "Précommande Reçue",
    "preorder.page.thanks": "Merci pour le Engagement",
    "preorder.page.message": "Votre précommande pour",
    "preorder.page.notified": "a été enregistrée. Nous vous notifierons quand cette pièce sera de retour en stock.",
    "preorder.page.ref": "Référence Précommande",
    "preorder.page.explore": "Découvrez d'autres pièces",
    "preorder.page.back": "Retour au Drop",
    "preorder.page.summary": "HOUSE OF FLAGS / Drop 001 /",
    "preorder.page.basePrice": "Prix de base",
    "preorder.page.totalExclShipping": "Total (excl. livraison)",
    "preorder.page.outOfStock": "⚠️ Cet article est actuellement en rupture de stock. Votre précommande en sécurise un au réapprovisionnement. La livraison sera calculée à l'exécution.",
    "preorder.page.backToProduct": "← Retour au produit",
    "preorder.page.confirm": "Confirmer Précommande",
    "preorder.page.confirming": "Envoi...",
    "preorder.page.contact": "Coordonnées",
    "preorder.page.note": "✓ Nous vous contactons quand cet article revient en stock.",
  },
};

export type TKey = keyof (typeof dicts)["en"];

export function translate(key: TKey, lang: Lang): string {
  return (dicts[lang] as Dict)[key] ?? (dicts.en as Dict)[key] ?? key;
}
